const { generateJson } = require("../services/geminiService");
const { buildGeneratePrompt, buildExtractTopicsPrompt } = require("../utils/promptBuilder");

const allowedModes = new Set(["quiz", "short", "long", "case", "mock", "ai"]);
const allowedDifficulties = new Set(["easy", "medium", "hard", "exam"]);

const normalizeArray = (data) => {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && Array.isArray(data.items)) {
    return data.items;
  }

  if (data && Array.isArray(data.questions)) {
    return data.questions;
  }

  return [data];
};

exports.generatePractice = async (req, res, next) => {
  try {
    const {
      mode,
      topic,
      difficulty,
      numQuestions,
      content,
      userQuery,
    } = req.body || {};

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

    res.status(200).json({
      success: true,
      data: normalized,
    });
  } catch (error) {
    next(error);
  }
};

exports.extractTopics = async (req, res, next) => {
  try {
    if (!req.file && !req.body?.text) {
      return res.status(400).json({ success: false, message: "Provide a PDF or text to extract topics." });
    }

    const prompt = buildExtractTopicsPrompt();
    const filePart = req.file
      ? {
          inlineData: {
            data: req.file.buffer.toString("base64"),
            mimeType: req.file.mimetype,
          },
        }
      : null;

    const contentPrompt = req.body?.text ? `${prompt}\nContent:\n${req.body.text}` : prompt;
    const data = await generateJson({ prompt: contentPrompt, filePart, retries: 1 });
    const normalized = normalizeArray(data);

    const topics = normalized
      .map((item) => (item.topic ? String(item.topic).trim() : String(item).trim()))
      .filter((topic) => topic.length > 0);

    if (topics.length === 0) {
      return res.status(422).json({ success: false, message: "No topics could be extracted." });
    }

    res.status(200).json({ success: true, topics });
  } catch (error) {
    next(error);
  }
};
