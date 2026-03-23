import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, TrendingUp, AlertTriangle, ArrowRight, Send, Loader2, CheckCircle } from 'lucide-react';
import styles from './Insights.module.css';

const Insights = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // --- LIVE DATA STATE ---
  const [metrics, setMetrics] = useState({
    avgFocus: 0,
    peakTime: "Analyzing...",
    peakDesc: "Log a focus session to unlock AI timing insights."
  });
  const [recommendations, setRecommendations] = useState([]);

  // Extract the user's first name for a personalized greeting
  const firstName = (localStorage.getItem('userName') || 'There').split(' ')[0];

  // --- INTERACTIVE CHAT STATE ---
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: `Hello ${firstName}! I am your InsightED AI Mentor. Based on your recent dashboard analytics, how can I help you optimize your study sessions today?`, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }
  ]);
  const [currentInput, setCurrentInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatEndRef = useRef(null);

  // --- FETCH REAL DATA ON MOUNT ---
  useEffect(() => {
    const fetchInsightsData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Fetch Dashboard Insights & Career Recommendations simultaneously
        const [resMetrics, resCareer] = await Promise.all([
          axios.get('http://localhost:5000/api/insights/dashboard', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: null } })),
          axios.get('http://localhost:5000/api/syllabus/career-insights?syllabusId=latest', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { recommendations: [] } }))
        ]);

        if (resMetrics.data?.success && resMetrics.data?.data) {
          setMetrics(resMetrics.data.data);
        }
        
        if (resCareer.data?.recommendations) {
          setRecommendations(resCareer.data.recommendations);
        }

      } catch (error) {
        console.error("Failed to fetch insights:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInsightsData();
  }, []);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAiTyping]);

  // --- ✅ NEW: DYNAMIC AI CHAT HANDLER ---
  // --- ✅ GOD-MODE: DYNAMIC AI CHAT HANDLER ---
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!currentInput.trim()) return;

    const userText = currentInput.trim();
    const newMsg = { sender: 'user', text: userText, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
    
    setChatMessages(prev => [...prev, newMsg]);
    setCurrentInput('');
    setIsAiTyping(true);

    try {
      const token = localStorage.getItem('token');
      
      // ✅ We are now passing the Name and Focus Score to the backend!
      const res = await axios.post('http://localhost:5000/api/insights/chat', 
        { 
          message: userText,
          userName: firstName,
          currentFocus: metrics.avgFocus
        }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const aiResponse = { 
        sender: 'ai', 
        text: res.data.reply || "I encountered a processing error.", 
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
      };
      setChatMessages(prev => [...prev, aiResponse]);

    } catch {
      setChatMessages(prev => [...prev, { 
        sender: 'ai', 
        text: "I am having trouble connecting to the InsightED servers right now. Please check your connection!", 
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

  // --- DYNAMIC ALERT LOGIC ---
  const isFocusLow = metrics.avgFocus > 0 && metrics.avgFocus < 60;

  return (
    <div className={styles.insightsContainer}>
      
      {/* LEFT COLUMN: The Analysis Feed */}
      <div className={styles.feedColumn}>
        <header className={`${styles.header} ${styles.animateFadeInUp}`}>
          <h1>AI Growth Engine</h1>
          <p>Real-time analysis of your learning patterns.</p>
        </header>

        {/* 1. DYNAMIC ALERT CARD */}
        {isFocusLow ? (
          <div className={`${styles.insightCard} ${styles.critical} ${styles.animateFadeInUp}`} style={{ animationDelay: '0.1s' }}>
            <div className={styles.cardHeader}>
              <div className={styles.iconBox}><AlertTriangle size={20} /></div>
              <h3>Focus Alert: Distraction Detected</h3>
            </div>
            <p>
              Your average focus score has dropped to <strong>{metrics.avgFocus}%</strong>. The AI predicts a drop in retention if you study complex topics right now.
            </p>
            <button className={`${styles.actionBtn} ${styles.btnPulseHover}`}>
              Schedule Spaced Repetition <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <div className={`${styles.insightCard} ${styles.opportunity} ${styles.animateFadeInUp}`} style={{ animationDelay: '0.1s' }}>
            <div className={styles.cardHeader}>
              <div className={styles.iconBox}><CheckCircle size={20} /></div>
              <h3>Strong Momentum Detected</h3>
            </div>
            <p>
              Your average focus score is a solid <strong>{metrics.avgFocus}%</strong>! You are in an optimal state to tackle high-weightage algorithmic problems today.
            </p>
          </div>
        )}

        {/* 2. LIVE PEAK PERFORMANCE CARD */}
        <div className={`${styles.insightCard} ${styles.opportunity} ${styles.animateFadeInUp}`} style={{ animationDelay: '0.2s' }}>
          <div className={styles.cardHeader}>
            <div className={styles.iconBox}><TrendingUp size={20} /></div>
            <h3>Peak Performance Detected</h3>
          </div>
          <p>
            Your focus intensity is historically highest around <strong>{metrics.peakTime}</strong>. 
            {metrics.peakDesc}
          </p>
        </div>

        {/* 3. DYNAMIC CAREER TRACK OR PROPER EMPTY STATE */}
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
                <div className={styles.resourceIcon} style={{ background: 'var(--bg-panel-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  <Lightbulb size={20} />
                </div>
                <div>
                  <h4 style={{ color: 'var(--text-main)' }}>Analyze Career Gaps</h4>
                  <span>Head to the Roadmap to unlock recommendations.</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: INTERACTIVE AI MENTOR CHAT */}
      <div className={`${styles.chatColumn} ${styles.animateFadeInUp}`} style={{ animationDelay: '0.4s' }}>
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