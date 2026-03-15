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

// --- [NEW] LIST ALL SUBJECTS FOR USER ---
// Use this to show a "Library" or "Switch Subject" menu on the dashboard
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

// --- [NEW] GET SPECIFIC SYLLABUS BY ID ---
// Use this when a user clicks a specific subject to "Resume"
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