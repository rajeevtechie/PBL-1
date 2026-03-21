// frontend/src/pages/practise_lab/practise_quiz.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Timer } from 'lucide-react'; // Added Timer Icon
import styles from './practise_lab.module.css';

const RESULTS_KEY = 'practiceQuizResults';
const SELECTED_KEY = 'practiceSelectedTopics';
const SETTINGS_KEY = 'practiceSettings';

const PractiseQuiz = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem(RESULTS_KEY) || '[]');
    setItems(Array.isArray(stored) ? stored : []);
  }, []);

  const handleGenerateMore = async () => {
    setGenerateError('');

    const selectedTopics = JSON.parse(localStorage.getItem(SELECTED_KEY) || '[]');
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');

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
      mode: 'quiz',
      topic: selectedTopics.join(', '),
      difficulty: difficultyMap[settings.difficulty] || 'medium',
      numQuestions: 5
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

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to generate more questions.');
      }

      const nextItems = Array.isArray(data.data) ? data.data : [];
      localStorage.setItem(RESULTS_KEY, JSON.stringify(nextItems));
      setItems(nextItems);
    } catch (error) {
      setGenerateError(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={styles.quizContainer}>
      <header className={styles.quizHeader}>
        <div>
          <span className={styles.badge}>Practice Lab</span>
          <h2 className={styles.quizTitle}>Generated Quiz</h2>
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
          <div className={styles.resultsList}>
            {items.map((item, index) => (
              <div key={`${item.question}-${index}`} className={styles.resultItem}>
                <div className={styles.resultQuestion}>
                  Q{index + 1}. {item.question}
                </div>
                <ul className={styles.resultOptions}>
                  {(item.options || []).map((option, optIndex) => (
                    <li key={`${option}-${optIndex}`}>{option}</li>
                  ))}
                </ul>
                <div className={styles.resultAnswer}>Answer: {item.answer}</div>
                {item.explanation && (
                  <div className={styles.resultExplain}>{item.explanation}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* --- UPDATED ACTION ROW WITH FOCUS JUMP --- */}
      <div className={styles.quizActionRow}>
        <button
          className={styles.finalAction}
          onClick={handleGenerateMore}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate 5 More'}
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
      </div>
    </div>
  );
};

export default PractiseQuiz;