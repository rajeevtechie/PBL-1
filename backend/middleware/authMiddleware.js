const jwt = require('jsonwebtoken');
const db = require('../config/db');

module.exports = async (req, res, next) => {
    // 1. Check if the browser even sent a cookie
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    try {
        // 2. Verify the cryptography of the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 🛡️ 3. THE GHOST KILLER: Check the Database!
        // We now fetch both verification status AND the active status
        const [users] = await db.execute('SELECT is_verified, is_active FROM users WHERE id = ?', [decoded.id]);
        
        if (users.length === 0) {
            // The DB was wiped or user was hard-deleted! Clear the dead cookie.
            res.clearCookie('token');
            return res.status(401).json({ message: "Account no longer exists." });
        }

        const user = users[0];

        // 🛡️ VULNERABILITY 1 PATCHED: Block deactivated accounts from using old tokens
        if (user.is_active === 0 || user.is_active === false) {
            res.clearCookie('token');
            return res.status(403).json({ message: "Access denied. Account is deactivated." });
        }

        // Block them if they bypassed the OTP step (unless they are a Demo Guest)
        if (decoded.role !== 'guest' && user.is_verified === 0) {
            res.clearCookie('token');
            return res.status(403).json({ message: "Account not verified." });
        }

        // 4. Everything is secure, allow them into the route
        req.user = decoded; 
        next();
    } catch (err) {
        res.clearCookie('token');
        res.status(401).json({ message: "Invalid or expired token." });
    }
};