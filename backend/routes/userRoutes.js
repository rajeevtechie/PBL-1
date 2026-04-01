// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware'); // Adjust path if your middleware folder is named differently!

// Route to update user preferences (like email notifications)
router.put('/preferences', authMiddleware, userController.updatePreferences);
// Add this right under your preferences route
router.put('/parent-email', authMiddleware, userController.updateParentEmail);

module.exports = router;