import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, Sliders, Timer, Sparkles, Folder, Save, Loader2 } from 'lucide-react';
import axios from 'axios';
import styles from './practise_lab.module.css';

const TOPICS_KEY = 'practiceTopics';
const SELECTED_KEY = 'practiceSelectedTopics';
const SETTINGS_KEY = 'practiceSettings';

const PracticeLab = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // --- SUBJECT GATE STATE ---
  const passedSubject = location.state?.subjectName;
  const [selectedSubject, setSelectedSubject] = useState(passedSubject ? { course_title: passedSubject } : null);
  
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(!passedSubject);

  // --- PRACTICE LAB STATE ---
  const [uploadedFile, setUploadedFile] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [activeMode, setActiveMode] = useState('Quiz (MCQ)');
  const [difficulty, setDifficulty] = useState('Medium');
  const [questionCount, setQuestionCount] = useState(15);
  const [timerEnabled, setTimerEnabled] = useState(true);
  
  const [isSavingFile, setIsSavingFile] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [fileTitle, setFileTitle] = useState('');
  const [fileTitleError, setFileTitleError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  // Added "Study Notes" back so you can generate detailed notes!
  const modes = useMemo(() => (
    ['Quiz (MCQ)', 'Short Answer', 'Long Answer', 'Case Study', 'Mock Test', 'Study Notes']
  ), []);

  const difficulties = ['Easy', 'Medium', 'Hard', 'Exam Level'];

  useEffect(() => {
    if (passedSubject) {
      localStorage.setItem('practiceSubject', passedSubject);
    }
  }, [passedSubject]);

  useEffect(() => {
    if (!passedSubject) {
      const fetchSubjects = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await axios.get('http://localhost:5000/api/syllabus/list', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setSubjects(res.data);
        } catch  {
          console.error("Failed to load subjects");
        } finally {
          setLoadingSubjects(false);
        }
      };
      fetchSubjects();
    }
  }, [passedSubject]);

  useEffect(() => {
    const storedSelected = JSON.parse(localStorage.getItem(SELECTED_KEY) || '[]');
    setSelectedTopics(Array.isArray(storedSelected) ? storedSelected : []);
  }, []);

  useEffect(() => {
    const settings = { mode: activeMode, difficulty, questionCount, timerEnabled };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [activeMode, difficulty, questionCount, timerEnabled]);

  const handleSelectSubject = (subject) => {
    setSelectedSubject(subject);
    localStorage.setItem('practiceSubject', subject.course_title);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      setUploadedFile(file);
      setExtractError('');
    }
  };

  const handleExtractTopics = async () => {
    setExtractError('');
    setIsExtracting(true);

    if (!uploadedFile && !textInput.trim()) {
      setExtractError('Please upload a syllabus PDF or paste text before continuing.');
      setIsExtracting(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();

      if (uploadedFile) formData.append('file', uploadedFile);
      if (textInput.trim()) formData.append('text', textInput.trim());

      const response = await fetch('http://localhost:5000/api/practice/extract-topics', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Topic extraction failed.');
      }

      const data = await response.json();
      const extractedTopics = Array.isArray(data.topics) ? data.topics : [];
      localStorage.setItem(TOPICS_KEY, JSON.stringify(extractedTopics));
      localStorage.setItem(SELECTED_KEY, JSON.stringify([]));
      setSelectedTopics([]);
      navigate('/practice-topics');
    } catch (error) {
      setExtractError(error.message);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSaveFile = async (titleValue) => {
    if (!uploadedFile) return;

    setIsSavingFile(true);
    setSaveError('');
    setSaveSuccess('');

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('title', titleValue.trim());
      formData.append('category', selectedSubject.course_title); 

      const response = await fetch('http://localhost:5000/api/library/save-file', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to save file.');

      setIsFileModalOpen(false);
      setFileTitle('');
      setFileTitleError('');
      setSaveSuccess('Saved to library.');
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setIsSavingFile(false);
    }
  };

  const openFileModal = () => {
    setFileTitle('');
    setFileTitleError('');
    setIsFileModalOpen(true);
  };

  const submitFileTitle = () => {
    if (!fileTitle.trim()) {
      setFileTitleError('Title is required.');
      return;
    }
    handleSaveFile(fileTitle);
  };

  if (!selectedSubject) {
    return (
      <div className={styles.labContainer}>
        <header className={styles.header}>
          <div className={styles.animateFadeInUp}>
            <span className={styles.badge}>Practice Lab</span>
            <h2>Select a Subject</h2>
            <p className={styles.subText}>Which library folder are we generating practice material for?</p>
          </div>
        </header>
        
        {loadingSubjects ? (
          <div style={{display: 'flex', justifyContent: 'center', marginTop: '40px'}}>
             <Loader2 size={40} className={styles.spin} color="#3b82f6" />
          </div>
        ) : (
          <div className={styles.splitGrid}>
            {subjects.length === 0 ? (
               <div className={styles.sectionCard}>
                 <p style={{color: '#94a3b8'}}>No subjects found. Upload a syllabus from the Dashboard first.</p>
               </div>
            ) : (
              subjects.map((sub, index) => (
                <div 
                  key={sub.id} 
                  className={`${styles.sectionCard} ${styles.btnPulseHover}`} 
                  onClick={() => handleSelectSubject(sub)} 
                  style={{cursor: 'pointer', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '15px', padding: '20px', animationDelay: `${index * 0.1}s`}}
                >
                  <Folder size={32} color="#38bdf8" />
                  <h3 style={{margin: 0, fontSize: '1.1rem'}}>{sub.course_title}</h3>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  const hasInput = Boolean(uploadedFile) || Boolean(textInput.trim());
  const canExtract = hasInput && !isExtracting;

  return (
    <div className={styles.labContainer}>
      <header className={styles.header}>
        <div className={styles.animateFadeInUp}>
          <span className={styles.badge}>Subject: {selectedSubject.course_title}</span>
          <h2>Build your practice set in minutes</h2>
          <p className={styles.subText}>Upload syllabus or notes, extract topics, then generate the format you want.</p>
        </div>
      </header>

      {/* STEP 1: UPLOAD & EXTRACT */}
      <section className={`${styles.sectionCard} ${styles.animateFadeInUp}`} style={{animationDelay: '0.1s'}}>
        <div className={styles.sectionHeader}>
          <div className={styles.stepBadge}>Step 1</div>
          <h3>Upload Content</h3>
          <p>Drag & drop a PDF or paste your text.</p>
        </div>

        <div className={styles.uploadGrid}>
          <div className={styles.uploadPanel} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
            <div className={styles.uploadIcon}><UploadCloud size={28} /></div>
            <h4>Upload PDF</h4>
            <p>Drop your study Material here or browse.</p>
            <label className={styles.fileButton}>
              <input type="file" accept=".pdf" onChange={(event) => setUploadedFile(event.target.files?.[0] || null)} hidden />
              Choose File
            </label>
            <div className={styles.fileMeta}>{uploadedFile ? uploadedFile.name : 'No file selected'}</div>
            {uploadedFile && (
              <button className={`${styles.secondaryAction} ${styles.btnPulseHover}`} onClick={openFileModal} disabled={isSavingFile} style={{ marginTop: '12px' }}>
                <Save size={16}/> {isSavingFile ? 'Saving...' : 'Save to Library'}
              </button>
            )}
          </div>

          <div className={styles.textPanel}>
            <div className={styles.panelHeader}><FileText size={20} /><span>Paste Text</span></div>
            <textarea className={styles.textArea} placeholder="Paste your topics or study notes here..." value={textInput} onChange={(event) => { setTextInput(event.target.value); setExtractError(''); }} />
          </div>
        </div>

        {/* THE FIX: Button is now inside the card, clearly visible, with no opacity bugs! */}
        <div className={styles.extractActionRow}>
          <button 
            className={`${styles.primaryAction} ${styles.btnPulseHover}`} 
            onClick={handleExtractTopics} 
            disabled={!canExtract}
          >
            {isExtracting ? <Loader2 className={styles.spin} size={18} /> : <Sparkles size={18} />} 
            {isExtracting ? 'Extracting Topics...' : 'Extract Topics'}
          </button>
        </div>

        {extractError && <div className={styles.extractError}>{extractError}</div>}
        {saveError && <div className={styles.extractError}>{saveError}</div>}
        {saveSuccess && <div className={styles.successMessage}>{saveSuccess}</div>}
      </section>

      {/* SAVE FILE MODAL */}
      {isFileModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <h3 className={styles.modalTitle}>Save to Library</h3>
            <p className={styles.modalText}>Enter a name for this file.</p>
            <input className={styles.modalInput} value={fileTitle} onChange={(event) => { setFileTitle(event.target.value); setFileTitleError(''); }} placeholder="e.g., Semester 4 Notes" />
            {fileTitleError && <div className={styles.modalError}>{fileTitleError}</div>}
            <div className={styles.modalActions}>
              <button className={styles.secondaryAction} onClick={() => setIsFileModalOpen(false)}>Cancel</button>
              <button className={styles.finalAction} onClick={submitFileTitle} disabled={isSavingFile}>{isSavingFile ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.splitGrid}>
        
        {/* STEP 2: MODE SELECTION */}
        <section className={`${styles.sectionCard} ${styles.animateFadeInUp}`} style={{animationDelay: '0.2s'}}>
          <div className={styles.sectionHeader}>
            <div className={styles.stepBadge}>Step 2</div>
            <h3>Mode Selection</h3>
            <p>Select how you want to practice.</p>
          </div>
          <div className={styles.modeGrid}>
            {modes.map((mode) => (
              <button key={mode} className={activeMode === mode ? styles.modeBtnActive : styles.modeBtn} onClick={() => setActiveMode(mode)}>
                {mode}
              </button>
            ))}
          </div>
        </section>

        {/* STEP 3: SETTINGS */}
        <section className={`${styles.sectionCard} ${styles.animateFadeInUp}`} style={{animationDelay: '0.3s'}}>
          <div className={styles.sectionHeader}>
            <div className={styles.stepBadge}>Step 3</div>
            <h3>Settings Panel</h3>
            <p>Fine-tune your practice session.</p>
          </div>
          <div className={styles.settingsBlock}>
            <div className={styles.settingRow}>
              <div>
                <span className={styles.settingLabel}>Difficulty</span>
                <div className={styles.difficultyRow}>
                  {difficulties.map((level) => (
                    <button key={level} className={difficulty === level ? styles.difficultyBtnActive : styles.difficultyBtn} onClick={() => setDifficulty(level)}>
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.settingRow}>
              <div>
                <span className={styles.settingLabel}>Number of Questions</span>
                <input type="number" min="5" max="50" value={questionCount} onChange={(event) => setQuestionCount(Number(event.target.value))} className={styles.numberInput} />
              </div>
            </div>

            <div className={styles.settingRow}>
              <div className={styles.timerToggle}><Timer size={18} /><span>Timer (Mock Test)</span></div>
              <button className={timerEnabled ? styles.toggleActive : styles.toggleInactive} onClick={() => setTimerEnabled(!timerEnabled)}>
                {timerEnabled ? 'On' : 'Off'}
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default PracticeLab;