const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

// --- REGISTER USER ---
exports.register = async (req, res) => {
    try {
        // Note: We extract name, email, and password from the frontend request.
        // Even if your frontend sends 'university', we are only saving what is in your DB schema.
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "Please provide all required fields." });
        }

        // 1. Check if user already exists
        const [existingUsers] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ message: "User already exists with this email." });
        }

        // 2. Hash the password for security
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Save user to database (✅ FIXED: Using 'password_hash' column)
        const [result] = await db.execute(
            'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
            [name, email, hashedPassword]
        );

        // 4. Generate JWT Token
        const token = jwt.sign({ id: result.insertId }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            message: "Account created successfully",
            token,
            user: { id: result.insertId, name, email }
        });

    } catch (error) {
        console.error("❌ Registration Error:", error);
        res.status(500).json({ message: "Server error during registration", error: error.message });
    }
};

// --- LOGIN USER ---
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Please provide email and password." });
        }

        // 1. Find user by email
        const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        const user = users[0];

        // 2. Compare passwords (✅ FIXED: Comparing against 'user.password_hash')
        const isMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        // 3. Generate JWT Token
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(200).json({
            message: "Login successful",
            token,
            user: { id: user.id, name: user.name, email: user.email }
        });

    } catch (error) {
        console.error("❌ Login Error:", error);
        res.status(500).json({ message: "Server error during login", error: error.message });
    }
};