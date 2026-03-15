import React from 'react';
import { Lightbulb, TrendingUp, AlertTriangle, ArrowRight, MessageSquare, Send } from 'lucide-react';
import styles from './Insights.module.css';

const Insights = () => {
  return (
    <div className={styles.insightsContainer}>
      
      {/* LEFT COLUMN: The Analysis Feed */}
      <div className={styles.feedColumn}>
        <header className={styles.header}>
          <h1>AI Growth Engine</h1>
          <p>Real-time analysis of your learning patterns.</p>
        </header>

        {/* 1. CRITICAL ALERT CARD */}
        <div className={`${styles.insightCard} ${styles.critical}`}>
          <div className={styles.cardHeader}>
            <div className={styles.iconBox}><AlertTriangle size={20} /></div>
            <h3>Retention Alert: Normalization</h3>
          </div>
          <p>
            You scored <strong>30%</strong> on the last DBMS quiz. The AI predicts a high chance of forgetting 
            "3rd Normal Form" before the final exam.
          </p>
          <button className={styles.actionBtn}>
            Schedule Spaced Repetition Review <ArrowRight size={16} />
          </button>
        </div>

        {/* 2. OPPORTUNITY CARD */}
        <div className={`${styles.insightCard} ${styles.opportunity}`}>
          <div className={styles.cardHeader}>
            <div className={styles.iconBox}><TrendingUp size={20} /></div>
            <h3>Peak Performance Detected</h3>
          </div>
          <p>
            Your focus intensity is highest between <strong>10 PM - 12 AM</strong>. 
            We have auto-scheduled your hardest topic (Operating Systems) for this slot tonight.
          </p>
        </div>

        {/* 3. RESOURCE RECOMMENDATION */}
        <div className={styles.insightCard}>
          <div className={styles.cardHeader}>
            <div className={styles.iconBox}><Lightbulb size={20} /></div>
            <h3>Recommended Resource</h3>
          </div>
          <p>Based on your code style in the last assignment, check out this article:</p>
          <div className={styles.resourceLink}>
            <img 
              src="https://ui-avatars.com/api/?name=R&background=0D8ABC&color=fff" 
              alt="Resource" 
              className={styles.resourceIcon} 
            />
            <div>
              <h4>Clean Code Patterns in React</h4>
              <span>Medium.com • 8 min read</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: AI Mentor Chat */}
      <div className={styles.chatColumn}>
        <div className={styles.chatHeader}>
          <h3>EduNexus AI Mentor</h3>
          <span className={styles.onlineDot}></span>
        </div>
        
        <div className={styles.chatWindow}>
          {/* AI Message */}
          <div className={`${styles.message} ${styles.aiMessage}`}>
            <p>Hello Rajeev! I noticed you struggled with <strong>Redux Reducers</strong> yesterday. Would you like a quick visualization to explain it?</p>
            <span className={styles.time}>10:05 AM</span>
          </div>

          {/* User Message */}
          <div className={`${styles.message} ${styles.userMessage}`}>
            <p>Yes, specifically how the state updates immutably.</p>
            <span className={styles.time}>10:06 AM</span>
          </div>

          {/* AI Response */}
          <div className={`${styles.message} ${styles.aiMessage}`}>
            <p>Sure! Imagine the state is a snapshot. You don't scribble on the photo; you take a new photo with the changes included...</p>
            <span className={styles.time}>10:06 AM</span>
          </div>
        </div>

        <div className={styles.chatInputArea}>
          <input type="text" placeholder="Ask anything..." />
          <button><Send size={18} /></button>
        </div>
      </div>

    </div>
  );
};

export default Insights;