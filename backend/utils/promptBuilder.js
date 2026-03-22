const buildGeneratePrompt = ({
  mode,
  topic,
  difficulty,
  numQuestions,
  content,
  userQuery,
}) => {
  const baseContext = content
    ? `Context:\n${content}\n`
    : "";

  switch (mode) {
    case "quiz":
      return `
${baseContext}
Generate ${numQuestions} MCQs on "${topic}".
Difficulty: ${difficulty}.
Only generate MCQ questions. Do not include case studies, short answers, or long answers.
Return strictly JSON with schema: {"items":[{"question":"string","options":["A","B","C","D"],"answer":"string","explanation":"string"}]}
No markdown. No extra text.
`;

    case "short":
      return `
${baseContext}
Generate ${numQuestions} short answer questions on "${topic}".
Difficulty: ${difficulty}.
Answers should be brief (2-4 lines). Do not include MCQ options or case studies.
Return strictly JSON with schema: {"items":[{"question":"string","answer":"string","explanation":"string"}]}
No markdown. No extra text.
`;

    case "long":
      return `
${baseContext}
Generate ${numQuestions} long answer (5-10 mark) questions on "${topic}".
Difficulty: ${difficulty}.
Answers should be structured but concise (6-10 lines). Do not include MCQ options or case studies.
Return strictly JSON with schema: {"items":[{"question":"string","answer":"string","explanation":"string"}]}
No markdown. No extra text.
`;

    case "case":
      return `
${baseContext}
Generate ${numQuestions} case studies on "${topic}".
Difficulty: ${difficulty}.
Each case must include a scenario and 2-4 questions. Do not include MCQ-only lists.
Return strictly JSON with schema: {"items":[{"scenario":"string","questions":[{"question":"string","answer":"string","explanation":"string"}]}]}
No markdown. No extra text.
`;

    case "mock":
      return `
${baseContext}
Generate a mock test on "${topic}".
Difficulty: ${difficulty}.
Include ${numQuestions} total questions with a mix of MCQ and short answer.
Ensure the response is structured by section (mcq, short, answers) only.
Return strictly JSON with schema: {"items":[{"section":"mcq","items":[{"question":"string","options":["A","B","C","D"],"answer":"string","explanation":"string"}]},{"section":"short","items":[{"question":"string","answer":"string","explanation":"string"}]},{"section":"answers","items":[{"type":"mcq","answers":[{"question":"string","answer":"string"}]},{"type":"short","answers":[{"question":"string","answer":"string"}]}]}]}
No markdown. No extra text.
`;

    case "ai":
      return `
${baseContext}
You are a study assistant. Answer the user query clearly and concisely.
User query: "${userQuery}"
Return a direct answer and up to 3 follow-up questions.
Return strictly JSON with schema: {"items":[{"answer":"string","followups":["string"]}]}
No markdown. No extra text.
`;

    default:
      return "";
  }
};

const buildExtractTopicsPrompt = () => `
System: You are an academic syllabus parser.
Task: Extract the main topics from the provided content.
Rules:
- Return only JSON with this schema: {"items":[{"topic":"string"}]}
- Keep topics short, distinct, and ordered by importance.
- Do not include any markdown.
`;

module.exports = {
  buildGeneratePrompt,
  buildExtractTopicsPrompt,
};
