import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  BookOpen, Briefcase, CheckCircle, Circle, Lock, 
  AlertTriangle, Loader2, ChevronRight, Sparkles, Target, Edit2
} from 'lucide-react';
import styles from './Roadmap.module.css';

const Roadmap = () => {
  const [roadmap, setRoadmap] = useState(null);
  const [careerData, setCareerData] = useState(null); 
  
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false); 
  const [targetRole, setTargetRole] = useState("");  
  const [error, setError] = useState('');
  
  const [isEditingGoal, setIsEditingGoal] = useState(false);
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

        // 2. Fetch Career Insights
        try {
            const resCareer = await axios.get('http://localhost:5000/api/syllabus/career-insights', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setCareerData(resCareer.data);
            if (resCareer.data.targetRole) {
                setTargetRole(resCareer.data.targetRole);
            }
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

  // --- Handle AI Generation ---
  const handleAnalyzeGaps = async () => {
    if (!targetRole.trim()) {
        alert("Please enter a target role first!"); return;
    }
    
    setAnalyzing(true);
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`http://localhost:5000/api/syllabus/latest/analyze`, 
            { targetRole: targetRole },
            { headers: { 'Authorization': `Bearer ${token}` }}
        );
        
        setCareerData({
            targetRole: targetRole,
            recommendations: response.data.recommendations
        });
        setIsEditingGoal(false);

    } catch (err) {
        console.error(err);
        alert("Failed to analyze gaps.");
    } finally {
        setAnalyzing(false);
    }
  };

  // --- NEW: Handle Checkbox Toggle ---
  const handleToggleComplete = async (recId, currentStatus) => {
    try {
        const token = localStorage.getItem('token');
        const newStatus = !currentStatus;

        // 1. Optimistic UI Update (Change it instantly on screen)
        setCareerData(prev => ({
            ...prev,
            recommendations: prev.recommendations.map(rec => 
                rec.id === recId ? { ...rec, is_completed: newStatus } : rec
            )
        }));

        // 2. Tell the backend to save the change in the database
        await axios.patch(`http://localhost:5000/api/syllabus/recommendation/${recId}/toggle`, 
            { isCompleted: newStatus },
            { headers: { 'Authorization': `Bearer ${token}` }}
        );
    } catch (err) {
        console.error("Failed to update status", err);
        // Revert UI if the network request fails
        alert("Failed to save progress. Please try again.");
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
          <div className={styles.trackHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <div className={styles.iconBox}><Briefcase size={24} /></div>
              <div>
                <h2>Career Track</h2>
                <span className={styles.subLabel}>
                   {careerData?.targetRole && !isEditingGoal ? `Gaps for ${careerData.targetRole}` : "Market Gap Analysis"}
                </span>
              </div>
            </div>
            
            {/* The Edit Goal Button */}
            {careerData?.targetRole && (
                <button 
                  onClick={() => setIsEditingGoal(!isEditingGoal)}
                  style={{
                      background: 'transparent', border: '1px solid #334155', color: '#cbd5e1', 
                      padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', 
                      display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem',
                      transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#334155'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <Edit2 size={14} /> {isEditingGoal ? "Cancel" : "Edit Goal"}
                </button>
            )}
          </div>

          <div className={styles.timeline}>
              
              {/* FORM VIEW */}
              {(!careerData || !careerData.recommendations || careerData.recommendations.length === 0 || isEditingGoal) ? (
                  <div className={`${styles.node} ${styles.aiNode}`}>
                    <div className={styles.line}></div>
                    <div className={styles.marker}><Sparkles size={18} /></div>
                    <div className={styles.content}>
                      <h3>Generate Career Insights</h3>
                      <p className={styles.aiDescription}>
                          What is your goal? Try typing a specific job (<strong>Data Scientist</strong>) or an objective (<strong>Java Interview Prep</strong>).
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
                  /* TIMELINE VIEW WITH CLICKABLE CHECKBOXES */
                  careerData.recommendations.map((rec) => (
                      <div key={rec.id} className={styles.node}>
                        <div className={styles.line}></div>
                        
                        {/* THE CLICKABLE MARKER */}
                        <div 
                            className={styles.marker} 
                            onClick={() => handleToggleComplete(rec.id, rec.is_completed)}
                            style={{ 
                                cursor: 'pointer',
                                color: rec.is_completed ? '#10b981' : 'var(--secondary)', 
                                backgroundColor: rec.is_completed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(236, 72, 153, 0.1)',
                                transition: 'all 0.3s ease',
                                border: rec.is_completed ? 'none' : '2px solid transparent'
                            }}
                            title="Click to mark as complete!"
                        >
                            {rec.is_completed ? <CheckCircle size={18} /> : <Circle size={16} />}
                        </div>

                        {/* THE CONTENT (Dims and strikes through when finished) */}
                        <div 
                            className={styles.content}
                            style={{ 
                                opacity: rec.is_completed ? 0.4 : 1,
                                transition: 'opacity 0.3s ease'
                            }}
                        >
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
                          
                          <h3 style={{ 
                              margin: 0, 
                              textDecoration: rec.is_completed ? 'line-through' : 'none' 
                          }}>
                              {rec.topic_name}
                          </h3>
                          
                          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                              {rec.is_completed ? "Completed! Great job." : `Industry requirement for ${careerData.targetRole}.`}
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