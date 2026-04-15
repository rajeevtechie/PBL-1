const db = require('../config/db');
const { generateJson } = require("../services/geminiService");
const { buildGeneratePrompt } = require("../utils/promptBuilder");

const formatForMySQL = (dateString) => {
    if (!dateString) return null;
    let formatted = dateString.replace('T', ' ');
    if (formatted.length === 16) formatted += ':00';
    return formatted;
};

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
    case "notes": return items.filter(item => toSafeString(item.content));
    default: return [];
  }
};

exports.getEvents = async (req, res) => {
    try {
        const userId = req.user?.id || req.userId;
        const [events] = await db.execute('SELECT * FROM scheduled_events WHERE user_id = ? ORDER BY start_time ASC', [userId]);
        res.status(200).json({ success: true, data: events });
    } catch (error) {
        console.error("Fetch Events Error:", error);
        res.status(500).json({ success: false, message: "Failed to load calendar." });
    }
};

exports.createEvent = async (req, res) => {
    try {
        const userId = req.user?.id || req.userId;
        const { title, event_type, reference_url, start_time, end_time, overwrite, subject_id, topic_name, assessment_type, difficulty, numQuestions } = req.body;

        const formattedStart = formatForMySQL(start_time);
        const formattedEnd = formatForMySQL(end_time);

        const [conflicts] = await db.execute(
            `SELECT id, title FROM scheduled_events WHERE user_id = ? AND start_time < ? AND end_time > ?`,
            [userId, formattedEnd, formattedStart]
        );

        if (conflicts.length > 0 && !overwrite) {
            return res.status(409).json({ success: false, conflict: true, message: `This slot overlaps with: "${conflicts[0].title}". Do you want to overwrite it?` });
        }

        if (conflicts.length > 0 && overwrite) {
            for (let conflict of conflicts) {
                await db.execute('DELETE FROM scheduled_events WHERE id = ?', [conflict.id]);
            }
        }

        const [result] = await db.execute(
            `INSERT INTO scheduled_events (user_id, title, event_type, reference_url, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, title, event_type, reference_url, formattedStart, formattedEnd]
        );

        const eventId = result.insertId;
        res.status(201).json({ success: true, message: "Event scheduled!", eventId });

        // 🌟 THE SHADOW AI WORKER (Now using your geminiService properly!)
        if (event_type === 'quiz' && topic_name && assessment_type) {
            (async () => {
                try {
                    console.log(`[AI Engine] Starting background generation for Event ${eventId}...`);
                    const [subs] = await db.execute('SELECT course_title FROM syllabuses WHERE id = ?', [subject_id]);
                    const subjectName = subs[0]?.course_title || 'General';

                    const modeMap = { 'quiz': 'quiz', 'short': 'short', 'long': 'long', 'notes': 'notes' };
                    const mode = modeMap[assessment_type] || 'quiz';
                    
                    const targetCount = Number(numQuestions) || 15;
                    const targetDiff = difficulty || 'Medium';

                    const startTimeObj = new Date(start_time);
                    const endTimeObj = new Date(end_time);
                    const durationMinutes = Math.max(1, Math.round((endTimeObj - startTimeObj) / 60000));

                    let prompt = buildGeneratePrompt({ mode, topic: topic_name, difficulty: targetDiff.toLowerCase(), numQuestions: targetCount, subjectName });
                    
                    let fullPrompt = "";
                    if (prompt) {
                        fullPrompt = mode !== 'notes' ? prompt + `\n\nCRITICAL INSTRUCTION: You MUST generate EXACTLY ${targetCount} items/questions. Return ONLY valid JSON.` : prompt;
                    } else {
                        console.log(`[AI Engine] Using safety fallback templates.`);
                        if (mode === 'notes') {
                            fullPrompt = `You are an expert tutor. Generate comprehensive study notes for the topic "${topic_name}" in the subject "${subjectName}". Return ONLY a JSON object matching this schema exactly: { "items": [ { "content": "Your markdown notes here..." } ] }`;
                        } else if (mode === 'quiz') {
                            fullPrompt = `You are an expert tutor. Generate a ${targetCount}-question Multiple Choice Quiz (${targetDiff} difficulty) on the topic "${topic_name}" for the subject "${subjectName}". Return ONLY a JSON object matching this schema exactly: { "items": [ { "question": "...", "options": ["A", "B", "C", "D"], "answer": "A", "explanation": "..." } ] }`;
                        } else {
                            fullPrompt = `You are an expert tutor. Generate a ${targetCount}-question ${mode} assessment (${targetDiff} difficulty) on the topic "${topic_name}" for the subject "${subjectName}". Return ONLY a JSON object matching this schema exactly: { "items": [ { "question": "...", "answer": "..." } ] }`;
                        }
                    }

                    // 🌟 THE FIX: Pass the prompt as an object so geminiService can destructure it!
                    const rawData = await generateJson({ prompt: fullPrompt });
                    
                    const normalized = normalizeByMode(mode, rawData);
                    
                    if (normalized.length === 0) throw new Error("Gemini returned empty or malformed data.");

                    const contentJson = JSON.stringify({ 
                        items: normalized, 
                        meta: { 
                            mode, 
                            topic: topic_name,
                            difficulty: targetDiff,
                            numQuestions: targetCount,
                            timerDuration: durationMinutes
                        } 
                    });

                    const [libRes] = await db.execute(
                        'INSERT INTO library_items (user_id, title, type, category, content) VALUES (?, ?, ?, ?, ?)',
                        [userId, `Scheduled: ${topic_name}`, mode, subjectName, contentJson]
                    );

                    await db.execute('UPDATE scheduled_events SET reference_url = ? WHERE id = ?', [`/practice-quiz?libraryId=${libRes.insertId}`, eventId]);
                    console.log(`[AI Engine] Pre-generation complete! Saved to Library ID ${libRes.insertId}`);
                } catch (err) {
                    console.error("[AI Engine] Background pre-generation failed:", err);
                }
            })();
        }
    } catch (error) {
        console.error("Create Event Error:", error);
        res.status(500).json({ success: false, message: "Failed to schedule event." });
    }
};

exports.deleteEvent = async (req, res) => {
    try {
        const userId = req.user?.id || req.userId;
        const { eventId } = req.params;
        await db.execute('DELETE FROM scheduled_events WHERE id = ? AND user_id = ?', [eventId, userId]);
        res.status(200).json({ success: true, message: "Event deleted." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to delete event." });
    }
};

exports.getPregeneratedQuiz = async (req, res) => {
    try {
        const { libraryId } = req.params;
        const userId = req.user?.id || req.userId;
        
        // 🌟 THE FIX: Fetch the category (Subject Name) so the frontend knows where it belongs
        const [rows] = await db.execute('SELECT category, content FROM library_items WHERE id = ? AND user_id = ?', [libraryId, userId]);
        
        if (rows.length > 0) {
            res.status(200).json({ 
                success: true, 
                category: rows[0].category, // The subject name (e.g., OOP Java)
                content: rows[0].content    // The AI content
            });
        } else {
            res.status(404).json({ success: false, message: "Quiz not found" });
        }
    } catch (error) {
        console.error("Fetch pregen error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};