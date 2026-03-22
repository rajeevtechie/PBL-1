// frontend/src/pages/practise_lab/practise_quiz.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Timer } from 'lucide-react'; // Added Timer Icon
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
      const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      const storedResults = {
        mode: settings.mode || '',
        items: nextItems
      };
      localStorage.setItem(RESULTS_KEY, JSON.stringify(storedResults));
      setItems(nextItems);
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

      const payload = {
        title: titleValue.trim(),
        type: selectedMode,
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

  const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  const modeLabel = settings.mode || 'Practice';

  return (
    <div className={styles.quizContainer}>
      <header className={styles.quizHeader}>
        <div>
          <span className={styles.badge}>Practice Lab</span>
          <h2 className={styles.quizTitle}>{modeLabel}</h2>
          <p className={styles.quizSub}>Review each question and explanation.</p>
        </div>
        <div className={styles.topicOnlyActions}>
          <button className={styles.secondaryAction} onClick={() => navigate('/practice-topics')}>
            Back
          </button>
          <button className={styles.finalAction} onClick={() => navigate('/assessment')}>
            New Practice
          </button>
        </div>
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

      {/* --- UPDATED ACTION ROW WITH FOCUS JUMP --- */}
      <div className={styles.quizActionRow}>
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

        {/* This button seamlessly connects Practice Lab -> Focus Mode */}
        <button
          className={styles.secondaryAction}
          onClick={() => navigate('/study')}
          style={{ marginLeft: 'auto', background: '#3b82f6', color: 'white', border: 'none' }}
        >
          <Timer size={18} style={{ marginRight: '8px' }}/> 
          Start Focus Session
        </button>

        {generateError && (
          <div className={styles.generateError}>{generateError}</div>
        )}
        {saveError && (
          <div className={styles.generateError}>{saveError}</div>
        )}
        {saveSuccess && (
          <div className={styles.successMessage}>{saveSuccess}</div>
        )}
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
              <button
                className={styles.secondaryAction}
                onClick={() => setIsSaveModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className={styles.finalAction}
                onClick={submitContentTitle}
                disabled={isSaving}
              >
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