const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    // 🛡️ SECURITY: Read the token directly from the secure cookie
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Attach user payload to the request
        next();
    } catch (err) {
        res.status(401).json({ message: "Invalid or expired token." });
    }
};