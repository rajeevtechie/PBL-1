const express = require('express');
const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware'); // (Assuming your folder is named 'middleware')
const syllabusController = require('../controllers/syllabusController');

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ==============================================================
// 1. FIXED ROUTES (Must come before /:id to avoid collisions)
// ==============================================================
router.post('/upload', authMiddleware, upload.single('file'), syllabusController.uploadSyllabus);
router.post('/confirm-upload', authMiddleware, syllabusController.confirmUpload);

router.get('/list', authMiddleware, syllabusController.listAllSyllabuses);
router.get('/latest', authMiddleware, syllabusController.getLatestSyllabus);

// ✅ Called by Dashboard.jsx for the Accordion Drill-Down
router.get('/progress/aggregate', authMiddleware, syllabusController.getAggregateProgress);

// ✅ Called by Roadmap.jsx to load the saved career goals
router.get('/career-insights', authMiddleware, syllabusController.getCareerInsights);

// ✅ Called by Roadmap.jsx when you click a Career Checkbox
router.patch('/recommendation/:recId/toggle', authMiddleware, syllabusController.toggleRecommendation);


// ==============================================================
// 2. DYNAMIC ID ROUTES (Must be at the very bottom)
// ==============================================================

// ✅ Called by Roadmap.jsx when you hit the "Generate" AI button
router.post('/:id/analyze', authMiddleware, syllabusController.generateCareerInsights);

// ✅ Called by Roadmap.jsx when you click an Academic Checkbox
router.put('/:id/structure', authMiddleware, syllabusController.updateSyllabusStructure);

// Get specific subject by ID
router.get('/:id', authMiddleware, syllabusController.getSyllabusById);

module.exports = router;