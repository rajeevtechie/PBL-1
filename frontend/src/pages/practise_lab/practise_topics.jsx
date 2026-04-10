import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListChecks } from 'lucide-react';
import { Joyride, STATUS } from 'react-joyride';
import styles from './practise_lab.module.css';

const TOPICS_KEY = 'practiceTopics';
const SELECTED_KEY = 'practiceSelectedTopics';

const PractiseTopics = () => {
  const navigate = useNavigate();
  
  // 🛡️ FIX: Lazy Initialization (Reads localStorage directly when state is created)
  const [topics] = useState(() => {
    const storedTopics = JSON.parse(localStorage.getItem(TOPICS_KEY) || '[]');
    return Array.isArray(storedTopics) ? storedTopics : [];
  });
  
  const [selectedTopics, setSelectedTopics] = useState(() => {
    const storedSelected = JSON.parse(localStorage.getItem(SELECTED_KEY) || '[]');
    return Array.isArray(storedSelected) ? storedSelected : [];
  });

  // --- 🪄 TOUR STATE ---
  const [runTour, setRunTour] = useState(false);
  const tourSteps = [
    {
      target: '#tour-topic-selector',
      content: (
        <div>
          <h3 style={{ margin: '0 0 10px 0', color: '#f8fafc' }}>Target Your Practice 🎯</h3>
          <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.95rem' }}>The AI extracted these topics from your file. Select exactly what you want to be quizzed on, or just hit 'All Topics' to cover everything!</p>
        </div>
      ),
      disableBeacon: true,
    }
  ];

  // Tour Trigger Effect
  useEffect(() => {
    if (!localStorage.getItem('hasSeenPracticeTopicsTour') && topics.length > 0) {
        setTimeout(() => setRunTour(true), 400);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTourCallback = (data) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      localStorage.setItem('hasSeenPracticeTopicsTour', 'true');
      setRunTour(false);
    }
  };

  const allTopicsSelected = topics.length > 0 && selectedTopics.length === topics.length;

  const toggleTopic = (topic) => {
    setSelectedTopics((prev) => {
      const next = prev.includes(topic) ? prev.filter(item => item !== topic) : [...prev, topic];
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
    if (topics.length === 0) { navigate('/assessment'); return; }
    if (selectedTopics.length === 0) return;
    navigate('/practice-quiz');
  };

  const handleBack = () => navigate('/assessment');

  return (
    <div className={styles.topicOnlyContainer}>
      
      <Joyride
        steps={tourSteps} run={runTour} continuous={true} showSkipButton={true} callback={handleTourCallback}
        styles={{
          options: { arrowColor: '#1e293b', backgroundColor: '#1e293b', overlayColor: 'rgba(15, 23, 42, 0.85)', primaryColor: '#6366f1', textColor: '#f8fafc', zIndex: 1000 },
          buttonNext: { backgroundColor: '#6366f1', borderRadius: '8px', fontSize: '0.9rem', padding: '8px 16px' },
          buttonBack: { color: '#cbd5e1', marginRight: '8px' }, buttonSkip: { color: '#64748b' }
        }}
      />

      <header className={styles.topicOnlyHeader}>
        <div>
          <span className={styles.badge}>Practice Lab</span>
          <h2 className={styles.topicOnlyTitle}>Select Topics</h2>
          <p className={styles.topicOnlySub}>Choose the topics you want to practice. You can refine this later.</p>
        </div>
        <div className={styles.topicOnlyActions}>
          <button className={styles.secondaryAction} onClick={handleBack}>Back</button>
          <button className={styles.finalAction} onClick={handleContinue} disabled={topics.length > 0 && selectedTopics.length === 0}>
            Continue
          </button>
        </div>
      </header>

      <section id="tour-topic-selector" className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div className={styles.stepBadge}>Step 2</div>
          <h3>Topic Selector</h3>
          <p>Pick a focus or cover everything.</p>
        </div>

        {topics.length === 0 ? (
          <div className={styles.extractError}>No topics found. Go back and extract topics first.</div>
        ) : (
          <>
            <button className={allTopicsSelected ? styles.allTopicsHeroActive : styles.allTopicsHero} onClick={toggleAllTopics}>
              <ListChecks size={18} /> All Topics
            </button>
            <div className={styles.topicGrid}>
              {topics.map((topic) => (
                <button key={topic} className={selectedTopics.includes(topic) ? styles.topicChipActive : styles.topicChip} onClick={() => toggleTopic(topic)}>
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