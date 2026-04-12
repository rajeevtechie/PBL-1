const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// 🛡️ THE FIX: Removed the { } curly braces so it imports the default function correctly!
const verifyToken = require('../middleware/authMiddleware'); // Check if it's 'middleware' or 'middlewares' in your folder structure!

// --- YOUR EXISTING ROUTES ---
router.put('/preferences', verifyToken, userController.updatePreferences);
router.put('/parent-email', verifyToken, userController.updateParentEmail);
router.put('/tour-sync', verifyToken, userController.syncTourFlag);
router.delete('/delete-account', verifyToken, userController.deleteAccount);
router.put('/update-password', verifyToken, userController.updatePassword);

module.exports = router;