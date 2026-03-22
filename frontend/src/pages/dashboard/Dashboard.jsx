import React, { useState, useEffect } from 'react';
import { Play, TrendingUp, Clock, ArrowRight, BookOpen, Briefcase, Upload, Loader2, ArrowLeftRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; 
import UploadModal from '../../Components/common/UploadModal/UploadModal'; 
import SubjectLibrary from '../../Components/common/SubjectLibrary/SubjectLibrary';
import styles from './Dashboard.module.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false); 

  // --- 1. DYNAMIC ANALYTICS & PROGRESS STATE ---
  const [loading, setLoading] = useState(true); 
  const [roadmap, setRoadmap] = useState(null);
  const [careerData, setCareerData] = useState(null);
  const [aggregateProgress, setAggregateProgress] = useState({ academic: 0, career: 0 });
  
  // --- TOGGLE VIEW STATES ---
  const [academicView, setAcademicView] = useState('aggregate'); // 'aggregate' | 'subject'
  const [careerView, setCareerView] = useState('aggregate');     // 'aggregate' | 'subject'
  
  const [metrics, setMetrics] = useState({
    avgFocus: 0,
    consistencyData: [0, 0, 0, 0, 0, 0, 0],
    peakTime: "Analyzing...",
    peakDesc: "Log a focus session to unlock AI timing insights."
  });

  const userName = localStorage.getItem('userName') || 'There';

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

        // Fetch Current Roadmap Context
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

        // Fetch Aggregate Progress (Now supported by the backend!)
        try {
            const resAggregate = await axios.get('http://localhost:5000/api/syllabus/progress/aggregate', { headers: { 'Authorization': `Bearer ${token}` } });
            if(resAggregate.data) {
                setAggregateProgress({ academic: resAggregate.data.academicProgress, career: resAggregate.data.careerProgress });
            }
        } catch  { console.log("Failed to fetch aggregates."); }

      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setLoading(false);
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

  // --- 3. DYNAMIC CALCULATIONS ---
  // Safely handling both boolean and TINYINT (1/0) values
  const nextAcademic = roadmap?.units?.find(u => !u.is_completed && !u.completed && u.is_completed !== 1 && u.completed !== 1)?.title || "All Caught Up!";
  const nextCareer = careerData?.recommendations?.find(r => !r.is_completed && r.is_completed !== 1)?.topic_name || "Ready for Industry!";

  // Calculate Specific Active Subject Progress
  const activeAcademicTotal = roadmap?.units?.length || 0;
  const activeAcademicCompleted = roadmap?.units?.filter(u => u.is_completed === true || u.completed === true || u.is_completed === 1 || u.completed === 1)?.length || 0;
  const activeAcademicProgress = activeAcademicTotal > 0 ? Math.round((activeAcademicCompleted / activeAcademicTotal) * 100) : 0;
  const activeAcademicName = roadmap?.courseTitle || "No Active Subject";

  // Calculate Specific Active Career Track Progress
  const activeCareerTotal = careerData?.recommendations?.length || 0;
  const activeCareerCompleted = careerData?.recommendations?.filter(r => r.is_completed === true || r.is_completed === 1)?.length || 0;
  const activeCareerProgress = activeCareerTotal > 0 ? Math.round((activeCareerCompleted / activeCareerTotal) * 100) : 0;
  const activeCareerName = careerData?.targetRole || "No Target Role";

  // UI Display Variables based on Toggle State
  const displayAcademicPercent = academicView === 'aggregate' ? aggregateProgress.academic : activeAcademicProgress;
  const displayAcademicTitle = academicView === 'aggregate' ? 'Overall Academic' : activeAcademicName;
  
  const displayCareerPercent = careerView === 'aggregate' ? aggregateProgress.career : activeCareerProgress;
  const displayCareerTitle = careerView === 'aggregate' ? 'Overall Career' : activeCareerName;

  if (loading) {
      return (
        <div className={styles.dashboardGrid} style={{display: 'flex', justifyContent: 'center', marginTop: '50px'}}>
          <Loader2 className={styles.spin} size={48} color="#3b82f6" />
        </div>
      );
  }

  return (
    <div className={styles.dashboardGrid}>
      
      {/* HERO SECTION */}
      <section className={`${styles.heroSection} ${styles.animateFadeInUp}`}>
        <div className={styles.heroHeader}>
          <span className={styles.heroBadge}>Dynamic Next Task</span>
          
          <span className={styles.heroUrgency}>
            {metrics.peakTime !== "Analyzing..." 
              ? `Optimal Focus Window: ${metrics.peakTime}` 
              : "Analyzing your study habits..."}
          </span>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className={styles.btnPulseHover}
            style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.8rem', fontWeight: '500'}}
          >
            <Upload size={14} /> Upload Syllabus
          </button>
        </div>
        
        <h1 className={styles.taskTitle}>Study: {nextAcademic !== "All Caught Up!" ? nextAcademic : "Review Session"}</h1>
        
        <p className={styles.taskReason}>
          {nextAcademic !== "All Caught Up!" 
            ? `Continue your progress in ${activeAcademicName}.` 
            : `You have successfully completed all units in ${activeAcademicName}!`}
        </p>

        <button className={`${styles.startBtn} ${styles.btnPulseHover}`} onClick={() => navigate('/roadmap')}>
          <Play size={20} fill="currentColor" />
          <span>Resume Roadmap</span>
        </button>
      </section>

      {/* MULTI-SUBJECT LIBRARY COMPONENT */}
      <section className={styles.animateFadeInUp} style={{ gridColumn: '1 / -1', animationDelay: '0.1s' }}>
        <SubjectLibrary />
      </section>

      {/* DYNAMIC ACADEMIC TRACK SNAPSHOT */}
      <section className={`${styles.trackCard} ${styles.animateFadeInUp}`} style={{ animationDelay: '0.2s' }}>
        <div className={styles.cardHeader}>
          <div className={styles.trackTitle}>
            <BookOpen size={18} />
            <h3 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>
              {displayAcademicTitle}
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className={styles.trackPercent}>{displayAcademicPercent}%</span>
            <button 
              className={styles.viewToggleBtn} 
              onClick={() => setAcademicView(prev => prev === 'aggregate' ? 'subject' : 'aggregate')}
              title="Toggle View"
            >
              <ArrowLeftRight size={12} /> {academicView === 'aggregate' ? 'Current' : 'Overall'}
            </button>
          </div>
        </div>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${displayAcademicPercent}%`, backgroundColor: 'var(--primary)', transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
        </div>
        <p className={styles.cardSubtext}>Next: {nextAcademic}</p>
      </section>

      {/* DYNAMIC CAREER TRACK SNAPSHOT */}
      <section className={`${styles.trackCard} ${styles.animateFadeInUp}`} style={{ animationDelay: '0.3s' }}>
        <div className={styles.cardHeader}>
           <div className={styles.trackTitle}>
            <Briefcase size={18} />
            <h3 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>
              {displayCareerTitle}
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className={styles.trackPercent}>{displayCareerPercent}%</span>
            <button 
              className={styles.viewToggleBtn} 
              onClick={() => setCareerView(prev => prev === 'aggregate' ? 'subject' : 'aggregate')}
              title="Toggle View"
            >
              <ArrowLeftRight size={12} /> {careerView === 'aggregate' ? 'Target' : 'Overall'}
            </button>
          </div>
        </div>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${displayCareerPercent}%`, backgroundColor: 'var(--secondary)', transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
        </div>
        <p className={styles.cardSubtext} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Next: {nextCareer}
        </p>
      </section>

      {/* DYNAMIC CONSISTENCY GRAPH */}
      <section className={`${styles.consistencySection} ${styles.animateFadeInUp}`} style={{ animationDelay: '0.4s' }}>
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
                   transition: 'height 1s cubic-bezier(0.4, 0, 0.2, 1), opacity 1s ease'
                 }}
               ></div>
             );
           })}
        </div>
      </section>

      {/* DYNAMIC FLOW STATE INDICATOR */}
      <section className={`${styles.flowCard} ${styles.animateFadeInUp}`} style={{ animationDelay: '0.5s' }}>
         <div className={styles.sectionTitle}>
            <Clock size={18} />
            <span>Peak Productivity</span>
         </div>
         <div className={styles.flowTime}>{metrics.peakTime}</div>
         <p className={styles.flowNote}>{metrics.peakDesc}</p>
      </section>

      {/* TRULY LIVE AI INSIGHT TEASER */}
      <section className={`${styles.insightCard} ${styles.animateFadeInUp}`} style={{ animationDelay: '0.6s' }}>
         <div className={styles.insightHeader}>
            <span className={styles.aiBadge}>AI Insight</span>
            <ArrowRight size={16} />
         </div>
         <p className={styles.insightText}>
            "{userName}, you are making great progress! Try shifting Deep Work to your {metrics.peakTime !== 'Analyzing...' ? metrics.peakTime.split(' - ')[0] : 'optimal'} slot to maximize retention."
         </p>
      </section>

      <UploadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onComplete={handleRoadmapReady} />
    </div>
  );
};

export default Dashboard;