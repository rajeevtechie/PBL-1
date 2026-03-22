import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  BookOpen, Briefcase, CheckCircle, Circle, Lock, 
  AlertTriangle, Loader2, ChevronRight, Sparkles, Target, Edit2, GraduationCap
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
  const [isGlobal, setIsGlobal] = useState(false); 

  const toggleUnit = (index) => {
    setExpandedUnits(prev => ({ ...prev, [index]: !prev[index] }));
  };

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

        const resSyllabus = await axios.get(endpoint, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        setRoadmap(resSyllabus.data);

        try {
            const syllabusIdQuery = activeId || 'latest';
            const resCareer = await axios.get(`http://localhost:5000/api/syllabus/career-insights?syllabusId=${syllabusIdQuery}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            setCareerData(resCareer.data);
            if (resCareer.data.targetRole) {
                setTargetRole(resCareer.data.targetRole);
            }
        } catch {
            console.log("No career data yet for this specific context.");
        }

      } catch (err) {
        setError(err.response?.status === 404 ? "No roadmap found. Upload a syllabus first!" : "Failed to load your learning path.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAnalyzeGaps = async () => {
    if (!targetRole.trim()) {
        alert("Please enter a target role or objective first!"); return;
    }
    
    setAnalyzing(true);
    try {
        const token = localStorage.getItem('token');
        const activeId = localStorage.getItem('activeSyllabusId') || 'latest';
        
        const response = await axios.post(`http://localhost:5000/api/syllabus/${activeId}/analyze`, 
            { targetRole: targetRole, isGlobal: isGlobal },
            { headers: { 'Authorization': `Bearer ${token}` }}
        );
        
        setCareerData({
            targetRole: targetRole,
            recommendations: response.data.recommendations
        });
        setIsEditingGoal(false);

    } catch (err) {
        console.error("Analysis Error:", err);
        alert("Failed to analyze gaps.");
    } finally {
        setAnalyzing(false);
    }
  };

  // --- PROGRESS CALCULATIONS ---
  const academicProgress = roadmap?.units?.length 
    ? Math.round((roadmap.units.filter(u => u.is_completed).length / roadmap.units.length) * 100) 
    : 0;

  const careerProgress = careerData?.recommendations?.length 
    ? Math.round((careerData.recommendations.filter(r => r.is_completed).length / careerData.recommendations.length) * 100) 
    : 0;

  // --- ACADEMIC UNIT TOGGLE ---
  const handleToggleAcademicUnit = async (unitIndex) => {
    try {
        const token = localStorage.getItem('token');
        const activeId = localStorage.getItem('activeSyllabusId') || 'latest';
        
        // Optimistic UI update
        const updatedRoadmap = { ...roadmap };
        updatedRoadmap.units[unitIndex].is_completed = !updatedRoadmap.units[unitIndex].is_completed;
        setRoadmap(updatedRoadmap);

        await axios.put(`http://localhost:5000/api/syllabus/${activeId}/structure`, 
            { structure: updatedRoadmap },
            { headers: { 'Authorization': `Bearer ${token}` }}
        );
    } catch (err) {
        console.error("Failed to update academic progress", err);
        alert("Failed to save progress. Please try again.");
    }
  };

  // --- CAREER RECOMMENDATION TOGGLE ---
  const handleToggleComplete = async (recId, currentStatus) => {
    try {
        const token = localStorage.getItem('token');
        const newStatus = !currentStatus;

        setCareerData(prev => ({
            ...prev,
            recommendations: prev.recommendations.map(rec => 
                rec.id === recId ? { ...rec, is_completed: newStatus } : rec
            )
        }));

        await axios.patch(`http://localhost:5000/api/syllabus/recommendation/${recId}/toggle`, 
            { isCompleted: newStatus },
            { headers: { 'Authorization': `Bearer ${token}` }}
        );
    } catch (err) {
        console.error("Failed to update status", err);
        alert("Failed to save progress.");
    }
  };

  if (loading) return <div className={styles.centerMsg}><Loader2 className={styles.spinner} size={48}/></div>;
  if (error) return <div className={styles.centerMsg}><AlertTriangle size={48}/> <p>{error}</p></div>;

  // ✅ UPDATED REGEX: Now safely catches exam, examination, academics, etc.
  const isAcademicMode = /academic|exam|examination|university|pass|score|college|grade/i.test(careerData?.targetRole || "");

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
          <div className={styles.trackHeader} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '15px' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', width: '100%' }}>
                <div className={styles.iconBox}><BookOpen size={24} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h2>Academic Track</h2>
                      <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary)' }}>{academicProgress}%</span>
                  </div>
                  <span className={styles.subLabel}>University Syllabus</span>
                </div>
            </div>
            {/* Academic Progress Bar */}
            <div style={{ width: '100%', height: '6px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${academicProgress}%`, background: 'var(--primary)', transition: 'width 0.4s ease' }}></div>
            </div>
          </div>
          
          <div className={styles.timeline}>
            {roadmap?.units?.map((unit, index) => (
              <div key={index} className={`${styles.node} ${unit.is_completed ? styles.completed : (index === 0 || roadmap.units[index-1]?.is_completed ? styles.current : styles.locked)}`}>
                <div className={styles.line}></div>
                
                <div className={styles.marker} style={{ backgroundColor: unit.is_completed ? 'rgba(16, 185, 129, 0.1)' : '', color: unit.is_completed ? '#10b981' : '' }}>
                  {unit.is_completed ? <CheckCircle size={18} /> : (index === 0 || roadmap.units[index-1]?.is_completed ? <Circle size={18} /> : <Lock size={16} />)}
                </div>

                <div className={styles.content} style={{ opacity: unit.is_completed ? 0.6 : 1, transition: 'opacity 0.3s ease' }}>
                  <div className={styles.unitBadge}>Unit {unit.unitNumber}</div>
                  <h3 style={{ textDecoration: unit.is_completed ? 'line-through' : 'none' }}>{unit.title}</h3>
                  
                  <ul className={styles.topicList}>
                      {unit.topics.slice(0, expandedUnits[index] ? unit.topics.length : 3).map((topic, tIdx) => (
                          <li key={tIdx}><ChevronRight size={14} style={{ minWidth: '14px' }} /> {topic}</li>
                      ))}
                      
                      {unit.topics.length > 3 && (
                          <li className={styles.moreTopics} onClick={() => toggleUnit(index)} style={{ cursor: 'pointer', color: 'var(--primary)', fontWeight: '600', marginTop: '8px' }}>
                            {expandedUnits[index] ? "- Show less topics" : `+ ${unit.topics.length - 3} more topics`}
                          </li>
                      )}
                  </ul>

                  {/* CHECKBOX AT THE BOTTOM OF EXPANDED UNIT */}
                  {expandedUnits[index] && (
                      <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input 
                              type="checkbox" 
                              id={`unit-${index}`}
                              checked={unit.is_completed || false}
                              onChange={() => handleToggleAcademicUnit(index)}
                              style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#10b981' }}
                          />
                          <label htmlFor={`unit-${index}`} style={{ cursor: 'pointer', fontSize: '0.85rem', color: unit.is_completed ? '#10b981' : '#cbd5e1', fontWeight: '500' }}>
                              Mark Unit {unit.unitNumber} as Completed
                          </label>
                      </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* === RIGHT COLUMN: CAREER / EXAM TRACK === */}
        <section className={styles.trackColumn}>
          <div className={styles.trackHeader} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '15px' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', width: '100%' }}>
                <div className={styles.iconBox}>
                  {isAcademicMode ? <GraduationCap size={24} /> : <Briefcase size={24} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h2>{isAcademicMode ? "Exam Predictor" : "Career Track"}</h2>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: isAcademicMode ? '#8b5cf6' : 'var(--secondary)' }}>{careerProgress}%</span>
                          {careerData?.targetRole && (
                              <button onClick={() => setIsEditingGoal(!isEditingGoal)} style={{ background: 'transparent', border: '1px solid #334155', color: '#cbd5e1', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}>
                                <Edit2 size={12} /> {isEditingGoal ? "Cancel" : "Edit"}
                              </button>
                          )}
                      </div>
                  </div>
                  <span className={styles.subLabel}>
                     {careerData?.targetRole && !isEditingGoal 
                        ? (isAcademicMode ? "Highest weightage topics" : `Gaps for ${careerData.targetRole}`) 
                        : "Market Gap Analysis"}
                  </span>
                </div>
            </div>
            {/* Career Progress Bar */}
            {careerData?.recommendations?.length > 0 && !isEditingGoal && (
                <div style={{ width: '100%', height: '6px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${careerProgress}%`, background: isAcademicMode ? '#8b5cf6' : 'var(--secondary)', transition: 'width 0.4s ease' }}></div>
                </div>
            )}
          </div>

          <div className={styles.timeline}>
              {(!careerData || !careerData.recommendations || careerData.recommendations.length === 0 || isEditingGoal) ? (
                  <div className={`${styles.node} ${styles.aiNode}`}>
                    <div className={styles.line}></div>
                    <div className={styles.marker}><Sparkles size={18} /></div>
                    <div className={styles.content}>
                      <h3>Generate Insights</h3>
                      <p className={styles.aiDescription}>Type a role like <strong>Data Analyst</strong>, or type <strong>"Exam Prep"</strong> to unlock Academic Mode!</p>
                      
                      <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                          <input type="text" placeholder="e.g. Software Developer or Exam Prep" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#1e293b', color: 'white' }} />
                          <button className={styles.aiBtn} onClick={handleAnalyzeGaps} disabled={analyzing} style={{ opacity: analyzing ? 0.7 : 1 }}>
                              {analyzing ? <Loader2 className={styles.spinner} size={16}/> : <Sparkles size={16} />} 
                              {analyzing ? "Analyzing..." : "Generate"}
                          </button>
                      </div>

                      <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#94a3b8' }}>
                          <input type="checkbox" id="globalToggle" checked={isGlobal} onChange={(e) => setIsGlobal(e.target.checked)} style={{ cursor: 'pointer', accentColor: 'var(--primary)' }} />
                          <label htmlFor="globalToggle" style={{ cursor: 'pointer' }}>Apply this goal to all my subjects (Global)</label>
                      </div>
                    </div>
                  </div>
              ) : (
                  careerData.recommendations.map((rec) => (
                      <div key={rec.id} className={styles.node}>
                        <div className={styles.line}></div>
                        
                        {/* MARKER (Still clickable for convenience) */}
                        <div className={styles.marker} onClick={() => handleToggleComplete(rec.id, rec.is_completed)} style={{ cursor: 'pointer', color: rec.is_completed ? '#10b981' : (isAcademicMode ? '#8b5cf6' : 'var(--secondary)'), backgroundColor: rec.is_completed ? 'rgba(16, 185, 129, 0.1)' : (isAcademicMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(236, 72, 153, 0.1)'), transition: 'all 0.3s ease', border: rec.is_completed ? 'none' : '2px solid transparent' }} >
                            {rec.is_completed ? <CheckCircle size={18} /> : (isAcademicMode ? <GraduationCap size={16} /> : <Circle size={16} />)}
                        </div>

                        <div className={styles.content} style={{ opacity: rec.is_completed ? 0.6 : 1, transition: 'opacity 0.3s ease' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '0.8rem', color: isAcademicMode ? '#8b5cf6' : 'var(--secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>{rec.category}</span>
                              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', backgroundColor: rec.importance_level === 'Critical' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: rec.importance_level === 'Critical' ? '#ef4444' : '#f59e0b' }}>{rec.importance_level}</span>
                          </div>
                          <h3 style={{ margin: 0, textDecoration: rec.is_completed ? 'line-through' : 'none' }}>{rec.topic_name}</h3>
                          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                              {rec.is_completed ? "Completed! Great job." : (isAcademicMode ? "Highly likely to appear on your exam." : `Industry requirement for ${careerData.targetRole}.`)}
                          </p>

                          {/* ✅ EXPLICIT CHECKBOX AT THE BOTTOM OF CAREER CARD */}
                          <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input 
                                  type="checkbox" 
                                  id={`rec-${rec.id}`}
                                  checked={rec.is_completed ? true : false}
                                  onChange={() => handleToggleComplete(rec.id, rec.is_completed)}
                                  style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: isAcademicMode ? '#8b5cf6' : '#10b981' }}
                              />
                              <label htmlFor={`rec-${rec.id}`} style={{ cursor: 'pointer', fontSize: '0.85rem', color: rec.is_completed ? (isAcademicMode ? '#8b5cf6' : '#10b981') : '#cbd5e1', fontWeight: '500' }}>
                                  Mark as Completed
                              </label>
                          </div>
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