// backend/controllers/userController.js
const db = require('../config/db'); // Adjust path if your db config is elsewhere

exports.updatePreferences = async (req, res) => {
  try {
    // Grab the user ID from your authentication middleware
    const userId = req.user?.id || req.userId;
    const { emailNotifs } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Update the user's email preference in the MySQL database
    // We use a ternary operator because MySQL uses 1 for true and 0 for false
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

    // Save the parent email (or set to NULL if they clear the input)
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