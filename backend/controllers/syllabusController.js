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

        // Store as JSON string in DB
        const [resultDb] = await db.execute(
            'INSERT INTO syllabuses (user_id, course_title, structure) VALUES (?, ?, ?)',
            [userId, syllabusJson.courseTitle || "Untitled Course", JSON.stringify(syllabusJson)]
        );

        console.log("✅ Syllabus Saved! Database ID:", resultDb.insertId);

        res.status(201).json({ 
            message: "Syllabus processed successfully", 
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

        // Fetch the goal
        const [goals] = await db.execute('SELECT target_role FROM career_goals WHERE user_id = ?', [userId]);
        
        // Fetch the recommendations
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

// --- GENERATE CAREER GAP ANALYSIS ---
exports.generateCareerInsights = async (req, res) => {
    try {
        const userId = req.user.id;
        let syllabusId = req.params.id; // Changed to let so we can modify it
        const { targetRole } = req.body; 

        if (!targetRole) {
            return res.status(400).json({ message: "Please provide a target career role." });
        }

        let academicStructure;

        // 1. Fetch the existing academic syllabus (Handle "latest" logic)
        if (syllabusId === 'latest') {
            const [rows] = await db.execute(
                'SELECT id, structure FROM syllabuses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
                [userId]
            );
            if (rows.length === 0) {
                return res.status(404).json({ message: "No syllabus found to analyze." });
            }
            academicStructure = rows[0].structure;
            syllabusId = rows[0].id; // Update to the real numeric ID
        } else {
            const [rows] = await db.execute(
                'SELECT structure FROM syllabuses WHERE id = ? AND user_id = ?',
                [syllabusId, userId]
            );
            if (rows.length === 0) {
                return res.status(404).json({ message: "Syllabus not found." });
            }
            academicStructure = rows[0].structure;
        }

        // 2. The Prompt: Tailored to match your `roadmap_recommendations` table
        const prompt = `
        System: You are an elite tech industry career advisor.
        Task: Analyze the following academic syllabus and compare it against the real-world requirements for a "${targetRole}". 
        Identify 3 to 5 critical industry skills that are MISSING from the syllabus but are strictly required for this role.
        
        Academic Syllabus:
        ${typeof academicStructure === 'string' ? academicStructure : JSON.stringify(academicStructure)}

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

        // 3. Ask Gemini 2.0
        console.log(`🧠 InsightED: Generating Career Gaps for ${targetRole}...`);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // 4. Clean & Parse JSON
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const careerJson = JSON.parse(text);

        // 5. Save Target Role to `career_goals` table
        await db.execute(
            `INSERT INTO career_goals (user_id, target_role) 
             VALUES (?, ?) 
             ON DUPLICATE KEY UPDATE target_role = ?`,
            [userId, targetRole, targetRole]
        );

        // 6. Save Skills to `roadmap_recommendations` table
        await db.execute('DELETE FROM roadmap_recommendations WHERE user_id = ?', [userId]);

        for (const skill of careerJson.missingSkills) {
            await db.execute(
                `INSERT INTO roadmap_recommendations (user_id, topic_name, category, importance_level) 
                 VALUES (?, ?, ?, ?)`,
                [userId, skill.topic_name, skill.category, skill.importance_level]
            );
        }

        res.status(200).json({ 
            message: "Career insights generated successfully",
            recommendations: careerJson.missingSkills 
        });

    } catch (error) {
        console.error("❌ Error generating career insights:", error);
        res.status(500).json({ message: "AI Analysis Failed", error: error.message });
    }
};