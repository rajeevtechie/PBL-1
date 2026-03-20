const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

const parseTopics = (rawText) => {
  let cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

  if (!cleaned.startsWith("{")) {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }
  }

  try {
    const parsed = JSON.parse(cleaned);
    const topics = Array.isArray(parsed.topics) ? parsed.topics : [];
    return topics
      .map((topic) => String(topic).trim())
      .filter((topic) => topic.length > 0);
  } catch (error) {
    return [];
  }
};

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
      const filePart = {
        inlineData: {
          data: req.file.buffer.toString("base64"),
          mimeType: req.file.mimetype,
        },
      };

      const result = await model.generateContent([prompt, filePart]);
      responseText = result.response.text();
    } else {
      const result = await model.generateContent(`${prompt}\nContent:\n${inputText}`);
      responseText = result.response.text();
    }

    const topics = parseTopics(responseText);

    if (topics.length === 0) {
      return res.status(422).json({ message: "No topics could be extracted." });
    }

    res.status(200).json({ topics });
  } catch (error) {
    console.error("Practice Lab topic extraction error:", error);
    res.status(500).json({ message: "Failed to extract topics.", error: error.message });
  }
};
