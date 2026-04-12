const db = require('../config/db'); 
const bcrypt = require('bcrypt'); // 🛡️ CRITICAL: Added this to hash the new passwords!

exports.updatePreferences = async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    const { emailNotifs } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await db.execute(
      'UPDATE users SET email_notifications = ? WHERE id = ?',
      [emailNotifs ? 1 : 0, userId]
    );

    res.status(200).json({ success: true, message: "Preferences updated successfully!" });
  } catch (error) {
    console.error("Failed to update preferences:", error);
    res.status(500).json({ message: "Server error updating preferences." });
  }
};

exports.updateParentEmail = async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    const { parentEmail } = req.body;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    await db.execute(
      'UPDATE users SET parent_email = ? WHERE id = ?',
      [parentEmail || null, userId]
    );

    res.status(200).json({ success: true, message: "Parent email updated!" });
  } catch (error) {
    console.error("Failed to update parent email:", error);
    res.status(500).json({ message: "Server error updating parent email." });
  }
};

// --- 🛡️ THE HYBRID TOUR SYNC ---
exports.syncTourFlag = async (req, res) => {
    try {
        const userId = req.user?.id || req.userId;
        const { tourKey } = req.body;

        if (!userId || !tourKey) {
            return res.status(400).json({ message: "Missing required data" });
        }

        // 1. Get the current JSON object from the database
        const [users] = await db.execute('SELECT tour_flags FROM users WHERE id = ?', [userId]);
        if (users.length === 0) return res.status(404).json({ message: "User not found" });

        // Parse the JSON (safeguard in case mysql2 returns it as a string)
        let flags = users[0].tour_flags || {};
        if (typeof flags === 'string') {
            flags = JSON.parse(flags);
        }

        // 2. Set the new flag to true
        flags[tourKey] = true;

        // 3. Save it back to the database
        await db.execute(
            'UPDATE users SET tour_flags = ? WHERE id = ?', 
            [JSON.stringify(flags), userId]
        );

        res.status(200).json({ success: true, message: "Tour progress saved." });
    } catch (error) {
        console.error("Tour Sync Error:", error);
        res.status(500).json({ message: "Server error syncing tour." });
    }
};

// --- 🔒 UPDATE PASSWORD ---
exports.updatePassword = async (req, res) => {
    try {
        const userId = req.user?.id || req.userId;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Both current and new passwords are required." });
        }

        // 1. Get the user's current hashed password from the DB
        const [users] = await db.execute('SELECT password_hash FROM users WHERE id = ?', [userId]);
        if (users.length === 0) return res.status(404).json({ message: "User not found." });

        const user = users[0];

        // 2. Verify the old password matches
        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect current password." });
        }

        // 3. Check new password strength
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({ message: "New password must be at least 8 characters and include uppercase, lowercase, number, and special character." });
        }

        // 4. Hash the new password and save it
        const hashedNewPassword = await bcrypt.hash(newPassword, 12);
        await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hashedNewPassword, userId]);

        res.status(200).json({ success: true, message: "Password updated successfully!" });
    } catch (error) {
        console.error("Update Password Error:", error);
        res.status(500).json({ message: "Server error updating password." });
    }
};

// --- DELETE (DEACTIVATE) ACCOUNT ---
exports.deleteAccount = async (req, res) => {
    try {
        const userId = req.user?.id || req.userId; 

        // 🛡️ VULNERABILITY PATCHED: The Ultimate Enterprise Soft Delete
        const scrambledEmail = `deleted_${Date.now()}_${userId}@insighted.com`;

        await db.execute(
            'UPDATE users SET is_active = FALSE, name = "Deleted User", email = ?, password_hash = "DELETED" WHERE id = ?', 
            [scrambledEmail, userId]
        );

        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        });

        res.status(200).json({ success: true, message: 'Account deactivated successfully.' });
    } catch (error) {
        console.error("Error deactivating account:", error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};