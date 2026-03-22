const express = require('express');
const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware');
const libraryController = require('../controllers/libraryController');

const router = express.Router();

// Memory Storage is required to pass the raw bytes to the Database
const upload = multer({ storage: multer.memoryStorage() });

// Save endpoints
router.post('/save-file', authMiddleware, upload.single('file'), libraryController.saveFile);
router.post('/save-content', authMiddleware, libraryController.saveContent);

// Fetch & Delete endpoints
router.get('/items', authMiddleware, libraryController.getLibraryItems);
router.delete('/item/:id', authMiddleware, libraryController.deleteItem);

// Dedicated route to serve raw PDF bytes to the Iframe Viewer
router.get('/file/:id', authMiddleware, libraryController.serveFile);

module.exports = router;