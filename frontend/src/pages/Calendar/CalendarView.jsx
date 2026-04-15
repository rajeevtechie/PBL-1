import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Calendar as CalendarIcon, Clock, Trash2, ExternalLink, BookOpen, Loader2 } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import styles from './CalendarView.module.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const CalendarView = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null); 
  
  const [currentView, setCurrentView] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [enableRedirect, setEnableRedirect] = useState(false);
  const [userSubjects, setUserSubjects] = useState([]);
  const [availableTopics, setAvailableTopics] = useState([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    event_type: 'focus', 
    subject_id: '',      
    topic_name: '',      
    assessment_type: 'quiz', 
    difficulty: 'Medium', // 🌟 NEW DEFAULT
    numQuestions: 15,     // 🌟 NEW DEFAULT
    start_time: '',
    end_time: ''
  });

  useEffect(() => {
    const fetchSubjects = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/syllabus/list', { withCredentials: true });
            setUserSubjects(res.data);
        } catch (err) {
            console.error("Failed to load subject list", err);
        }
    };
    fetchSubjects();
  }, []);

  useEffect(() => {
    const fetchTopics = async () => {
      if (formData.event_type === 'quiz' && formData.subject_id) {
        setIsLoadingTopics(true);
        try {
          const res = await axios.get(`http://localhost:5000/api/syllabus/${formData.subject_id}`, { withCredentials: true });
          const allTopics = [];
          if (res.data && res.data.units) {
            res.data.units.forEach(unit => {
              if (unit.topics) allTopics.push(...unit.topics);
            });
          }
          setAvailableTopics(allTopics);
          if (allTopics.length > 0) setFormData(prev => ({ ...prev, topic_name: allTopics[0] }));
        } catch  {
          setAvailableTopics([]);
        } finally {
          setIsLoadingTopics(false);
        }
      } else {
        setAvailableTopics([]);
      }
    };
    fetchTopics();
  }, [formData.subject_id, formData.event_type]);

  const fetchEvents = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/calendar', { withCredentials: true });
      if (res.data.success) {
        const formattedEvents = res.data.data.map(ev => ({
          ...ev,
          start: new Date(ev.start_time), 
          end: new Date(ev.end_time),
        }));
        setEvents(formattedEvents);
      }
    } catch (error) {
      console.error("Failed to fetch calendar events:", error);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleSelectSlot = ({ start, end }) => {
    const formatForInput = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    setFormData({
      title: '',
      event_type: 'focus',
      subject_id: userSubjects.length > 0 ? userSubjects[0].id : '', 
      topic_name: '',
      assessment_type: 'quiz',
      difficulty: 'Medium',
      numQuestions: 15,
      start_time: formatForInput(start),
      end_time: formatForInput(end)
    });
    
    setEnableRedirect(false);
    setSelectedEvent(null);
    setIsModalOpen(true);
  };

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleSaveEvent = async (e, forceOverwrite = false) => {
    if (e) e.preventDefault(); 
    
    let generatedUrl = '';
    if (enableRedirect) {
      if (formData.event_type === 'focus') {
        if (formData.subject_id) {
          const selectedSubObj = userSubjects.find(s => String(s.id) === String(formData.subject_id));
          if (selectedSubObj) generatedUrl = `/study?subject=${encodeURIComponent(selectedSubObj.course_title)}`;
          else generatedUrl = '/study';
        } else generatedUrl = '/study';
      }
      if (formData.event_type === 'quiz') generatedUrl = '/practice-quiz'; 
      if (formData.event_type === 'task') generatedUrl = '/dashboard'; 
    }

    try {
      await axios.post('http://localhost:5000/api/calendar', {
        title: formData.title,
        event_type: formData.event_type,
        reference_url: generatedUrl,
        start_time: formData.start_time, 
        end_time: formData.end_time,
        overwrite: forceOverwrite,
        subject_id: formData.subject_id || null,         
        topic_name: formData.topic_name || null,         
        assessment_type: formData.assessment_type || null,
        difficulty: formData.difficulty,    // 🌟 Send new data
        numQuestions: formData.numQuestions // 🌟 Send new data
      }, { withCredentials: true });
      
      setIsModalOpen(false);
      fetchEvents(); 
    } catch (error) {
      if (error.response && error.response.status === 409) {
        const userWantsToOverwrite = window.confirm(error.response.data.message);
        if (userWantsToOverwrite) handleSaveEvent(null, true); 
      }
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await axios.delete(`http://localhost:5000/api/calendar/${eventId}`, { withCredentials: true });
      setIsModalOpen(false);
      fetchEvents();
    } catch (error) {
      console.error("Failed to delete event", error);
    }
  };

  const eventStyleGetter = (event) => {
    let backgroundColor = '#3b82f6'; 
    if (event.event_type === 'focus') backgroundColor = '#8b5cf6'; 
    if (event.event_type === 'quiz') backgroundColor = '#10b981'; 
    return { style: { backgroundColor, borderRadius: '6px', opacity: 0.9, color: 'white', border: 'none', display: 'block' } };
  };

  return (
    <div className={styles.calendarContainer}>
      <header className={styles.header}>
        <div>
          <h1>Study Schedule</h1>
          <p>Plan your focus sessions and upcoming quizzes.</p>
        </div>
        <button className={styles.primaryBtn} onClick={() => {
            const now = new Date();
            const later = new Date(now.getTime() + 60 * 60 * 1000);
            handleSelectSlot({ start: now, end: later });
        }}>
          <Plus size={18} /> New Event
        </button>
      </header>

      <div className={styles.calendarWrapper}>
        <Calendar
          localizer={localizer} events={events} startAccessor="start" endAccessor="end" selectable
          onSelectSlot={handleSelectSlot} onSelectEvent={handleSelectEvent} eventPropGetter={eventStyleGetter}
          style={{ height: '100%' }} views={['month', 'week', 'day']} view={currentView}
          onView={setCurrentView} date={currentDate} onNavigate={setCurrentDate}
        />
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            
            <div className={styles.modalHeader}>
              <h2>{selectedEvent ? 'Event Details' : 'Schedule Event'}</h2>
              <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>

            {selectedEvent ? (
              <div className={styles.eventDetails}>
                <h3 className={styles.eventTitle}>{selectedEvent.title}</h3>
                <div className={styles.eventMeta}>
                  <span className={styles.badge} data-type={selectedEvent.event_type}>{selectedEvent.event_type.toUpperCase()}</span>
                  <span className={styles.timeInfo}><Clock size={16}/> {format(selectedEvent.start, 'MMM d, h:mm a')} - {format(selectedEvent.end, 'h:mm a')}</span>
                </div>
                <div className={styles.modalActions}>
                  {selectedEvent.reference_url && (
                    <button className={styles.actionBtn} onClick={() => navigate(selectedEvent.reference_url)}><ExternalLink size={18} /> Go to Activity</button>
                  )}
                  <button className={`${styles.actionBtn} ${styles.dangerBtn}`} onClick={() => handleDeleteEvent(selectedEvent.id)}><Trash2 size={18} /> Cancel Event</button>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => handleSaveEvent(e, false)} className={styles.eventForm}>
                
                <div className={styles.formGroup}>
                  <label>Event Title</label>
                  <input type="text" required placeholder="e.g., Deep Work: Data Structures" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>
                
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Event Type</label>
                    <select value={formData.event_type} onChange={e => {
                        setFormData({...formData, event_type: e.target.value});
                        if(e.target.value === 'task') setEnableRedirect(false);
                      }}>
                      <option value="focus">Focus Session</option>
                      <option value="quiz">Practice / Assessment</option>
                      <option value="task">General Task</option>
                    </select>
                  </div>
                  
                  <div className={styles.formGroup} style={{ display: 'flex', alignItems: 'center', marginTop: '26px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: formData.event_type === 'task' ? 'not-allowed' : 'pointer', margin: 0 }}>
                      <input type="checkbox" checked={enableRedirect} onChange={(e) => setEnableRedirect(e.target.checked)} disabled={formData.event_type === 'task'} style={{ width: '18px', height: '18px', cursor: 'inherit', margin: 0 }} />
                      <span style={{ color: formData.event_type === 'task' ? 'var(--text-muted)' : 'var(--text-main)' }}>Enable Auto-Redirect</span>
                    </label>
                  </div>
                </div>

                {(formData.event_type === 'focus' || formData.event_type === 'quiz') && (
                  <div className={styles.formRow} style={{ marginTop: '15px', padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    
                    <div className={styles.formGroup}>
                      <label><BookOpen size={14} style={{display:'inline', marginRight:'4px'}}/> Select Subject</label>
                      <select value={formData.subject_id} onChange={e => setFormData({...formData, subject_id: e.target.value})} required>
                        <option value="" disabled>Choose a subject...</option>
                        {userSubjects.map(sub => (<option key={sub.id} value={sub.id}>{sub.course_title}</option>))}
                      </select>
                    </div>

                    {formData.event_type === 'quiz' && (
                      <div className={styles.formGroup}>
                        <label>Select Topic</label>
                        {isLoadingTopics ? (
                          <div style={{ display: 'flex', alignItems: 'center', height: '40px', color: 'var(--text-dim)' }}>
                            <Loader2 size={16} className={styles.spin} style={{ marginRight: '8px' }} /> Loading topics...
                          </div>
                        ) : (
                          <select value={formData.topic_name} onChange={e => setFormData({...formData, topic_name: e.target.value})} required>
                            {availableTopics.length === 0 ? <option value="" disabled>No topics found</option> : availableTopics.map((topic, idx) => <option key={idx} value={topic}>{topic}</option>)}
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 🌟 NEW: Assessment Settings UI */}
                {formData.event_type === 'quiz' && (
                  <>
                    <div className={styles.formGroup} style={{ marginTop: '15px' }}>
                      <label>Assessment Type</label>
                      <select value={formData.assessment_type} onChange={e => setFormData({...formData, assessment_type: e.target.value})}>
                        <option value="quiz">Multiple Choice Quiz (MCQ)</option>
                        <option value="short">Short Answer Assessment</option>
                        <option value="long">Long Essay/Mock Exam</option>
                        <option value="notes">Generate Study Notes Only</option>
                      </select>
                    </div>

                    <div className={styles.formRow} style={{ marginTop: '15px' }}>
                      <div className={styles.formGroup}>
                        <label>Difficulty</label>
                        <select value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: e.target.value})}>
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                          <option value="Exam Level">Exam Level</option>
                        </select>
                      </div>
                      {formData.assessment_type !== 'notes' && (
                        <div className={styles.formGroup}>
                          <label>No. of Questions</label>
                          <input type="number" min="5" max="50" value={formData.numQuestions} onChange={e => setFormData({...formData, numQuestions: e.target.value})} />
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className={styles.formRow} style={{ marginTop: '15px' }}>
                  <div className={styles.formGroup}>
                    <label>Start Time</label>
                    <input type="datetime-local" required value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>End Time</label>
                    <input type="datetime-local" required value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} />
                  </div>
                </div>

                <button type="submit" className={styles.submitBtn}>Save to Calendar</button>
              </form>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;