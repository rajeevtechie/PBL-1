// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware'); // Adjust path if your middleware folder is named differently!

// Route to update user preferences (like email notifications)
router.put('/preferences', authMiddleware, userController.updatePreferences);

module.exports = router;