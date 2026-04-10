import React, { useState, useEffect } from 'react';
import { Play, TrendingUp, Clock, ArrowRight, BookOpen, Briefcase, Upload, Loader2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; 
import UploadModal from '../../Components/common/UploadModal/UploadModal'; 
import SubjectLibrary from '../../Components/common/SubjectLibrary/SubjectLibrary';
import ActivityGraph from '../../Components/common/Heatmap/ActivityGraph';
import styles from './Dashboard.module.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false); 

  const [loading, setLoading] = useState(true); 
  const [roadmap, setRoadmap] = useState(null);
  const [careerData, setCareerData] = useState(null);
  
  const [aggregateProgress, setAggregateProgress] = useState({ academic: 0, career: 0, details: [] });
  const [expandedTracks, setExpandedTracks] = useState({ academic: false, career: false });
  
  const [metrics, setMetrics] = useState({
    avgFocus: 0,
    consistencyData: [0, 0, 0, 0, 0, 0, 0],
    peakTime: "Analyzing...",
    peakDesc: "Log a focus session to unlock AI timing insights.",
    totalSessions: 0
  });

  const userName = localStorage.getItem('userName') || 'There';

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        try {
            const resMetrics = await axios.get('http://localhost:5000/api/insights/dashboard');
            if (resMetrics.data.success) {
                setMetrics(prev => ({...prev, ...resMetrics.data.data}));
            }
        } catch { console.log("No analytics data yet."); }

        const activeId = localStorage.getItem('activeSyllabusId');
        const endpoint = activeId ? `http://localhost:5000/api/syllabus/${activeId}` : 'http://localhost:5000/api/syllabus/latest';
        
        try {
            const resRoadmap = await axios.get(endpoint);
            setRoadmap(resRoadmap.data);
        } catch { console.log("No roadmap data yet."); }

        try {
            const syllabusIdQuery = activeId || 'latest';
            const resCareer = await axios.get(`http://localhost:5000/api/syllabus/career-insights?syllabusId=${syllabusIdQuery}`);
            setCareerData(resCareer.data);
        } catch { console.log("No career data yet."); }

        try {
            const resAggregate = await axios.get('http://localhost:5000/api/syllabus/progress/aggregate');
            if(resAggregate.data) {
                setAggregateProgress({ 
                    academic: resAggregate.data.academicProgress, 
                    career: resAggregate.data.careerProgress,
                    details: resAggregate.data.details || [] 
                });
            }
        } catch { console.log("Failed to fetch aggregates."); }

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

  const nextAcademicUnit = roadmap?.units?.find(u => !u.is_completed && !u.completed && u.is_completed !== 1 && u.completed !== 1);
  const nextCareerRec = careerData?.recommendations?.find(r => !r.is_completed && r.is_completed !== 1);

  let displayTask = "Review Session";
  let displayReason = "You're all caught up! Great time to review.";

  if (nextAcademicUnit) {
      displayTask = nextAcademicUnit.title;
      displayReason = `Continue your academic progress in ${roadmap?.courseTitle || 'your subject'}.`;
  } else if (nextCareerRec) {
      displayTask = nextCareerRec.topic_name;
      displayReason = `Industry gap identified for ${careerData?.targetRole || 'your career goal'}.`;
  }

  const toggleTrack = (trackName) => {
      setExpandedTracks(prev => ({ ...prev, [trackName]: !prev[trackName] }));
  };

  const renderPeakProductivity = () => {
    if (metrics.totalSessions === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '10px 0', marginTop: '10px' }}>
          <h4 style={{ color: 'var(--text-dim)', marginBottom: '8px', fontSize: '1rem' }}>AI Calibrating... ⏳</h4>
          <p style={{ fontSize: '13px', color: '#888', lineHeight: '1.4' }}>
            We need to learn your rhythms! Start your first Focus Session to let InsightED discover your peak hours.
          </p>
        </div>
      );
    } else if (metrics.totalSessions < 4) {
      return (
        <div style={{ textAlign: 'center', padding: '10px 0', marginTop: '10px' }}>
          <h4 style={{ color: '#eab308', marginBottom: '8px', fontSize: '1rem' }}>Gathering Insights... 🧠</h4>
          <p style={{ fontSize: '13px', color: '#888', lineHeight: '1.4' }}>
            {metrics.totalSessions}/4 sessions logged. Try studying at different times to map your energy levels!
          </p>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', marginTop: '12px', overflow: 'hidden' }}>
            <div style={{ width: `${(metrics.totalSessions / 4) * 100}%`, height: '100%', background: '#eab308', transition: 'width 0.5s ease' }}></div>
          </div>
        </div>
      );
    } else {
      return (
        <div style={{ textAlign: 'center', padding: '10px 0', marginTop: '10px' }}>
          <div className={styles.flowTime} style={{ color: '#4ade80' }}>{metrics.peakTime} ⚡</div>
          <p className={styles.flowNote} style={{ marginTop: '8px' }}>{metrics.peakDesc}</p>
        </div>
      );
    }
  };

  if (loading) {
      return (
        <div className={styles.dashboardGrid} style={{display: 'flex', justifyContent: 'center', marginTop: '50px'}}>
          <Loader2 className={styles.spinner || "spinner"} size={48} color="#3b82f6" />
        </div>
      );
  }

  return (
    <div className={styles.dashboardGrid}>
      
      <section className={`${styles.heroSection} ${styles.animateFadeInUp || ''}`}>
        <div className={styles.heroHeader}>
          <span className={styles.heroBadge}>Dynamic Next Task</span>
          
          <span className={styles.heroUrgency} style={{ color: metrics.totalSessions >= 4 ? '#10b981' : '#f59e0b' }}>
            {metrics.totalSessions >= 4 
              ? `Optimal Focus Window: ${metrics.peakTime}` 
              : (metrics.totalSessions > 0 ? `AI Calibrating (${metrics.totalSessions}/4)...` : "Optimal Focus Window: Not enough data")}
          </span>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className={styles.btnPulseHover || ''}
            style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.8rem', fontWeight: '500'}}
          >
            <Upload size={14} /> Upload Syllabus
          </button>
        </div>
        
        <h1 className={styles.taskTitle}>Study: {displayTask}</h1>
        <p className={styles.taskReason}>{displayReason}</p>

        <div style={{ display: 'flex', gap: '15px', marginTop: '20px', flexWrap: 'wrap' }}>
            <button 
              className={`${styles.startBtn} ${styles.btnPulseHover || ''}`} 
              onClick={() => navigate('/focus', { state: { defaultSubject: roadmap?.courseTitle, defaultTask: displayTask } })}
              style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600' }}
            >
              <Play size={20} fill="currentColor" />
              <span>Start Focused Session</span>
            </button>
            
            <button 
              onClick={() => navigate('/roadmap')}
              style={{ background: 'transparent', color: '#cbd5e1', border: '1px solid #334155', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', transition: 'all 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              View Roadmap
            </button>
        </div>
      </section>

      <section className={styles.animateFadeInUp || ''} style={{ gridColumn: '1 / -1', animationDelay: '0.1s' }}>
        <SubjectLibrary />
      </section>

      {/* --- ACADEMIC TRACK ACCORDION --- */}
      <section className={`${styles.trackCard} ${styles.animateFadeInUp || ''}`} style={{ animationDelay: '0.2s', cursor: 'pointer', transition: 'all 0.3s ease' }} onClick={() => toggleTrack('academic')}>
        <div className={styles.cardHeader}>
          <div className={styles.trackTitle}>
            <BookOpen size={18} /> <h3 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>Overall Academic</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className={styles.trackPercent}>{aggregateProgress.academic}%</span>
              {expandedTracks.academic ? <ChevronUp size={18} color="#94a3b8"/> : <ChevronDown size={18} color="#94a3b8"/>}
          </div>
        </div>
        
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${aggregateProgress.academic}%`, backgroundColor: 'var(--primary)', transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
        </div>

        {expandedTracks.academic && (
            <div onClick={(e) => e.stopPropagation()} style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 'bold' }}>Progress by Subject</span>
                {aggregateProgress.details.map(detail => (
                    <div key={detail.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                            <span style={{ color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80%' }}>{detail.courseTitle}</span>
                            <span style={{ color: 'var(--primary)' }}>{detail.academicProgress}%</span>
                        </div>
                        <div style={{ width: '100%', height: '4px', background: '#1e293b', borderRadius: '2px' }}>
                            <div style={{ width: `${detail.academicProgress}%`, height: '100%', background: 'var(--primary)', borderRadius: '2px' }}></div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </section>

      {/* --- CAREER TRACK ACCORDION --- */}
      <section className={`${styles.trackCard} ${styles.animateFadeInUp || ''}`} style={{ animationDelay: '0.3s', cursor: 'pointer', transition: 'all 0.3s ease' }} onClick={() => toggleTrack('career')}>
        <div className={styles.cardHeader}>
           <div className={styles.trackTitle}>
            <Briefcase size={18} /> <h3 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>Overall Career</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className={styles.trackPercent}>{aggregateProgress.career}%</span>
              {expandedTracks.career ? <ChevronUp size={18} color="#94a3b8"/> : <ChevronDown size={18} color="#94a3b8"/>}
          </div>
        </div>

        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${aggregateProgress.career}%`, backgroundColor: 'var(--secondary)', transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
        </div>

        {expandedTracks.career && (
            <div onClick={(e) => e.stopPropagation()} style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 'bold' }}>Progress by Subject</span>
                {aggregateProgress.details.map(detail => (
                    <div key={detail.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                            <span style={{ color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80%' }}>{detail.courseTitle}</span>
                            <span style={{ color: 'var(--secondary)' }}>{detail.careerProgress}%</span>
                        </div>
                        <div style={{ width: '100%', height: '4px', background: '#1e293b', borderRadius: '2px' }}>
                            <div style={{ width: `${detail.careerProgress}%`, height: '100%', background: 'var(--secondary)', borderRadius: '2px' }}></div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </section>

      {/* --- DYNAMIC ROW: AI INSIGHT & PEAK PRODUCTIVITY --- */}
      <div 
        style={{ 
          display: 'flex', 
          gap: '24px', 
          gridColumn: '1 / -1', 
          width: '100%',
          alignItems: 'stretch' 
        }}
        className={styles.animateFadeInUp || ''}
      >
        <section 
          className={styles.insightCard} 
          onClick={() => navigate('/insights')}
          style={{ 
            animationDelay: '0.5s', 
            flex: '2', 
            margin: 0, 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          title="View full AI Insights"
        >
           <div className={styles.insightHeader}>
             <span className={styles.aiBadge}>AI Insight</span> <ArrowRight size={16} />
           </div>
           <p className={styles.insightText}>
             {metrics.totalSessions === 0 
               ? `Welcome, ${userName}! Your AI growth engine is ready. Complete your first Focus Session to unlock personalized retention insights.` 
               : `"${userName}, you are making great progress! Try shifting Deep Work to your ${metrics.peakTime !== 'Analyzing...' ? metrics.peakTime.split(' - ')[0] : 'optimal'} slot to maximize retention."`}
           </p>
        </section>

        <section 
          className={styles.flowCard} 
          style={{ animationDelay: '0.6s', flex: '1', margin: 0 }}
        >
           <div className={styles.sectionTitle}><Clock size={18} /> <span>Peak Productivity</span></div>
           {renderPeakProductivity()}
        </section>
      </div>

      {/* DYNAMIC CONSISTENCY GRAPH & HEATMAP */}
      <section className={`${styles.consistencySection} ${styles.animateFadeInUp || ''}`} style={{ animationDelay: '0.4s', gridColumn: '1 / -1', width: '100%' }}>
        <div className={styles.sectionTitle} style={{ marginBottom: '16px' }}>
            <TrendingUp size={18} /> <span>Focus & Consistency</span>
        </div>
        
        <div className={styles.statsRow} style={{ marginBottom: '24px' }}>
          <div className={styles.statItem}>
              <span className={styles.statValue}>{metrics.avgFocus}%</span> 
              <span className={styles.statLabel}>Avg Focus</span>
          </div>
          <div className={styles.statItem}>
              <span className={styles.statValue}>{metrics.totalSessions}</span> 
              <span className={styles.statLabel}>Total Sessions</span>
          </div>
        </div>

        <ActivityGraph />
        
      </section>

      <UploadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onComplete={handleRoadmapReady} />
    </div>
  );
};

export default Dashboard;