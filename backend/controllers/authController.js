const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

// --- 1. REGISTER NEW USER ---
exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // 🛡️ SECURITY: Strict Input Validation
        const nameRegex = /^[a-zA-Z\s]+$/; // Letters and spaces only
        if (!name || !nameRegex.test(name)) {
            return res.status(400).json({ message: "Name must contain only letters and spaces." });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Standard email format
        if (!email || !emailRegex.test(email)) {
            return res.status(400).json({ message: "Please enter a valid email address." });
        }

        if (!password || password.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters long." });
        }

        // Check if user already exists
        const [existingUser] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ message: "Email is already registered." });
        }

        // 🛡️ SECURITY: Hash password with 12 salt rounds (Optimal balance of speed/security)
        const hashedPassword = await bcrypt.hash(password, 12);

        // Insert into database
        const [result] = await db.execute(
            'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, 'student']
        );

        // Generate JWT Token
        const token = jwt.sign(
            { id: result.insertId, role: 'student' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' } // Token lasts 7 days
        );

        // 🛡️ SECURITY: Send token via HttpOnly Cookie (Invisible to JS/Hackers)
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', 
            sameSite: 'strict', 
            maxAge: 7 * 24 * 60 * 60 * 1000 
        });

        res.status(201).json({
            success: true,
            message: "Registration successful",
            user: { id: result.insertId, name, email, role: 'student' }
        });

    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

// --- 2. LOGIN EXISTING USER ---
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Fetch user from DB
        const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(400).json({ message: "Invalid email or password." });
        }

        const user = users[0];

        // Verify Password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password." });
        }

        // Generate JWT Token
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // 🛡️ SECURITY: Send token via HttpOnly Cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            success: true,
            message: "Login successful",
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

// --- 3. GUEST LOGIN (DEMO MODE) ---
exports.guestLogin = async (req, res) => {
    try {
        const guestId = 4; // Your specific guest user ID in the database
        
        // 🛡️ We explicitly add role: 'guest' so we can restrict them later
        const token = jwt.sign(
            { id: guestId, role: 'guest' }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' } // Guest tokens only last 1 hour
        );
        
        // Send cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 1000 // 1 hour
        });

        res.status(200).json({
            success: true,
            message: "Logged in as Guest",
            user: { id: guestId, name: "Guest Student", email: "guest@insighted.com", role: "guest" }
        });
    } catch (error) {
        console.error("Guest Login Error:", error);
        res.status(500).json({ message: "Guest access failed." });
    }
};

// --- 4. LOGOUT ---
// Because JS can't delete HttpOnly cookies, the server must clear it!
exports.logout = (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
    
    res.status(200).json({ success: true, message: "Logged out successfully" });
};