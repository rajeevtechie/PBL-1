const { GoogleGenerativeAI } = require("@google/generative-ai");
const db = require('../config/db');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// 1. Use the globally stable model string that we know your SDK supports!
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

// --- 1. UPLOAD & ANALYZE SYLLABUS ---
exports.uploadSyllabus = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });

        const filePart = { inlineData: { data: req.file.buffer.toString("base64"), mimeType: req.file.mimetype } };
        const prompt = `
        System: You are the InsightED academic curriculum parser. 
        Task: Analyze this syllabus file and extract the course structure.
        Output Format: Strictly JSON. No markdown. No intro text.
        Schema: { "courseTitle": "string", "units": [ { "unitNumber": number, "title": "string", "topics": ["string", "string"], "is_completed": false } ] }
        `;

        const result = await model.generateContent([prompt, filePart]);
        let text = await result.response.text();
        
        text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
        const startIndex = text.indexOf('{');
        const endIndex = text.lastIndexOf('}');
        if (startIndex !== -1 && endIndex !== -1) text = text.substring(startIndex, endIndex + 1);

        const syllabusJson = JSON.parse(text);
        const userId = req.user.id; 
        const courseTitle = syllabusJson.courseTitle || "Untitled Course";

        const [existing] = await db.execute('SELECT id FROM syllabuses WHERE user_id = ? AND course_title = ?', [userId, courseTitle]);
        if (existing.length > 0) return res.status(409).json({ message: `Syllabus exists.`, parsedData: syllabusJson, existingId: existing[0].id });

        const [resultDb] = await db.execute('INSERT INTO syllabuses (user_id, course_title, structure) VALUES (?, ?, ?)', [userId, courseTitle, JSON.stringify(syllabusJson)]);
        await db.execute('INSERT INTO library_items (user_id, title, type, category) VALUES (?, ?, ?, ?)', [userId, courseTitle, 'folder', 'uploaded']);

        res.status(201).json({ message: "Processed successfully", syllabusId: resultDb.insertId, data: syllabusJson });
    } catch (error) { res.status(500).json({ message: "AI Processing Failed", error: error.message }); }
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

// --- 3. TOGGLE ACADEMIC UNIT COMPLETION ---
exports.toggleUnitCompletion = async (req, res) => {
    try {
        const userId = req.user.id;
        const reqId = req.params.id; 
        const { unitIndex, isCompleted } = req.body;

        let query = 'SELECT id, structure FROM syllabuses WHERE id = ? AND user_id = ?';
        let params = [reqId, userId];

        if (!reqId || reqId === 'latest' || reqId === 'undefined') {
            query = 'SELECT id, structure FROM syllabuses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1';
            params = [userId];
        }

        const [rows] = await db.execute(query, params);
        if (rows.length === 0) return res.status(404).json({ message: "Syllabus not found" });

        const realSyllabusId = rows[0].id; 
        let structure = typeof rows[0].structure === 'string' ? JSON.parse(rows[0].structure) : rows[0].structure;
        
        if (structure.units && structure.units[unitIndex] !== undefined) {
            structure.units[unitIndex].is_completed = isCompleted;
            structure.units[unitIndex].completed = isCompleted; 
        } else {
            return res.status(400).json({ message: "Unit index out of bounds." });
        }

        await db.execute('UPDATE syllabuses SET structure = ? WHERE id = ? AND user_id = ?', [JSON.stringify(structure), realSyllabusId, userId]);
        res.status(200).json({ message: "Progress updated", structure });
    } catch (error) { res.status(500).json({ message: "Server error", error: error.message }); }
};

// --- 4. GET AGGREGATE PROGRESS ---
exports.getAggregateProgress = async (req, res) => {
    try {
        const userId = req.user.id;
        const [syllabuses] = await db.execute('SELECT structure FROM syllabuses WHERE user_id = ?', [userId]);
        let totalAcademic = 0, completedAcademic = 0;

        syllabuses.forEach(row => {
            let structure = typeof row.structure === 'string' ? JSON.parse(row.structure) : row.structure;
            if (structure?.units) {
                totalAcademic += structure.units.length;
                completedAcademic += structure.units.filter(u => u.is_completed === true || u.completed === true || u.is_completed === 1).length;
            }
        });

        const academicProgress = totalAcademic > 0 ? Math.round((completedAcademic / totalAcademic) * 100) : 0;

        const [recs] = await db.execute('SELECT is_completed FROM roadmap_recommendations WHERE user_id = ?', [userId]);
        const careerProgress = recs.length > 0 ? Math.round((recs.filter(r => r.is_completed === 1 || r.is_completed === true).length / recs.length) * 100) : 0;

        res.status(200).json({ academicProgress, careerProgress });
    } catch (error) { res.status(500).json({ academicProgress: 0, careerProgress: 0 }); }
};

// --- 5. LIST ALL SUBJECTS ---
exports.listAllSyllabuses = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT id, course_title, created_at FROM syllabuses WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
        res.status(200).json(rows);
    } catch (error) { res.status(500).json({ message: "Failed" }); }
};

// --- 6. GET SPECIFIC SYLLABUS ---
exports.getSyllabusById = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM syllabuses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (rows.length === 0) return res.status(404).json({ message: "Subject not found." });
        let data = typeof rows[0].structure === 'string' ? JSON.parse(rows[0].structure) : rows[0].structure;
        data.id = rows[0].id;
        res.status(200).json(data);
    } catch (error) { res.status(500).json({ message: "Failed" }); }
};

// --- 7. GET LATEST SYLLABUS ---
exports.getLatestSyllabus = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM syllabuses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ message: "No roadmap found." });
        let data = typeof rows[0].structure === 'string' ? JSON.parse(rows[0].structure) : rows[0].structure;
        data.id = rows[0].id;
        res.status(200).json(data);
    } catch (error) { res.status(500).json({ message: "Failed" }); }
};

// --- 8. CAREER INSIGHTS & GAP ANALYSIS ---
exports.getCareerInsights = async (req, res) => {
    try {
        const [goals] = await db.execute('SELECT target_role FROM career_goals WHERE user_id = ?', [req.user.id]);
        const [recs] = await db.execute('SELECT * FROM roadmap_recommendations WHERE user_id = ?', [req.user.id]);
        res.status(200).json({ targetRole: goals.length > 0 ? goals[0].target_role : null, recommendations: recs });
    } catch (error) { res.status(500).json({ message: "Failed" }); }
};

// ✅ THE FIX: Uses global model and Titanium JSON Extractor 
exports.generateCareerInsights = async (req, res) => {
    try {
        const userId = req.user.id;
        const { targetRole, isGlobal, syllabusId } = req.body; 

        if (!targetRole) return res.status(400).json({ message: "Please provide a target role." });

        let query = 'SELECT course_title, structure FROM syllabuses WHERE user_id = ?';
        let params = [userId];

        if (!isGlobal) {
            if (syllabusId && syllabusId !== 'latest' && syllabusId !== 'undefined') {
                query = 'SELECT course_title, structure FROM syllabuses WHERE id = ? AND user_id = ?';
                params = [syllabusId, userId];
            } else {
                query = 'SELECT course_title, structure FROM syllabuses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1';
                params = [userId];
            }
        }

        const [rows] = await db.execute(query, params);
        if (rows.length === 0) return res.status(404).json({ message: "No syllabuses found to analyze." });

        const combinedCurriculum = rows.map(row => {
            let parsedStructure = typeof row.structure === 'string' ? JSON.parse(row.structure) : row.structure;
            return { subjectTitle: row.course_title, content: parsedStructure };
        });

        const prompt = `
        System: You are an elite tech industry career advisor.
        Task: Analyze the provided academic curriculum context against the real-world industry requirements for a "${targetRole}". 
        Identify exactly 3 to 5 critical industry skills that are MISSING from this specific curriculum.
        Student's Curriculum Context: ${JSON.stringify(combinedCurriculum)}
        Output Format: ONLY JSON. No intro text, no markdown.
        Schema:
        { "missingSkills": [ { "topic_name": "string", "category": "string", "importance_level": "Critical" | "High" | "Medium" } ] }
        `;

        // 2. Uses the globally defined model
        const result = await model.generateContent(prompt);
        let text = await result.response.text();

        // 3. Titanium Regex Extractor
        text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
        const startIndex = text.indexOf('{');
        const endIndex = text.lastIndexOf('}');
        
        if (startIndex === -1 || endIndex === -1) {
            throw new Error("AI did not return valid JSON.");
        }
        
        text = text.substring(startIndex, endIndex + 1);
        const careerJson = JSON.parse(text);

        const skills = careerJson.missingSkills || careerJson.missing_skills || careerJson.skills || [];
        if (!skills || skills.length === 0) return res.status(500).json({ message: "AI returned empty insights. Please try again." });

        await db.execute(`INSERT INTO career_goals (user_id, target_role) VALUES (?, ?) ON DUPLICATE KEY UPDATE target_role = ?`, [userId, targetRole, targetRole]);
        await db.execute('DELETE FROM roadmap_recommendations WHERE user_id = ?', [userId]);

        for (const skill of skills) {
            await db.execute(
                `INSERT INTO roadmap_recommendations (user_id, topic_name, category, importance_level) VALUES (?, ?, ?, ?)`,
                [userId, skill.topic_name || "Skill", skill.category || "General", skill.importance_level || "Medium"]
            );
        }

        const [newRecs] = await db.execute('SELECT * FROM roadmap_recommendations WHERE user_id = ?', [userId]);
        res.status(200).json({ message: "Generated successfully", recommendations: newRecs });
    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ message: `AI Error: ${error.message}` });
    }
};

exports.toggleRecommendation = async (req, res) => {
    try {
        const { isCompleted } = req.body; 
        await db.execute('UPDATE roadmap_recommendations SET is_completed = ? WHERE id = ? AND user_id = ?', [isCompleted ? 1 : 0, req.params.recId, req.user.id]);
        res.status(200).json({ message: "Updated" });
    } catch (error) { res.status(500).json({ message: "Failed" }); }
};