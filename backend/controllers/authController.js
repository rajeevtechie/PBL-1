const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { sendOTP } = require('../utils/mailer'); 
require('dotenv').config();

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// --- 1. REGISTER ---
exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const nameRegex = /^[a-zA-Z\s]+$/; 
        if (!name || !nameRegex.test(name)) {
            return res.status(400).json({ message: "Name must contain only letters and spaces." });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; 
        if (!email || !emailRegex.test(email)) {
            return res.status(400).json({ message: "Please enter a valid email address." });
        }

        // 🛡️ STRICT PASSWORD VALIDATOR
        // 🛡️ STRICT PASSWORD VALIDATOR
        // Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character (ANY special character)
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
        
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ 
                message: "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character." 
            });
        }

        const [existingUser] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ message: "Email is already registered." });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); 

        const [result] = await db.execute(
            'INSERT INTO users (name, email, password_hash, role, is_verified, verification_otp, otp_expires_at) VALUES (?, ?, ?, ?, FALSE, ?, ?)',
            [name, email, hashedPassword, 'student', otp, otpExpiry]
        );

        await sendOTP(email, otp);

        res.status(201).json({
            success: true,
            message: "Registration successful. Please check your email for the OTP.",
            requireVerification: true,
            email: email 
        });

    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

// --- 2. VERIFY EMAIL ---
exports.verifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(400).json({ message: "User not found." });

        const user = users[0];

        if (user.is_verified) {
            return res.status(400).json({ message: "Email is already verified." });
        }

        if (user.verification_otp !== otp) {
            return res.status(400).json({ message: "Invalid verification code." });
        }

        if (new Date() > new Date(user.otp_expires_at)) {
            return res.status(400).json({ message: "Verification code has expired. Please request a new one." });
        }

        await db.execute(
            'UPDATE users SET is_verified = TRUE, verification_otp = NULL, otp_expires_at = NULL WHERE email = ?',
            [email]
        );

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 
        });

        res.status(200).json({
            success: true,
            message: "Email verified successfully! Logging you in...",
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });

    } catch (error) {
        console.error("Verify Error:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

// --- 2.5 RESEND OTP ---
exports.resendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(400).json({ message: "User not found." });

        const user = users[0];

        if (user.is_verified) {
            return res.status(400).json({ message: "Email is already verified." });
        }

        // Generate a new OTP and Expiry
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);

        // Update the user's record with the new OTP
        await db.execute(
            'UPDATE users SET verification_otp = ?, otp_expires_at = ? WHERE email = ?',
            [otp, otpExpiry, email]
        );

        // Send the new email
        await sendOTP(email, otp);

        res.status(200).json({ success: true, message: "A new verification code has been sent." });

    } catch (error) {
        console.error("Resend OTP Error:", error);
        res.status(500).json({ message: "Failed to resend code. Please try again." });
    }
};

// --- 3. LOGIN ---
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(400).json({ message: "Invalid email or password." });

        const user = users[0];

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(400).json({ message: "Invalid email or password." });

        // 🛡️ SECURITY: Block login if they haven't verified their email!
        if (user.is_verified === 0 || !user.is_verified) {
            return res.status(403).json({ 
                message: "Please verify your email address before logging in.",
                requireVerification: true,
                email: user.email
            });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            success: true, message: "Login successful",
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

// --- 4. GUEST LOGIN & LOGOUT ---
exports.guestLogin = async (req, res) => {
    try {
        const guestId = 4; 
        const token = jwt.sign({ id: guestId, role: 'guest' }, process.env.JWT_SECRET, { expiresIn: '1h' });
        
        res.cookie('token', token, {
            httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 60 * 60 * 1000 
        });

        res.status(200).json({
            success: true, message: "Logged in as Guest",
            user: { id: guestId, name: "Guest Student", email: "guest@insighted.com", role: "guest" }
        });
    } catch (error) {
        console.error("Guest Login Error:", error);
        res.status(500).json({ message: "Guest access failed." });
    }
};

exports.logout = (req, res) => {
    res.clearCookie('token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
    res.status(200).json({ success: true, message: "Logged out successfully" });
};