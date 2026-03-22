const { GoogleGenerativeAI } = require("@google/generative-ai");
const db = require('../config/db');
require('dotenv').config();

// 1. Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

// --- UPLOAD & ANALYZE SYLLABUS ---
exports.uploadSyllabus = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        console.log(`📤 InsightED: Processing file for User ID ${req.user.id}...`);

        const filePart = {
            inlineData: {
                data: req.file.buffer.toString("base64"),
                mimeType: req.file.mimetype,
            },
        };

        const prompt = `
        System: You are the InsightED academic curriculum parser. 
        Task: Analyze this syllabus file and extract the course structure.
        Output Format: Strictly JSON. No markdown. No intro text.
        Schema:
        {
            "courseTitle": "string",
            "units": [
                {
                    "unitNumber": number,
                    "title": "string",
                    "topics": ["string", "string"]
                }
            ]
        }
        `;

        const result = await model.generateContent([prompt, filePart]);
        const response = await result.response;
        let text = response.text();

        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const syllabusJson = JSON.parse(text);

        const userId = req.user.id; 
        const courseTitle = syllabusJson.courseTitle || "Untitled Course";

        // 1. Store as JSON string in DB
        const [resultDb] = await db.execute(
            'INSERT INTO syllabuses (user_id, course_title, structure) VALUES (?, ?, ?)',
            [userId, courseTitle, JSON.stringify(syllabusJson)]
        );

        // 2. [NEW] Auto-Create Library Folder for this Subject
        await db.execute(
            'INSERT INTO library_items (user_id, title, type, category) VALUES (?, ?, ?, ?)',
            [userId, courseTitle, 'folder', 'uploaded']
        );

        console.log("✅ Syllabus Saved & Folder Created! Database ID:", resultDb.insertId);

        res.status(201).json({ 
            message: "Syllabus processed and Library folder created successfully", 
            syllabusId: resultDb.insertId,
            data: syllabusJson 
        });

    } catch (error) {
        console.error("❌ Error processing syllabus:", error);
        res.status(500).json({ message: "AI Processing Failed", error: error.message });
    }
};

// --- LIST ALL SUBJECTS FOR USER ---
exports.listAllSyllabuses = async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await db.execute(
            'SELECT id, course_title, created_at FROM syllabuses WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );

        res.status(200).json(rows);
    } catch (error) {
        console.error("❌ Error listing syllabuses:", error);
        res.status(500).json({ message: "Failed to fetch subject list" });
    }
};

// --- GET SPECIFIC SYLLABUS BY ID ---
exports.getSyllabusById = async (req, res) => {
    try {
        const userId = req.user.id;
        const syllabusId = req.params.id;

        const [rows] = await db.execute(
            'SELECT * FROM syllabuses WHERE id = ? AND user_id = ?',
            [syllabusId, userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Subject not found." });
        }

        let roadmapData = rows[0].structure;
        if (typeof roadmapData === 'string') {
            roadmapData = JSON.parse(roadmapData);
        }

        res.status(200).json(roadmapData);
    } catch (error) {
        console.error("❌ Error fetching specific roadmap:", error);
        res.status(500).json({ message: "Failed to load the selected subject" });
    }
};

// --- GET LATEST SYLLABUS (Auto-resume last active) ---
exports.getLatestSyllabus = async (req, res) => {
    try {
        const userId = req.user.id; 

        const [rows] = await db.execute(
            'SELECT * FROM syllabuses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "No roadmap found. Please upload a syllabus first." });
        }

        let roadmapData = rows[0].structure;

        if (typeof roadmapData === 'string') {
            try {
                roadmapData = JSON.parse(roadmapData);
            } catch (e) {
                console.error("Error parsing JSON from DB:", e);
                return res.status(500).json({ message: "Data corruption in database" });
            }
        }

        res.status(200).json(roadmapData);
        
    } catch (error) {
        console.error("❌ Error fetching roadmap:", error);
        res.status(500).json({ message: "Failed to load roadmap" });
    }
};

// --- GET SAVED CAREER INSIGHTS ---
exports.getCareerInsights = async (req, res) => {
    try {
        const userId = req.user.id;

        const [goals] = await db.execute('SELECT target_role FROM career_goals WHERE user_id = ?', [userId]);
        const [recs] = await db.execute('SELECT * FROM roadmap_recommendations WHERE user_id = ?', [userId]);

        res.status(200).json({
            targetRole: goals.length > 0 ? goals[0].target_role : null,
            recommendations: recs
        });
    } catch (error) {
        console.error("❌ Error fetching career insights:", error);
        res.status(500).json({ message: "Failed to load career track" });
    }
};

// --- GENERATE HOLISTIC CAREER GAP ANALYSIS (AGGREGATED) ---
exports.generateCareerInsights = async (req, res) => {
    try {
        const userId = req.user.id;
        const { targetRole } = req.body; 

        if (!targetRole) {
            return res.status(400).json({ message: "Please provide a target career role." });
        }

        const [rows] = await db.execute(
            'SELECT course_title, structure FROM syllabuses WHERE user_id = ?',
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "No syllabuses found. Please upload at least one syllabus first." });
        }

        const combinedCurriculum = rows.map(row => {
            let parsedStructure = row.structure;
            if (typeof parsedStructure === 'string') {
                try { parsedStructure = JSON.parse(parsedStructure); } catch(e) { }
            }
            return {
                subjectTitle: row.course_title,
                content: parsedStructure
            };
        });

        const prompt = `
        System: You are an elite tech industry career advisor.
        Task: Analyze the following COMBINED academic curriculum (which represents everything this student has learned across multiple university subjects). 
        Compare their total aggregated knowledge against the real-world industry requirements for a "${targetRole}". 
        Identify 3 to 5 critical industry skills that are completely MISSING from their entire curriculum but are strictly required for this role.
        
        Student's Combined Curriculum:
        ${JSON.stringify(combinedCurriculum)}

        Output Format: Strictly JSON. No markdown. No intro text.
        Schema:
        {
            "missingSkills": [
                {
                    "topic_name": "string (e.g., 'Docker & Containerization')",
                    "category": "string (e.g., 'DevOps' or 'Backend')",
                    "importance_level": "Critical" | "High" | "Medium"
                }
            ]
        }
        `;

        console.log(`🧠 InsightED: Aggregating ${rows.length} subjects to find gaps for ${targetRole}...`);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const careerJson = JSON.parse(text);

        await db.execute(
            `INSERT INTO career_goals (user_id, target_role) 
             VALUES (?, ?) 
             ON DUPLICATE KEY UPDATE target_role = ?`,
            [userId, targetRole, targetRole]
        );

        await db.execute('DELETE FROM roadmap_recommendations WHERE user_id = ?', [userId]);

        for (const skill of careerJson.missingSkills) {
            await db.execute(
                `INSERT INTO roadmap_recommendations (user_id, topic_name, category, importance_level) 
                 VALUES (?, ?, ?, ?)`,
                [userId, skill.topic_name, skill.category, skill.importance_level]
            );
        }

        const [newRecs] = await db.execute('SELECT * FROM roadmap_recommendations WHERE user_id = ?', [userId]);

        res.status(200).json({ 
            message: "Holistic career insights generated successfully",
            recommendations: newRecs 
        });

    } catch (error) {
        console.error("❌ Error generating holistic career insights:", error);
        res.status(500).json({ message: "AI Analysis Failed", error: error.message });
    }
};

// --- TOGGLE RECOMMENDATION COMPLETION ---
exports.toggleRecommendation = async (req, res) => {
    try {
        const userId = req.user.id;
        const recId = req.params.recId;
        const { isCompleted } = req.body; 

        await db.execute(
            'UPDATE roadmap_recommendations SET is_completed = ? WHERE id = ? AND user_id = ?',
            [isCompleted ? 1 : 0, recId, userId]
        );

        res.status(200).json({ message: "Status updated successfully" });
    } catch (error) {
        console.error("❌ Error toggling recommendation:", error);
        res.status(500).json({ message: "Failed to update status" });
    }
};