const express = require('express');
const router = express.Router();
const multer = require('multer');
const syllabusController = require('../controllers/syllabusController');
const authMiddleware = require('../middleware/authMiddleware');

// Configure Multer (Store files in memory temporarily)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- UPLOAD ROUTE ---
router.post(
    '/upload', 
    authMiddleware,             
    upload.single('file'),      
    syllabusController.uploadSyllabus
);

// --- STATIC GET ROUTES (Must go BEFORE /:id) ---
router.get('/latest', authMiddleware, syllabusController.getLatestSyllabus);
router.get('/list', authMiddleware, syllabusController.listAllSyllabuses);

// ✅ NEW: Fetch saved career insights 
router.get('/career-insights', authMiddleware, syllabusController.getCareerInsights);

// --- DYNAMIC ROUTES (Containing :id) ---
router.get('/:id', authMiddleware, syllabusController.getSyllabusById);

// ✅ NEW: Generate AI Gap Analysis
router.post('/:id/analyze', authMiddleware, syllabusController.generateCareerInsights);

module.exports = router;