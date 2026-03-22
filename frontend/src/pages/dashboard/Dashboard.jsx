import React, { useState, useEffect } from 'react';
import { Play, TrendingUp, Clock, ArrowRight, BookOpen, Briefcase, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // Added axios for data fetching
import UploadModal from '../../Components/common/UploadModal/UploadModal'; 
import SubjectLibrary from '../../Components/common/SubjectLibrary/SubjectLibrary';
import styles from './Dashboard.module.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false); 

  // --- DYNAMIC ANALYTICS STATE ---
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    avgFocus: 0,
    consistencyData: [0, 0, 0, 0, 0, 0, 0],
    peakTime: "Analyzing...",
    peakDesc: "Log a focus session to unlock AI timing insights."
  });

  // --- FETCH ANALYTICS DATA ON MOUNT ---
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await axios.get('http://localhost:5000/api/insights/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
          setMetrics(response.data.data);
        }
      } catch (error) {
        console.error("Dashboard analytics fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // --- FIXED: Function to run when upload finishes ---
  const handleRoadmapReady = (newSyllabusId) => {
    // If the modal gives us a specific ID, save it. 
    // Otherwise, clear the memory so the Roadmap page knows to fetch the 'latest' one!
    if (newSyllabusId && typeof newSyllabusId === 'string') {
        localStorage.setItem('activeSyllabusId', newSyllabusId);
    } else {
        localStorage.removeItem('activeSyllabusId'); 
    }
    
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

      {/* --- MULTI-SUBJECT LIBRARY COMPONENT --- */}
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

      {/* 3. DYNAMIC CONSISTENCY GRAPH */}
      <section className={styles.consistencySection}>
        <div className={styles.sectionTitle}>
          <TrendingUp size={18} />
          <span>Focus & Consistency</span>
        </div>
        
        <div className={styles.statsRow}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{metrics.avgFocus}%</span>
            <span className={styles.statLabel}>Avg Focus</span>
          </div>
          <div className={styles.statItem}>
            {/* Counts how many days out of the last 7 had active study sessions */}
            <span className={styles.statValue}>
              {metrics.consistencyData.filter(d => d > 0).length} / 7
            </span>
            <span className={styles.statLabel}>Active Days</span>
          </div>
        </div>

        <div className={styles.graphPlaceholder}>
           {/* Maps the 0-4 intensity scale to vertical CSS heights */}
           {metrics.consistencyData.map((level, i) => {
             const heights = ['10%', '35%', '60%', '85%', '100%'];
             return (
               <div 
                 key={i} 
                 className={styles.bar} 
                 style={{
                   height: heights[level], 
                   opacity: level === 0 ? 0.2 : 0.6 + (level * 0.1),
                   transition: 'height 0.5s ease, opacity 0.5s ease'
                 }}
               ></div>
             );
           })}
        </div>
      </section>

      {/* 4. DYNAMIC FLOW STATE INDICATOR */}
      <section className={styles.flowCard}>
         <div className={styles.sectionTitle}>
            <Clock size={18} />
            <span>Peak Productivity</span>
         </div>
         <div className={styles.flowTime}>{metrics.peakTime}</div>
         <p className={styles.flowNote}>{metrics.peakDesc}</p>
      </section>

      {/* 5. AI INSIGHT TEASER */}
      <section className={styles.insightCard}>
         <div className={styles.insightHeader}>
            <span className={styles.aiBadge}>AI Insight</span>
            <ArrowRight size={16} />
         </div>
         <p className={styles.insightText}>
            "Rajeev, you are spending 40% of time on Planning but only 20% on Deep Work. 
            Try shifting Data Structures to your {metrics.peakTime !== 'Analyzing...' ? metrics.peakTime.split(' - ')[0] : '10 PM'} slot."
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