// backend/routes/insightRoutes.js
const express = require('express');
const router = express.Router();
const insightController = require('../controllers/insightController');
const authMiddleware = require('../middleware/authMiddleware');

// Get the main dashboard analytics
router.get('/dashboard', authMiddleware, insightController.getDashboardAnalytics);

module.exports = router;