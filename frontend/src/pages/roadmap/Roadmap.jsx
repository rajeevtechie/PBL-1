import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  BookOpen, 
  Briefcase, 
  CheckCircle, 
  Circle, 
  Lock, 
  AlertTriangle, 
  Loader2,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import styles from './Roadmap.module.css';

const Roadmap = () => {
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // --- NEW: State to track which units are expanded ---
  const [expandedUnits, setExpandedUnits] = useState({});

  // --- NEW: Function to toggle unit expansion ---
  const toggleUnit = (index) => {
    setExpandedUnits(prev => ({
      ...prev,
      [index]: !prev[index] // Toggle between true/false for this specific unit index
    }));
  };

  // Fetch the Real Syllabus Data
  useEffect(() => {
    const fetchRoadmap = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            setError("Please login to view your roadmap.");
            setLoading(false);
            return;
        }

        // 1. Check if user clicked a specific subject
        const activeId = localStorage.getItem('activeSyllabusId');
        
        // 2. Decide which URL to use
        const endpoint = activeId 
            ? `http://localhost:5000/api/syllabus/${activeId}` 
            : 'http://localhost:5000/api/syllabus/latest';

        // 3. Fetch it!
        const response = await axios.get(endpoint, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        setRoadmap(response.data);
      } catch (err) {
        console.error("Error loading roadmap:", err);
        if (err.response?.status === 404) {
            setError("No roadmap found. Upload a syllabus on the Dashboard first!");
        } else {
            setError("Failed to load your learning path.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchRoadmap();
  }, []);

  if (loading) {
      return (
          <div className={styles.centerMsg}>
              <Loader2 size={48} className={styles.spinner} />
              <p>Loading your personal roadmap...</p>
          </div>
      );
  }
  if (error) {
      return (
          <div className={styles.centerMsg}>
              <div className={styles.errorIcon}><AlertTriangle size={48} /></div>
              <h3>No Roadmap Found</h3>
              <p>{error}</p>
          </div>
      );
  }

  return (
    <div className={styles.roadmapContainer}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
            <h1>{roadmap.courseTitle || "Academic Roadmap"}</h1>
            <p>
            <span className={styles.highlight}>Academic Syllabus</span> synced with <span className={styles.highlight}>Industry Demands</span>.
            </p>
        </div>
      </header>

      <div className={styles.tracksGrid}>
        
        {/* === LEFT COLUMN: REAL ACADEMIC DATA === */}
        <section className={styles.trackColumn}>
          <div className={styles.trackHeader}>
            <div className={styles.iconBox}><BookOpen size={24} /></div>
            <div>
              <h2>Academic Track</h2>
              <span className={styles.subLabel}>University Syllabus</span>
            </div>
          </div>
          
          <div className={styles.timeline}>
            {roadmap.units && roadmap.units.map((unit, index) => (
              <div key={index} className={`${styles.node} ${index === 0 ? styles.current : styles.locked}`}>
                <div className={styles.line}></div>
                
                {/* Marker Icon */}
                <div className={styles.marker}>
                  {index === 0 ? <Circle size={18} /> : <Lock size={16} />}
                </div>

                {/* Content Card */}
                <div className={styles.content}>
                  <div className={styles.unitBadge}>Unit {unit.unitNumber}</div>
                  <h3>{unit.title}</h3>
                  
                  {/* --- UPDATED: Dynamic Topics List --- */}
                  <ul className={styles.topicList}>
                      {unit.topics
                        // Show all if expanded, otherwise slice to 3
                        .slice(0, expandedUnits[index] ? unit.topics.length : 3)
                        .map((topic, tIdx) => (
                          <li key={tIdx}>
                            <ChevronRight size={14} style={{ minWidth: '14px' }} /> 
                            {topic}
                          </li>
                      ))}
                      
                      {/* Toggle Button for More/Less Topics */}
                      {unit.topics.length > 3 && (
                          <li 
                            className={styles.moreTopics} 
                            onClick={() => toggleUnit(index)}
                            style={{ cursor: 'pointer', display: 'inline-block', color: 'var(--primary)', fontWeight: '600' }}
                          >
                            {expandedUnits[index] ? "- Show less" : `+ ${unit.topics.length - 3} more topics`}
                          </li>
                      )}
                  </ul>
                  {/* --------------------------------- */}

                </div>
              </div>
            ))}
          </div>
        </section>

        {/* === RIGHT COLUMN: FUTURE AI INSIGHTS === */}
        <section className={styles.trackColumn}>
          <div className={styles.trackHeader}>
            <div className={styles.iconBox}><Briefcase size={24} /></div>
            <div>
              <h2>Career Track</h2>
              <span className={styles.subLabel}>Market Gap Analysis</span>
            </div>
          </div>

          <div className={styles.timeline}>
              <div className={`${styles.node} ${styles.aiNode}`}>
                <div className={styles.line}></div>
                <div className={styles.marker}>
                   <Sparkles size={18} />
                </div>
                <div className={styles.content}>
                  <h3>Generate Career Insights</h3>
                  <p className={styles.aiDescription}>
                      Click to compare your syllabus against <strong>Full Stack Developer</strong> job requirements.
                  </p>
                  <button className={styles.aiBtn}>
                      <Sparkles size={16} /> Analyze Gaps
                  </button>
                </div>
              </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default Roadmap;