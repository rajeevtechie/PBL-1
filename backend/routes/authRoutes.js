const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-otp', authController.resendOTP); // 👈 ADD THIS LINE
router.post('/login', authController.login);
router.post('/guest-login', authController.guestLogin);
router.post('/logout', authController.logout);

module.exports = router;