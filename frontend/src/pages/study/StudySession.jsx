import React, { useState, useEffect } from 'react';
import { X, Play, Square, FileText, Video, Code, Clock, Activity, ListChecks } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './StudySession.module.css';

const StudySession = () => {
  const navigate = useNavigate();
  
  // --- STATE MANAGEMENT ---
  const [isActive, setIsActive] = useState(false);
  const [targetMinutes, setTargetMinutes] = useState(25);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [studiedSeconds, setStudiedSeconds] = useState(0); 
  
  const [showReflection, setShowReflection] = useState(false);
  const [focusScore, setFocusScore] = useState(50);
  const [sessionStartTime, setSessionStartTime] = useState(null);

  // --- DYNAMIC DATA STATES ---
  const [subjectName, setSubjectName] = useState("General Study");
  const [resources, setResources] = useState([]);

  // --- INTERCEPT PRACTICE LAB DATA ON LOAD ---
  useEffect(() => {
    // Pull data using your exact Practice Lab keys
    const selectedTopics = JSON.parse(localStorage.getItem('practiceSelectedTopics') || '[]');
    const quizResults = JSON.parse(localStorage.getItem('practiceQuizResults') || '[]');
    const settings = JSON.parse(localStorage.getItem('practiceSettings') || '{}');

    // Set the Main Focus Topic dynamically based on what they selected
    const currentSubject = selectedTopics.length > 0 
      ? selectedTopics.join(', ') 
      : "General Focus Session";
      
    setSubjectName(currentSubject);

    // Build the Resource Sidebar Dynamically
    const dynamicCards = [];

    // Card 1: Review base material
    dynamicCards.push({
      id: 'read-material',
      title: 'Review Syllabus & Notes',
      tag: 'Read',
      icon: <FileText size={18} className={styles.icon} />,
      action: () => navigate('/assessment') 
    });

    // Card 2: Dynamic YouTube Search based on their FIRST selected topic
    if (selectedTopics.length > 0) {
      dynamicCards.push({
        id: 'youtube-visual',
        title: `${selectedTopics[0]} Visualized`,
        tag: 'Watch',
        icon: <Video size={18} className={styles.icon} />,
        action: () => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(selectedTopics[0] + ' computer science explanation')}`, '_blank')
      });
    }

    // Card 3: Link to the generated quiz or prompt to make one
    if (quizResults.length > 0) {
      dynamicCards.push({
        id: 'solve-quiz',
        title: `Solve Generated ${settings.mode || 'Quiz'}`,
        tag: 'Practice',
        icon: <ListChecks size={18} className={styles.icon} />,
        action: () => navigate('/practice-quiz') 
      });
    } else {
      dynamicCards.push({
        id: 'make-quiz',
        title: 'Generate Practice Set',
        tag: 'Code',
        icon: <Code size={18} className={styles.icon} />,
        action: () => navigate('/practice-topics')
      });
    }

    setResources(dynamicCards);
  }, [navigate]);

  // --- TIMING LOGIC (Background-Tab Proof) ---
  useEffect(() => {
    let interval;
    if (isActive) {
      const storedEndTime = localStorage.getItem('studyEndTime');
      let expectedEndTime;

      if (!storedEndTime) {
        expectedEndTime = Date.now() + (targetMinutes * 60 * 1000);
        localStorage.setItem('studyEndTime', expectedEndTime.toString());
        setSessionStartTime(new Date().toISOString());
      } else {
        expectedEndTime = parseInt(storedEndTime, 10);
      }

      interval = setInterval(() => {
        const now = Date.now();
        const diffInSeconds = Math.round((expectedEndTime - now) / 1000);

        if (diffInSeconds <= 0) {
          clearInterval(interval);
          setRemainingSeconds(0);
          handleSessionComplete(targetMinutes * 60); 
        } else {
          setRemainingSeconds(diffInSeconds);
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, targetMinutes]);

  // Keep timer display synced if target minutes change manually before starting
  useEffect(() => {
    if (!isActive) {
      setRemainingSeconds(targetMinutes * 60);
    }
  }, [targetMinutes, isActive]);

  // --- HANDLERS ---
  const handleStart = () => {
    setIsActive(true);
    setShowReflection(false);
  };

  const handleSessionComplete = (totalSecondsStudied) => {
    setIsActive(false);
    setStudiedSeconds(totalSecondsStudied);
    localStorage.removeItem('studyEndTime');
    setShowReflection(true);
  };

  const handleStopEarly = () => {
    const actualSeconds = (targetMinutes * 60) - remainingSeconds;
    handleSessionComplete(actualSeconds);
  };

  const handleSaveSession = async () => {
    const durationMinutes = Math.floor(studiedSeconds / 60);
    const endTime = new Date().toISOString();

    if (durationMinutes < 1) {
      alert("Session too short! You must focus for at least 1 minute to log data.");
      resetState();
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const payload = {
        subjectName: subjectName,
        startTime: sessionStartTime,
        endTime: endTime,
        durationMinutes: durationMinutes,
        focusScore: focusScore
      };

      await axios.post('http://localhost:5000/api/practice/log-session', payload, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      alert("Awesome work! Session logged successfully.");
      resetState();

    } catch (error) {
      console.error("Error logging session:", error);
      alert(error.response?.data?.message || "Failed to save session.");
    }
  };

  const resetState = () => {
    setIsActive(false);
    setRemainingSeconds(targetMinutes * 60);
    setSessionStartTime(null);
    setShowReflection(false);
    setFocusScore(50);
    localStorage.removeItem('studyEndTime');
  };

  // --- UPGRADED FORMAT TIME LOGIC (Supports > 60 mins) ---
  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  return (
    <div className={styles.focusContainer}>
      
      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.topicInfo}>
          <span className={styles.badge}>Focus Mode</span>
          <h1>{subjectName}</h1>
        </div>
        <button className={styles.exitBtn} onClick={() => {
          if (isActive) handleStopEarly();
          else navigate('/dashboard');
        }}>
          <X size={20} />
          <span>{isActive ? "End Early" : "Exit"}</span>
        </button>
      </header>

      {/* GRID LAYOUT */}
      <div className={styles.contentGrid}>
        
        {/* LEFT COLUMN: TIMER */}
        <main className={styles.timerSection}>
          {!showReflection ? (
            <>
              {!isActive && (
                <div className={styles.durationSetter}>
                  <Clock size={16} />
                  
                  {/* WRAPPER HACK APPLIED HERE */}
                  <div className={styles.inputWrapper}>
                    <input 
                      type="number" 
                      min="1" 
                      max="480" 
                      value={targetMinutes}
                      onChange={(e) => {
                        let val = Number(e.target.value);
                        if (val > 480) val = 480; 
                        if (val < 1 && e.target.value !== "") val = 1;
                        setTargetMinutes(val);
                      }}
                      className={styles.durationInput}
                    />
                  </div>
                  
                  <span>mins</span>
                </div>
              )}

              <div className={styles.timerCircle}>
                <div className={styles.timeDisplay}>{formatTime(remainingSeconds)}</div>
                <p className={styles.statusText}>{isActive ? "Stay Focused..." : "Ready to Start?"}</p>
              </div>
              
              <div className={styles.controls}>
                {!isActive ? (
                  <button className={`${styles.toggleBtn} ${styles.startBtn}`} onClick={handleStart}>
                    <Play size={32} fill="white" style={{marginLeft: '4px'}} />
                  </button>
                ) : (
                  <button className={`${styles.toggleBtn} ${styles.stopBtn}`} onClick={handleStopEarly}>
                    <Square size={24} fill="white" />
                  </button>
                )}
              </div>
            </>
          ) : (
            /* REFLECTION MODAL (Replaces Timer) */
            <div className={styles.reflectionPhase}>
                <h3><Activity size={22} color="#3b82f6" style={{marginRight: '10px'}}/> Session Complete</h3>
                <p>You studied for <strong>{Math.floor(studiedSeconds / 60)} minutes</strong>. How focused were you?</p>
                
                <input 
                    type="range" 
                    min="1" 
                    max="100" 
                    value={focusScore}
                    onChange={(e) => setFocusScore(Number(e.target.value))}
                    className={styles.focusSlider}
                />
                
                <div className={styles.sliderLabels}>
                    <span>Distracted</span>
                    <strong style={{color: '#3b82f6'}}>{focusScore}%</strong>
                    <span>Deep Flow</span>
                </div>

                <div className={styles.reflectionActions}>
                    <button onClick={handleSaveSession} className={styles.saveBtn}>Save Log</button>
                    <button onClick={resetState} className={styles.discardBtn}>Discard</button>
                </div>
            </div>
          )}
        </main>

        {/* RIGHT COLUMN: DYNAMIC RESOURCES */}
        <aside className={styles.resourcesPanel}>
          <h3>Session Resources</h3>
          <div className={styles.resourceList}>
            {resources.map((resource) => (
              <div 
                key={resource.id} 
                className={styles.resourceCard}
                onClick={resource.action}
              >
                {resource.icon}
                <div>
                  <h4>{resource.title}</h4>
                  <span className={styles.tag}>{resource.tag}</span>
                </div>
              </div>
            ))}
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