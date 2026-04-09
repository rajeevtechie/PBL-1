// backend/routes/insightRoutes.js
const express = require('express');
const router = express.Router();
const insightController = require('../controllers/insightController');
const authMiddleware = require('../middleware/authMiddleware');


// 1. Get the main dashboard analytics
router.get('/dashboard', authMiddleware, insightController.getDashboardAnalytics);

// 2. AI Mentor Chat (The new route we just added!)
router.post('/chat', authMiddleware, insightController.chatWithMentor);
// Add this under your existing routes
router.get('/heatmap', authMiddleware, insightController.getActivityHeatmap);

module.exports = router;