// backend/controllers/practiceController.js
const db = require("../config/db"); // Your promisePool from db.js
const { generateJson } = require("../services/geminiService");
const { buildGeneratePrompt } = require("../utils/promptBuilder");

const allowedModes = new Set(["quiz", "short", "long", "case", "mock", "ai"]);
const allowedDifficulties = new Set(["easy", "medium", "hard", "exam"]);

// Helper to ensure AI output is always safely mapped
const normalizeArray = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.questions)) return data.questions;
  return [data];
};

// --- 1. GENERATE AI PRACTICE (Used in practise_quiz.jsx) ---
exports.generatePractice = async (req, res, next) => {
  try {
    const { mode, topic, difficulty, numQuestions, content, userQuery } = req.body || {};

    if (!mode || !allowedModes.has(mode)) {
      return res.status(400).json({ success: false, message: "Invalid mode." });
    }
    if (mode !== "ai" && (!topic || !topic.trim())) {
      return res.status(400).json({ success: false, message: "Topic is required." });
    }
    if (mode === "ai" && (!userQuery || !userQuery.trim())) {
      return res.status(400).json({ success: false, message: "userQuery is required for AI Ask." });
    }
    if (mode !== "ai" && (!difficulty || !allowedDifficulties.has(difficulty))) {
      return res.status(400).json({ success: false, message: "Invalid difficulty." });
    }
    if (mode !== "ai" && (!numQuestions || Number(numQuestions) < 1)) {
      return res.status(400).json({ success: false, message: "numQuestions must be greater than 0." });
    }

    const prompt = buildGeneratePrompt({
      mode,
      topic: topic?.trim(),
      difficulty,
      numQuestions: Number(numQuestions),
      content,
      userQuery,
    });

    if (!prompt) {
      return res.status(400).json({ success: false, message: "Unable to build prompt." });
    }

    const data = await generateJson({ prompt, retries: 1 });
    const normalized = normalizeArray(data);

    res.status(200).json({ success: true, data: normalized });
  } catch (error) {
    next(error);
  }
};

// --- 2. LOG STUDY SESSION (Used in StudySession.jsx) ---
exports.logStudySession = async (req, res, next) => {
  try {
    const { subjectName, startTime, endTime, durationMinutes, focusScore } = req.body;
    const userId = req.user?.id || req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "User authentication failed." });
    }

    if (!startTime || !endTime || durationMinutes === undefined) {
      return res.status(400).json({ success: false, message: "Missing session timestamps or duration." });
    }

    const query = `
      INSERT INTO study_sessions 
      (user_id, subject_name, start_time, end_time, duration_minutes, focus_score) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(query, [
      userId,
      subjectName || 'General Study',
      new Date(startTime),
      new Date(endTime),
      durationMinutes,
      focusScore || 50
    ]);

    res.status(201).json({ 
      success: true, 
      message: "Focus session saved!", 
      sessionId: result.insertId 
    });
  } catch (error) {
    next(error); 
  }
};

// --- 3. GET STUDY STATS (Used in Dashboard.jsx) ---
exports.getStudyStats = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.userId; 

    if (!userId) {
      return res.status(401).json({ success: false, message: "User authentication failed." });
    }

    // Fetch the 5 most recent study sessions
    const [recentSessions] = await db.execute(`
      SELECT id, subject_name, duration_minutes, focus_score, start_time 
      FROM study_sessions 
      WHERE user_id = ? 
      ORDER BY start_time DESC 
      LIMIT 5
    `, [userId]);

    // Calculate Aggregates (Total Time & Average Focus)
    const [aggregates] = await db.execute(`
      SELECT 
        SUM(duration_minutes) as total_minutes, 
        AVG(focus_score) as avg_focus 
      FROM study_sessions 
      WHERE user_id = ?
    `, [userId]);

    const stats = aggregates[0];

    res.status(200).json({ 
      success: true, 
      data: {
        totalMinutes: stats.total_minutes || 0,
        avgFocus: stats.avg_focus ? Math.round(stats.avg_focus) : 0,
        recentSessions: recentSessions
      }
    });

  } catch (error) {
    next(error); 
  }
};