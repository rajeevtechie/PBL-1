require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
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
// Enables frontend-backend communication across different ports
app.use(cors());

// Parses incoming JSON payloads and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- API Route Registration ---

// 1. Authentication (Login & Register)
app.use('/api/auth', authRoutes); 

// 2. AI Syllabus Analysis & Roadmap Generation
app.use('/api/syllabus', syllabusRoutes); 

// 3. Practice Lab (RESTORED: Fixed the Extract Topics HTML Error)
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
    res.send('InsightED API is Running Smoothly...');
});

// --- Error Handling (Must be last) ---
// Prevents server crashes by catching unhandled errors
app.use(errorHandler);

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`🚀 InsightED Server running on port ${PORT}`);
});
startWeeklyEmailCron();