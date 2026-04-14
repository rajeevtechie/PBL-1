require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser'); 
const path = require('path');
const rateLimit = require('express-rate-limit');
const db = require('./config/db'); 

// --- Import Routes ---
const authRoutes = require('./routes/authRoutes');
const syllabusRoutes = require('./routes/syllabusRoutes'); 
const practiceRoutes = require('./routes/practiceRoutes');
// 🗑️ DELETED: practiceLabRoutes import
const libraryRoutes = require('./routes/libraryRoutes');
const focusRoutes = require('./routes/focusRoutes');
const insightRoutes = require('./routes/insightRoutes');
const userRoutes = require('./routes/userRoutes'); 

const errorHandler = require('./middlewares/errorHandler');
const startWeeklyEmailCron = require('./cron/weeklySummary');
require('./workers/aiWorker'); // 👈 Starts the background queue worker

const app = express();
const PORT = process.env.PORT || 5000;

// --- Global Middleware ---

app.use(cors({
    origin: 'http://localhost:5173', 
    credentials: true                
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser()); 

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Security Middleware ---

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  message: { message: "Too many login attempts from this IP, please try again after 15 minutes." },
  standardHeaders: true, 
  legacyHeaders: false, 
});

app.use('/api/auth', authLimiter);


// --- API Route Registration ---

// 1. Authentication (Login & Register)
app.use('/api/auth', authRoutes); 

// 2. AI Syllabus Analysis & Roadmap Generation
app.use('/api/syllabus', syllabusRoutes); 

// 3. Practice Lab (Unified Engine)
app.use('/api/practice', practiceRoutes); 
// 🗑️ DELETED: practiceLabRoutes mount

// 4. Library (Secure PDF Blob & Split-Screen View)
app.use('/api/library', libraryRoutes); 

// 5. Analytics & AI Insights
app.use('/api/insights', insightRoutes);

// 6. Focus Mode & Study Sessions
app.use('/api/focus', focusRoutes);

// 7. User Profiles & Settings
app.use('/api/users', userRoutes);

// --- Test Route ---
app.get('/', (req, res) => {
    res.send('InsightED API is Secure and Running Smoothly...');
});

// --- Error Handling (Must be last) ---
app.use(errorHandler);

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`🚀 InsightED Server running on port ${PORT}`);
});

// Start background cron jobs
startWeeklyEmailCron();