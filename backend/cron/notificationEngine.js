const cron = require('node-cron');
const db = require('../config/db');
const webpush = require('web-push');

// Ensure web-push is configured here too
webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

const startNotificationEngine = () => {
    // Run every minute ('* * * * *')
    cron.schedule('* * * * *', async () => {
        console.log("Checking for upcoming events...");

        try {
            // Find events starting in exactly 5 minutes that haven't been notified yet
            const [upcomingEvents] = await db.execute(`
                SELECT e.id, e.title, e.event_type, e.reference_url, s.subscription_data
                FROM scheduled_events e
                JOIN push_subscriptions s ON e.user_id = s.user_id
                WHERE e.start_time BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 5 MINUTE)
                AND e.is_notified = FALSE
            `);

            if (upcomingEvents.length === 0) return;

            for (const event of upcomingEvents) {
                // 🌟 THE FIX: Check if mysql2 already parsed it into an object!
                const subData = typeof event.subscription_data === 'string' 
                    ? JSON.parse(event.subscription_data) 
                    : event.subscription_data;

                const payload = JSON.stringify({
                    title: `Upcoming: ${event.title}`,
                    body: `Your ${event.event_type} starts in 5 minutes!`,
                    url: event.reference_url || '/dashboard' // Default URL if none provided
                });

                try {
                    // Send the push notification
                    await webpush.sendNotification(subData, payload);
                    
                    // Mark as notified so we don't spam them
                    await db.execute('UPDATE scheduled_events SET is_notified = TRUE WHERE id = ?', [event.id]);
                    console.log(`Sent push notification for event ID: ${event.id}`);

                } catch (pushErr) {
                    console.error("Failed to send push. Subscription might be invalid.", pushErr);
                }
            }
        } catch (error) {
            console.error("Error running Notification Engine:", error);
        }
    });
};

module.exports = startNotificationEngine;