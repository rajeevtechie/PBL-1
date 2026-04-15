const db = require('../config/db');
const webpush = require('web-push');

webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

// 1. Subscribe (and clean up old duplicates)
exports.subscribe = async (req, res) => {
    try {
        const userId = req.user?.id || req.userId;
        const subscription = req.body;

        if (!userId || !subscription) {
            return res.status(400).json({ success: false, message: "Invalid subscription data." });
        }

        // 🌟 FIX: Delete any existing subscriptions for this user first to prevent spam!
        await db.execute('DELETE FROM push_subscriptions WHERE user_id = ?', [userId]);

        // Save the fresh subscription
        await db.execute(
            'INSERT INTO push_subscriptions (user_id, subscription_data) VALUES (?, ?)',
            [userId, JSON.stringify(subscription)]
        );

        res.status(201).json({ success: true, message: "Subscription saved." });
    } catch (error) {
        console.error("Subscription Error:", error);
        res.status(500).json({ success: false, message: "Failed to save subscription." });
    }
};

// 2. Unsubscribe (Triggered by the Settings Toggle)
exports.unsubscribe = async (req, res) => {
    try {
        const userId = req.user?.id || req.userId;
        
        // Wipe their subscription so the Cron job ignores them
        await db.execute('DELETE FROM push_subscriptions WHERE user_id = ?', [userId]);
        
        res.status(200).json({ success: true, message: "Successfully unsubscribed." });
    } catch (error) {
        console.error("Unsubscribe Error:", error);
        res.status(500).json({ success: false, message: "Failed to unsubscribe." });
    }
};