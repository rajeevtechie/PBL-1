const express = require("express");
const router = express.Router();
const practiceController = require("../controllers/practiceController");
const authMiddleware = require("../middleware/authMiddleware");

// Note: Ensure you import your multer upload middleware if your app uses one!
const upload = require("../middleware/uploadMiddleware"); // Adjust path if needed

// 1. AI Practice Generation Route
router.post("/generate", authMiddleware, practiceController.generatePractice);

router.get("/status/:jobId", authMiddleware, practiceController.checkJobStatus); // 👈 The frontend polling route

// 2. Focus Mode Route
router.post("/log-session", authMiddleware, practiceController.logStudySession);

// 3. Dashboard Analytics Route
router.get("/stats", authMiddleware, practiceController.getStudyStats);

// 🛡️ 4. TRACK A: Sync with Database Syllabus
router.post('/extract-syllabus-topics', authMiddleware, practiceController.extractSyllabusTopics);

// 🛡️ 5. TRACK B: Extract Custom Topics from Uploaded PDF/Text
// Make sure you have upload.single('file') if your controller expects req.file
router.post('/extract-topics', authMiddleware, upload.single('file'), practiceController.extractTopics);

module.exports = router;