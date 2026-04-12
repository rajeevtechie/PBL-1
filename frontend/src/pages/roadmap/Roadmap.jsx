import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  BookOpen, Briefcase, CheckCircle, Circle, Lock, 
  AlertTriangle, Loader2, ChevronRight, Sparkles, Edit2, GraduationCap, ChevronDown
} from 'lucide-react';
import TourGuide from '../../Components/common/TourGuide/TourGuide'; 
import styles from './Roadmap.module.css';
import { markTourCompleted } from '../../utils/tourSync'; // Adjust path if needed!

const Roadmap = () => {
  const [roadmap, setRoadmap] = useState(null);
  const [careerData, setCareerData] = useState(null); 
  const [subjectList, setSubjectList] = useState([]); 
  
  const [activeId, setActiveId] = useState(localStorage.getItem('activeSyllabusId') || 'latest');

  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false); 
  const [targetRole, setTargetRole] = useState("");  
  const [error, setError] = useState('');
  
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [expandedUnits, setExpandedUnits] = useState({});
  const [isGlobal, setIsGlobal] = useState(false); 

  // --- 🪄 TOUR STATE ---
  const [runTour, setRunTour] = useState(false);
  const tourSteps = [
    {
      target: '#tour-academic',
      placement: 'center', // 🛡️ FIX: Center over the column to prevent overflow
      content: (
        <div>
          <h3 style={{ margin: '0 0 10px 0', color: '#f8fafc' }}>Your Academic Path 📚</h3>
          <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.95rem' }}>This is your university syllabus automatically broken down into manageable units. Mark them as complete as you study!</p>
        </div>
      ),
      disableBeacon: true,
    },
    {
      target: '#tour-career',
      placement: 'center', // 🛡️ FIX: Center over the column to prevent overflow
      content: (
        <div>
          <h3 style={{ margin: '0 0 10px 0', color: '#f8fafc' }}>Bridge the Gap 🌉</h3>
          <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.95rem' }}>Type your dream job (e.g., 'Data Analyst') to generate a custom list of industry skills you need. Or, type <strong>'Exam Prep'</strong> to reveal high-weightage topics!</p>
        </div>
      ),
    }
  ];

  const toggleUnit = (index) => {
    setExpandedUnits(prev => ({ ...prev, [index]: !prev[index] }));
  };

  useEffect(() => {
    const fetchSubjectList = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/syllabus/list', { withCredentials: true });
            setSubjectList(res.data);
        } catch (err) {
            console.error("Failed to load subject list", err);
        }
    };
    fetchSubjectList();
  }, []);

  // 1. Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      
      try {
        const endpoint = activeId === 'latest' 
            ? `http://localhost:5000/api/syllabus/latest` 
            : `http://localhost:5000/api/syllabus/${activeId}`;

        const resSyllabus = await axios.get(endpoint, { withCredentials: true });
        setRoadmap(resSyllabus.data);

        if (activeId === 'latest' && resSyllabus.data.id) {
            setActiveId(resSyllabus.data.id.toString());
            localStorage.setItem('activeSyllabusId', resSyllabus.data.id.toString());
        }

        try {
            const syllabusIdQuery = resSyllabus.data.id || activeId;
            const resCareer = await axios.get(`http://localhost:5000/api/syllabus/career-insights?syllabusId=${syllabusIdQuery}`, { withCredentials: true });
            
            setCareerData(resCareer.data);
            if (resCareer.data.targetRole) {
                setTargetRole(resCareer.data.targetRole);
            } else {
                setTargetRole(""); 
            }
        } catch {
            setCareerData(null);
            setTargetRole("");
        }

      } catch (err) {
        setError(err.response?.status === 404 ? "No roadmap found. Upload a syllabus first!" : "Failed to load your learning path.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeId]);

  // 2. 🛡️ THE ARCHITECTURE FIX: Bulletproof Tour Trigger (DOM Polling)
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('hasSeenRoadmapTour');

    // Only start polling if they haven't seen it, there is no error, and loading is finished
    if (!hasSeenTour && !error && !loading) {
      const checkDOM = setInterval(() => {
        const targetEl = document.querySelector('#tour-academic');
        
        if (targetEl) {
          setRunTour(true);        // Start the tour!
          
          // 🛡️ THE SPEEDRUNNER FIX: Mark as seen the exact millisecond it fires
          markTourCompleted('hasSeenRoadmapTour');
          
          clearInterval(checkDOM); // Stop checking!
        }
      }, 100);

      // Cleanup function prevents memory leaks if user navigates away
      return () => clearInterval(checkDOM); 
    }
  }, [loading, error]);


  const handleAnalyzeGaps = async () => {
    if (!targetRole.trim()) {
        alert("Please enter a target role or objective first!"); return;
    }
    
    setAnalyzing(true);
    try {
        const currentId = roadmap?.id || activeId; 
        const response = await axios.post(`http://localhost:5000/api/syllabus/${currentId}/analyze`, { targetRole: targetRole, isGlobal: isGlobal, syllabusId: currentId }, { withCredentials: true });
        
        setCareerData({ targetRole: targetRole, recommendations: response.data.recommendations });
        setIsEditingGoal(false);
    } catch (err) {
        console.error("Analysis Error:", err);
        alert(err.response?.data?.message || "Failed to analyze gaps. Please try again.");
    } finally {
        setAnalyzing(false);
    }
  };

  const handleToggleAcademicUnit = async (unitIndex) => {
    const currentStatus = roadmap.units[unitIndex].is_completed || roadmap.units[unitIndex].completed || false;
    const newStatus = !currentStatus;

    const updatedUnits = [...roadmap.units];
    updatedUnits[unitIndex] = { ...updatedUnits[unitIndex], is_completed: newStatus, completed: newStatus };
    const updatedRoadmap = { ...roadmap, units: updatedUnits };
    setRoadmap(updatedRoadmap);

    try {
        const currentId = roadmap?.id || activeId;
        await axios.put(`http://localhost:5000/api/syllabus/${currentId}/structure`, { structure: updatedRoadmap }, { withCredentials: true });
    } catch (err) {
        console.error("Failed to update academic progress", err);
        alert("Failed to save progress. Reverting change.");
        const revertedUnits = [...roadmap.units];
        revertedUnits[unitIndex] = { ...revertedUnits[unitIndex], is_completed: currentStatus, completed: currentStatus };
        setRoadmap({ ...roadmap, units: revertedUnits });
    }
  };

  const handleToggleComplete = async (recId, currentStatus) => {
    try {
        const newStatus = !currentStatus;
        setCareerData(prev => ({
            ...prev, recommendations: prev.recommendations.map(rec => rec.id === recId ? { ...rec, is_completed: newStatus } : rec)
        }));
        await axios.patch(`http://localhost:5000/api/syllabus/recommendation/${recId}/toggle`, { isCompleted: newStatus }, { withCredentials: true });
    } catch (err) {
        console.error("Failed to update status", err);
        alert("Failed to save progress.");
    }
  };

  const academicProgress = roadmap?.units?.length 
    ? Math.round((roadmap.units.filter(u => u.is_completed || u.completed || u.is_completed === 1).length / roadmap.units.length) * 100) : 0;

  const careerProgress = careerData?.recommendations?.length 
    ? Math.round((careerData.recommendations.filter(r => r.is_completed === true || r.is_completed === 1).length / careerData.recommendations.length) * 100) : 0;

  const isAcademicMode = /academic|exam|examination|university|pass|score|college|grade/i.test(careerData?.targetRole || "");

  if (loading) return <div className={styles.centerMsg}><Loader2 className={styles.spinner} size={48}/></div>;
  if (error) return <div className={styles.centerMsg}><AlertTriangle size={48}/> <p>{error}</p></div>;

  return (
    <div className={styles.roadmapContainer}>
      
      {/* 🪄 OUR NEW CLEAN REUSABLE COMPONENT */}
      <TourGuide 
        steps={tourSteps} 
        run={runTour} 
        onComplete={() => {
          localStorage.setItem('hasSeenRoadmapTour', 'true');
          setRunTour(false);
        }} 
      />

      <header className={styles.header}>
        <div className={styles.headerContent} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '20px' }}>
            <div>
                <h1>{roadmap?.courseTitle || "Academic Roadmap"}</h1>
                <p>
                   <span className={styles.highlight}>Academic Syllabus</span> synced with 
                   <span className={styles.highlight}> Industry Demands</span>.
                </p>
            </div>

            {subjectList.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(30, 41, 59, 0.5)', padding: '8px 12px', borderRadius: '10px', border: '1px solid #334155' }}>
                    <BookOpen size={16} color="#94a3b8" />
                    <select 
                        value={activeId} 
                        onChange={(e) => {
                            const newId = e.target.value;
                            localStorage.setItem('activeSyllabusId', newId);
                            setActiveId(newId);
                        }}
                        style={{ background: 'transparent', color: 'white', border: 'none', outline: 'none', cursor: 'pointer', fontSize: '0.95rem', fontWeight: '500', paddingRight: '5px' }}
                    >
                        {subjectList.map(sub => (
                            <option key={sub.id} value={sub.id} style={{ background: '#1e293b' }}>
                                {sub.course_title}
                            </option>
                        ))}
                    </select>
                </div>
            )}
        </div>
      </header>

      <div className={styles.tracksGrid}>
        
        <section id="tour-academic" className={styles.trackColumn}> {/* 👈 TARGET 1 */}
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
            <div style={{ width: '100%', height: '6px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${academicProgress}%`, background: 'var(--primary)', transition: 'width 0.4s ease' }}></div>
            </div>
          </div>
          
          <div className={styles.timeline}>
            {roadmap?.units?.map((unit, index) => {
              const unitDone = unit.is_completed || unit.completed || unit.is_completed === 1;
              const isShortUnit = !unit.topics || unit.topics.length <= 3;
              
              return (
              <div key={index} className={`${styles.node} ${unitDone ? styles.completed : (index === 0 || (roadmap.units[index-1]?.is_completed || roadmap.units[index-1]?.completed) ? styles.current : styles.locked)}`}>
                <div className={styles.line}></div>
                <div className={styles.marker} style={{ backgroundColor: unitDone ? 'rgba(16, 185, 129, 0.1)' : '', color: unitDone ? '#10b981' : '' }}>
                  {unitDone ? <CheckCircle size={18} /> : (index === 0 || (roadmap.units[index-1]?.is_completed || roadmap.units[index-1]?.completed) ? <Circle size={18} /> : <Lock size={16} />)}
                </div>
                <div className={styles.content} style={{ opacity: unitDone ? 0.6 : 1, transition: 'opacity 0.3s ease' }}>
                  <div className={styles.unitBadge}>Unit {unit.unitNumber}</div>
                  <h3 style={{ textDecoration: unitDone ? 'line-through' : 'none' }}>{unit.title}</h3>
                  <ul className={styles.topicList}>
                      {unit.topics?.slice(0, expandedUnits[index] ? unit.topics.length : 3).map((topic, tIdx) => (
                          <li key={tIdx}><ChevronRight size={14} style={{ minWidth: '14px' }} /> {topic}</li>
                      ))}
                      {!isShortUnit && (
                          <li className={styles.moreTopics} onClick={() => toggleUnit(index)} style={{ cursor: 'pointer', color: 'var(--primary)', fontWeight: '600', marginTop: '8px' }}>
                            {expandedUnits[index] ? "- Show less topics" : `+ ${unit.topics.length - 3} more topics`}
                          </li>
                      )}
                  </ul>
                  
                  {(expandedUnits[index] || isShortUnit) && (
                      <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input type="checkbox" id={`unit-${index}`} checked={unitDone} onChange={() => handleToggleAcademicUnit(index)} style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#10b981' }} />
                          <label htmlFor={`unit-${index}`} style={{ cursor: 'pointer', fontSize: '0.85rem', color: unitDone ? '#10b981' : '#cbd5e1', fontWeight: '500' }}>Mark Unit {unit.unitNumber} as Completed</label>
                      </div>
                  )}
                </div>
              </div>
            )})}
          </div>
        </section>

        <section id="tour-career" className={styles.trackColumn}> {/* 👈 TARGET 2 */}
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
                     {careerData?.targetRole && !isEditingGoal ? (isAcademicMode ? "Highest weightage topics" : `Gaps for ${careerData.targetRole}`) : "Market Gap Analysis"}
                  </span>
                </div>
            </div>
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
                  careerData.recommendations.map((rec) => {
                      const recDone = rec.is_completed === true || rec.is_completed === 1;
                      return (
                      <div key={rec.id} className={styles.node}>
                        <div className={styles.line}></div>
                        <div className={styles.marker} onClick={() => handleToggleComplete(rec.id, recDone)} style={{ cursor: 'pointer', color: recDone ? '#10b981' : (isAcademicMode ? '#8b5cf6' : 'var(--secondary)'), backgroundColor: recDone ? 'rgba(16, 185, 129, 0.1)' : (isAcademicMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(236, 72, 153, 0.1)'), transition: 'all 0.3s ease', border: recDone ? 'none' : '2px solid transparent' }} >
                            {recDone ? <CheckCircle size={18} /> : (isAcademicMode ? <GraduationCap size={16} /> : <Circle size={16} />)}
                        </div>
                        <div className={styles.content} style={{ opacity: recDone ? 0.6 : 1, transition: 'opacity 0.3s ease' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '0.8rem', color: isAcademicMode ? '#8b5cf6' : 'var(--secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>{rec.category}</span>
                              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', backgroundColor: rec.importance_level === 'Critical' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: rec.importance_level === 'Critical' ? '#ef4444' : '#f59e0b' }}>{rec.importance_level}</span>
                          </div>
                          <h3 style={{ margin: 0, textDecoration: recDone ? 'line-through' : 'none' }}>{rec.topic_name}</h3>
                          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                              {recDone ? "Completed! Great job." : (isAcademicMode ? "Highly likely to appear on your exam." : `Industry requirement for ${careerData.targetRole}.`)}
                          </p>
                          <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input type="checkbox" id={`rec-${rec.id}`} checked={recDone} onChange={() => handleToggleComplete(rec.id, recDone)} style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: isAcademicMode ? '#8b5cf6' : '#10b981' }} />
                              <label htmlFor={`rec-${rec.id}`} style={{ cursor: 'pointer', fontSize: '0.85rem', color: recDone ? (isAcademicMode ? '#8b5cf6' : '#10b981') : '#cbd5e1', fontWeight: '500' }}>Mark as Completed</label>
                          </div>
                        </div>
                      </div>
                  )})
              )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Roadmap;