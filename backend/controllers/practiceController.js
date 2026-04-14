const db = require("../config/db"); 
const { generateJson } = require("../services/geminiService");
const { buildGeneratePrompt } = require("../utils/promptBuilder");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { aiQueue } = require("../config/queue"); // 🛡️ NEW: Import the AI Queue

// Setup Gemini for Track B PDF extraction
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const allowedModes = new Set(["quiz", "short", "long", "case", "mock", "ai", "notes"]);
const allowedDifficulties = new Set(["easy", "medium", "hard", "exam"]);

const normalizeArray = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.questions)) return data.questions;
  return [data];
};

const toSafeString = (value) => (typeof value === "string" ? value.trim() : "");

const normalizeByMode = (mode, data) => {
  const items = normalizeArray(data).filter(Boolean);

  switch (mode) {
    case "quiz": return items.filter(item => toSafeString(item.question) && Array.isArray(item.options) && item.options.length > 0);
    case "short":
    case "long": return items.filter(item => toSafeString(item.question) && toSafeString(item.answer));
    case "case": return items.filter(item => toSafeString(item.scenario) && Array.isArray(item.questions));
    case "mock": return items.filter(item => toSafeString(item.section) && Array.isArray(item.items));
    case "ai": return items.filter(item => toSafeString(item.answer));
    case "notes": return items.filter(item => toSafeString(item.content)); 
    default: return [];
  }
};

const parseTopics = (rawText) => {
  let cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
  if (!cleaned.startsWith("{")) {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  try {
    const parsed = JSON.parse(cleaned);
    const topics = Array.isArray(parsed.topics) ? parsed.topics : (Array.isArray(parsed.items) ? parsed.items.map(i => i.topic) : []);
    return topics.map((topic) => String(topic).trim()).filter((topic) => topic.length > 0);
  } catch (error) {
    return [];
  }
};

// --- 1. ENQUEUE AI PRACTICE (Track A/B Generation) ---
exports.generatePractice = async (req, res, next) => {
  try {
    const { mode, topic, difficulty, numQuestions, content, userQuery, subjectName } = req.body || {};

    if (!mode || !allowedModes.has(mode)) return res.status(400).json({ success: false, message: "Invalid mode." });
    if (mode !== "ai" && (!topic || !topic.trim())) return res.status(400).json({ success: false, message: "Topic is required." });
    if (mode === "ai" && (!userQuery || !userQuery.trim())) return res.status(400).json({ success: false, message: "userQuery is required." });
    
    const targetCount = Number(numQuestions) || 5;

    let prompt = buildGeneratePrompt({
      mode, topic: topic?.trim(), difficulty, numQuestions: targetCount, content, userQuery, subjectName, 
    });

    if (!prompt) return res.status(400).json({ success: false, message: "Unable to build prompt." });

    if (mode !== "notes") {
        prompt += `\n\nCRITICAL INSTRUCTION: You MUST generate EXACTLY ${targetCount} items/questions.`;
    }

    // 🛡️ THE FIX: Add the heavy lifting to the Queue instead of awaiting Gemini here
    const job = await aiQueue.add('generate-practice', { 
        prompt, mode, targetCount 
    });

    // Return a 202 Accepted and hand the frontend a ticket number
    res.status(202).json({ success: true, message: "Added to queue", jobId: job.id });
  } catch (error) {
    next(error);
  }
};

// --- 1.5. CHECK JOB STATUS (Frontend Polling Route) ---
exports.checkJobStatus = async (req, res, next) => {
    try {
        const { jobId } = req.params;
        const job = await aiQueue.getJob(jobId);
        
        if (!job) return res.status(404).json({ success: false, message: "Job not found" });

        const state = await job.getState();

        if (state === 'completed') {
            const rawData = job.returnvalue; 
            const mode = job.data.mode;
            const targetCount = job.data.targetCount;

            let normalized = normalizeByMode(mode, rawData);
            if (mode !== "notes" && normalized.length > targetCount) {
                normalized = normalized.slice(0, targetCount);
            }

            return res.status(200).json({ success: true, status: 'completed', data: normalized });
        } else if (state === 'failed') {
            return res.status(500).json({ success: false, status: 'failed', message: "AI Generation Failed." });
        } else {
            return res.status(202).json({ success: true, status: state }); 
        }
    } catch (error) {
        next(error);
    }
};

// --- 2. EXTRACT SYLLABUS TOPICS (Track A: Database Sync) ---
exports.extractSyllabusTopics = async (req, res, next) => {
    try {
        const { subjectId } = req.body;
        const userId = req.user?.id || req.userId;

        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
        if (!subjectId) return res.status(400).json({ success: false, message: "Subject ID is required." });

        const [rows] = await db.execute(
            'SELECT structure FROM syllabuses WHERE id = ? AND user_id = ?',
            [subjectId, userId]
        );

        if (!rows || rows.length === 0 || !rows[0].structure) {
            return res.status(404).json({ success: false, message: "No syllabus structure found for this subject." });
        }

        const roadmapData = typeof rows[0].structure === 'string' ? JSON.parse(rows[0].structure) : rows[0].structure;
        let extractedTopics = [];

        if (roadmapData && Array.isArray(roadmapData.units)) {
            roadmapData.units.forEach(unit => {
                if (unit.topics && Array.isArray(unit.topics)) {
                    unit.topics.forEach(t => {
                       extractedTopics.push(typeof t === 'string' ? t : t.title || t.name || JSON.stringify(t));
                    });
                } else if (unit.title) {
                    extractedTopics.push(unit.title); 
                }
            });
        } else if (Array.isArray(roadmapData)) {
            extractedTopics = roadmapData; 
        }

        extractedTopics = extractedTopics.filter(t => typeof t === 'string' && t.trim() !== '');

        if (extractedTopics.length === 0) return res.status(422).json({ success: false, message: "Could not parse topics." });

        res.status(200).json({ success: true, topics: extractedTopics });

    } catch (error) {
        console.error("Extract Syllabus Topics Error:", error);
        res.status(500).json({ success: false, message: "Failed to extract topics from database." });
    }
};

// --- 3. EXTRACT CUSTOM TOPICS (Track B: PDF/Text Upload) ---
exports.extractTopics = async (req, res) => {
  try {
    const inputText = req.body?.text || "";

    if (!req.file && !inputText.trim()) {
      return res.status(400).json({ message: "Provide a PDF or text to extract topics." });
    }

    const prompt = `
System: You are an academic syllabus parser.
Task: Extract the main topics from the provided content.
Rules:
- Return only JSON with this schema: { "topics": ["string"] }
- Keep topics short, distinct, and ordered from most important to least.
- Do not include any markdown.
`;

    let responseText = "";

    if (req.file) {
      const filePart = { inlineData: { data: req.file.buffer.toString("base64"), mimeType: req.file.mimetype } };
      const result = await model.generateContent([prompt, filePart]);
      responseText = result.response.text();
    } else {
      const result = await model.generateContent(`${prompt}\nContent:\n${inputText}`);
      responseText = result.response.text();
    }

    const topics = parseTopics(responseText);

    if (topics.length === 0) return res.status(422).json({ message: "No topics could be extracted." });

    res.status(200).json({ topics });
  } catch (error) {
    console.error("Practice Lab topic extraction error:", error);
    res.status(500).json({ message: "Failed to extract topics.", error: error.message });
  }
};

// --- 4. LOG STUDY SESSION ---
exports.logStudySession = async (req, res, next) => {
  try {
    const { subjectName, startTime, endTime, durationMinutes, focusScore } = req.body;
    const userId = req.user?.id || req.userId;

    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

    const query = `INSERT INTO study_sessions (user_id, subject_name, start_time, end_time, duration_minutes, focus_score) VALUES (?, ?, ?, ?, ?, ?)`;
    const [result] = await db.execute(query, [userId, subjectName || 'General Study', new Date(startTime), new Date(endTime), durationMinutes, focusScore || 50]);

    res.status(201).json({ success: true, sessionId: result.insertId });
  } catch (error) {
    next(error); 
  }
};

// --- 5. GET STUDY STATS ---
exports.getStudyStats = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.userId; 
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

    const [recentSessions] = await db.execute(`SELECT id, subject_name, duration_minutes, focus_score, start_time FROM study_sessions WHERE user_id = ? ORDER BY start_time DESC LIMIT 5`, [userId]);
    const [aggregates] = await db.execute(`SELECT SUM(duration_minutes) as total_minutes, AVG(focus_score) as avg_focus FROM study_sessions WHERE user_id = ?`, [userId]);

    const stats = aggregates[0];
    res.status(200).json({ success: true, data: { totalMinutes: stats.total_minutes || 0, avgFocus: stats.avg_focus ? Math.round(stats.avg_focus) : 0, recentSessions }});
  } catch (error) {
    next(error); 
  }
};