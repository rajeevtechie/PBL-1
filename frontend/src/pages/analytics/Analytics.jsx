import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, Target, Zap, Clock, Activity, Loader2 } from 'lucide-react';
import styles from './Analytics.module.css';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  
  // --- LIVE DATA STATE ---
  const [metrics, setMetrics] = useState({
    avgFocus: 0,
    consistencyData: [0, 0, 0, 0, 0, 0, 0],
    peakTime: "Analyzing...",
    peakDesc: "Log a focus session to unlock AI timing insights."
  });
  const [progress, setProgress] = useState({ academic: 0, career: 0 });

  // --- FETCH DATA ON MOUNT ---
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }

        // Fetch Both Insights and Aggregate Progress simultaneously
        const [resMetrics, resProgress] = await Promise.all([
          axios.get('http://localhost:5000/api/insights/dashboard', { 
            headers: { Authorization: `Bearer ${token}` } 
          }).catch(() => ({ data: { data: null } })), // Catch individual failures safely
          
          axios.get('http://localhost:5000/api/syllabus/progress/aggregate', { 
            headers: { Authorization: `Bearer ${token}` } 
          }).catch(() => ({ data: { academicProgress: 0, careerProgress: 0 } }))
        ]);

        if (resMetrics.data?.success && resMetrics.data?.data) {
          setMetrics(resMetrics.data.data);
        }
        
        if (resProgress.data) {
          setProgress({
            academic: resProgress.data.academicProgress || 0,
            career: resProgress.data.careerProgress || 0
          });
        }

      } catch (error) {
        console.error("Failed to fetch analytics data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, []);

  // --- DYNAMIC CALCULATIONS ---
  // 1. Velocity: Scales dynamically based on average focus score
  const velocityMultiplier = Math.max(0.8, (metrics.avgFocus / 70)).toFixed(1);
  
  // 2. Active Streak: Count of days this week with a score > 0
  const activeDaysCount = metrics.consistencyData.filter(d => d > 0).length;

  // 3. Goal Projection: Changes based on their academic progress percentage
  const isAhead = progress.academic >= 50;
  const projectionTitle = isAhead ? "On Track" : "Needs Attention";
  const projectionDesc = isAhead 
    ? "Estimated finish: 3 days before exam." 
    : "You are currently falling behind schedule.";
  const projectionColor = isAhead ? 'var(--success)' : 'var(--warning)';

  // 4. Bar Graph Mapper
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const graphHeights = ['10%', '35%', '60%', '85%', '100%']; // Maps 0-4 intensity to CSS height

  if (loading) {
    return (
      <div className={styles.analyticsContainer} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Loader2 size={48} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className={styles.analyticsContainer}>
      <header className={`${styles.header} ${styles.animateFadeInUp}`}>
        <h1>Cognitive Analytics</h1>
        <p>Real-time insights into your study velocity and retention.</p>
      </header>

      {/* 1. KEY METRICS GRID */}
      <section className={styles.metricsGrid}>
        
        {/* DYNAMIC VELOCITY CARD */}
        <div className={`${styles.metricCard} ${styles.animateFadeInUp}`} style={{ animationDelay: '0.1s' }}>
          <div className={styles.cardIcon}><Zap size={20} /></div>
          <div className={styles.cardContent}>
            <h3>Study Velocity</h3>
            <div className={styles.bigValue}>{velocityMultiplier}x</div>
            <p className={styles.subText}>
              {velocityMultiplier >= 1.0 ? 'You are learning faster than estimated.' : 'Your learning pace is slightly below average.'}
            </p>
          </div>
        </div>

        {/* DYNAMIC CONSISTENCY CARD */}
        <div className={`${styles.metricCard} ${styles.animateFadeInUp}`} style={{ animationDelay: '0.2s' }}>
          <div className={styles.cardIcon}><Activity size={20} /></div>
          <div className={styles.cardContent}>
            <h3>Avg Focus Score</h3>
            <div className={styles.bigValue}>{metrics.avgFocus}%</div>
            <p className={styles.subText}>{activeDaysCount} active study days this week.</p>
          </div>
        </div>

        {/* DYNAMIC GOAL PROJECTION */}
        <div className={`${styles.metricCard} ${styles.animateFadeInUp}`} style={{ animationDelay: '0.3s' }}>
          <div className={styles.cardIcon}><Target size={20} /></div>
          <div className={styles.cardContent}>
            <h3>Goal Projection</h3>
            <div className={styles.bigValue}>{projectionTitle}</div>
            <p className={styles.subText} style={{ color: projectionColor }}>
              {projectionDesc}
            </p>
          </div>
        </div>
      </section>

      {/* 2. GRAPHS SECTION */}
      <section className={styles.chartsRow}>
        
        {/* LIVE RETENTION CURVE */}
        <div className={`${styles.chartCard} ${styles.animateFadeInUp}`} style={{ animationDelay: '0.4s' }}>
          <div className={styles.chartHeader}>
            <h3>Retention Curve</h3>
            <select className={styles.btnPulseHover}><option>Last 7 Days</option></select>
          </div>
          <div className={styles.graphContainer}>
            
            {/* Dynamically map the 7-day array from your database */}
            {metrics.consistencyData.map((intensityLevel, index) => (
              <div key={index} className={styles.barGroup}>
                <div 
                  className={`${styles.bar} ${styles.animateGrow}`} 
                  style={{ 
                    height: graphHeights[intensityLevel], 
                    backgroundColor: intensityLevel >= 3 ? 'var(--primary)' : 'var(--secondary)',
                    animationDelay: `${0.5 + (index * 0.1)}s` 
                  }}
                ></div>
                <span className={styles.animateFadeInUp} style={{ animationDelay: `${0.5 + (index * 0.1)}s` }}>
                  {daysOfWeek[index]}
                </span>
              </div>
            ))}

          </div>
        </div>

        {/* LIVE FLOW STATE */}
        <div className={`${styles.chartCard} ${styles.animateFadeInUp}`} style={{ animationDelay: '0.5s' }}>
          <div className={styles.chartHeader}>
            <h3>Flow State Clusters</h3>
          </div>
          <div className={styles.flowContent}>
            <div className={styles.flowStat}>
              <Clock size={32} className={styles.flowIcon} />
              <div>
                <h4>Peak Hours</h4>
                <span>{metrics.peakTime}</span>
              </div>
            </div>
            <p className={styles.flowDesc}>
              {metrics.peakDesc}
            </p>
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