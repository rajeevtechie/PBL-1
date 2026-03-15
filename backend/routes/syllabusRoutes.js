const express = require('express');
const router = express.Router();
const multer = require('multer'); // <--- 1. Import Multer
const syllabusController = require('../controllers/syllabusController');
const authMiddleware = require('../middleware/authMiddleware');

// 2. Configure Multer (Store files in memory temporarily)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 3. Add 'upload.single('file')' middleware
// This tells the server: "Expect a file named 'file', catch it, and put it in req.file"
router.post(
    '/upload', 
    authMiddleware,             // Check if user is logged in
    upload.single('file'),      // <--- CATCH THE FILE HERE
    syllabusController.uploadSyllabus
);

router.get('/latest', authMiddleware, syllabusController.getLatestSyllabus);
router.get('/list', authMiddleware, syllabusController.listAllSyllabuses);
router.get('/:id', authMiddleware, syllabusController.getSyllabusById);

module.exports = router;