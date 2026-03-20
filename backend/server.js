require('dotenv').config();
const db = require('./config/db'); 
const express = require('express');
const cors = require('cors');
const path = require('path');

// --- Import Routes ---
const authRoutes = require('./routes/authRoutes');
const syllabusRoutes = require('./routes/syllabusRoutes'); 
const practiceRoutes = require('./routes/practiceRoutes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Routes ---
app.use('/api/auth', authRoutes);       // Login & Register
app.use('/api/syllabus', syllabusRoutes); // AI & Uploads
app.use('/api/practice', practiceRoutes); // Practice Lab

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