const buildGeneratePrompt = ({
  mode,
  topic,
  difficulty,
  numQuestions,
  content,
  userQuery,
  subjectName, 
}) => {
  const baseContext = `Academic Course Context: ${subjectName || 'General Studies'}\n` + 
                      (content ? `Source Material:\n${content}\n` : "");

  switch (mode) {
    case "quiz":
      return `
${baseContext}
Generate ${numQuestions} MCQs on the topic: "${topic}".
Difficulty: ${difficulty}.
Ensure the questions are highly relevant to the Academic Course Context provided above.
Only generate MCQ questions. Do not include case studies, short answers, or long answers.
Return strictly JSON with schema: {"items":[{"question":"string","options":["A","B","C","D"],"answer":"string","explanation":"string"}]}
No markdown. No extra text.
`;

    case "short":
      return `
${baseContext}
Generate ${numQuestions} short answer questions on the topic: "${topic}".
Difficulty: ${difficulty}.
Ensure the terminology aligns with the Academic Course Context.
Answers should be brief (2-4 lines). Do not include MCQ options or case studies.
Return strictly JSON with schema: {"items":[{"question":"string","answer":"string","explanation":"string"}]}
No markdown. No extra text.
`;

    case "long":
      return `
${baseContext}
Generate ${numQuestions} long answer (5-10 mark) questions on the topic: "${topic}".
Difficulty: ${difficulty}.
Answers should be structured but concise (6-10 lines), graded at a university level for the Academic Course Context.
Return strictly JSON with schema: {"items":[{"question":"string","answer":"string","explanation":"string"}]}
No markdown. No extra text.
`;

    case "case":
      return `
${baseContext}
Generate ${numQuestions} professional case studies on the topic: "${topic}".
Difficulty: ${difficulty}.
Each case must include a real-world scenario relevant to the Academic Course Context and 2-4 analytical questions.
Return strictly JSON with schema: {"items":[{"scenario":"string","questions":[{"question":"string","answer":"string","explanation":"string"}]}]}
No markdown. No extra text.
`;

    case "mock":
      return `
${baseContext}
Generate a comprehensive university-level mock test on the topic: "${topic}".
Difficulty: ${difficulty}.
Course Alignment: ${subjectName || 'General'}.
Include ${numQuestions} total questions with a mix of MCQ and short answer.
Return strictly JSON with schema: {"items":[{"section":"mcq","items":[{"question":"string","options":["A","B","C","D"],"answer":"string","explanation":"string"}]},{"section":"short","items":[{"question":"string","answer":"string","explanation":"string"}]},{"section":"answers","items":[{"type":"mcq","answers":[{"question":"string","answer":"string"}]},{"type":"short","answers":[{"question":"string","answer":"string"}]}]}]}
No markdown. No extra text.
`;

    // 🛡️ NEW: Instructions for Study Notes
    case "notes":
      return `
${baseContext}
Generate comprehensive, university-level study notes on the topic: "${topic}".
Break down the core concepts, definitions, and key takeaways clearly. 
Ensure the terminology perfectly aligns with the Academic Course Context.
Structure the notes into a few highly readable paragraphs or bullet points.
Return strictly JSON with schema: {"items":[{"content":"string"}]}
No markdown. No extra text.
`;

    case "ai":
      return `
${baseContext}
You are an InsightED academic tutor specializing in ${subjectName || 'General Studies'}.
User query: "${userQuery}"
Return a direct, helpful answer and up to 3 follow-up questions to test their understanding.
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