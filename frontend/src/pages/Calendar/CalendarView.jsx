import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Calendar as CalendarIcon, Clock, Trash2, ExternalLink } from 'lucide-react';
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

  const [formData, setFormData] = useState({
    title: '',
    event_type: 'focus',
    start_time: '',
    end_time: ''
  });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // 🌟 FIX: Updated with overwrite logic
  const handleSaveEvent = async (e, forceOverwrite = false) => {
    if (e) e.preventDefault(); 
    
    let generatedUrl = '';
    if (enableRedirect) {
      if (formData.event_type === 'focus') generatedUrl = '/focus';
      if (formData.event_type === 'quiz') generatedUrl = '/practice-quiz';
    }

    try {
      await axios.post('http://localhost:5000/api/calendar', {
        title: formData.title,
        event_type: formData.event_type,
        reference_url: generatedUrl,
        start_time: formData.start_time, 
        end_time: formData.end_time,
        overwrite: forceOverwrite // Pass the flag!
      }, { withCredentials: true });
      
      setIsModalOpen(false);
      fetchEvents(); 
    } catch (error) {
      // 🌟 NEW: Catch the conflict and ask the user
      if (error.response && error.response.status === 409) {
        const userWantsToOverwrite = window.confirm(error.response.data.message);
        
        if (userWantsToOverwrite) {
          // Re-fire the function, but force the overwrite this time
          handleSaveEvent(null, true); 
        }
      } else {
        console.error("Failed to save event", error);
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
    
    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        display: 'block'
      }
    };
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
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          style={{ height: '100%' }}
          views={['month', 'week', 'day']}
          view={currentView}
          onView={setCurrentView}
          date={currentDate}
          onNavigate={setCurrentDate}
        />
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            
            <div className={styles.modalHeader}>
              <h2>{selectedEvent ? 'Event Details' : 'Schedule Event'}</h2>
              <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {selectedEvent ? (
              <div className={styles.eventDetails}>
                <h3 className={styles.eventTitle}>{selectedEvent.title}</h3>
                <div className={styles.eventMeta}>
                  <span className={styles.badge} data-type={selectedEvent.event_type}>
                    {selectedEvent.event_type.toUpperCase()}
                  </span>
                  <span className={styles.timeInfo}>
                    <Clock size={16}/> 
                    {format(selectedEvent.start, 'MMM d, h:mm a')} - {format(selectedEvent.end, 'h:mm a')}
                  </span>
                </div>
                
                <div className={styles.modalActions}>
                  {selectedEvent.reference_url && (
                    <button 
                      className={styles.actionBtn} 
                      onClick={() => navigate(selectedEvent.reference_url)}
                    >
                      <ExternalLink size={18} /> Go to Activity
                    </button>
                  )}
                  <button 
                    className={`${styles.actionBtn} ${styles.dangerBtn}`}
                    onClick={() => handleDeleteEvent(selectedEvent.id)}
                  >
                    <Trash2 size={18} /> Cancel Event
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => handleSaveEvent(e, false)} className={styles.eventForm}>
                <div className={styles.formGroup}>
                  <label>Event Title</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g., Deep Work: Data Structures"
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})} 
                  />
                </div>
                
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Event Type</label>
                    <select 
                      value={formData.event_type} 
                      onChange={e => {
                        setFormData({...formData, event_type: e.target.value});
                        if(e.target.value === 'task') setEnableRedirect(false);
                      }}
                    >
                      <option value="focus">Focus Session</option>
                      <option value="quiz">Quiz / Exam</option>
                      <option value="task">General Task</option>
                    </select>
                  </div>
                  
                  <div className={styles.formGroup} style={{ display: 'flex', alignItems: 'center', marginTop: '26px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: formData.event_type === 'task' ? 'not-allowed' : 'pointer', margin: 0 }}>
                      <input 
                        type="checkbox" 
                        checked={enableRedirect}
                        onChange={(e) => setEnableRedirect(e.target.checked)}
                        disabled={formData.event_type === 'task'}
                        style={{ width: '18px', height: '18px', cursor: 'inherit', margin: 0 }}
                      />
                      <span style={{ color: formData.event_type === 'task' ? 'var(--text-muted)' : 'var(--text-main)' }}>
                        Enable Auto-Redirect {formData.event_type === 'task' ? '(N/A for Tasks)' : ''}
                      </span>
                    </label>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Start Time</label>
                    <input 
                      type="datetime-local" 
                      required 
                      value={formData.start_time} 
                      onChange={e => setFormData({...formData, start_time: e.target.value})} 
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>End Time</label>
                    <input 
                      type="datetime-local" 
                      required 
                      value={formData.end_time} 
                      onChange={e => setFormData({...formData, end_time: e.target.value})} 
                    />
                  </div>
                </div>

                <button type="submit" className={styles.submitBtn}>
                  Save to Calendar
                </button>
              </form>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;