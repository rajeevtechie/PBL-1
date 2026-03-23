import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const FocusContext = createContext();

export const useFocus = () => useContext(FocusContext);

export const FocusProvider = ({ children }) => {
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [targetMinutes, setTargetMinutes] = useState(25);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);

  useEffect(() => {
    let interval;
    if (isActive && !isPaused && remainingSeconds > 0) {
      interval = setInterval(() => setRemainingSeconds((prev) => prev - 1), 1000);
    } else if (isActive && !isPaused && remainingSeconds === 0) {
      clearInterval(interval);
      stopSession(100); // Auto-complete assumes perfect focus if you made it to the end!
    }
    return () => clearInterval(interval);
  }, [isActive, isPaused, remainingSeconds]);

  const startSession = () => {
    setIsActive(true);
    setIsPaused(false);
    setSessionStartTime(new Date().toISOString());
  };

  const pauseSession = () => setIsPaused(true);
  const resumeSession = () => setIsPaused(false);

  // ✅ NOW ACCEPTS A SCORE FROM 0 to 100
  const stopSession = async (focusScore = 90) => {
    setIsActive(false);
    setIsPaused(false);
    
    const actualStudiedSeconds = (targetMinutes * 60) - remainingSeconds;
    const durationMinutes = Math.floor(actualStudiedSeconds / 60);

    if (durationMinutes >= 1) {
      try {
        const token = localStorage.getItem('token');
        await axios.post('http://localhost:5000/api/practice/log-session', {
          subjectName: selectedSubject || 'General Focus',
          startTime: sessionStartTime,
          endTime: new Date().toISOString(),
          durationMinutes: durationMinutes,
          focusScore: focusScore // Passes the star rating to the DB!
        }, { headers: { Authorization: `Bearer ${token}` } });
        alert(`Awesome job! ${durationMinutes} minutes logged to your Dashboard.`);
      } catch (err) {
        console.error("Failed to log session:", err);
      }
    } else {
      alert("Session was too short to record (under 1 minute).");
    }

    setRemainingSeconds(targetMinutes * 60);
    setSessionStartTime(null);
  };

  return (
    <FocusContext.Provider value={{
      selectedSubject, setSelectedSubject,
      targetMinutes, setTargetMinutes,
      remainingSeconds, setRemainingSeconds,
      isActive, isPaused,
      startSession, pauseSession, resumeSession, stopSession
    }}>
      {children}
    </FocusContext.Provider>
  );
};