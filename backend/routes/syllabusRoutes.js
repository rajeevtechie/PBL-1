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
router.get('/career-insights', authMiddleware, syllabusController.getCareerInsights);

// ✅ NEW: Toggle Checkbox Status
router.patch('/recommendation/:recId/toggle', authMiddleware, syllabusController.toggleRecommendation);

// --- DYNAMIC ROUTES (Containing :id) ---
router.get('/:id', authMiddleware, syllabusController.getSyllabusById);
router.post('/:id/analyze', authMiddleware, syllabusController.generateCareerInsights);
// ✅ NEW: Save Academic Progress
router.put('/:id/structure', authMiddleware, syllabusController.updateSyllabusStructure);

module.exports = router;