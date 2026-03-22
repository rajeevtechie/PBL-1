// frontend/src/pages/practise_lab/practise_quiz.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Timer, Square, CheckCircle, Clock } from 'lucide-react'; 
import axios from 'axios';
import styles from './practise_lab.module.css';

const RESULTS_KEY = 'practiceQuizResults';
const SELECTED_KEY = 'practiceSelectedTopics';
const SETTINGS_KEY = 'practiceSettings';
const AI_QUERY_KEY = 'practiceAiQuery';

const normalizeStoredResults = (stored, currentMode) => {
  if (Array.isArray(stored)) {
    return currentMode ? [] : stored;
  }

  if (stored && Array.isArray(stored.items)) {
    if (currentMode && stored.mode && stored.mode !== currentMode) {
      return [];
    }
    return stored.items;
  }

  return [];
};

const PractiseQuiz = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [aiQuery, setAiQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [contentTitle, setContentTitle] = useState('');
  const [contentTitleError, setContentTitleError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  // --- EMBEDDED FOCUS TIMER STATE ---
  const [targetMinutes, setTargetMinutes] = useState(25);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [isFocusActive, setIsFocusActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [studiedSeconds, setStudiedSeconds] = useState(0);

  const modeMap = {
    'Quiz (MCQ)': 'quiz',
    'Short Answer': 'short',
    'Long Answer': 'long',
    'Case Study': 'case',
    'Mock Test': 'mock',
    'AI Ask': 'ai'
  };

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem(RESULTS_KEY) || '[]');
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    setItems(normalizeStoredResults(stored, settings.mode));
    const storedQuery = localStorage.getItem(AI_QUERY_KEY) || '';
    setAiQuery(storedQuery);
  }, []);

  // AUTO-START TIMER
  useEffect(() => {
    if (items.length > 0 && !isFocusActive && studiedSeconds === 0 && !sessionStartTime) {
      setIsFocusActive(true);
      setSessionStartTime(new Date().toISOString());
      localStorage.setItem('quizFocusEndTime', (Date.now() + targetMinutes * 60000).toString());
    }
  }, [items, isFocusActive, studiedSeconds, sessionStartTime, targetMinutes]);

  // Keep Timer Ticking
  useEffect(() => {
    let interval;
    if (isFocusActive) {
      const storedEndTime = parseInt(localStorage.getItem('quizFocusEndTime'), 10);
      interval = setInterval(() => {
        const diff = Math.round((storedEndTime - Date.now()) / 1000);
        if (diff <= 0) {
          clearInterval(interval);
          setRemainingSeconds(0);
          handleStopFocus(targetMinutes * 60);
        } else {
          setRemainingSeconds(diff);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isFocusActive, targetMinutes]);

  // --- DYNAMIC TIME EDITING LOGIC ---
  const handleTimeChange = (e) => {
    let val = e.target.value;
    
    // Allow empty state while typing
    if (val === '') {
      setTargetMinutes('');
      return;
    }

    const mins = Number(val);
    if (mins < 1 || isNaN(mins)) return; // Prevent negative or invalid numbers
    
    setTargetMinutes(mins);

    // If timer is already running, dynamically push the expected end time further out
    if (isFocusActive && sessionStartTime) {
      const newEndTime = new Date(sessionStartTime).getTime() + (mins * 60000);
      localStorage.setItem('quizFocusEndTime', newEndTime.toString());
      
      const diff = Math.round((newEndTime - Date.now()) / 1000);
      setRemainingSeconds(diff > 0 ? diff : 0);
    } else {
      setRemainingSeconds(mins * 60);
    }
  };

  const handleTimeBlur = () => {
    // Failsafe: if they click away and left it empty, reset to 25
    if (!targetMinutes || targetMinutes < 1) {
      setTargetMinutes(25);
      if (isFocusActive && sessionStartTime) {
        const newEndTime = new Date(sessionStartTime).getTime() + (25 * 60000);
        localStorage.setItem('quizFocusEndTime', newEndTime.toString());
      } else {
        setRemainingSeconds(25 * 60);
      }
    }
  };

  const handleStopFocus = async (secondsOverride) => {
    setIsFocusActive(false);
    
    // Fallback safely if targetMinutes is empty string
    const safeTargetMins = Number(targetMinutes) || 25;
    const actualSeconds = secondsOverride !== undefined ? secondsOverride : (safeTargetMins * 60) - remainingSeconds;
    
    setStudiedSeconds(actualSeconds);
    localStorage.removeItem('quizFocusEndTime');

    const durationMinutes = Math.floor(actualSeconds / 60);
    
    if (durationMinutes >= 1) {
      try {
        const token = localStorage.getItem('token');
        const subjectName = localStorage.getItem('practiceSubject') || 'Practice Review';
        
        await axios.post('http://localhost:5000/api/practice/log-session', {
          subjectName: subjectName,
          startTime: sessionStartTime,
          endTime: new Date().toISOString(),
          durationMinutes: durationMinutes,
          focusScore: 85 
        }, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        setSaveSuccess(`Session Completed! ${durationMinutes} minutes recorded to Analytics.`);
        setTimeout(() => setSaveSuccess(''), 5000);

      } catch (err) {
        console.error("Failed to auto-log session", err);
        setSaveError("Session finished, but failed to sync to Dashboard.");
      }
    } else {
      setSaveError("Session too short to record (Under 1 minute).");
      setTimeout(() => setSaveError(''), 5000);
    }
  };

  const handleGenerateMore = async () => {
    setGenerateError('');

    const selectedTopics = JSON.parse(localStorage.getItem(SELECTED_KEY) || '[]');
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    const selectedMode = modeMap[settings.mode];

    if (!selectedMode) {
      setGenerateError('Please select a practice mode first.');
      return;
    }

    if (!Array.isArray(selectedTopics) || selectedTopics.length === 0) {
      setGenerateError('Select topics first, then generate more questions.');
      return;
    }

    const difficultyMap = {
      Easy: 'easy',
      Medium: 'medium',
      Hard: 'hard',
      'Exam Level': 'exam'
    };

    const payload = {
      mode: selectedMode,
      topic: selectedTopics.join(', '),
      difficulty: difficultyMap[settings.difficulty] || 'medium',
      numQuestions: Number(settings.questionCount) || 5
    };

    if (selectedMode === 'ai') {
      if (!aiQuery.trim()) {
        setGenerateError('Enter your AI query before generating.');
        return;
      }
      payload.userQuery = aiQuery.trim();
    }

    setIsGenerating(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/practice/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to generate more questions.');
      }

      const nextItems = Array.isArray(data.data) ? data.data : [];
      const storedResults = {
        mode: settings.mode || '',
        items: nextItems
      };
      localStorage.setItem(RESULTS_KEY, JSON.stringify(storedResults));
      setItems(nextItems);

      setStudiedSeconds(0);
      setSessionStartTime(null);
      setIsFocusActive(false);

    } catch (error) {
      setGenerateError(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToLibrary = async (titleValue) => {
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    const selectedMode = modeMap[settings.mode];

    if (!selectedMode) {
      setSaveError('Select a mode before saving.');
      return;
    }

    if (!items || items.length === 0) {
      setSaveError('Generate content before saving.');
      return;
    }

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess('');

    try {
      const token = localStorage.getItem('token');
      const selectedTopics = JSON.parse(localStorage.getItem(SELECTED_KEY) || '[]');
      const subjectName = localStorage.getItem('practiceSubject') || 'General';

      const payload = {
        title: titleValue.trim(),
        type: selectedMode,
        category: subjectName, 
        content: {
          items,
          meta: {
            mode: settings.mode,
            topics: selectedTopics,
            difficulty: settings.difficulty,
            numQuestions: settings.questionCount
          }
        }
      };

      const response = await fetch('http://localhost:5000/api/library/save-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to save content.');
      }

      setIsSaveModalOpen(false);
      setContentTitle('');
      setContentTitleError('');
      setSaveSuccess('Saved to library.');
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const openSaveModal = () => {
    setContentTitle('');
    setContentTitleError('');
    setIsSaveModalOpen(true);
  };

  const submitContentTitle = () => {
    if (!contentTitle.trim()) {
      setContentTitleError('Title is required.');
      return;
    }
    handleSaveToLibrary(contentTitle);
  };

  const renderItem = (item, index) => {
    if (item?.answer && !item?.question && !item?.scenario && !item?.section) {
      return (
        <div key={`ai-${index}`} className={styles.resultItem}>
          <div className={styles.resultQuestion}>AI Response</div>
          <div className={styles.resultAnswer}>{item.answer}</div>
          {Array.isArray(item.followups) && item.followups.length > 0 && (
            <ul className={styles.resultOptions}>
              {item.followups.map((followup, followIndex) => (
                <li key={`ai-follow-${followIndex}`}>{followup}</li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    if (item?.scenario && Array.isArray(item.questions)) {
      return (
        <div key={`case-${index}`} className={styles.resultItem}>
          <div className={styles.resultQuestion}>Case {index + 1}: {item.scenario}</div>
          <ul className={styles.resultOptions}>
            {item.questions.map((q, qIndex) => (
              <li key={`case-q-${qIndex}`}>{q.question}</li>
            ))}
          </ul>
        </div>
      );
    }

    if (item?.section && Array.isArray(item.items)) {
      return (
        <div key={`section-${index}`} className={styles.resultItem}>
          <div className={styles.resultQuestion}>Section: {item.section}</div>
          <ul className={styles.resultOptions}>
            {item.items.map((q, qIndex) => (
              <li key={`section-q-${qIndex}`}>{q.question || q.answer || 'Answer key'}</li>
            ))}
          </ul>
        </div>
      );
    }

    return (
      <div key={`${item.question}-${index}`} className={styles.resultItem}>
        <div className={styles.resultQuestion}>
          Q{index + 1}. {item.question}
        </div>
        {Array.isArray(item.options) && item.options.length > 0 && (
          <ul className={styles.resultOptions}>
            {item.options.map((option, optIndex) => (
              <li key={`${option}-${optIndex}`}>{option}</li>
            ))}
          </ul>
        )}
        {item.answer && <div className={styles.resultAnswer}>Answer: {item.answer}</div>}
        {item.explanation && (
          <div className={styles.resultExplain}>{item.explanation}</div>
        )}
      </div>
    );
  };

  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  const modeLabel = settings.mode || 'Practice';

  return (
    <div className={styles.quizContainer}>
      
      <header className={styles.quizHeader} style={{ alignItems: 'center', background: '#1e293b', padding: '20px', borderRadius: '16px', border: isFocusActive ? '1px solid #10b981' : '1px solid #334155' }}>
        <div>
          <span className={styles.badge} style={{ color: isFocusActive ? '#10b981' : '#3b82f6' }}>
            {isFocusActive ? 'Focus Engine Active' : 'Practice Lab'}
          </span>
          <h2 className={styles.quizTitle}>{modeLabel}</h2>
        </div>
        
        {items.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            
            {/* NEW: DYNAMIC TIME INPUT */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(15, 23, 42, 0.4)', padding: '6px 12px', borderRadius: '8px', border: '1px solid #334155' }}>
              <Clock size={16} color="#94a3b8" />
              <input 
                type="number" 
                value={targetMinutes} 
                onChange={handleTimeChange}
                onBlur={handleTimeBlur}
                style={{ 
                  width: '40px', 
                  background: 'transparent', 
                  border: 'none', 
                  color: '#fff', 
                  fontSize: '1rem', 
                  fontWeight: 'bold', 
                  textAlign: 'center', 
                  outline: 'none',
                  fontVariantNumeric: 'tabular-nums'
                }}
              />
              <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: '600' }}>min</span>
            </div>

            <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: isFocusActive ? '#10b981' : '#f8fafc', fontVariantNumeric: 'tabular-nums', minWidth: '100px', textAlign: 'center', letterSpacing: '1px' }}>
              {formatTime(remainingSeconds)}
            </div>

            {isFocusActive && (
              <button onClick={() => handleStopFocus()} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(239, 68, 68, 0.2)' }}>
                <Square size={16} fill="white"/> Stop Focus
              </button>
            )}
          </div>
        )}
      </header>

      {items.length === 0 ? (
        <div className={styles.extractError}>No quiz items found. Generate a quiz first.</div>
      ) : (
        <section className={styles.resultsCard}>
          <div className={styles.resultsHeader}>
            <div>
              <h3 className={styles.resultsTitle}>{modeLabel} Results</h3>
              <p className={styles.resultsSub}>Save this set to your Library for later.</p>
            </div>
            <button
              className={styles.secondaryAction}
              onClick={openSaveModal}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save to Library'}
            </button>
          </div>
          <div className={styles.resultsList}>
            {items.map((item, index) => renderItem(item, index))}
          </div>
        </section>
      )}

      {/* --- ACTION ROW --- */}
      <div className={styles.quizActionRow} style={{ alignItems: 'center' }}>
        {modeMap[settings.mode] === 'ai' && (
          <input
            className={styles.textArea}
            placeholder="Ask anything about your selected topics..."
            value={aiQuery}
            onChange={(event) => {
              const next = event.target.value;
              setAiQuery(next);
              localStorage.setItem(AI_QUERY_KEY, next);
            }}
            style={{ flex: 1, minHeight: '44px' }}
          />
        )}
        
        <button
          className={styles.finalAction}
          onClick={handleGenerateMore}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate'}
        </button>

        {/* --- MARK AS COMPLETED BUTTON --- */}
        {isFocusActive && (
          <button
            className={styles.secondaryAction}
            onClick={() => handleStopFocus()}
            style={{ marginLeft: 'auto', background: '#10b981', color: '#0f172a', border: 'none', display: 'flex', alignItems: 'center', fontWeight: 'bold', gap: '6px' }}
          >
            <CheckCircle size={18} /> 
            Mark as Completed
          </button>
        )}
      </div>
      
      <div style={{ marginTop: '10px' }}>
        {generateError && <div className={styles.generateError}>{generateError}</div>}
        {saveError && <div className={styles.generateError} style={{color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)'}}>{saveError}</div>}
        {saveSuccess && <div className={styles.successMessage} style={{color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '8px'}}>{saveSuccess}</div>}
      </div>

      {isSaveModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <h3 className={styles.modalTitle}>Save to Library</h3>
            <p className={styles.modalText}>Enter a name for this content.</p>
            <input
              className={styles.modalInput}
              value={contentTitle}
              onChange={(event) => {
                setContentTitle(event.target.value);
                setContentTitleError('');
              }}
              placeholder="e.g., Mock Test - Unit 2"
            />
            {contentTitleError && (
              <div className={styles.modalError}>{contentTitleError}</div>
            )}
            <div className={styles.modalActions}>
              <button className={styles.secondaryAction} onClick={() => setIsSaveModalOpen(false)}>
                Cancel
              </button>
              <button className={styles.finalAction} onClick={submitContentTitle} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PractiseQuiz;