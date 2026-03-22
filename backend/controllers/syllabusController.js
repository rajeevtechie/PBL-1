const { GoogleGenerativeAI } = require("@google/generative-ai");
const db = require('../config/db');
require('dotenv').config();

// 1. Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

// --- UPLOAD & ANALYZE SYLLABUS ---
exports.uploadSyllabus = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });

        console.log(`📤 InsightED: Processing file for User ID ${req.user.id}...`);
        const filePart = { inlineData: { data: req.file.buffer.toString("base64"), mimeType: req.file.mimetype } };

        const prompt = `
        System: You are the InsightED academic curriculum parser. 
        Task: Analyze this syllabus file and extract the course structure.
        Output Format: Strictly JSON. Schema: {"courseTitle": "string", "units": [{"unitNumber": number, "title": "string", "topics": ["string"]}]}
        `;

        const result = await model.generateContent([prompt, filePart]);
        let text = (await result.response).text().replace(/```json/g, "").replace(/```/g, "").trim();
        const syllabusJson = JSON.parse(text);

        const [resultDb] = await db.execute(
            'INSERT INTO syllabuses (user_id, course_title, structure) VALUES (?, ?, ?)',
            [req.user.id, syllabusJson.courseTitle || "Untitled Course", JSON.stringify(syllabusJson)]
        );

        res.status(201).json({ message: "Syllabus processed", syllabusId: resultDb.insertId, data: syllabusJson });
    } catch (error) {
        console.error("❌ Error processing syllabus:", error);
        res.status(500).json({ message: "AI Processing Failed", error: error.message });
    }
};

// --- LIST ALL SUBJECTS ---
exports.listAllSyllabuses = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT id, course_title, created_at FROM syllabuses WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch subject list" });
    }
};

// --- GET SPECIFIC SYLLABUS ---
exports.getSyllabusById = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM syllabuses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (rows.length === 0) return res.status(404).json({ message: "Subject not found." });
        
        let roadmapData = typeof rows[0].structure === 'string' ? JSON.parse(rows[0].structure) : rows[0].structure;
        res.status(200).json(roadmapData);
    } catch (error) {
        res.status(500).json({ message: "Failed to load subject" });
    }
};

// --- GET LATEST SYLLABUS ---
exports.getLatestSyllabus = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM syllabuses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ message: "No roadmap found." });

        let roadmapData = typeof rows[0].structure === 'string' ? JSON.parse(rows[0].structure) : rows[0].structure;
        res.status(200).json(roadmapData);
    } catch (error) {
        res.status(500).json({ message: "Failed to load roadmap" });
    }
};

// --- GET CONTEXTUAL CAREER INSIGHTS ---
exports.getCareerInsights = async (req, res) => {
    try {
        const userId = req.user.id;
        let syllabusId = req.query.syllabusId;

        if (!syllabusId || syllabusId === 'latest' || syllabusId === 'undefined') {
            const [syl] = await db.execute('SELECT id FROM syllabuses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [userId]);
            if (syl.length === 0) return res.status(200).json({ targetRole: null, recommendations: [] });
            syllabusId = syl[0].id;
        }

        const [localGoal] = await db.execute('SELECT target_role FROM career_goals WHERE user_id = ? AND syllabus_id = ?', [userId, syllabusId]);
        const [globalGoal] = await db.execute('SELECT target_role FROM career_goals WHERE user_id = ? AND syllabus_id IS NULL', [userId]);
        
        const activeRole = localGoal.length > 0 ? localGoal[0].target_role : (globalGoal.length > 0 ? globalGoal[0].target_role : null);

        const [recs] = await db.execute('SELECT * FROM roadmap_recommendations WHERE user_id = ? AND syllabus_id = ?', [userId, syllabusId]);

        res.status(200).json({ targetRole: activeRole, recommendations: recs });
    } catch (error) {
        console.error("❌ Error fetching insights:", error);
        res.status(500).json({ message: "Failed to load career track" });
    }
};

// --- GENERATE SMART/CONTEXTUAL CAREER INSIGHTS ---
exports.generateCareerInsights = async (req, res) => {
    try {
        const userId = req.user.id;
        let syllabusId = req.params.id;
        const { targetRole, isGlobal } = req.body; 

        if (!targetRole) return res.status(400).json({ message: "Please provide a target career role." });

        if (syllabusId === 'latest' || syllabusId === 'undefined') {
            const [rows] = await db.execute('SELECT id FROM syllabuses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [userId]);
            if (rows.length === 0) return res.status(404).json({ message: "No syllabus found." });
            syllabusId = rows[0].id;
        }

        const [rows] = await db.execute('SELECT course_title, structure FROM syllabuses WHERE id = ? AND user_id = ?', [syllabusId, userId]);
        if (rows.length === 0) return res.status(404).json({ message: "Syllabus not found." });
        
        const courseTitle = rows[0].course_title;
        const academicStructure = rows[0].structure;

        const isAcademicMode = /academic|exam|university|pass|score/i.test(targetRole);
        let prompt = "";

        if (isAcademicMode) {
            console.log(`🧠 InsightED: Academic Mode triggered for ${courseTitle}...`);
            prompt = `
            System: You are an expert university professor and exam predictor.
            Task: Analyze the following syllabus for "${courseTitle}". Predict the top 3 to 5 highest-weightage exam topics.
            Syllabus: ${typeof academicStructure === 'string' ? academicStructure : JSON.stringify(academicStructure)}
            Output Format: Strictly JSON. Schema: {"missingSkills": [{"topic_name": "string", "category": "Exam Prediction", "importance_level": "Critical" | "High" | "Medium"}]}
            `;
        } else {
            console.log(`🧠 InsightED: Industry Mode triggered for ${courseTitle} -> ${targetRole}...`);
            prompt = `
            System: You are an elite tech industry career advisor.
            Task: Analyze this specific academic syllabus ("${courseTitle}"). The user wants to be a "${targetRole}". 
            Identify 3 to 5 critical industry skills strictly related to this subject that the university is NOT teaching them.
            Syllabus: ${typeof academicStructure === 'string' ? academicStructure : JSON.stringify(academicStructure)}
            Output Format: Strictly JSON. Schema: {"missingSkills": [{"topic_name": "string", "category": "Industry Gap", "importance_level": "Critical" | "High"}]}
            `;
        }

        const result = await model.generateContent(prompt);
        let text = (await result.response).text().replace(/```json/g, "").replace(/```/g, "").trim();
        const careerJson = JSON.parse(text);

        if (isGlobal !== false) {
            await db.execute('DELETE FROM career_goals WHERE user_id = ? AND syllabus_id IS NULL', [userId]);
            await db.execute('INSERT INTO career_goals (user_id, syllabus_id, target_role) VALUES (?, NULL, ?)', [userId, targetRole]);
        } else {
            await db.execute('DELETE FROM career_goals WHERE user_id = ? AND syllabus_id = ?', [userId, syllabusId]);
            await db.execute('INSERT INTO career_goals (user_id, syllabus_id, target_role) VALUES (?, ?, ?)', [userId, syllabusId, targetRole]);
        }

        await db.execute('DELETE FROM roadmap_recommendations WHERE user_id = ? AND syllabus_id = ?', [userId, syllabusId]);
        for (const skill of careerJson.missingSkills) {
            await db.execute(
                'INSERT INTO roadmap_recommendations (user_id, syllabus_id, topic_name, category, importance_level) VALUES (?, ?, ?, ?, ?)',
                [userId, syllabusId, skill.topic_name, skill.category, skill.importance_level]
            );
        }

        const [newRecs] = await db.execute('SELECT * FROM roadmap_recommendations WHERE user_id = ? AND syllabus_id = ?', [userId, syllabusId]);
        res.status(200).json({ message: "Contextual insights generated!", recommendations: newRecs });

    } catch (error) {
        console.error("❌ Error generating insights:", error);
        res.status(500).json({ message: "AI Analysis Failed", error: error.message });
    }
};

// --- TOGGLE RECOMMENDATION COMPLETION ---
exports.toggleRecommendation = async (req, res) => {
    try {
        await db.execute('UPDATE roadmap_recommendations SET is_completed = ? WHERE id = ? AND user_id = ?', [req.body.isCompleted ? 1 : 0, req.params.recId, req.user.id]);
        res.status(200).json({ message: "Status updated" });
    } catch (error) {
        res.status(500).json({ message: "Failed to update status" });
    }
};

// --- UPDATE ACADEMIC SYLLABUS PROGRESS ---
exports.updateSyllabusStructure = async (req, res) => {
    try {
        const userId = req.user.id;
        let syllabusId = req.params.id;
        const { structure } = req.body;

        if (syllabusId === 'latest' || syllabusId === 'undefined') {
            const [rows] = await db.execute('SELECT id FROM syllabuses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [userId]);
            if (rows.length === 0) return res.status(404).json({ message: "No syllabus found." });
            syllabusId = rows[0].id;
        }

        await db.execute('UPDATE syllabuses SET structure = ? WHERE id = ? AND user_id = ?', [JSON.stringify(structure), syllabusId, userId]);
        res.status(200).json({ message: "Academic progress saved successfully" });
    } catch (error) {
        console.error("❌ Error updating syllabus progress:", error);
        res.status(500).json({ message: "Failed to save progress" });
    }
};