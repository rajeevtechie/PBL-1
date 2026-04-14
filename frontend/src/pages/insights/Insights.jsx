import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, TrendingUp, AlertTriangle, ArrowRight, Send, Loader2, CheckCircle, Sparkles, Calendar, Mail } from 'lucide-react';
import TourGuide from '../../Components/common/TourGuide/TourGuide'; 
import styles from './Insights.module.css';
import { markTourCompleted } from '../../utils/tourSync'; 

const Insights = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const [metrics, setMetrics] = useState({
    avgFocus: 0,
    totalSessions: 0, 
    peakTime: "Analyzing...",
    peakDesc: "Log a focus session to unlock AI timing insights."
  });
  const [recommendations, setRecommendations] = useState([]);
  
  // 🌟 NEW STATE: Weekly AI Reports
  const [weeklyReports, setWeeklyReports] = useState([]);
  const [generatingReport, setGeneratingReport] = useState(false);

  const firstName = (localStorage.getItem('userName') || 'There').split(' ')[0];

  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: `Hello ${firstName}! I am your InsightED AI Mentor. Based on your recent dashboard analytics, how can I help you optimize your study sessions today?`, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }
  ]);
  const [currentInput, setCurrentInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatEndRef = useRef(null);

  const [runTour, setRunTour] = useState(false);
  const tourSteps = [
    {
      target: '#tour-feed',
      placement: 'center', 
      content: (
        <div>
          <h3 style={{ margin: '0 0 10px 0', color: '#f8fafc' }}>Real-time Feed 📡</h3>
          <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.95rem' }}>This feed updates live as you study. It alerts you to dropping focus levels and highlights career skills you are missing.</p>
        </div>
      ),
      disableBeacon: true,
    },
    {
      target: '#tour-mentor',
      placement: 'center', 
      content: (
        <div>
          <h3 style={{ margin: '0 0 10px 0', color: '#f8fafc' }}>Your Personal Mentor 🤖</h3>
          <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.95rem' }}>Ask this AI anything! It knows your current focus score and study habits, and can give you personalized advice on how to improve.</p>
        </div>
      ),
    }
  ];

  // 1. Fetch Data (Now includes Weekly Summary!)
  useEffect(() => {
    const fetchInsightsData = async () => {
      try {
        const [resMetrics, resCareer, resWeekly] = await Promise.all([
          axios.get('http://localhost:5000/api/insights/dashboard', { withCredentials: true }).catch(() => ({ data: { data: null } })),
          axios.get('http://localhost:5000/api/syllabus/career-insights?syllabusId=latest', { withCredentials: true }).catch(() => ({ data: { recommendations: [] } })),
          axios.get('http://localhost:5000/api/insights/weekly-summary', { withCredentials: true }).catch(() => ({ data: { data: [] } }))
        ]);

        if (resMetrics.data?.success && resMetrics.data?.data) setMetrics(resMetrics.data.data);
        if (resCareer.data?.recommendations) setRecommendations(resCareer.data.recommendations);
        if (resWeekly.data?.success && resWeekly.data?.data) setWeeklyReports(resWeekly.data.data);

      } catch (error) {
        console.error("Failed to fetch insights:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInsightsData();
  }, []);

  // Tour Logic
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('hasSeenInsightsTour');
    if (!hasSeenTour && !loading) {
      const checkDOM = setInterval(() => {
        const targetEl = document.querySelector('#tour-feed');
        if (targetEl) {
          setRunTour(true);        
          markTourCompleted('hasSeenInsightsTour'); 
          clearInterval(checkDOM); 
        }
      }, 100);
      return () => clearInterval(checkDOM); 
    }
  }, [loading]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAiTyping]);

  // 🌟 NEW FUNCTION: Manually trigger the AI Engine
  const handleGenerateWeeklyReport = async () => {
    setGeneratingReport(true);
    try {
      const res = await axios.post('http://localhost:5000/api/insights/weekly-summary', {}, { withCredentials: true });
      if (res.data.success && res.data.stats) {
        // Add the new report to the top of the list!
        setWeeklyReports(prev => [{ insight_text: res.data.insight }, ...prev]);
      } else {
        // If they haven't studied enough this week to generate a report
        alert(res.data.insight || "Keep studying to unlock your weekly report!");
      }
    } catch  {
      alert("Failed to generate report. Make sure the backend is running!");
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!currentInput.trim()) return;

    const userText = currentInput.trim();
    const newMsg = { sender: 'user', text: userText, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
    
    setChatMessages(prev => [...prev, newMsg]);
    setCurrentInput('');
    setIsAiTyping(true);

    try {
      const res = await axios.post('http://localhost:5000/api/insights/chat', { 
          message: userText,
          userName: firstName,
          currentFocus: metrics.avgFocus
      }, { withCredentials: true });

      const aiResponse = { 
        sender: 'ai', 
        text: res.data.reply || "I encountered a processing error.", 
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
      };
      setChatMessages(prev => [...prev, aiResponse]);

    } catch {
      setChatMessages(prev => [...prev, { 
        sender: 'ai', 
        text: "I am having trouble connecting to the servers right now.", 
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
      }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.insightsContainer} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Loader2 size={48} color="#3b82f6" className={styles.spin} />
      </div>
    );
  }

  const isFocusLow = metrics.avgFocus > 0 && metrics.avgFocus < 60;

  return (
    <div className={styles.insightsContainer}>
      
      <TourGuide steps={tourSteps} run={runTour} onComplete={() => { localStorage.setItem('hasSeenInsightsTour', 'true'); setRunTour(false); }} />

      <div id="tour-feed" className={styles.feedColumn}> 
        <header className={`${styles.header} ${styles.animateFadeInUp}`}>
          <h1>AI Growth Engine</h1>
          <p>Real-time analysis of your learning patterns.</p>
        </header>

        {/* 🌟 NEW CARD: The Weekly AI Report */}
        <div className={`${styles.insightCard} ${styles.animateFadeInUp}`} style={{ animationDelay: '0.05s', borderLeft: '4px solid #8b5cf6', background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.05), var(--bg-panel))' }}>
          <div className={styles.cardHeader} style={{ marginBottom: '10px' }}>
            <div className={styles.iconBox} style={{ color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.1)' }}><Calendar size={20} /></div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Weekly Performance Review</h3>
              <button 
                onClick={handleGenerateWeeklyReport} 
                disabled={generatingReport}
                className={styles.btnPulseHover}
                style={{ 
                  fontSize: '0.8rem', padding: '6px 12px', borderRadius: '20px', 
                  background: generatingReport ? 'var(--border-color)' : '#8b5cf6', 
                  color: 'white', border: 'none', cursor: generatingReport ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold'
                }}
              >
                {generatingReport ? <><Loader2 size={14} className={styles.spin} /> Crunching Data...</> : <><Sparkles size={14} /> Generate Now</>}
              </button>
            </div>
          </div>
          
          <div style={{ background: 'var(--bg-app)', padding: '15px', borderRadius: '8px', marginTop: '15px', border: '1px solid var(--border-color)' }}>
            {weeklyReports.length > 0 ? (
              <p style={{ margin: 0, color: 'var(--text-main)', fontStyle: 'italic', lineHeight: '1.6' }}>
                "{weeklyReports[0].insight_text}"
              </p>
            ) : (
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                No weekly report generated yet. Log some study sessions and click "Generate Now" to get your AI review!
              </p>
            )}
          </div>
        </div>

        {/* ... The rest of the original feed cards ... */}
        {metrics.totalSessions === 0 ? (
           <div className={`${styles.insightCard} ${styles.opportunity} ${styles.animateFadeInUp}`} style={{ animationDelay: '0.1s' }}>
             <div className={styles.cardHeader}>
               <div className={styles.iconBox}><Sparkles size={20} /></div>
               <h3>Welcome to InsightED!</h3>
             </div>
             <p>Your AI analytics engine is currently calibrating. Head over to the <strong>Focus Mode</strong> and complete your first session to unlock personalized retention insights.</p>
           </div>
        ) : isFocusLow ? (
          <div className={`${styles.insightCard} ${styles.critical} ${styles.animateFadeInUp}`} style={{ animationDelay: '0.1s' }}>
            <div className={styles.cardHeader}>
              <div className={styles.iconBox}><AlertTriangle size={20} /></div>
              <h3>Focus Alert: Distraction Detected</h3>
            </div>
            <p>Your average focus score has dropped to <strong>{metrics.avgFocus}%</strong>. The AI predicts a drop in retention if you study complex topics right now.</p>
            <button className={`${styles.actionBtn} ${styles.btnPulseHover}`}>Schedule Spaced Repetition <ArrowRight size={16} /></button>
          </div>
        ) : (
          <div className={`${styles.insightCard} ${styles.opportunity} ${styles.animateFadeInUp}`} style={{ animationDelay: '0.1s' }}>
            <div className={styles.cardHeader}>
              <div className={styles.iconBox}><CheckCircle size={20} /></div>
              <h3>Strong Momentum Detected</h3>
            </div>
            <p>Your average focus score is a solid <strong>{metrics.avgFocus}%</strong>! You are in an optimal state to tackle high-weightage algorithmic problems today.</p>
          </div>
        )}

        <div className={`${styles.insightCard} ${styles.opportunity} ${styles.animateFadeInUp}`} style={{ animationDelay: '0.2s' }}>
          <div className={styles.cardHeader}>
            <div className={styles.iconBox}><TrendingUp size={20} /></div>
            <h3>Peak Performance Detected</h3>
          </div>
          <p>Your focus intensity is historically highest around <strong>{metrics.peakTime}</strong>. {metrics.peakDesc}</p>
        </div>

        <div className={`${styles.insightCard} ${styles.animateFadeInUp}`} style={{ animationDelay: '0.3s' }}>
          <div className={styles.cardHeader}>
            <div className={styles.iconBox}><Lightbulb size={20} /></div>
            <h3>Career Track Recommendation</h3>
          </div>
          
          {recommendations.length > 0 ? (
            <>
              <p>Based on your industry gap analysis, you should focus on this missing skill:</p>
              <div className={styles.resourceLink} onClick={() => navigate('/roadmap')}>
                <div className={styles.resourceIcon} style={{ background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                  {recommendations[0].topic_name.charAt(0)}
                </div>
                <div>
                  <h4>{recommendations[0].topic_name}</h4>
                  <span>{recommendations[0].category} • {recommendations[0].importance_level} Priority</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <p>You haven't generated an industry gap analysis for your active syllabus yet.</p>
              <div className={styles.resourceLink} onClick={() => navigate('/roadmap')} style={{ border: '1px dashed var(--border-color)', background: 'transparent' }}>
                <div className={styles.resourceIcon} style={{ background: 'var(--bg-panel-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><Lightbulb size={20} /></div>
                <div>
                  <h4 style={{ color: 'var(--text-main)' }}>Analyze Career Gaps</h4>
                  <span>Head to the Roadmap to unlock recommendations.</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* CHAT COLUMN */}
      <div id="tour-mentor" className={`${styles.chatColumn} ${styles.animateFadeInUp}`} style={{ animationDelay: '0.4s' }}> 
        <div className={styles.chatHeader}>
          <h3>InsightED AI Mentor</h3>
          <span className={styles.onlineDot}></span>
        </div>
        
        <div className={styles.chatWindow}>
          {chatMessages.map((msg, index) => (
            <div key={index} className={`${styles.message} ${msg.sender === 'ai' ? styles.aiMessage : styles.userMessage} ${styles.animateFadeInUp}`} style={{ animationDelay: '0s', animationDuration: '0.3s' }}>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.text}</p>
              <span className={styles.time}>{msg.time}</span>
            </div>
          ))}
          
          {isAiTyping && (
            <div className={`${styles.message} ${styles.aiMessage} ${styles.typingIndicator}`}>
              <span></span><span></span><span></span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className={styles.chatInputArea}>
          <input 
            type="text" 
            placeholder="Ask anything about your syllabus..." 
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            disabled={isAiTyping}
          />
          <button type="submit" disabled={!currentInput.trim() || isAiTyping} className={styles.btnPulseHover}>
            <Send size={18} />
          </button>
        </form>
      </div>

    </div>
  );
};

export default Insights;