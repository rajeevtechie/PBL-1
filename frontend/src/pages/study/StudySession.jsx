import React, { useState, useEffect } from 'react';
import { X, Play, Pause, FileText, Video, Code, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './StudySession.module.css';

const StudySession = () => {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isActive, setIsActive] = useState(false);

  // Timer Logic
  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      alert("Session Complete! Great job.");
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  // Format time (mm:ss)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => setIsActive(!isActive);

  return (
    <div className={styles.focusContainer}>
      
      {/* 1. MINIMAL HEADER */}
      <header className={styles.header}>
        <div className={styles.topicInfo}>
          <span className={styles.badge}>Focus Mode</span>
          <h1>Database Indexing & B-Trees</h1>
        </div>
        <button className={styles.exitBtn} onClick={() => navigate('/dashboard')}>
          <X size={20} />
          <span>End Session</span>
        </button>
      </header>

      <div className={styles.contentGrid}>
        
        {/* 2. THE TIMER (Center Stage) */}
        <main className={styles.timerSection}>
          <div className={styles.timerCircle}>
            <div className={styles.timeDisplay}>{formatTime(timeLeft)}</div>
            <p className={styles.statusText}>{isActive ? "Stay Focused..." : "Ready to Start?"}</p>
          </div>
          
          <div className={styles.controls}>
            <button className={styles.toggleBtn} onClick={toggleTimer}>
              {isActive ? <Pause size={32} fill="white" /> : <Play size={32} fill="white" />}
            </button>
          </div>
        </main>

        {/* 3. RESOURCES PANEL (Right Side) */}
        <aside className={styles.resourcesPanel}>
          <h3>Session Resources</h3>
          <div className={styles.resourceList}>
            <div className={styles.resourceCard}>
              <FileText size={18} className={styles.icon} />
              <div>
                <h4>Lecture Notes (PDF)</h4>
                <span className={styles.tag}>Read</span>
              </div>
            </div>
            
            <div className={styles.resourceCard}>
              <Video size={18} className={styles.icon} />
              <div>
                <h4>B-Trees Visualization</h4>
                <span className={styles.tag}>Watch</span>
              </div>
            </div>

            <div className={styles.resourceCard}>
              <Code size={18} className={styles.icon} />
              <div>
                <h4>Practice: Implement Insert</h4>
                <span className={styles.tag}>Code</span>
              </div>
            </div>
          </div>

          <div className={styles.notesArea}>
             <h3>Quick Notes</h3>
             <textarea placeholder="Type your key takeaways here..." className={styles.notesInput}></textarea>
          </div>
        </aside>

      </div>
    </div>
  );
};

export default StudySession;