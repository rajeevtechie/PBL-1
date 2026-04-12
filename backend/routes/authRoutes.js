const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// --- 1. CORE AUTHENTICATION ---
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/guest-login', authController.guestLogin);

// --- 2. EMAIL VERIFICATION ---
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-otp', authController.resendOTP);

// --- 3. PASSWORD RECOVERY (The new routes!) ---
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-reset-otp', authController.verifyResetOtp);
router.post('/reset-password', authController.resetPassword);

module.exports = router;