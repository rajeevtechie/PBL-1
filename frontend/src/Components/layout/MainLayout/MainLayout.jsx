import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from "../Sidebar/Sidebar";
import styles from './MainLayout.module.css';
import { useFocus } from '../../../context/FocusContext'; 
import { Play, Pause, Maximize2 } from 'lucide-react';

const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isActive, isPaused, remainingSeconds, selectedSubject, pauseSession, resumeSession } = useFocus();

  // --- DYNAMIC PROFILE STATE ---
  const [userName, setUserName] = useState(localStorage.getItem('userName') || 'User');
  const [userAvatar, setUserAvatar] = useState(localStorage.getItem('userAvatar') || null);

  useEffect(() => {
    // 1. Initial Theme Boot-up
    const savedPrefs = JSON.parse(localStorage.getItem('appPreferences') || '{"darkMode":true}');
    if (!savedPrefs.darkMode) document.body.classList.add('light-theme');
    else document.body.classList.remove('light-theme');

    // 2. Listen for Settings Changes!
    const handleProfileUpdate = () => {
      setUserName(localStorage.getItem('userName') || 'User');
      setUserAvatar(localStorage.getItem('userAvatar') || null);
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, []);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getPageTitle = () => {
    const path = location.pathname.split('/')[1];
    if (!path || path === 'dashboard') return "Dashboard";
    return path.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className={styles.layoutContainer}>
      <Sidebar />
      <main className={styles.mainContent}>
        <div className={styles.topHeader}>
          <h2>{getPageTitle()}</h2>
          
          {/* ✅ DYNAMIC PROFILE AVATAR */}
          <div className={styles.userProfile} onClick={() => navigate('/settings')} style={{ cursor: 'pointer', overflow: 'hidden' }} title="Go to Settings">
            {userAvatar ? (
              <img src={userAvatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              getInitials(userName)
            )}
          </div>
        </div>

        <div className={styles.scrollArea}>
          <Outlet />
        </div>
      </main>

      {/* FLOATING GLOBAL WIDGET */}
      {isActive && (
        <div className={styles.floatingTimer}>
          <div className={styles.timerInfo} onClick={() => navigate('/focus')}>
            <span className={styles.timerSubject}>{selectedSubject || 'Focus Session'}</span>
            <span className={styles.timerClock}>{formatTime(remainingSeconds)}</span>
          </div>
          <div className={styles.timerControls}>
            {isPaused ? (
              <button onClick={resumeSession} className={styles.controlBtn} title="Resume"><Play size={16}/></button>
            ) : (
              <button onClick={pauseSession} className={styles.controlBtn} title="Pause"><Pause size={16}/></button>
            )}
            <button onClick={() => navigate('/focus')} className={styles.controlBtn} title="Return to Session"><Maximize2 size={16}/></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainLayout;