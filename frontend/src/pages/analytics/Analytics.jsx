import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, Target, Zap, Clock, Activity, Loader2 } from 'lucide-react';
import { Joyride, STATUS } from 'react-joyride'; // 👈 IMPORT JOYRIDE
import styles from './Analytics.module.css';

const getDynamicLast7Days = () => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    result.push(i === 0 ? 'Today' : days[d.getDay()]);
  }
  return result;
};

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  
  const [metrics, setMetrics] = useState({
    avgFocus: 0,
    consistencyData: [0, 0, 0, 0, 0, 0, 0],
    peakTime: "Analyzing...",
    peakDesc: "Log a focus session to unlock AI timing insights.",
    studyVelocity: 1.0 
  });
  const [progress, setProgress] = useState({ academic: 0, career: 0 });

  // --- 🪄 TOUR STATE ---
  const [runTour, setRunTour] = useState(false);
  const tourSteps = [
    {
      target: '#tour-metrics',
      content: (
        <div>
          <h3 style={{ margin: '0 0 10px 0', color: '#f8fafc' }}>Cognitive Analytics 🧠</h3>
          <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.95rem' }}>This is your command center. Watch your Study Velocity and Focus Score update in real-time as you log sessions.</p>
        </div>
      ),
      disableBeacon: true,
    },
    {
      target: '#tour-retention',
      content: (
        <div>
          <h3 style={{ margin: '0 0 10px 0', color: '#f8fafc' }}>Retention Curve 📊</h3>
          <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.95rem' }}>See how consistently you've been studying over the past 7 days. Taller, greener bars mean better focus!</p>
        </div>
      ),
    },
    {
      target: '#tour-flow',
      content: (
        <div>
          <h3 style={{ margin: '0 0 10px 0', color: '#f8fafc' }}>Flow State Clusters ⚡</h3>
          <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.95rem' }}>The AI determines your peak productivity hours so you know exactly when to tackle the hardest subjects.</p>
        </div>
      ),
    }
  ];

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        const [resMetrics, resProgress] = await Promise.all([
          axios.get('http://localhost:5000/api/insights/dashboard').catch(() => ({ data: { data: null } })),
          axios.get('http://localhost:5000/api/syllabus/progress/aggregate').catch(() => ({ data: { academicProgress: 0, careerProgress: 0 } }))
        ]);

        if (resMetrics.data?.success && resMetrics.data?.data) setMetrics(resMetrics.data.data);
        if (resProgress.data) setProgress({ academic: resProgress.data.academicProgress || 0, career: resProgress.data.careerProgress || 0 });
      } catch (error) {
        console.error("Failed to fetch analytics data:", error);
      } finally {
        setLoading(false);
        // 🪄 Check if they have seen the Analytics tour
        if (!localStorage.getItem('hasSeenAnalyticsTour')) {
          setTimeout(() => setRunTour(true), 600);
        }
      }
    };
    fetchAnalyticsData();
  }, []);

  const handleTourCallback = (data) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      localStorage.setItem('hasSeenAnalyticsTour', 'true');
      setRunTour(false);
    }
  };

  const velocityMultiplier = metrics.studyVelocity || 1.0;
  const activeDaysCount = metrics.consistencyData.filter(d => d > 0).length;
  const isAhead = progress.academic >= 50;
  const projectionTitle = isAhead ? "On Track" : "Needs Attention";
  const projectionDesc = isAhead ? "Estimated finish: 3 days before exam." : "You are currently falling behind schedule.";
  const projectionColor = isAhead ? 'var(--success)' : 'var(--warning)';
  const dynamicDaysOfWeek = getDynamicLast7Days();
  const graphHeights = ['10%', '35%', '60%', '85%', '100%']; 

  if (loading) {
    return (
      <div className={styles.analyticsContainer} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Loader2 size={48} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className={styles.analyticsContainer}>
      
      {/* 🪄 JOYRIDE INJECTION */}
      <Joyride
        steps={tourSteps} run={runTour} continuous={true} showSkipButton={true} callback={handleTourCallback}
        styles={{
          options: { arrowColor: '#1e293b', backgroundColor: '#1e293b', overlayColor: 'rgba(15, 23, 42, 0.85)', primaryColor: '#6366f1', textColor: '#f8fafc', zIndex: 1000 },
          buttonNext: { backgroundColor: '#6366f1', borderRadius: '8px', fontSize: '0.9rem', padding: '8px 16px' },
          buttonBack: { color: '#cbd5e1', marginRight: '8px' }, buttonSkip: { color: '#64748b' }
        }}
      />

      <header className={`${styles.header} ${styles.animateFadeInUp}`}>
        <h1>Cognitive Analytics</h1>
        <p>Real-time insights into your study velocity and retention.</p>
      </header>

      <section id="tour-metrics" className={styles.metricsGrid}> {/* 👈 TARGET 1 */}
        <div className={`${styles.metricCard} ${styles.animateFadeInUp}`} style={{ animationDelay: '0.1s' }}>
          <div className={styles.cardIcon}><Zap size={20} /></div>
          <div className={styles.cardContent}>
            <h3>Study Velocity</h3>
            <div className={styles.bigValue}>{velocityMultiplier}x</div>
            <p className={styles.subText}>{velocityMultiplier >= 1.0 ? 'You are learning faster than estimated.' : 'Your learning pace is slightly below average.'}</p>
          </div>
        </div>

        <div className={`${styles.metricCard} ${styles.animateFadeInUp}`} style={{ animationDelay: '0.2s' }}>
          <div className={styles.cardIcon}><Activity size={20} /></div>
          <div className={styles.cardContent}>
            <h3>Avg Focus Score</h3>
            <div className={styles.bigValue}>{metrics.avgFocus}%</div>
            <p className={styles.subText}>{activeDaysCount} active study days this week.</p>
          </div>
        </div>

        <div className={`${styles.metricCard} ${styles.animateFadeInUp}`} style={{ animationDelay: '0.3s' }}>
          <div className={styles.cardIcon}><Target size={20} /></div>
          <div className={styles.cardContent}>
            <h3>Goal Projection</h3>
            <div className={styles.bigValue}>{projectionTitle}</div>
            <p className={styles.subText} style={{ color: projectionColor }}>{projectionDesc}</p>
          </div>
        </div>
      </section>

      <section className={styles.chartsRow}>
        <div id="tour-retention" className={`${styles.chartCard} ${styles.animateFadeInUp}`} style={{ animationDelay: '0.4s' }}> {/* 👈 TARGET 2 */}
          <div className={styles.chartHeader}>
            <h3>Retention Curve</h3>
            <select className={styles.btnPulseHover}><option>Last 7 Days</option></select>
          </div>
          <div className={styles.graphContainer}>
            {metrics.consistencyData.map((intensityLevel, index) => (
              <div key={index} className={styles.barGroup}>
                <div className={`${styles.bar} ${styles.animateGrow}`} style={{ height: graphHeights[intensityLevel], backgroundColor: intensityLevel >= 3 ? 'var(--primary)' : 'var(--secondary)', animationDelay: `${0.5 + (index * 0.1)}s` }}></div>
                <span className={styles.animateFadeInUp} style={{ animationDelay: `${0.5 + (index * 0.1)}s`, color: index === 6 ? '#f8fafc' : '#94a3b8', fontWeight: index === 6 ? 'bold' : 'normal' }}>
                  {dynamicDaysOfWeek[index]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div id="tour-flow" className={`${styles.chartCard} ${styles.animateFadeInUp}`} style={{ animationDelay: '0.5s' }}> {/* 👈 TARGET 3 */}
          <div className={styles.chartHeader}>
            <h3>Flow State Clusters</h3>
          </div>
          <div className={styles.flowContent}>
            <div className={styles.flowStat}>
              <Clock size={32} className={styles.flowIcon} />
              <div><h4>Peak Hours</h4><span>{metrics.peakTime}</span></div>
            </div>
            <p className={styles.flowDesc}>{metrics.peakDesc}</p>
            <div className={styles.tags}>
              <span className={styles.btnPulseHover} style={{cursor: 'default'}}>Deep Work</span>
              <span className={styles.btnPulseHover} style={{cursor: 'default'}}>Night Owl</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Analytics;