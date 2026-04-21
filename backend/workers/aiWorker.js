const { Worker } = require('bullmq');
const { redisConnection } = require('../config/queue');
const { generateJson } = require('../services/geminiService');
const db = require('../config/db');
// 🛡️ NEW: Importing your centralized model!
const { model } = require('../config/geminiConfig'); 

console.log("AI Worker is standing by...");

const aiWorker = new Worker('ai-tasks', async (job) => {
    console.log(`[Queue] Processing Job ${job.id}: ${job.name}`);

    // --- 1. PRACTICE GENERATION JOB ---
    if (job.name === 'generate-practice') {
        const { prompt } = job.data;
        return await generateJson({ prompt, retries: 2 });
    }

    // --- 2. CAREER INSIGHTS JOB ---
    if (job.name === 'generate-career') {
        const { courseTitle, academicStructure, targetRole, isAcademicMode, userId, syllabusId, isGlobal, cacheKey } = job.data;

        let prompt = isAcademicMode 
            ? `System: You are an expert university professor and exam predictor.
               Task: Analyze the following syllabus for "${courseTitle}". Predict the top 3 to 5 highest-weightage exam topics.
               Syllabus: ${typeof academicStructure === 'string' ? academicStructure : JSON.stringify(academicStructure)}
               Output Format: Strictly JSON. Schema: {"missingSkills": [{"topic_name": "string", "category": "Exam Prediction", "importance_level": "Critical" | "High" | "Medium"}]}`
            : `System: You are an elite tech industry career advisor.
               Task: Analyze this specific academic syllabus ("${courseTitle}"). The user wants to be a "${targetRole}". 
               Identify 3 to 5 critical industry skills strictly related to this subject that the university is NOT teaching them.
               Syllabus: ${typeof academicStructure === 'string' ? academicStructure : JSON.stringify(academicStructure)}
               Output Format: Strictly JSON. Schema: {"missingSkills": [{"topic_name": "string", "category": "Industry Gap", "importance_level": "Critical" | "High"}]}`;

        // Uses your centralized model!
        const result = await model.generateContent(prompt);
        let text = await result.response.text();

        text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
        const startIndex = text.indexOf('{');
        const endIndex = text.lastIndexOf('}');
        if (startIndex !== -1 && endIndex !== -1) text = text.substring(startIndex, endIndex + 1);
        const careerJson = JSON.parse(text);
        const skills = careerJson.missingSkills || careerJson.missing_skills || careerJson.skills || [];

        try { await db.execute('INSERT INTO ai_cache (cache_key, response_data) VALUES (?, ?)', [cacheKey, JSON.stringify(careerJson)]); } catch (e) {}

        if (isGlobal !== false) {
            await db.execute('DELETE FROM career_goals WHERE user_id = ? AND syllabus_id IS NULL', [userId]);
            await db.execute('INSERT INTO career_goals (user_id, syllabus_id, target_role) VALUES (?, NULL, ?)', [userId, targetRole]);
        } else {
            await db.execute('DELETE FROM career_goals WHERE user_id = ? AND syllabus_id = ?', [userId, syllabusId]);
            await db.execute('INSERT INTO career_goals (user_id, syllabus_id, target_role) VALUES (?, ?, ?)', [userId, syllabusId, targetRole]);
        }

        await db.execute('DELETE FROM roadmap_recommendations WHERE user_id = ? AND syllabus_id = ?', [userId, syllabusId]);
        for (const skill of skills) {
            await db.execute(
                'INSERT INTO roadmap_recommendations (user_id, syllabus_id, topic_name, category, importance_level) VALUES (?, ?, ?, ?, ?)',
                [userId, syllabusId, skill.topic_name || "Skill", skill.category || "General", skill.importance_level || "Medium"]
            );
        }

        const [newRecs] = await db.execute('SELECT * FROM roadmap_recommendations WHERE user_id = ? AND syllabus_id = ?', [userId, syllabusId]);
        return newRecs; 
    }

    // --- 3. SYLLABUS UPLOAD JOB ---
    if (job.name === 'generate-roadmap') {
        const { base64Data, mimeType, cacheKey, userId } = job.data;
        
        const filePart = { inlineData: { data: base64Data, mimeType: mimeType } };
        const prompt = `
        System: You are the InsightED academic curriculum parser. 
        Task: Analyze this syllabus file and extract the course structure.
        
        CRITICAL RULE FOR courseTitle: Extract the core subject name ONLY. Strip out all filler words like "Syllabus of", "Course at", "Undergraduate", "Post Graduate", "Level", "Department of", "Semester", etc. 
        Keep it to 1-4 words max. (Example: If the text says "Syllabus of Cyber Security Course at Undergraduate level", you must output exactly "Cyber Security").

        Output Format: Strictly JSON. No markdown. No intro text.
        Schema: { "courseTitle": "string", "units": [ { "unitNumber": number, "title": "string", "topics": ["string", "string"], "is_completed": false } ] }
        `;

        // Uses your centralized model!
        const result = await model.generateContent([prompt, filePart]);
        let text = await result.response.text();
        
        text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
        const startIndex = text.indexOf('{');
        const endIndex = text.lastIndexOf('}');
        if (startIndex !== -1 && endIndex !== -1) text = text.substring(startIndex, endIndex + 1);

        const syllabusJson = JSON.parse(text);

        try { await db.execute('INSERT INTO ai_cache (cache_key, response_data) VALUES (?, ?)', [cacheKey, JSON.stringify(syllabusJson)]); } catch (e) {}

        const courseTitle = syllabusJson.courseTitle || "Untitled Course";

        const [existing] = await db.execute('SELECT id FROM syllabuses WHERE user_id = ? AND course_title = ?', [userId, courseTitle]);
        if (existing.length > 0) {
            return { type: 'conflict', parsedData: syllabusJson, existingId: existing[0].id };
        }

        const [resultDb] = await db.execute('INSERT INTO syllabuses (user_id, course_title, structure) VALUES (?, ?, ?)', [userId, courseTitle, JSON.stringify(syllabusJson)]);
        try { await db.execute('INSERT INTO library_items (user_id, title, type, category) VALUES (?, ?, ?, ?)', [userId, courseTitle, 'folder', 'uploaded']); } catch (e) {}

        return { type: 'success', syllabusId: resultDb.insertId, data: syllabusJson };
    }

}, { connection: redisConnection, concurrency: 2 });

aiWorker.on('completed', (job) => console.log(`[Queue] Job ${job.id} completed successfully now!`));
aiWorker.on('failed', (job, err) => console.log(`[Queue] Job ${job.id} failed:`, err.message));

module.exports = aiWorker;