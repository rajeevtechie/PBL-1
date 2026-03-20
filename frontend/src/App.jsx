import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// === LAYOUTS ===
import MainLayout from './Components/layout/MainLayout/MainLayout';

// === PUBLIC PAGES ===
import Landing from './pages/landing/Landing';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register'; // ✅ Imported correctly

// === CORE DASHBOARD PAGES ===
import Dashboard from './pages/dashboard/Dashboard';
import Roadmap from './pages/roadmap/Roadmap';        // Feature 3: Dual Track
import Analytics from './pages/analytics/Analytics';  // Feature 4 & 6: Velocity & Flow State
import Assessment from './pages/practise_lab/practise_lab'; // Feature 1: Practice Lab
import PractiseTopics from './pages/practise_lab/practise_topics';
import PractiseQuiz from './pages/practise_lab/practise_quiz';
import Insights from './pages/insights/Insights';     // Feature 2: AI Narratives
import Settings from './pages/settings/Settings';     // User Config

// === STANDALONE PAGES ===
import StudySession from './pages/study/StudySession'; // Focus Mode (No Sidebar)

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ====================================================
            1. PUBLIC ROUTES (Accessible without Sidebar)
           ==================================================== */}
        {/* The Landing Page is the first thing users see */}
        <Route path="/" element={<Landing />} />
        
        {/* Auth Pages */}
        <Route path="/login" element={<Login />} />
        
        {/* ✅ CORRECTED: Now points to the Register component */}
        <Route path="/register" element={<Register />} />


        {/* ====================================================
            2. PROTECTED APP ROUTES (Wrapped in MainLayout)
            These pages get the Sidebar and Top Header.
           ==================================================== */}
        <Route element={<MainLayout />}>
          {/* Main Dashboard (The Command Center) */}
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* Feature Pages */}
          <Route path="/roadmap" element={<Roadmap />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/assessment" element={<Assessment />} />
          <Route path="/practice-topics" element={<PractiseTopics />} />
          <Route path="/practice-quiz" element={<PractiseQuiz />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/settings" element={<Settings />} />
        </Route>


        {/* ====================================================
            3. STANDALONE ROUTES (Distraction Free)
            Focus Mode takes over the whole screen (No Sidebar).
           ==================================================== */}
        <Route path="/study" element={<StudySession />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;