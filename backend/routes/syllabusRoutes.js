const express = require('express');
const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware');
const syllabusController = require('../controllers/syllabusController');

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ==============================================================
// 1. CAREER TRACK & AI INSIGHT ROUTES (Must be FIRST to avoid :id collision)
// ==============================================================
router.get('/career/insights', authMiddleware, syllabusController.getCareerInsights);
router.post('/career/generate', authMiddleware, syllabusController.generateCareerInsights);
router.patch('/recommendation/:recId/toggle', authMiddleware, syllabusController.toggleRecommendation);

// ==============================================================
// 2. ACADEMIC SYLLABUS ROUTES
// ==============================================================
router.post('/upload', authMiddleware, upload.single('file'), syllabusController.uploadSyllabus);
router.post('/confirm-upload', authMiddleware, syllabusController.confirmUpload);
router.get('/list', authMiddleware, syllabusController.listAllSyllabuses);
router.get('/latest', authMiddleware, syllabusController.getLatestSyllabus);
router.get('/progress/aggregate', authMiddleware, syllabusController.getAggregateProgress);

// Dynamic ID routes MUST be at the very bottom
router.post('/:id/unit/toggle', authMiddleware, syllabusController.toggleUnitCompletion);
router.get('/:id', authMiddleware, syllabusController.getSyllabusById);

module.exports = router;