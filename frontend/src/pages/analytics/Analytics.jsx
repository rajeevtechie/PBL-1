import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, Target, Zap, Clock, Activity, Loader2 } from 'lucide-react';
import styles from './Analytics.module.css';

// ✅ NEW: Helper function to generate the exact last 7 days dynamically
const getDynamicLast7Days = () => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    // Label index 0 (which is today) as 'Today', otherwise use the day name
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
    studyVelocity: 1.0 // 👈 Now defaults to 1.0 until backend loads
  });
  const [progress, setProgress] = useState({ academic: 0, career: 0 });

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        const [resMetrics, resProgress] = await Promise.all([
          // Secure cookies mean we don't need to pass headers manually!
          axios.get('http://localhost:5000/api/insights/dashboard').catch(() => ({ data: { data: null } })),
          axios.get('http://localhost:5000/api/syllabus/progress/aggregate').catch(() => ({ data: { academicProgress: 0, careerProgress: 0 } }))
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
  
  // 1. Velocity: Now pulled directly from real Task completion data!
  const velocityMultiplier = metrics.studyVelocity || 1.0;
  
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
  const dynamicDaysOfWeek = getDynamicLast7Days();
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
        
        <div className={`${styles.metricCard} ${styles.animateFadeInUp}`} style={{ animationDelay: '0.1s' }}>
          <div className={styles.cardIcon}><Zap size={20} /></div>
          <div className={styles.cardContent}>
            <h3>Study Velocity</h3>
            <div className={styles.bigValue}>{velocityMultiplier}x</div>
            <p className={styles.subText}>
              {velocityMultiplier >= 1.0 
                ? 'You are learning faster than estimated.' 
                : 'Your learning pace is slightly below average.'}
            </p>
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
            <p className={styles.subText} style={{ color: projectionColor }}>
              {projectionDesc}
            </p>
          </div>
        </div>
      </section>

      {/* 2. GRAPHS SECTION */}
      <section className={styles.chartsRow}>
        
        <div className={`${styles.chartCard} ${styles.animateFadeInUp}`} style={{ animationDelay: '0.4s' }}>
          <div className={styles.chartHeader}>
            <h3>Retention Curve</h3>
            <select className={styles.btnPulseHover}><option>Last 7 Days</option></select>
          </div>
          <div className={styles.graphContainer}>
            
            {/* Dynamically map the 7-day array to the EXACT days of the week */}
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
                {/* Check out the label! It maps to our dynamic array now. */}
                <span className={styles.animateFadeInUp} style={{ animationDelay: `${0.5 + (index * 0.1)}s`, color: index === 6 ? '#f8fafc' : '#94a3b8', fontWeight: index === 6 ? 'bold' : 'normal' }}>
                  {dynamicDaysOfWeek[index]}
                </span>
              </div>
            ))}

          </div>
        </div>

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