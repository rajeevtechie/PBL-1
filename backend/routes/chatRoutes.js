const express = require("express");
const router = express.Router();

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🔥 System prompt (your AI brain)
const SYSTEM_PROMPT = `
You are EduNexus AI Mentor.

EduNexus is an AI-powered learning platform that:
- Adapts to university syllabus
- Provides Dual-Track Roadmap (college + industry)
- Has Focus Mode for distraction-free study
- Uses Cognitive Analytics (Analytical, Creative, Logic, Theory)

Your job:
- Explain concepts simply
- Help students learn
- Answer platform-related questions
- Be friendly and clear
`;

router.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    // ❗ Check input
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    let reply = "";

    try {
      // 🔥 Try Gemini 2.5
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash"
      });

      const result = await model.generateContent(
        SYSTEM_PROMPT + "\n" + message
      );

      reply = result.response.text();

    } catch (err) {
      console.log("⚠️ Gemini 2.5 failed, using fallback...");

      // ✅ Fallback to 1.5 (safe)
      const fallbackModel = genAI.getGenerativeModel({
        model: "gemini-1.5-flash"
      });

      const result = await fallbackModel.generateContent(
        SYSTEM_PROMPT + "\n" + message
      );

      reply = result.response.text();
    }

    return res.json({ reply });

  } catch (error) {
    console.error("❌ Chat error:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;


