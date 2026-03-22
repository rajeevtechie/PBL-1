require('dotenv').config();
const db = require('./config/db'); 
const express = require('express');
const cors = require('cors');
const path = require('path');

// --- Import Routes ---
const authRoutes = require('./routes/authRoutes');
const syllabusRoutes = require('./routes/syllabusRoutes'); 
const practiceRoutes = require('./routes/practiceRoutes');
const practiceLabRoutes = require('./routes/practiceLabRoutes');
const libraryRoutes = require('./routes/libraryRoutes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
const PORT = 5000;
// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Routes ---
app.use('/api/auth', authRoutes);       // Login & Register
app.use('/api/syllabus', syllabusRoutes); // AI & Uploads
app.use('/api/practice', practiceRoutes); // Practice Lab
app.use('/api/practice', practiceLabRoutes); // Practice Lab topic extraction
app.use('/api/library', libraryRoutes); // Library
const focusRoutes = require('./routes/focusRoutes');
const insightRoutes = require('./routes/insightRoutes');
app.use('/api/insights', insightRoutes);
app.use('/api/focus', focusRoutes);

// --- Test Route ---
app.get('/', (req, res) => {
    res.send('InsightED API is Running...');
});

// --- Error Handling ---
app.use(errorHandler);

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});