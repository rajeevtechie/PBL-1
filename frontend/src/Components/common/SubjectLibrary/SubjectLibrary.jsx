import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Book, Clock, ChevronRight, Loader2 } from 'lucide-react';
import styles from './SubjectLibrary.module.css';

const SubjectLibrary = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await axios.get('http://localhost:5000/api/syllabus/list', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        setSubjects(response.data);
      } catch (error) {
        console.error("Failed to load subjects", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, []);

  const handleSelectSubject = (id) => {
    // 1. Save the clicked subject ID as the "Active" one
    localStorage.setItem('activeSyllabusId', id);
    // 2. Send them to the Roadmap to view it!
    navigate('/roadmap');
  };

  if (loading) return <div className={styles.loading}><Loader2 className={styles.spinner}/> Loading your subjects...</div>;
  if (subjects.length === 0) return null; // Hide if they haven't uploaded anything yet

  return (
    <div className={styles.libraryContainer}>
      <h3 className={styles.title}>Your Learning Library</h3>
      
      <div className={styles.grid}>
        {subjects.map((sub) => (
          <div key={sub.id} className={styles.card} onClick={() => handleSelectSubject(sub.id)}>
            <div className={styles.iconWrapper}>
              <Book size={20} />
            </div>
            <div className={styles.info}>
              <h4>{sub.course_title}</h4>
              <span className={styles.date}>
                <Clock size={12} /> 
                {new Date(sub.created_at).toLocaleDateString()}
              </span>
            </div>
            <ChevronRight size={18} className={styles.arrow} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubjectLibrary;