const express = require('express');
const router = express.Router();
const focusController = require('../controllers/focusController');
const authMiddleware = require('../middleware/authMiddleware'); 

// GET /api/focus/clusters
router.get('/clusters', authMiddleware, focusController.getFocusClusters);

module.exports = router;