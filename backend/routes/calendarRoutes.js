const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');

// 🌟 THE FIX: Removed the curly braces so it imports the default function correctly!
const verifyToken = require('../middleware/authMiddleware'); 

// Your existing routes...
router.get('/', verifyToken, calendarController.getEvents);
router.post('/', verifyToken, calendarController.createEvent);
router.delete('/:eventId', verifyToken, calendarController.deleteEvent);

// The new route we just added!
router.get('/quiz/:libraryId', verifyToken, calendarController.getPregeneratedQuiz);

module.exports = router;