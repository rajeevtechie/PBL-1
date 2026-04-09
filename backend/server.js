require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser'); // 👈 PHASE 2: Added Cookie Parser
const path = require('path');
const rateLimit = require('express-rate-limit');
const db = require('./config/db'); 

// --- Import Routes ---
const authRoutes = require('./routes/authRoutes');
const syllabusRoutes = require('./routes/syllabusRoutes'); 
const practiceRoutes = require('./routes/practiceRoutes');
const practiceLabRoutes = require('./routes/practiceLabRoutes');
const libraryRoutes = require('./routes/libraryRoutes');
const focusRoutes = require('./routes/focusRoutes');
const insightRoutes = require('./routes/insightRoutes');
const errorHandler = require('./middlewares/errorHandler');
const startWeeklyEmailCron = require('./cron/weeklySummary');

const app = express();
const PORT = process.env.PORT || 5000;

// --- Global Middleware ---

// 🛡️ CRITICAL Phase 2 CORS UPDATE: Allow credentials (cookies) to pass through
app.use(cors({
    origin: 'http://localhost:5173', // Must match your frontend Vite port exactly
    credentials: true                // 👈 THIS ALLOWS AXIOS TO SEND COOKIES
}));

// Parses incoming JSON payloads and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🛡️ PHASE 2: Tell Express how to read HttpOnly cookies
app.use(cookieParser()); // 👈 MUST be after express.json()

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Security Middleware ---

// 🛡️ SECURITY PHASE 1: Block brute-force login attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 failed/successful login attempts per 15 mins
  message: { message: "Too many login attempts from this IP, please try again after 15 minutes." },
  standardHeaders: true, 
  legacyHeaders: false, 
});

// Apply this rate limiter ONLY to the auth routes
app.use('/api/auth', authLimiter);


// --- API Route Registration ---

// 1. Authentication (Login & Register)
app.use('/api/auth', authRoutes); 

// 2. AI Syllabus Analysis & Roadmap Generation
app.use('/api/syllabus', syllabusRoutes); 

// 3. Practice Lab 
app.use('/api/practice', practiceRoutes); 
app.use('/api/practice', practiceLabRoutes); 

// 4. Library (Secure PDF Blob & Split-Screen View)
app.use('/api/library', libraryRoutes); 

// 5. Analytics & AI Insights
app.use('/api/insights', insightRoutes);

// 6. Focus Mode & Study Sessions
app.use('/api/focus', focusRoutes);

// --- Test Route ---
app.get('/', (req, res) => {
    res.send('InsightED API is Secure and Running Smoothly...');
});

// --- Error Handling (Must be last) ---
// Prevents server crashes by catching unhandled errors
app.use(errorHandler);

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`🚀 InsightED Server running on port ${PORT}`);
});

// Start background cron jobs
startWeeklyEmailCron();