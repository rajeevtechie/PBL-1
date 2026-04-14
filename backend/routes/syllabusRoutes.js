const express = require('express');
const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware'); 
const syllabusController = require('../controllers/syllabusController');

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ==============================================================
// 1. FIXED ROUTES (Must come before /:id to avoid collisions)
// ==============================================================
router.post('/upload', authMiddleware, upload.single('file'), syllabusController.uploadSyllabus);

// 🛡️ THE MISSING ROUTE: This allows the frontend to check the queue!
router.get('/upload/status/:jobId', authMiddleware, syllabusController.checkUploadJobStatus); 

router.post('/confirm-upload', authMiddleware, syllabusController.confirmUpload);

router.get('/list', authMiddleware, syllabusController.listAllSyllabuses);
router.get('/latest', authMiddleware, syllabusController.getLatestSyllabus);

router.get('/progress/aggregate', authMiddleware, syllabusController.getAggregateProgress);
router.get('/career-insights', authMiddleware, syllabusController.getCareerInsights);
router.patch('/recommendation/:recId/toggle', authMiddleware, syllabusController.toggleRecommendation);


// ==============================================================
// 2. DYNAMIC ID ROUTES (Must be at the very bottom)
// ==============================================================
router.post('/:id/analyze', authMiddleware, syllabusController.generateCareerInsights);
router.get('/:id/analyze/status/:jobId', authMiddleware, syllabusController.checkCareerJobStatus); 

router.put('/:id/structure', authMiddleware, syllabusController.updateSyllabusStructure);

// ⚠️ THIS CATCH-ALL ROUTE MUST BE THE VERY LAST ONE
router.get('/:id', authMiddleware, syllabusController.getSyllabusById);

module.exports = router;