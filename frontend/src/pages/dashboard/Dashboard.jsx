import React, { useState } from 'react';
import { Play, TrendingUp, Clock, ArrowRight, BookOpen, Briefcase, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import UploadModal from '../../Components/common/UploadModal/UploadModal'; 
import SubjectLibrary from '../../Components/common/SubjectLibrary/SubjectLibrary'; // <-- NEW IMPORT
import styles from './Dashboard.module.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false); 

  // Function to run when upload finishes
  const handleRoadmapReady = () => {
    setIsModalOpen(false);
    navigate('/roadmap'); 
  };

  return (
    <div className={styles.dashboardGrid}>
      
      {/* 1. HERO SECTION */}
      <section className={styles.heroSection}>
        <div className={styles.heroHeader}>
          <span className={styles.heroBadge}>Dynamic Next Task</span>
          <span className={styles.heroUrgency}>Due: Tomorrow, 10:00 AM</span>
          
          {/* Upload Button */}
          <button 
            onClick={() => setIsModalOpen(true)}
            style={{ 
              marginLeft: 'auto', 
              background: 'rgba(255,255,255,0.1)', 
              border: 'none', 
              color: 'white', 
              padding: '6px 12px', 
              borderRadius: '6px', 
              cursor: 'pointer', 
              display: 'flex', 
              gap: '8px', 
              alignItems: 'center', 
              fontSize: '0.8rem',
              fontWeight: '500'
            }}
          >
            <Upload size={14} /> Upload Syllabus
          </button>
        </div>
        
        <h1 className={styles.taskTitle}>Study: Database Indexing & B-Trees</h1>
        <p className={styles.taskReason}>
          High Weightage Topic • 40% of previous exams contained this.
        </p>

        <button 
          className={styles.startBtn} 
          onClick={() => navigate('/study')}
        >
          <Play size={20} fill="currentColor" />
          <span>Start Focused Session</span>
        </button>
      </section>

      {/* --- NEW: MULTI-SUBJECT LIBRARY COMPONENT --- */}
      <section style={{ gridColumn: '1 / -1' }}>
        <SubjectLibrary />
      </section>

      {/* 2. TRACK SNAPSHOTS */}
      <section className={styles.trackCard}>
        <div className={styles.cardHeader}>
          <div className={styles.trackTitle}>
            <BookOpen size={18} />
            <h3>Academic Track</h3>
          </div>
          <span className={styles.trackPercent}>45%</span>
        </div>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: '45%', backgroundColor: 'var(--primary)' }}></div>
        </div>
        <p className={styles.cardSubtext}>Next: Relational Algebra</p>
      </section>

      <section className={styles.trackCard}>
        <div className={styles.cardHeader}>
           <div className={styles.trackTitle}>
            <Briefcase size={18} />
            <h3>Career Track</h3>
          </div>
          <span className={styles.trackPercent}>30%</span>
        </div>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: '30%', backgroundColor: 'var(--secondary)' }}></div>
        </div>
        <p className={styles.cardSubtext}>Next: LeetCode Medium (Arrays)</p>
      </section>

      {/* 3. CONSISTENCY GRAPH */}
      <section className={styles.consistencySection}>
        <div className={styles.sectionTitle}>
          <TrendingUp size={18} />
          <span>Consistency Score</span>
        </div>
        
        <div className={styles.statsRow}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>85%</span>
            <span className={styles.statLabel}>Consistency</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>12 Days</span>
            <span className={styles.statLabel}>Current Streak</span>
          </div>
        </div>

        <div className={styles.graphPlaceholder}>
           <div className={styles.bar} style={{height: '40%'}}></div>
           <div className={styles.bar} style={{height: '60%'}}></div>
           <div className={styles.bar} style={{height: '30%'}}></div>
           <div className={styles.bar} style={{height: '80%'}}></div>
           <div className={styles.bar} style={{height: '100%', opacity: 1}}></div>
           <div className={styles.bar} style={{height: '70%'}}></div>
           <div className={styles.bar} style={{height: '90%'}}></div>
        </div>
      </section>

      {/* 4. FLOW STATE INDICATOR */}
      <section className={styles.flowCard}>
         <div className={styles.sectionTitle}>
            <Clock size={18} />
            <span>Peak Productivity</span>
         </div>
         <div className={styles.flowTime}>10 PM - 1 AM</div>
         <p className={styles.flowNote}>Your brain is most active at night.</p>
      </section>

      {/* 5. AI INSIGHT TEASER */}
      <section className={styles.insightCard}>
         <div className={styles.insightHeader}>
            <span className={styles.aiBadge}>AI Insight</span>
            <ArrowRight size={16} />
         </div>
         <p className={styles.insightText}>
           "Rajeev, you are spending 40% of time on Planning but only 20% on Deep Work. 
           Try shifting Data Structures to your 10 PM slot."
         </p>
      </section>

      {/* 6. RENDER THE MODAL COMPONENT */}
      <UploadModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onComplete={handleRoadmapReady} 
      />

    </div>
  );
};

export default Dashboard;