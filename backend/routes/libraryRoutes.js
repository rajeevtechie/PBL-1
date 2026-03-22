const express = require('express');
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/authMiddleware');
const libraryController = require('../controllers/libraryController');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ext || '';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${safeExt}`);
  }
});

const upload = multer({ storage });

router.post('/save-file', authMiddleware, upload.single('file'), libraryController.saveFile);
router.post('/save-content', authMiddleware, libraryController.saveContent);
router.get('/uploaded', authMiddleware, libraryController.getUploaded);
router.get('/generated', authMiddleware, libraryController.getGenerated);
router.delete('/:id', authMiddleware, libraryController.deleteItem);

module.exports = router;
