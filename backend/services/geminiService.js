const { model } = require("../config/geminiConfig");

const cleanJsonText = (text) => {
  const stripped = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  if (stripped.startsWith("{") || stripped.startsWith("[")) {
    return stripped;
  }

  const firstBrace = stripped.search(/[\[{]/);
  const lastBrace = Math.max(stripped.lastIndexOf("}"), stripped.lastIndexOf("]"));

  if (firstBrace === -1 || lastBrace === -1) {
    return stripped;
  }

  return stripped.slice(firstBrace, lastBrace + 1);
};

const safeParseJson = (text) => {
  const cleaned = cleanJsonText(text);
  return JSON.parse(cleaned);
};

const generateJson = async ({ prompt, filePart, retries = 1 }) => {
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const result = await model.generateContent(filePart ? [prompt, filePart] : prompt);
      const response = result.response.text();
      return safeParseJson(response);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

module.exports = {
  generateJson,
};
