import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Play, Pause, Square, Folder, BookOpen, Code, Edit3, Clock, ArrowLeft, Star, Loader2 } from 'lucide-react';
import axios from 'axios';
import styles from './StudySession.module.css';
import { useFocus } from '../../context/FocusContext'; 

const StudySession = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { 
    selectedSubject, setSelectedSubject,
    targetMinutes, setTargetMinutes,
    remainingSeconds, setRemainingSeconds,
    isActive, isPaused,
    startSession, pauseSession, resumeSession, stopSession
  } = useFocus();

  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(!selectedSubject);
  const [notes, setNotes] = useState('');
  
  const [showRating, setShowRating] = useState(false);
  const [ratingValue, setRatingValue] = useState(5); 

  // 🌟 FIX: A 'routing ready' flag to prevent early rendering while we parse the URL
  const [isRoutingReady, setIsRoutingReady] = useState(false);

  useEffect(() => {
    // 1. Look for incoming subject requests
    let passedSubject = location.state?.defaultSubject || location.state?.subjectName;
    
    if (!passedSubject && location.search) {
      const searchParams = new URLSearchParams(location.search);
      const urlSubject = searchParams.get('subject');
      if (urlSubject) passedSubject = urlSubject;
    }

    // 2. Execute state changes
    if (!passedSubject && !isActive && selectedSubject) {
        // Only clear if we genuinely arrived with nothing and aren't active
        setSelectedSubject(null);
    } else if (passedSubject && !isActive && selectedSubject !== passedSubject) {
        // Set the new subject!
        setSelectedSubject(passedSubject);
    }

    // 3. Mark routing as complete so the UI can render safely
    setIsRoutingReady(true);
    
    // We intentionally DO NOT wipe the URL here. We leave it alone to prevent double-renders.
    // The Back button handles the actual URL cleanup when the user decides to leave.
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.state, location.search, isActive]);

  useEffect(() => {
    if (isRoutingReady && !selectedSubject) {
      const fetchSubjects = async () => {
        setLoadingSubjects(true);
        try {
          const token = localStorage.getItem('token');
          const res = await axios.get('http://localhost:5000/api/syllabus/list', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setSubjects(res.data);
        } catch  {
          console.error("Failed to load subjects");
        } finally {
          setLoadingSubjects(false);
        }
      };
      fetchSubjects();
    }
  }, [selectedSubject, isRoutingReady]);

  const handleNavigateToPractice = () => {
    navigate('/assessment', { state: { subjectName: selectedSubject } });
  };

  const handleInitiateStop = () => {
    const studiedSeconds = (targetMinutes * 60) - remainingSeconds;
    
    if (studiedSeconds < 60) {
        stopSession(0);
        setSelectedSubject(null);
        navigate('/dashboard'); 
    } else {
        if (!isPaused) pauseSession(); 
        setShowRating(true);
    }
  };

  const handleStopAndSave = async (score) => {
    setShowRating(false);
    await stopSession(score); 
    setSelectedSubject(null); 
    navigate('/dashboard'); 
  };

  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // 🌟 FIX: Prevent the component from rendering the wrong page while it figures out the URL
  if (!isRoutingReady) {
    return (
        <div className={styles.container} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <Loader2 size={32} className={styles.spin} color="var(--primary)" />
        </div>
    );
  }

  // --- 1. BRIDGE PAGE (SUBJECT SELECTION) ---
  if (!selectedSubject) {
    return (
      <div className={styles.container}>
        <header className={`${styles.header} ${styles.animateFadeInUp}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', color: 'var(--text-dim)', marginBottom: '20px' }} onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={20} /> Back to Dashboard
          </div>
          <div>
            <span className={styles.badge}>Focus Engine</span>
            <h2>What are we studying today?</h2>
            <p className={styles.subText}>Select a subject to accurately track your progress.</p>
          </div>
        </header>
        
        {loadingSubjects ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-dim)', marginTop: '20px' }}>
                <Loader2 size={18} className={styles.spin} /> Loading your subjects...
            </div>
        ) : (
          <div className={styles.subjectGrid}>
            {subjects.length === 0 ? (
               <div className={`${styles.subjectCard} ${styles.animateFadeInUp}`}>
                 <p style={{color: 'var(--text-dim)'}}>No subjects found. Upload a syllabus from the Dashboard first.</p>
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

  // --- 2. TIMER PAGE ---
  return (
    <div className={styles.container}>
      <header className={`${styles.headerRow} ${styles.animateFadeInUp}`}>
        <div>
          {!isActive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: 'var(--text-dim)', marginBottom: '15px', fontWeight: '500' }} onClick={() => {
                setSelectedSubject(null);
                // 🌟 FIX: Clean the URL when the user explicitly clicks "Back"
                navigate('/study', { replace: true, state: {} }); 
            }}>
              <ArrowLeft size={18} /> Back to Subjects
            </div>
          )}
          <span className={styles.badge}>FOCUS MODE</span>
          <h2 className={styles.title}>{selectedSubject}</h2>
        </div>
      </header>

      <div className={styles.splitLayout}>
        <div className={`${styles.timerPanel} ${styles.animateFadeInUp}`} style={{ animationDelay: '0.1s' }}>
          <div className={styles.timeSelector}>
            <Clock size={16} color="var(--text-dim)"/>
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
            <div className={styles.timeDisplay} style={{ color: isPaused ? '#f59e0b' : 'var(--text-main)' }}>
               {formatTime(remainingSeconds)}
            </div>
            <div className={styles.timerStatus}>
              {isActive ? (isPaused ? "Paused" : "Focusing...") : "Ready to Start?"}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            {!isActive ? (
              <button className={`${styles.startBtn} ${styles.btnPulseHover}`} onClick={startSession}>
                <Play size={28} fill="currentColor" />
              </button>
            ) : (
              <>
                <button 
                  className={styles.btnPulseHover} 
                  onClick={isPaused ? resumeSession : pauseSession}
                  style={{ background: isPaused ? '#10b981' : 'rgba(245, 158, 11, 0.2)', color: isPaused ? 'white' : '#f59e0b', border: isPaused ? 'none' : '1px solid #f59e0b', padding: '14px 28px', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                >
                  {isPaused ? <Play size={20} fill="currentColor"/> : <Pause size={20} fill="currentColor"/>}
                  {isPaused ? 'Resume' : 'Pause'}
                </button>

                <button className={`${styles.stopBtn} ${styles.btnPulseHover}`} onClick={handleInitiateStop}>
                  <Square size={20} fill="currentColor" /> Stop
                </button>
              </>
            )}
          </div>
        </div>

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
                <span className={styles.resourceTag}>Practice</span>
              </div>
            </div>
          </div>

          <h3 className={styles.panelTitle} style={{marginTop: '30px'}}>Quick Notes</h3>
          <div className={styles.notesWrapper}>
            <textarea className={styles.notesArea} placeholder="Type your key takeaways here..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            <Edit3 size={16} className={styles.notesIcon} />
          </div>
        </div>
      </div>

      {/* --- 3. RATING MODAL OVERLAY --- */}
      {showRating && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <div style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '40px', width: '90%', maxWidth: '420px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                <h3 style={{ fontSize: '1.8rem', margin: '0 0 10px 0', color: 'var(--text-main)', fontWeight: '800' }}>Session Complete</h3>
                <p style={{ color: 'var(--text-dim)', fontSize: '1.05rem', marginBottom: '30px' }}>How focused were you during this session?</p>
                
                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '40px' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                        <Star 
                            key={star} 
                            size={42} 
                            fill={star <= ratingValue ? '#f59e0b' : 'transparent'} 
                            color={star <= ratingValue ? '#f59e0b' : '#475569'}
                            onClick={() => setRatingValue(star)}
                            style={{ cursor: 'pointer', transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}
                            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.2)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                        />
                    ))}
                </div>

                <button 
                    onClick={() => handleStopAndSave(ratingValue * 20)}
                    style={{ background: '#10b981', color: 'white', border: 'none', padding: '14px 30px', borderRadius: '12px', fontSize: '1.15rem', fontWeight: 'bold', cursor: 'pointer', width: '100%', transition: 'background 0.2s', boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4)' }}
                    onMouseOver={e => e.currentTarget.style.background = '#059669'}
                    onMouseOut={e => e.currentTarget.style.background = '#10b981'}
                >
                    Log Session & Exit
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default StudySession;