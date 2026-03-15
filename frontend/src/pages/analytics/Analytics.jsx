import React from 'react';
import { TrendingUp, Target, Zap, Clock, Activity, Calendar } from 'lucide-react';
import styles from './Analytics.module.css';

const Analytics = () => {
  return (
    <div className={styles.analyticsContainer}>
      <header className={styles.header}>
        <h1>Cognitive Analytics</h1>
        <p>Real-time insights into your study velocity and retention.</p>
      </header>

      {/* 1. KEY METRICS GRID (Feature 6: Velocity & Projection) [cite: 426] */}
      <section className={styles.metricsGrid}>
        
        {/* VELOCITY CARD [cite: 429] */}
        <div className={styles.metricCard}>
          <div className={styles.cardIcon}><Zap size={20} /></div>
          <div className={styles.cardContent}>
            <h3>Study Velocity</h3>
            <div className={styles.bigValue}>1.2x</div>
            <p className={styles.subText}>You are learning 20% faster than estimated.</p>
          </div>
        </div>

        {/* CONSISTENCY CARD [cite: 10] */}
        <div className={styles.metricCard}>
          <div className={styles.cardIcon}><Activity size={20} /></div>
          <div className={styles.cardContent}>
            <h3>Consistency Score</h3>
            <div className={styles.bigValue}>85%</div>
            <p className={styles.subText}>12 day active streak.</p>
          </div>
        </div>

        {/* GOAL PROJECTION [cite: 433] */}
        <div className={styles.metricCard}>
          <div className={styles.cardIcon}><Target size={20} /></div>
          <div className={styles.cardContent}>
            <h3>Goal Projection</h3>
            <div className={styles.bigValue}>On Track</div>
            <p className={styles.subText} style={{ color: 'var(--success)' }}>
              Estimated finish: 3 days before exam.
            </p>
          </div>
        </div>
      </section>

      {/* 2. GRAPHS SECTION */}
      <section className={styles.chartsRow}>
        
        {/* RETENTION CURVE */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3>Retention Curve</h3>
            <select><option>Last 7 Days</option></select>
          </div>
          <div className={styles.graphContainer}>
            {/* CSS-Only Bar Chart Simulation */}
            <div className={styles.barGroup}>
              <div className={styles.bar} style={{ height: '40%' }}></div>
              <span>Mon</span>
            </div>
            <div className={styles.barGroup}>
              <div className={styles.bar} style={{ height: '65%' }}></div>
              <span>Tue</span>
            </div>
            <div className={styles.barGroup}>
              <div className={styles.bar} style={{ height: '50%' }}></div>
              <span>Wed</span>
            </div>
            <div className={styles.barGroup}>
              <div className={styles.bar} style={{ height: '85%' }}></div>
              <span>Thu</span>
            </div>
            <div className={styles.barGroup}>
              <div className={styles.bar} style={{ height: '100%', backgroundColor: 'var(--primary)' }}></div>
              <span>Fri</span>
            </div>
            <div className={styles.barGroup}>
              <div className={styles.bar} style={{ height: '70%' }}></div>
              <span>Sat</span>
            </div>
            <div className={styles.barGroup}>
              <div className={styles.bar} style={{ height: '90%' }}></div>
              <span>Sun</span>
            </div>
          </div>
        </div>

        {/* FLOW STATE [cite: 338] */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3>Flow State Clusters</h3>
          </div>
          <div className={styles.flowContent}>
            <div className={styles.flowStat}>
              <Clock size={32} className={styles.flowIcon} />
              <div>
                <h4>Peak Hours</h4>
                <span>10:00 PM - 01:00 AM</span>
              </div>
            </div>
            <p className={styles.flowDesc}>
              Our AI detected your highest focus levels during late-night sessions. 
              We have auto-scheduled "Hard" topics for this window.
            </p>
            <div className={styles.tags}>
              <span>Deep Work</span>
              <span>Night Owl</span>
            </div>
          </div>
        </div>

      </section>
    </div>
  );
};

export default Analytics;