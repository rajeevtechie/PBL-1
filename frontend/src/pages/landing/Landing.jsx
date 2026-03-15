import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Target, Zap, BarChart2 } from 'lucide-react';
import styles from './Landing.module.css';

const Landing = () => {
  return (
    <div className={styles.landingContainer}>
      
      {/* 1. NAVBAR */}
      <nav className={styles.navbar}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>IE</div>
          <span>InsightED</span>
        </div>
        <div className={styles.navLinks}>
          <Link to="/login" className={styles.loginBtn}>Login</Link>
          <Link to="/register" className={styles.ctaBtn}>Get Started</Link>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <header className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Bridge the Gap Between <br />
            <span className={styles.highlight}>Syllabus</span> & <span className={styles.highlight}>Industry</span>
          </h1>
          <p className={styles.heroSub}>
            Don't just pass your exams. Build a career. EduNexus syncs your academic curriculum with real-world job skills in one dual-track roadmap.
          </p>
          <div className={styles.heroActions}>
            <Link to="/register" className={styles.primaryBtn}>
              Start Your Journey <ArrowRight size={20} />
            </Link>
            <button className={styles.secondaryBtn}>View Demo</button>
          </div>
        </div>
        
        {/* Abstract Visual Representation of "Bridging the Gap" */}
        <div className={styles.heroVisual}>
          <div className={styles.floatingCard} style={{ top: '20%', left: '10%' }}>
            <BookOpen size={24} color="#6366f1" />
            <span>Academic API</span>
          </div>
          <div className={styles.floatingCard} style={{ top: '50%', right: '10%' }}>
            <Zap size={24} color="#10b981" />
            <span>Job Skills</span>
          </div>
          <div className={styles.connectionLine}></div>
        </div>
      </header>

      {/* 3. FEATURES GRID */}
      <section className={styles.features}>
        <div className={styles.sectionHeader}>
          <h2>Why EduNexus?</h2>
          <p>The only platform that adapts to your university schedule.</p>
        </div>

        <div className={styles.grid}>
          <div className={styles.featureCard}>
            <div className={styles.iconBox}><Target size={24} /></div>
            <h3>Dual-Track Roadmap</h3>
            <p>Automatically maps your college syllabus topics to relevant industry interview questions.</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.iconBox}><Zap size={24} /></div>
            <h3>Focus Mode</h3>
            <p>Distraction-free study timer with integrated resources to maximize retention.</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.iconBox}><BarChart2 size={24} /></div>
            <h3>Cognitive Analytics</h3>
            <p>Visualize your learning patterns across 4 quadrants: Analytical, Creative, Logic, and Theory.</p>
          </div>
        </div>
      </section>

      {/* 4. FOOTER */}
      <footer className={styles.footer}>
        <p>© 2025 EduNexus Project. Built for SIT Pune.</p>
      </footer>

    </div>
  );
};

export default Landing;