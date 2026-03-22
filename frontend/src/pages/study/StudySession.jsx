import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Play, Square, X, Folder, BookOpen, Code, Edit3, Clock } from 'lucide-react';
import axios from 'axios';
import styles from './StudySession.module.css';

const StudySession = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [selectedSubject, setSelectedSubject] = useState(location.state?.subjectName || null);
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(!selectedSubject);

  const [targetMinutes, setTargetMinutes] = useState(25);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!selectedSubject) {
      const fetchSubjects = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await axios.get('http://localhost:5000/api/syllabus/list', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setSubjects(res.data);
        } catch (err) {
          console.error("Failed to load subjects");
        } finally {
          setLoadingSubjects(false);
        }
      };
      fetchSubjects();
    }
  }, [selectedSubject]);

  useEffect(() => {
    let interval;
    if (isActive && remainingSeconds > 0) {
      interval = setInterval(() => {
        setRemainingSeconds((prev) => prev - 1);
      }, 1000);
    } else if (isActive && remainingSeconds === 0) {
      clearInterval(interval);
      handleStopSession(); 
    }
    return () => clearInterval(interval);
  }, [isActive, remainingSeconds]);

  const handleStartSession = () => {
    setIsActive(true);
    setSessionStartTime(new Date().toISOString());
  };

  const handleStopSession = async () => {
    setIsActive(false);
    const actualStudiedSeconds = (targetMinutes * 60) - remainingSeconds;
    const durationMinutes = Math.floor(actualStudiedSeconds / 60);

    if (durationMinutes >= 1) {
      try {
        const token = localStorage.getItem('token');
        await axios.post('http://localhost:5000/api/practice/log-session', {
          subjectName: selectedSubject,
          startTime: sessionStartTime,
          endTime: new Date().toISOString(),
          durationMinutes: durationMinutes,
          focusScore: 90 
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        alert(`Awesome job! ${durationMinutes} minutes logged to your Dashboard.`);
      } catch (err) {
        console.error("Failed to log session:", err);
      }
    } else {
      alert("Session was too short to record (under 1 minute).");
    }

    setRemainingSeconds(targetMinutes * 60);
    setSessionStartTime(null);
  };

  const handleNavigateToPractice = () => {
    if (selectedSubject === 'General Focus Session') {
      navigate('/assessment');
    } else {
      navigate('/assessment', { state: { subjectName: selectedSubject } });
    }
  };

  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // --- STEP 0: SUBJECT SELECTION GATE ---
  if (!selectedSubject) {
    return (
      <div className={styles.container}>
        <header className={`${styles.header} ${styles.animateFadeInUp}`}>
          <div>
            <span className={styles.badge}>Focus Engine</span>
            <h2>What are we studying today?</h2>
            <p className={styles.subText}>Select a subject to accurately track your progress.</p>
          </div>
        </header>
        
        {loadingSubjects ? <p style={{color: '#94a3b8'}}>Loading your subjects...</p> : (
          <div className={styles.subjectGrid}>
            {subjects.length === 0 ? (
               <div className={`${styles.subjectCard} ${styles.animateFadeInUp}`}>
                 <p style={{color: '#94a3b8'}}>No subjects found. Upload a syllabus from the Dashboard first.</p>
               </div>
            ) : (
              [{ id: 'general', course_title: 'General Focus Session' }, ...subjects].map((sub, index) => (
                <div 
                  key={sub.id} 
                  className={`${styles.subjectCard} ${styles.animateFadeInUp}`} 
                  onClick={() => setSelectedSubject(sub.course_title)}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <Folder size={32} color={sub.id === 'general' ? '#10b981' : '#38bdf8'} />
                  <h3>{sub.course_title}</h3>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  // --- STEP 1: MAIN FOCUS UI ---
  return (
    <div className={styles.container}>
      <header className={`${styles.headerRow} ${styles.animateFadeInUp}`}>
        <div>
          <span className={styles.badge}>FOCUS MODE</span>
          <h2 className={styles.title}>{selectedSubject}</h2>
        </div>
        <button className={`${styles.exitBtn} ${styles.btnPulseHover}`} onClick={() => navigate('/dashboard')}>
          <X size={16} /> Exit
        </button>
      </header>

      <div className={styles.splitLayout}>
        
        {/* LEFT PANEL: TIMER */}
        <div className={`${styles.timerPanel} ${styles.animateFadeInUp}`} style={{ animationDelay: '0.1s' }}>
          <div className={styles.timeSelector}>
            <Clock size={16} color="#94a3b8"/>
            <input 
              type="number" 
              value={targetMinutes}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val > 0) {
                  setTargetMinutes(val);
                  if (!isActive) setRemainingSeconds(val * 60);
                }
              }}
              disabled={isActive}
              className={styles.timeInput}
            />
            <span>mins</span>
          </div>

          <div className={styles.timerCircle}>
            <div className={styles.timeDisplay}>{formatTime(remainingSeconds)}</div>
            <div className={styles.timerStatus}>{isActive ? "Focusing..." : "Ready to Start?"}</div>
          </div>

          {!isActive ? (
            <button className={`${styles.startBtn} ${styles.btnPulseHover}`} onClick={handleStartSession}>
              <Play size={28} fill="currentColor" />
            </button>
          ) : (
            <button className={`${styles.stopBtn} ${styles.btnPulseHover}`} onClick={handleStopSession}>
              <Square size={20} fill="currentColor" />
              Stop Focus
            </button>
          )}
        </div>

        {/* RIGHT PANEL: RESOURCES & NOTES */}
        <div className={`${styles.resourcesPanel} ${styles.animateFadeInUp}`} style={{ animationDelay: '0.2s' }}>
          
          <h3 className={styles.panelTitle}>Session Resources</h3>
          <div className={styles.resourceList}>
            <div className={`${styles.resourceCard} ${styles.btnPulseHover}`} onClick={() => navigate('/library')}>
              <BookOpen size={20} color="#3b82f6" />
              <div>
                <h4>Review Syllabus & Notes</h4>
                <span className={styles.resourceTag}>Read</span>
              </div>
            </div>
            
            <div className={`${styles.resourceCard} ${styles.btnPulseHover}`} onClick={handleNavigateToPractice}>
              <Code size={20} color="#8b5cf6" />
              <div>
                <h4>Generate Practice Set</h4>
                <span className={styles.resourceTag}>Code</span>
              </div>
            </div>
          </div>

          <h3 className={styles.panelTitle} style={{marginTop: '30px'}}>Quick Notes</h3>
          <div className={styles.notesWrapper}>
            <textarea 
              className={styles.notesArea}
              placeholder="Type your key takeaways here..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <Edit3 size={16} className={styles.notesIcon} />
          </div>

        </div>
      </div>
    </div>
  );
};

export default StudySession;