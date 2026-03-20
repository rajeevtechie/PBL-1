const express = require('express');
const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware');
const practiceLabController = require('../controllers/practiceLabController');

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post(
  '/extract-topics',
  authMiddleware,
  upload.single('file'),
  practiceLabController.extractTopics
);

module.exports = router;
