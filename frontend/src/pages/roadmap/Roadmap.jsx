import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  BookOpen, Briefcase, CheckCircle, Circle, Lock, 
  AlertTriangle, Loader2, ChevronRight, Sparkles, Target
} from 'lucide-react';
import styles from './Roadmap.module.css';

const Roadmap = () => {
  const [roadmap, setRoadmap] = useState(null);
  const [careerData, setCareerData] = useState(null); // NEW: Holds career gaps
  
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false); // NEW: Loading state for AI
  const [targetRole, setTargetRole] = useState("");  // NEW: Input state
  const [error, setError] = useState('');
  
  const [expandedUnits, setExpandedUnits] = useState({});

  const toggleUnit = (index) => {
    setExpandedUnits(prev => ({ ...prev, [index]: !prev[index] }));
  };

  // Fetch Academic Syllabus & Career Data on Load
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
            setError("Please login to view your roadmap.");
            setLoading(false); return;
        }

        const activeId = localStorage.getItem('activeSyllabusId');
        const endpoint = activeId 
            ? `http://localhost:5000/api/syllabus/${activeId}` 
            : 'http://localhost:5000/api/syllabus/latest';

        // 1. Fetch Syllabus
        const resSyllabus = await axios.get(endpoint, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        setRoadmap(resSyllabus.data);

        // 2. Fetch Career Insights (if any exist)
        try {
            const resCareer = await axios.get('http://localhost:5000/api/syllabus/career-insights', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setCareerData(resCareer.data);
        } catch  {
            console.log("No career data yet, that's fine!");
        }

      } catch (err) {
        console.error("Error loading roadmap:", err);
        setError(err.response?.status === 404 ? "No roadmap found. Upload a syllabus first!" : "Failed to load your learning path.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- NEW: Handle AI Generation ---
  const handleAnalyzeGaps = async () => {
    if (!targetRole.trim()) {
        alert("Please enter a target role first!"); return;
    }
    
    // We need the current syllabus ID. If activeSyllabusId isn't set, we assume they are on their latest one.
    // To be safe, let's grab it from local storage, or fallback to 'latest'
    const activeId = localStorage.getItem('activeSyllabusId') || 'latest';
    
    setAnalyzing(true);
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`http://localhost:5000/api/syllabus/${activeId}/analyze`, 
            { targetRole: targetRole },
            { headers: { 'Authorization': `Bearer ${token}` }}
        );
        
        // Update UI with new data
        setCareerData({
            targetRole: targetRole,
            recommendations: response.data.recommendations
        });
    } catch (err) {
        console.error(err);
        alert("Failed to analyze gaps. Make sure you are using a specific syllabus ID.");
    } finally {
        setAnalyzing(false);
    }
  };

  if (loading) return <div className={styles.centerMsg}><Loader2 className={styles.spinner} size={48}/></div>;
  if (error) return <div className={styles.centerMsg}><AlertTriangle size={48}/> <p>{error}</p></div>;

  return (
    <div className={styles.roadmapContainer}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
            <h1>{roadmap?.courseTitle || "Academic Roadmap"}</h1>
            <p>
               <span className={styles.highlight}>Academic Syllabus</span> synced with 
               <span className={styles.highlight}> Industry Demands</span>.
            </p>
        </div>
      </header>

      <div className={styles.tracksGrid}>
        
        {/* === LEFT COLUMN: ACADEMIC TRACK === */}
        <section className={styles.trackColumn}>
          <div className={styles.trackHeader}>
            <div className={styles.iconBox}><BookOpen size={24} /></div>
            <div>
              <h2>Academic Track</h2>
              <span className={styles.subLabel}>University Syllabus</span>
            </div>
          </div>
          
          <div className={styles.timeline}>
            {roadmap?.units?.map((unit, index) => (
              <div key={index} className={`${styles.node} ${index === 0 ? styles.current : styles.locked}`}>
                <div className={styles.line}></div>
                <div className={styles.marker}>
                  {index === 0 ? <Circle size={18} /> : <Lock size={16} />}
                </div>
                <div className={styles.content}>
                  <div className={styles.unitBadge}>Unit {unit.unitNumber}</div>
                  <h3>{unit.title}</h3>
                  <ul className={styles.topicList}>
                      {unit.topics.slice(0, expandedUnits[index] ? unit.topics.length : 3).map((topic, tIdx) => (
                          <li key={tIdx}><ChevronRight size={14} style={{ minWidth: '14px' }} /> {topic}</li>
                      ))}
                      {unit.topics.length > 3 && (
                          <li className={styles.moreTopics} onClick={() => toggleUnit(index)} style={{ cursor: 'pointer', color: 'var(--primary)', fontWeight: '600' }}>
                            {expandedUnits[index] ? "- Show less" : `+ ${unit.topics.length - 3} more topics`}
                          </li>
                      )}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* === RIGHT COLUMN: CAREER TRACK === */}
        <section className={styles.trackColumn}>
          <div className={styles.trackHeader}>
            <div className={styles.iconBox}><Briefcase size={24} /></div>
            <div>
              <h2>Career Track</h2>
              <span className={styles.subLabel}>
                 {careerData?.targetRole ? `Gaps for ${careerData.targetRole}` : "Market Gap Analysis"}
              </span>
            </div>
          </div>

          <div className={styles.timeline}>
              
              {/* IF NO CAREER DATA YET: SHOW GENERATOR FORM */}
              {(!careerData || !careerData.recommendations || careerData.recommendations.length === 0) ? (
                  <div className={`${styles.node} ${styles.aiNode}`}>
                    <div className={styles.line}></div>
                    <div className={styles.marker}><Sparkles size={18} /></div>
                    <div className={styles.content}>
                      <h3>Generate Career Insights</h3>
                      <p className={styles.aiDescription}>
                          What is your dream job? We will compare your syllabus against industry requirements to find the missing skills.
                      </p>
                      
                      <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                          <input 
                              type="text" 
                              placeholder="e.g. Full Stack Developer" 
                              value={targetRole}
                              onChange={(e) => setTargetRole(e.target.value)}
                              style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#1e293b', color: 'white' }}
                          />
                          <button 
                              className={styles.aiBtn} 
                              onClick={handleAnalyzeGaps}
                              disabled={analyzing}
                              style={{ opacity: analyzing ? 0.7 : 1 }}
                          >
                              {analyzing ? <Loader2 className={styles.spinner} size={16}/> : <Sparkles size={16} />} 
                              {analyzing ? "Analyzing..." : "Analyze Gaps"}
                          </button>
                      </div>
                    </div>
                  </div>
              ) : (
                  /* IF CAREER DATA EXISTS: SHOW THE TIMELINE OF GAPS */
                  careerData.recommendations.map((rec, index) => (
                      <div key={index} className={styles.node}>
                        <div className={styles.line}></div>
                        <div className={styles.marker} style={{ color: 'var(--secondary)', backgroundColor: 'rgba(236, 72, 153, 0.1)' }}>
                            <Target size={16} />
                        </div>
                        <div className={styles.content}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '0.8rem', color: 'var(--secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>
                                  {rec.category}
                              </span>
                              <span style={{ 
                                  fontSize: '0.75rem', 
                                  padding: '2px 8px', 
                                  borderRadius: '12px',
                                  backgroundColor: rec.importance_level === 'Critical' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                  color: rec.importance_level === 'Critical' ? '#ef4444' : '#f59e0b'
                              }}>
                                  {rec.importance_level}
                              </span>
                          </div>
                          <h3 style={{ margin: 0 }}>{rec.topic_name}</h3>
                          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                              Industry standard requirement for {careerData.targetRole}.
                          </p>
                        </div>
                      </div>
                  ))
              )}

          </div>
        </section>

      </div>
    </div>
  );
};

export default Roadmap;