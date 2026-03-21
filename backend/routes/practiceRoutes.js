// backend/routes/practiceRoutes.js
const express = require("express");
const router = express.Router();
const practiceController = require("../controllers/practiceController");
const authMiddleware = require("../middleware/authMiddleware");

// 1. AI Practice Generation Route
// Used by practise_quiz.jsx to generate questions via Gemini
router.post(
  "/generate", 
  authMiddleware, 
  practiceController.generatePractice
);

// 2. Focus Mode Route
// Used by StudySession.jsx to save completed Pomodoro data
router.post(
  "/log-session", 
  authMiddleware, 
  practiceController.logStudySession
);

// 3. Dashboard Analytics Route
// Used by Dashboard.jsx to fetch total time, avg focus, and recent history
router.get(
  "/stats", 
  authMiddleware, 
  practiceController.getStudyStats
);

module.exports = router;