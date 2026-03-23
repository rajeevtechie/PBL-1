import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from "../Sidebar/Sidebar";
import styles from './MainLayout.module.css';
import { useFocus } from '../../../context/FocusContext'; 
import { Play, Pause, Maximize2, GripVertical } from 'lucide-react';

const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isActive, isPaused, remainingSeconds, selectedSubject, pauseSession, resumeSession } = useFocus();

  // --- DYNAMIC PROFILE STATE ---
  const [userName, setUserName] = useState(localStorage.getItem('userName') || 'User');
  const [userAvatar, setUserAvatar] = useState(localStorage.getItem('userAvatar') || null);

  // --- DRAGGABLE TIMER STATE ---
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Handle Drag Start
  const handleMouseDown = (e) => {
    // Prevent dragging if the user is clicking a button
    if (e.target.closest('button')) return; 
    
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - dragPos.x,
      y: e.clientY - dragPos.y
    };
  };

  // Handle Drag Move & End (Attached to Document so it tracks outside the widget)
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      setDragPos({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // --- THEME & SETTINGS BOOTUP ---
  useEffect(() => {
    const savedPrefs = JSON.parse(localStorage.getItem('appPreferences') || '{"darkMode":true}');
    if (!savedPrefs.darkMode) document.body.classList.add('light-theme');
    else document.body.classList.remove('light-theme');

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

      {/* FLOATING GLOBAL WIDGET - NOW DRAGGABLE! */}
      {isActive && (
        <div 
          className={styles.floatingTimer}
          onMouseDown={handleMouseDown}
          style={{ 
            transform: `translate(${dragPos.x}px, ${dragPos.y}px)`,
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none', // Prevents text highlighting while dragging
            transition: isDragging ? 'none' : 'box-shadow 0.2s ease', // Disables transition during drag for 0 latency
            boxShadow: isDragging ? '0 20px 40px rgba(0,0,0,0.6)' : '0 10px 25px rgba(0,0,0,0.5)'
          }}
        >
          {/* Visual Grip Handle */}
          <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-dim)', marginRight: '8px', opacity: 0.7 }}>
            <GripVertical size={18} />
          </div>

          <div className={styles.timerInfo} onClick={() => navigate('/focus')} style={{ cursor: 'pointer' }}>
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