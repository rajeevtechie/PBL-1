const express = require('express');
const router = express.Router();
const pushController = require('../controllers/pushController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/subscribe', authMiddleware, pushController.subscribe);
router.delete('/unsubscribe', authMiddleware, pushController.unsubscribe); // 🌟 NEW

module.exports = router;