const db = require('../config/db');

// Converts "2026-04-15T19:10" -> "2026-04-15 19:10:00"
const formatForMySQL = (dateString) => {
    if (!dateString) return null;
    let formatted = dateString.replace('T', ' ');
    // If the frontend didn't send seconds (length 16), add them for MySQL
    if (formatted.length === 16) {
        formatted += ':00';
    }
    return formatted;
};

// Get all upcoming events for the user
exports.getEvents = async (req, res) => {
    try {
        const userId = req.user?.id || req.userId;
        const [events] = await db.execute(
            'SELECT * FROM scheduled_events WHERE user_id = ? ORDER BY start_time ASC',
            [userId]
        );
        res.status(200).json({ success: true, data: events });
    } catch (error) {
        console.error("Fetch Events Error:", error);
        res.status(500).json({ success: false, message: "Failed to load calendar." });
    }
};

// Create a new scheduled event (🌟 NOW WITH CONFLICT RESOLUTION)
exports.createEvent = async (req, res) => {
    try {
        const userId = req.user?.id || req.userId;
        
        // 🌟 NEW: Destructure the 'overwrite' flag from the incoming request body
        const { title, event_type, reference_url, start_time, end_time, overwrite } = req.body;

        // Clean the strings before inserting them into MySQL
        const formattedStart = formatForMySQL(start_time);
        const formattedEnd = formatForMySQL(end_time);

        // 🌟 NEW: Check for time conflicts! 
        // Formula: (NewStart < OldEnd) AND (NewEnd > OldStart)
        const [conflicts] = await db.execute(
            `SELECT id, title FROM scheduled_events 
             WHERE user_id = ? 
             AND start_time < ? 
             AND end_time > ?`,
            [userId, formattedEnd, formattedStart]
        );

        // If there is a conflict and the user hasn't explicitly said to overwrite...
        if (conflicts.length > 0 && !overwrite) {
            return res.status(409).json({ 
                success: false, 
                conflict: true,
                message: `This slot overlaps with: "${conflicts[0].title}". Do you want to overwrite it?` 
            });
        }

        // If they DID say to overwrite, delete the old conflicting events first
        if (conflicts.length > 0 && overwrite) {
            for (let conflict of conflicts) {
                await db.execute('DELETE FROM scheduled_events WHERE id = ?', [conflict.id]);
            }
        }

        // Finally, save the new event!
        const [result] = await db.execute(
            `INSERT INTO scheduled_events 
            (user_id, title, event_type, reference_url, start_time, end_time) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, title, event_type, reference_url, formattedStart, formattedEnd]
        );

        res.status(201).json({ success: true, message: "Event scheduled!", eventId: result.insertId });
    } catch (error) {
        console.error("Create Event Error:", error);
        res.status(500).json({ success: false, message: "Failed to schedule event." });
    }
};

// Delete an event
exports.deleteEvent = async (req, res) => {
    try {
        const userId = req.user?.id || req.userId;
        const { eventId } = req.params;

        await db.execute('DELETE FROM scheduled_events WHERE id = ? AND user_id = ?', [eventId, userId]);
        res.status(200).json({ success: true, message: "Event deleted." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to delete event." });
    }
};