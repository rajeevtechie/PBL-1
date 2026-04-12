import React from 'react';
import Terms from './pages/Terms/Terms';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// === GLOBAL CONTEXT ===
import { FocusProvider } from './context/FocusContext'; // ✅ The Brain of the Timer

// === LAYOUTS ===
import MainLayout from './Components/layout/MainLayout/MainLayout';

// === PUBLIC PAGES ===
import Landing from './pages/landing/Landing';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register'; 

// === CORE DASHBOARD PAGES ===
import Dashboard from './pages/dashboard/Dashboard';
import Roadmap from './pages/roadmap/Roadmap';        
import Analytics from './pages/analytics/Analytics';  
import Assessment from './pages/practise_lab/practise_lab'; 
import PractiseTopics from './pages/practise_lab/practise_topics';
import PractiseQuiz from './pages/practise_lab/practise_quiz';
import Library from './pages/library/Library';
import Insights from './pages/insights/Insights';     
import Settings from './pages/settings/Settings';     

// === STANDALONE PAGES ===
import StudySession from './pages/study/StudySession'; 

function App() {
  return (
    // 🌟 WRAPPING THE ENTIRE APP IN THE FOCUS PROVIDER 🌟
    <FocusProvider>
      <BrowserRouter>
        <Routes>

          {/* ====================================================
              1. PUBLIC ROUTES (Accessible without Sidebar)
             ==================================================== */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/terms" element={<Terms />} />

          {/* ====================================================
              2. PROTECTED APP ROUTES (Wrapped in MainLayout)
             ==================================================== */}
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/roadmap" element={<Roadmap />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/assessment" element={<Assessment />} />
            <Route path="/practice-topics" element={<PractiseTopics />} />
            <Route path="/practice-quiz" element={<PractiseQuiz />} />
            <Route path="/library" element={<Library />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* ====================================================
              3. STANDALONE ROUTES (Distraction Free)
             ==================================================== */}
          {/* I left both /study and /focus pointing to the same place just in case! */}
          <Route path="/study" element={<StudySession />} />
          <Route path="/focus" element={<StudySession />} />

        </Routes>
      </BrowserRouter>
    </FocusProvider>
  );
}

export default App;