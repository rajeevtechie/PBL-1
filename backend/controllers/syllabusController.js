const { GoogleGenerativeAI } = require("@google/generative-ai");
const db = require('../config/db');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

// --- 1. UPLOAD & ANALYZE SYLLABUS ---
// --- 1. UPLOAD & ANALYZE SYLLABUS ---
exports.uploadSyllabus = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });

        console.log(`📤 Processing file: ${req.file.originalname} for User ID: ${req.user.id}`);

        const filePart = { inlineData: { data: req.file.buffer.toString("base64"), mimeType: req.file.mimetype } };
        const prompt = `
        System: You are the InsightED academic curriculum parser. 
        Task: Analyze this syllabus file and extract the course structure.
        Output Format: Strictly JSON. No markdown. No intro text.
        Schema: { "courseTitle": "string", "units": [ { "unitNumber": number, "title": "string", "topics": ["string", "string"], "is_completed": false } ] }
        `;

        const result = await model.generateContent([prompt, filePart]);
        let text = await result.response.text();
        
        // Robust JSON extraction
        text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
        const startIndex = text.indexOf('{');
        const endIndex = text.lastIndexOf('}');
        if (startIndex !== -1 && endIndex !== -1) text = text.substring(startIndex, endIndex + 1);

        const syllabusJson = JSON.parse(text);
        const userId = req.user.id; 
        const courseTitle = syllabusJson.courseTitle || "Untitled Course";

        const [existing] = await db.execute('SELECT id FROM syllabuses WHERE user_id = ? AND course_title = ?', [userId, courseTitle]);
        if (existing.length > 0) {
            console.log("⚠️ Syllabus already exists. Prompting overwrite.");
            return res.status(409).json({ message: `Syllabus exists.`, parsedData: syllabusJson, existingId: existing[0].id });
        }

        const [resultDb] = await db.execute('INSERT INTO syllabuses (user_id, course_title, structure) VALUES (?, ?, ?)', [userId, courseTitle, JSON.stringify(syllabusJson)]);
        
        // 🚨 PREVENTING THE CRASH: Wrapping library_items insert in a try/catch
        try {
            await db.execute('INSERT INTO library_items (user_id, title, type, category) VALUES (?, ?, ?, ?)', [userId, courseTitle, 'folder', 'uploaded']);
        } catch (libErr) {
            console.warn("⚠️ Warning: Could not insert into library_items (table might not exist yet). Skipping safely.");
        }

        console.log("✅ Upload & Analysis Successful!");
        res.status(201).json({ message: "Processed successfully", syllabusId: resultDb.insertId, data: syllabusJson });
    } catch (error) { 
        // ✅ Bringing back the console logging so we can see any API/DB errors!
        console.error("❌ Upload Error:", error);
        res.status(500).json({ message: "AI Processing Failed", error: error.message }); 
    }
};

// --- 2. CONFIRM OVERWRITE EXISTING SYLLABUS ---
exports.confirmUpload = async (req, res) => {
    try {
        const { parsedData, existingId } = req.body;
        if (!existingId) return res.status(400).json({ message: "Missing ID." });
        await db.execute('UPDATE syllabuses SET structure = ?, created_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?', [JSON.stringify(parsedData), existingId, req.user.id]);
        res.status(200).json({ message: "Updated", syllabusId: existingId, data: parsedData });
    } catch (error) { res.status(500).json({ message: "Save Failed", error: error.message }); }
};

// --- 3. GET AGGREGATE PROGRESS (WITH DASHBOARD DRILL-DOWN) ---
exports.getAggregateProgress = async (req, res) => {
    try {
        const userId = req.user.id;

        const [syllabuses] = await db.execute('SELECT id, course_title, structure FROM syllabuses WHERE user_id = ?', [userId]);

        let totalAcademicUnits = 0;
        let completedAcademicUnits = 0;
        let totalCareerRecs = 0;
        let completedCareerRecs = 0;
        const details = [];

        const [recs] = await db.execute('SELECT syllabus_id, is_completed FROM roadmap_recommendations WHERE user_id = ?', [userId]);

        for (const syl of syllabuses) {
            const structure = typeof syl.structure === 'string' ? JSON.parse(syl.structure) : syl.structure;

            // Subject Academic Math
            let subjTotalUnits = 0;
            let subjCompletedUnits = 0;
            if (structure && structure.units) {
                subjTotalUnits = structure.units.length;
                subjCompletedUnits = structure.units.filter(u => u.is_completed === true || u.completed === true || u.is_completed === 1).length;
            }
            const subjAcademicProg = subjTotalUnits === 0 ? 0 : Math.round((subjCompletedUnits / subjTotalUnits) * 100);

            totalAcademicUnits += subjTotalUnits;
            completedAcademicUnits += subjCompletedUnits;

            // Subject Career Math
            const subjRecs = recs.filter(r => r.syllabus_id === syl.id);
            const subjTotalRecs = subjRecs.length;
            const subjCompletedRecs = subjRecs.filter(r => r.is_completed === true || r.is_completed === 1).length;
            const subjCareerProg = subjTotalRecs === 0 ? 0 : Math.round((subjCompletedRecs / subjTotalRecs) * 100);

            totalCareerRecs += subjTotalRecs;
            completedCareerRecs += subjCompletedRecs;

            // Save details for Dashboard Accordion
            details.push({ id: syl.id, courseTitle: syl.course_title, academicProgress: subjAcademicProg, careerProgress: subjCareerProg });
        }

        const academicAvg = totalAcademicUnits === 0 ? 0 : Math.round((completedAcademicUnits / totalAcademicUnits) * 100);
        const careerAvg = totalCareerRecs === 0 ? 0 : Math.round((completedCareerRecs / totalCareerRecs) * 100);

        res.status(200).json({ academicProgress: academicAvg, careerProgress: careerAvg, details: details });
    } catch (error) { 
        res.status(500).json({ message: "Failed to calculate aggregate progress" }); 
    }
};

// --- 4. LIST ALL SUBJECTS ---
exports.listAllSyllabuses = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT id, course_title, created_at FROM syllabuses WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
        res.status(200).json(rows);
    } catch (error) { res.status(500).json({ message: "Failed" }); }
};

// --- 5. GET SPECIFIC SYLLABUS ---
exports.getSyllabusById = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM syllabuses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (rows.length === 0) return res.status(404).json({ message: "Subject not found." });
        let data = typeof rows[0].structure === 'string' ? JSON.parse(rows[0].structure) : rows[0].structure;
        data.id = rows[0].id;
        res.status(200).json(data);
    } catch (error) { res.status(500).json({ message: "Failed" }); }
};

// --- 6. GET LATEST SYLLABUS ---
exports.getLatestSyllabus = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM syllabuses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ message: "No roadmap found." });
        let data = typeof rows[0].structure === 'string' ? JSON.parse(rows[0].structure) : rows[0].structure;
        data.id = rows[0].id;
        res.status(200).json(data);
    } catch (error) { res.status(500).json({ message: "Failed" }); }
};

// --- 7. GET CAREER INSIGHTS BY CONTEXT ---
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
    } catch (error) { res.status(500).json({ message: "Failed" }); }
};

// --- 8. GENERATE CAREER INSIGHTS (CONTEXTUAL TRAFFIC COP) ---
exports.generateCareerInsights = async (req, res) => {
    try {
        const userId = req.user.id;
        let syllabusId = req.params.id || req.body.syllabusId;
        const { targetRole, isGlobal } = req.body; 

        if (!targetRole) return res.status(400).json({ message: "Please provide a target role." });

        if (!syllabusId || syllabusId === 'latest' || syllabusId === 'undefined') {
            const [rows] = await db.execute('SELECT id FROM syllabuses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [userId]);
            if (rows.length === 0) return res.status(404).json({ message: "No syllabus found." });
            syllabusId = rows[0].id;
        }

        const [rows] = await db.execute('SELECT course_title, structure FROM syllabuses WHERE id = ? AND user_id = ?', [syllabusId, userId]);
        if (rows.length === 0) return res.status(404).json({ message: "Syllabus not found." });
        
        const courseTitle = rows[0].course_title;
        const academicStructure = rows[0].structure;

        // Traffic Cop: Academic vs Industry
        const isAcademicMode = /academic|exam|examination|university|pass|score|college|grade/i.test(targetRole);
        let prompt = "";

        if (isAcademicMode) {
            prompt = `
            System: You are an expert university professor and exam predictor.
            Task: Analyze the following syllabus for "${courseTitle}". Predict the top 3 to 5 highest-weightage exam topics.
            Syllabus: ${typeof academicStructure === 'string' ? academicStructure : JSON.stringify(academicStructure)}
            Output Format: Strictly JSON. Schema: {"missingSkills": [{"topic_name": "string", "category": "Exam Prediction", "importance_level": "Critical" | "High" | "Medium"}]}
            `;
        } else {
            prompt = `
            System: You are an elite tech industry career advisor.
            Task: Analyze this specific academic syllabus ("${courseTitle}"). The user wants to be a "${targetRole}". 
            Identify 3 to 5 critical industry skills strictly related to this subject that the university is NOT teaching them.
            Syllabus: ${typeof academicStructure === 'string' ? academicStructure : JSON.stringify(academicStructure)}
            Output Format: Strictly JSON. Schema: {"missingSkills": [{"topic_name": "string", "category": "Industry Gap", "importance_level": "Critical" | "High"}]}
            `;
        }

        const result = await model.generateContent(prompt);
        let text = await result.response.text();

        // Robust JSON extraction
        text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
        const startIndex = text.indexOf('{');
        const endIndex = text.lastIndexOf('}');
        if (startIndex !== -1 && endIndex !== -1) text = text.substring(startIndex, endIndex + 1);
        
        const careerJson = JSON.parse(text);
        const skills = careerJson.missingSkills || careerJson.missing_skills || careerJson.skills || [];

        // Save Goal appropriately (Global vs Local)
        if (isGlobal !== false) {
            await db.execute('DELETE FROM career_goals WHERE user_id = ? AND syllabus_id IS NULL', [userId]);
            await db.execute('INSERT INTO career_goals (user_id, syllabus_id, target_role) VALUES (?, NULL, ?)', [userId, targetRole]);
        } else {
            await db.execute('DELETE FROM career_goals WHERE user_id = ? AND syllabus_id = ?', [userId, syllabusId]);
            await db.execute('INSERT INTO career_goals (user_id, syllabus_id, target_role) VALUES (?, ?, ?)', [userId, syllabusId, targetRole]);
        }

        // Save specific recommendations to this syllabus ID
        await db.execute('DELETE FROM roadmap_recommendations WHERE user_id = ? AND syllabus_id = ?', [userId, syllabusId]);
        for (const skill of skills) {
            await db.execute(
                'INSERT INTO roadmap_recommendations (user_id, syllabus_id, topic_name, category, importance_level) VALUES (?, ?, ?, ?, ?)',
                [userId, syllabusId, skill.topic_name || "Skill", skill.category || "General", skill.importance_level || "Medium"]
            );
        }

        const [newRecs] = await db.execute('SELECT * FROM roadmap_recommendations WHERE user_id = ? AND syllabus_id = ?', [userId, syllabusId]);
        res.status(200).json({ message: "Generated successfully", recommendations: newRecs });
    } catch (error) { 
        res.status(500).json({ message: "AI Error", error: error.message }); 
    }
};

// --- 9. TOGGLE RECOMMENDATION COMPLETION ---
exports.toggleRecommendation = async (req, res) => {
    try {
        const { isCompleted } = req.body; 
        await db.execute('UPDATE roadmap_recommendations SET is_completed = ? WHERE id = ? AND user_id = ?', [isCompleted ? 1 : 0, req.params.recId, req.user.id]);
        res.status(200).json({ message: "Updated" });
    } catch (error) { res.status(500).json({ message: "Failed" }); }
};

// --- 10. UPDATE ACADEMIC SYLLABUS STRUCTURE (For Roadmap.jsx Checkboxes) ---
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
        res.status(200).json({ message: "Progress saved" });
    } catch (error) { res.status(500).json({ message: "Failed" }); }
};