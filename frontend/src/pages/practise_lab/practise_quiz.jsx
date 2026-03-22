import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Square, CheckCircle, Clock, Save, RefreshCw } from 'lucide-react'; 
import axios from 'axios';
import styles from './practise_lab.module.css';

const RESULTS_KEY = 'practiceQuizResults';
const SELECTED_KEY = 'practiceSelectedTopics';
const SETTINGS_KEY = 'practiceSettings';

const normalizeStoredResults = (stored, currentMode) => {
  if (Array.isArray(stored)) return currentMode ? [] : stored;
  if (stored && Array.isArray(stored.items)) {
    if (currentMode && stored.mode && stored.mode !== currentMode) return [];
    return stored.items;
  }
  return [];
};

const PractiseQuiz = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  
  // --- SAVE STATE ---
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [contentTitle, setContentTitle] = useState('');
  const [contentTitleError, setContentTitleError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  // --- FOCUS TIMER & EVALUATION STATE ---
  const [targetMinutes, setTargetMinutes] = useState(25);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [isFocusActive, setIsFocusActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [studiedSeconds, setStudiedSeconds] = useState(0);
  
  // --- INTERACTIVE QUIZ STATE ---
  const [userAnswers, setUserAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(null);

  const modeMap = {
    'Quiz (MCQ)': 'quiz',
    'Short Answer': 'short',
    'Long Answer': 'long',
    'Case Study': 'case',
    'Mock Test': 'mock'
    // Removed AI Ask
  };

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem(RESULTS_KEY) || '[]');
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    setItems(normalizeStoredResults(stored, settings.mode));
  }, []);

  useEffect(() => {
    if (items.length > 0 && !isFocusActive && studiedSeconds === 0 && !sessionStartTime && !isSubmitted) {
      setIsFocusActive(true);
      setSessionStartTime(new Date().toISOString());
      localStorage.setItem('quizFocusEndTime', (Date.now() + targetMinutes * 60000).toString());
    }
  }, [items, isFocusActive, studiedSeconds, sessionStartTime, targetMinutes, isSubmitted]);

  useEffect(() => {
    let interval;
    if (isFocusActive) {
      const storedEndTime = parseInt(localStorage.getItem('quizFocusEndTime'), 10);
      interval = setInterval(() => {
        const diff = Math.round((storedEndTime - Date.now()) / 1000);
        if (diff <= 0) {
          clearInterval(interval);
          setRemainingSeconds(0);
          handleSubmitQuiz(targetMinutes * 60); 
        } else {
          setRemainingSeconds(diff);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isFocusActive, targetMinutes]);

  const handleTimeChange = (e) => {
    let val = e.target.value;
    if (val === '') {
      setTargetMinutes('');
      return;
    }
    const mins = Number(val);
    if (mins < 1 || isNaN(mins)) return; 
    setTargetMinutes(mins);

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

  const handleAnswerChange = (index, value) => {
    setUserAnswers(prev => ({
      ...prev,
      [index]: value
    }));
  };

  const handleSubmitQuiz = async (secondsOverride) => {
    setIsFocusActive(false);
    setIsSubmitted(true);
    
    const safeTargetMins = Number(targetMinutes) || 25;
    const actualSeconds = secondsOverride !== undefined ? secondsOverride : (safeTargetMins * 60) - remainingSeconds;
    
    setStudiedSeconds(actualSeconds);
    localStorage.removeItem('quizFocusEndTime');

    let correctCount = 0;
    let gradableCount = 0;

    items.forEach((item, index) => {
      const isMCQ = Array.isArray(item.options) && item.options.length > 0;
      if (isMCQ && item.answer) {
        gradableCount++;
        const userAns = userAnswers[index] || '';
        const userFirstChar = userAns.trim().charAt(0).toUpperCase();
        const actualFirstChar = item.answer.trim().charAt(0).toUpperCase();
        
        if (item.answer.includes(userAns) || userFirstChar === actualFirstChar) {
          correctCount++;
        }
      }
    });

    const finalScore = gradableCount > 0 ? Math.round((correctCount / gradableCount) * 100) : 85;
    setQuizScore(finalScore);

    const durationMinutes = Math.floor(actualSeconds / 60);
    if (durationMinutes >= 1 || gradableCount > 0) { 
      try {
        const token = localStorage.getItem('token');
        const subjectName = localStorage.getItem('practiceSubject') || 'Practice Review';
        
        await axios.post('http://localhost:5000/api/practice/log-session', {
          subjectName: subjectName,
          startTime: sessionStartTime || new Date().toISOString(),
          endTime: new Date().toISOString(),
          durationMinutes: Math.max(durationMinutes, 1), 
          focusScore: finalScore 
        }, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        setSaveSuccess(`Evaluation Complete! Score: ${finalScore}%. Data logged to Analytics.`);
        setTimeout(() => setSaveSuccess(''), 6000);
      } catch (err) {
        setSaveError("Evaluated, but failed to sync to Dashboard.");
      }
    } else {
      setSaveError("Session too short to record analytics.");
      setTimeout(() => setSaveError(''), 5000);
    }
  };

  const handleGenerateMore = async () => {
    setGenerateError('');
    const selectedTopics = JSON.parse(localStorage.getItem(SELECTED_KEY) || '[]');
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    const selectedMode = modeMap[settings.mode];

    if (!selectedMode || selectedTopics.length === 0) {
      setGenerateError('Mode and topics required.');
      return;
    }

    const payload = {
      mode: selectedMode,
      topic: selectedTopics.join(', '),
      difficulty: { 'Easy': 'easy', 'Medium': 'medium', 'Hard': 'hard', 'Exam Level': 'exam' }[settings.difficulty] || 'medium',
      numQuestions: Number(settings.questionCount) || 5
      // Removed userQuery entirely
    };

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
      if (!response.ok) throw new Error(data.message || 'Failed to generate questions.');

      const nextItems = Array.isArray(data.data) ? data.data : [];
      localStorage.setItem(RESULTS_KEY, JSON.stringify({ mode: settings.mode, items: nextItems }));
      setItems(nextItems);

      setUserAnswers({});
      setIsSubmitted(false);
      setQuizScore(null);
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
    if (!selectedMode || items.length === 0) return;

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess('');

    try {
      const token = localStorage.getItem('token');
      const payload = {
        title: titleValue.trim(),
        type: selectedMode,
        category: localStorage.getItem('practiceSubject') || 'General', 
        content: { items, meta: { mode: settings.mode } }
      };

      await fetch('http://localhost:5000/api/library/save-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      setIsSaveModalOpen(false);
      setSaveSuccess('Saved to library.');
    } catch (error) {
      setSaveError('Failed to save content.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderItem = (item, index) => {
    const isMCQ = Array.isArray(item.options) && item.options.length > 0;
    
    let isCorrect = false;
    if (isSubmitted && isMCQ && item.answer) {
        const uFirst = (userAnswers[index] || '').trim().charAt(0).toUpperCase();
        const aFirst = item.answer.trim().charAt(0).toUpperCase();
        if (item.answer.includes(userAnswers[index]) || uFirst === aFirst) {
            isCorrect = true;
        }
    }

    // Apply staggered animation delay based on index
    return (
      <div 
        key={`${index}`} 
        className={`${styles.resultItem} ${styles.animateSlideUp}`} 
        style={{ 
          animationDelay: `${index * 0.1}s`,
          borderColor: isSubmitted && isMCQ ? (isCorrect ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)') : '#334155',
          backgroundColor: isSubmitted && isMCQ ? (isCorrect ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)') : 'transparent'
      }}>
        <div className={styles.resultQuestion}>
          Q{index + 1}. {item.question || item.scenario || 'AI Content'}
        </div>
        
        {isMCQ && (
          <div className={styles.interactiveOptions}>
            {item.options.map((option, optIndex) => {
              const isSelected = userAnswers[index] === option;
              let btnClass = styles.optionBtn;
              
              if (isSubmitted) {
                  const optFirst = option.charAt(0).toUpperCase();
                  const ansFirst = item.answer.trim().charAt(0).toUpperCase();
                  const isActuallyCorrect = item.answer.includes(option) || optFirst === ansFirst;
                  
                  if (isActuallyCorrect) btnClass = styles.optionBtnCorrect;
                  else if (isSelected && !isActuallyCorrect) btnClass = styles.optionBtnWrong;
                  else btnClass = styles.optionBtnDisabled;
              } else if (isSelected) {
                  btnClass = styles.optionBtnSelected;
              }

              return (
                <button 
                    key={optIndex} 
                    className={btnClass} 
                    onClick={() => !isSubmitted && handleAnswerChange(index, option)}
                    disabled={isSubmitted}
                >
                  {option}
                </button>
              );
            })}
          </div>
        )}

        {!isMCQ && !item.section && item.question && (
            <textarea 
                className={styles.interactiveTextarea}
                placeholder={isSubmitted ? "" : "Type your answer here to evaluate..."}
                value={userAnswers[index] || ''}
                onChange={(e) => handleAnswerChange(index, e.target.value)}
                disabled={isSubmitted}
            />
        )}

        {isSubmitted && item.answer && (
            <div className={styles.resultAnswer} style={{ marginTop: '15px' }}>
                <strong>Actual Answer:</strong> {item.answer}
            </div>
        )}
        {isSubmitted && item.explanation && (
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
      
      <header className={`${styles.quizHeader} ${styles.animateFadeInUp}`} style={{ alignItems: 'center', background: '#1e293b', padding: '20px', borderRadius: '16px', border: isFocusActive ? '1px solid #10b981' : '1px solid #334155' }}>
        <div>
          <span className={styles.badge} style={{ color: isFocusActive ? '#10b981' : (isSubmitted ? '#8b5cf6' : '#3b82f6') }}>
            {isFocusActive ? 'Focus Engine Active' : (isSubmitted ? 'Evaluation Complete' : 'Practice Lab')}
          </span>
          <h2 className={styles.quizTitle}>{modeLabel} {quizScore !== null ? `- Score: ${quizScore}%` : ''}</h2>
        </div>
        
        {items.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(15, 23, 42, 0.4)', padding: '6px 12px', borderRadius: '8px', border: '1px solid #334155' }}>
              <Clock size={16} color="#94a3b8" />
              <input 
                type="number" 
                value={targetMinutes} 
                onChange={handleTimeChange}
                onBlur={handleTimeBlur}
                disabled={isSubmitted || isFocusActive}
                style={{ width: '40px', background: 'transparent', border: 'none', color: '#fff', fontSize: '1rem', fontWeight: 'bold', textAlign: 'center', outline: 'none' }}
              />
              <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: '600' }}>min</span>
            </div>

            <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: isFocusActive ? '#10b981' : '#f8fafc', fontVariantNumeric: 'tabular-nums', minWidth: '100px', textAlign: 'center' }}>
              {formatTime(remainingSeconds)}
            </div>

            {isFocusActive && (
              <button onClick={() => handleSubmitQuiz()} className={styles.btnPulseHover} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Square size={16} fill="white"/> End Early
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
              <h3 className={styles.resultsTitle}>{modeLabel} Questions</h3>
              <p className={styles.resultsSub}>
                  {isSubmitted ? 'Review your performance below.' : 'Answers are hidden until you submit.'}
              </p>
            </div>
            <button className={styles.secondaryAction} onClick={() => setIsSaveModalOpen(true)} disabled={isSaving}>
              <Save size={16}/> {isSaving ? 'Saving...' : 'Save to Library'}
            </button>
          </div>
          <div className={styles.resultsList}>
            {items.map((item, index) => renderItem(item, index))}
          </div>
        </section>
      )}

      {/* --- ACTION ROW --- */}
      <div className={`${styles.quizActionRow} ${styles.animateFadeInUp}`} style={{ alignItems: 'center', animationDelay: '0.5s' }}>
        <button className={styles.secondaryAction} onClick={handleGenerateMore} disabled={isGenerating}>
          <RefreshCw size={16} className={isGenerating ? styles.spin : ''} /> {isGenerating ? 'Generating...' : 'Generate New Test'}
        </button>

        {!isSubmitted && items.length > 0 && (
          <button
            className={`${styles.finalAction} ${styles.btnPulseHover}`}
            onClick={() => handleSubmitQuiz()}
            style={{ marginLeft: 'auto', background: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <CheckCircle size={18} /> Submit Test & Evaluate
          </button>
        )}
      </div>
      
      <div style={{ marginTop: '10px' }}>
        {generateError && <div className={styles.generateError}>{generateError}</div>}
        {saveError && <div className={styles.generateError} style={{color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)'}}>{saveError}</div>}
        {saveSuccess && <div className={`${styles.successMessage} ${styles.animateFadeInUp}`} style={{color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '8px'}}>{saveSuccess}</div>}
      </div>

      {isSaveModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <h3 className={styles.modalTitle}>Save to Library</h3>
            <p className={styles.modalText}>Enter a name for this content.</p>
            <input className={styles.modalInput} value={contentTitle} onChange={(e) => { setContentTitle(e.target.value); setContentTitleError(''); }} placeholder="e.g., Mock Test - Unit 2" />
            {contentTitleError && <div className={styles.modalError}>{contentTitleError}</div>}
            <div className={styles.modalActions}>
              <button className={styles.secondaryAction} onClick={() => setIsSaveModalOpen(false)}>Cancel</button>
              <button className={styles.finalAction} onClick={() => handleSaveToLibrary(contentTitle)} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PractiseQuiz;