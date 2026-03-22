import React, { useState, useEffect } from 'react';
import { Play, TrendingUp, Clock, ArrowRight, BookOpen, Briefcase, Upload, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; 
import UploadModal from '../../Components/common/UploadModal/UploadModal'; 
import SubjectLibrary from '../../Components/common/SubjectLibrary/SubjectLibrary';
import styles from './Dashboard.module.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false); 

  // --- 1. DYNAMIC ANALYTICS & PROGRESS STATE ---
  const [loading, setLoading] = useState(true); // Now we will actually use this!
  const [roadmap, setRoadmap] = useState(null);
  const [careerData, setCareerData] = useState(null);
  const [aggregateProgress, setAggregateProgress] = useState({ academic: 0, career: 0 });
  
  const [metrics, setMetrics] = useState({
    avgFocus: 0,
    consistencyData: [0, 0, 0, 0, 0, 0, 0],
    peakTime: "Analyzing...",
    peakDesc: "Log a focus session to unlock AI timing insights."
  });

  // --- 2. FETCH ALL DATA ON MOUNT ---
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Fetch Analytics
        try {
            const resMetrics = await axios.get('http://localhost:5000/api/insights/dashboard', { headers: { Authorization: `Bearer ${token}` } });
            if (resMetrics.data.success) setMetrics(resMetrics.data.data);
        } catch  { console.log("No analytics data yet."); }

        // Fetch Current Roadmap Context (for "Next Task" UI)
        const activeId = localStorage.getItem('activeSyllabusId');
        const endpoint = activeId ? `http://localhost:5000/api/syllabus/${activeId}` : 'http://localhost:5000/api/syllabus/latest';
        
        try {
            const resRoadmap = await axios.get(endpoint, { headers: { 'Authorization': `Bearer ${token}` } });
            setRoadmap(resRoadmap.data);
        } catch  { console.log("No roadmap data yet."); }

        try {
            const syllabusIdQuery = activeId || 'latest';
            const resCareer = await axios.get(`http://localhost:5000/api/syllabus/career-insights?syllabusId=${syllabusIdQuery}`, { headers: { 'Authorization': `Bearer ${token}` } });
            setCareerData(resCareer.data);
        } catch  { console.log("No career data yet."); }

        // Fetch Aggregate Progress (The true averages!)
        try {
            const resAggregate = await axios.get('http://localhost:5000/api/syllabus/progress/aggregate', { headers: { 'Authorization': `Bearer ${token}` } });
            setAggregateProgress({ academic: resAggregate.data.academicProgress, career: resAggregate.data.careerProgress });
        } catch  { console.log("Failed to fetch aggregates."); }

      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setLoading(false); // Signal that fetching is done
      }
    };

    fetchDashboardData();
  }, []);

  const handleRoadmapReady = (newSyllabusId) => {
    if (newSyllabusId && typeof newSyllabusId === 'string') {
        localStorage.setItem('activeSyllabusId', newSyllabusId);
    } else {
        localStorage.removeItem('activeSyllabusId'); 
    }
    setIsModalOpen(false);
    navigate('/roadmap'); 
  };

  // --- 3. CALCULATE "NEXT TASK" ---
  const nextAcademic = roadmap?.units?.find(u => !u.is_completed)?.title || "All Caught Up!";
  const nextCareer = careerData?.recommendations?.find(r => !r.is_completed)?.topic_name || "Ready for Industry!";

  // ✅ FIXED ESLINT ERROR: We are now explicitly using the 'loading' variable to show a spinner
  if (loading) {
      return <div className={styles.dashboardGrid} style={{display: 'flex', justifyContent: 'center', marginTop: '50px'}}><Loader2 className="spinner" size={48} color="var(--primary)"/></div>;
  }

  return (
    <div className={styles.dashboardGrid}>
      
      {/* HERO SECTION */}
      <section className={styles.heroSection}>
        <div className={styles.heroHeader}>
          <span className={styles.heroBadge}>Dynamic Next Task</span>
          <span className={styles.heroUrgency}>Due: Tomorrow, 10:00 AM</span>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.8rem', fontWeight: '500'}}
          >
            <Upload size={14} /> Upload Syllabus
          </button>
        </div>
        
        <h1 className={styles.taskTitle}>Study: {nextAcademic !== "All Caught Up!" ? nextAcademic : "Review Session"}</h1>
        <p className={styles.taskReason}>Pick up right where you left off on your roadmap.</p>

        <button className={styles.startBtn} onClick={() => navigate('/roadmap')}>
          <Play size={20} fill="currentColor" />
          <span>Resume Roadmap</span>
        </button>
      </section>

      {/* MULTI-SUBJECT LIBRARY COMPONENT */}
      <section style={{ gridColumn: '1 / -1' }}>
        <SubjectLibrary />
      </section>

      {/* DYNAMIC TRACK SNAPSHOTS (Using aggregateProgress) */}
      <section className={styles.trackCard}>
        <div className={styles.cardHeader}>
          <div className={styles.trackTitle}>
            <BookOpen size={18} />
            <h3>Academic Track</h3>
          </div>
          <span className={styles.trackPercent}>{aggregateProgress.academic}%</span>
        </div>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${aggregateProgress.academic}%`, backgroundColor: 'var(--primary)', transition: 'width 0.5s ease-in-out' }}></div>
        </div>
        <p className={styles.cardSubtext}>Next: {nextAcademic}</p>
      </section>

      <section className={styles.trackCard}>
        <div className={styles.cardHeader}>
           <div className={styles.trackTitle}>
            <Briefcase size={18} />
            <h3>Career Track</h3>
          </div>
          <span className={styles.trackPercent}>{aggregateProgress.career}%</span>
        </div>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${aggregateProgress.career}%`, backgroundColor: 'var(--secondary)', transition: 'width 0.5s ease-in-out' }}></div>
        </div>
        <p className={styles.cardSubtext} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Next: {nextCareer}
        </p>
      </section>

      {/* DYNAMIC CONSISTENCY GRAPH */}
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
            <span className={styles.statValue}>
              {metrics.consistencyData.filter(d => d > 0).length} / 7
            </span>
            <span className={styles.statLabel}>Active Days</span>
          </div>
        </div>

        <div className={styles.graphPlaceholder}>
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

      {/* DYNAMIC FLOW STATE INDICATOR */}
      <section className={styles.flowCard}>
         <div className={styles.sectionTitle}>
            <Clock size={18} />
            <span>Peak Productivity</span>
         </div>
         <div className={styles.flowTime}>{metrics.peakTime}</div>
         <p className={styles.flowNote}>{metrics.peakDesc}</p>
      </section>

      {/* AI INSIGHT TEASER */}
      <section className={styles.insightCard}>
         <div className={styles.insightHeader}>
            <span className={styles.aiBadge}>AI Insight</span>
            <ArrowRight size={16} />
         </div>
         <p className={styles.insightText}>
            "Rajeev, you are making great progress! Try shifting Deep Work to your {metrics.peakTime !== 'Analyzing...' ? metrics.peakTime.split(' - ')[0] : '10 PM'} slot."
         </p>
      </section>

      {/* RENDER THE MODAL COMPONENT */}
      <UploadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onComplete={handleRoadmapReady} />
    </div>
  );
};

export default Dashboard;