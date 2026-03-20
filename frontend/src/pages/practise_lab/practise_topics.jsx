import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListChecks } from 'lucide-react';
import styles from './practise_lab.module.css';

const TOPICS_KEY = 'practiceTopics';
const SELECTED_KEY = 'practiceSelectedTopics';

const PractiseTopics = () => {
  const navigate = useNavigate();
  const [topics, setTopics] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]);

  useEffect(() => {
    const storedTopics = JSON.parse(localStorage.getItem(TOPICS_KEY) || '[]');
    const storedSelected = JSON.parse(localStorage.getItem(SELECTED_KEY) || '[]');
    setTopics(Array.isArray(storedTopics) ? storedTopics : []);
    setSelectedTopics(Array.isArray(storedSelected) ? storedSelected : []);
  }, []);

  const allTopicsSelected = topics.length > 0 && selectedTopics.length === topics.length;

  const toggleTopic = (topic) => {
    setSelectedTopics((prev) => {
      const next = prev.includes(topic)
        ? prev.filter(item => item !== topic)
        : [...prev, topic];
      localStorage.setItem(SELECTED_KEY, JSON.stringify(next));
      return next;
    });
  };

  const toggleAllTopics = () => {
    const next = allTopicsSelected ? [] : [...topics];
    setSelectedTopics(next);
    localStorage.setItem(SELECTED_KEY, JSON.stringify(next));
  };

  const handleContinue = () => {
    if (topics.length === 0) {
      navigate('/assessment');
      return;
    }

    if (selectedTopics.length === 0) {
      return;
    }

    navigate('/assessment');
  };

  const handleBack = () => {
    navigate('/assessment');
  };

  return (
    <div className={styles.topicOnlyContainer}>
      <header className={styles.topicOnlyHeader}>
        <div>
          <span className={styles.badge}>Practice Lab</span>
          <h2 className={styles.topicOnlyTitle}>Select Topics</h2>
          <p className={styles.topicOnlySub}>Choose the topics you want to practice. You can refine this later.</p>
        </div>
        <div className={styles.topicOnlyActions}>
          <button className={styles.secondaryAction} onClick={handleBack}>Back</button>
          <button
            className={styles.finalAction}
            onClick={handleContinue}
            disabled={topics.length > 0 && selectedTopics.length === 0}
          >
            Continue
          </button>
        </div>
      </header>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div className={styles.stepBadge}>Step 2</div>
          <h3>Topic Selector</h3>
          <p>Pick a focus or cover everything.</p>
        </div>

        {topics.length === 0 ? (
          <div className={styles.extractError}>No topics found. Go back and extract topics first.</div>
        ) : (
          <>
            <button
              className={allTopicsSelected ? styles.allTopicsHeroActive : styles.allTopicsHero}
              onClick={toggleAllTopics}
            >
              <ListChecks size={18} /> All Topics
            </button>
            <div className={styles.topicGrid}>
              {topics.map((topic) => (
                <button
                  key={topic}
                  className={selectedTopics.includes(topic) ? styles.topicChipActive : styles.topicChip}
                  onClick={() => toggleTopic(topic)}
                >
                  <ListChecks size={16} /> {topic}
                </button>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default PractiseTopics;
