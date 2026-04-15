const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');
const authMiddleware = require('../middleware/authMiddleware'); 

// 1. Get all events for the logged-in user
router.get('/', authMiddleware, calendarController.getEvents);

// 2. Create a new event
router.post('/', authMiddleware, calendarController.createEvent);

// 3. Delete an event by ID
router.delete('/:eventId', authMiddleware, calendarController.deleteEvent);

module.exports = router;