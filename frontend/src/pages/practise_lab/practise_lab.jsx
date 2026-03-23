import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, Sliders, Timer, Sparkles, Folder, Save, Loader2, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import styles from './practise_lab.module.css';

const TOPICS_KEY = 'practiceTopics';
const SELECTED_KEY = 'practiceSelectedTopics';
const SETTINGS_KEY = 'practiceSettings';
// ✅ NEW: Keys to save your draft progress
const DRAFT_TEXT_KEY = 'practiceDraftText';
const DRAFT_FILE_META_KEY = 'practiceDraftFileMeta';

const PracticeLab = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const passedSubject = location.state?.subjectName;
  const [selectedSubject, setSelectedSubject] = useState(passedSubject ? { course_title: passedSubject } : null);
  
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(!passedSubject);

  // --- PRACTICE LAB STATE ---
  const [uploadedFile, setUploadedFile] = useState(null);
  
  // ✅ FIX: Load drafted text and file metadata if the user navigated away and came back
  const [textInput, setTextInput] = useState(() => sessionStorage.getItem(DRAFT_TEXT_KEY) || '');
  const [draftFileMeta, setDraftFileMeta] = useState(() => JSON.parse(sessionStorage.getItem(DRAFT_FILE_META_KEY) || 'null'));

  const [selectedTopics, setSelectedTopics] = useState(() => {
    const storedSelected = JSON.parse(localStorage.getItem(SELECTED_KEY) || '[]');
    return Array.isArray(storedSelected) ? storedSelected : [];
  });

  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  
  // Load settings from storage so they don't reset when you leave the page
  const savedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  const [activeMode, setActiveMode] = useState(savedSettings.mode || 'Quiz (MCQ)');
  const [difficulty, setDifficulty] = useState(savedSettings.difficulty || 'Medium');
  const [questionCount, setQuestionCount] = useState(savedSettings.questionCount || 15);
  const [timerEnabled, setTimerEnabled] = useState(savedSettings.timerEnabled ?? true);
  
  const [isSavingFile, setIsSavingFile] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [fileTitle, setFileTitle] = useState('');
  const [fileTitleError, setFileTitleError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

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
        } catch {
          console.error("Failed to load subjects");
        } finally {
          setLoadingSubjects(false);
        }
      };
      fetchSubjects();
    }
  }, [passedSubject]);

  // ✅ FIX: Save text input to session storage as they type
  useEffect(() => {
    sessionStorage.setItem(DRAFT_TEXT_KEY, textInput);
  }, [textInput]);

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
    handleFileUpload(file);
  };

  const handleFileUpload = (file) => {
    if (file) {
      setUploadedFile(file);
      setExtractError('');
      // ✅ Save metadata so the user knows they uploaded something if they navigate away
      const meta = { name: file.name, size: file.size };
      setDraftFileMeta(meta);
      sessionStorage.setItem(DRAFT_FILE_META_KEY, JSON.stringify(meta));
    }
  };

  const handleExtractTopics = async () => {
    setExtractError('');
    setIsExtracting(true);

    if (!uploadedFile && !textInput.trim()) {
      // ✅ If they have a draft file but no actual file (because they navigated away), warn them.
      if (draftFileMeta && !uploadedFile) {
         setExtractError('Browser security requires you to re-select your PDF file before extracting.');
      } else {
         setExtractError('Please upload a syllabus PDF or paste text before continuing.');
      }
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
      
      // Clear drafts on success
      sessionStorage.removeItem(DRAFT_TEXT_KEY);
      sessionStorage.removeItem(DRAFT_FILE_META_KEY);
      
      navigate('/practice-topics');
    } catch (error) {
      setExtractError(error.message);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSaveFile = async (titleValue) => {
    if (!uploadedFile) {
        if (draftFileMeta) setSaveError("Please re-select the file. Browsers clear files when navigating between pages.");
        return;
    }

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
      setSaveSuccess('Saved to library. You can now extract topics!');
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
        <div className={styles.sectionHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className={styles.stepBadge}>Step 1</div>
            <h3>Upload Content</h3>
            <p>Drag & drop a PDF or paste your text.</p>
          </div>
          {/* Draft Indicator */}
          {(textInput.trim() || draftFileMeta) && !uploadedFile && (
             <span style={{ fontSize: '0.75rem', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Draft Restored
             </span>
          )}
        </div>

        <div className={styles.uploadGrid}>
          <div className={styles.uploadPanel} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
            <div className={styles.uploadIcon}><UploadCloud size={28} /></div>
            <h4>Upload PDF</h4>
            <p>Drop your study Material here or browse.</p>
            <label className={styles.fileButton}>
              <input type="file" accept=".pdf" onChange={(event) => handleFileUpload(event.target.files?.[0])} hidden />
              Choose File
            </label>
            
            {/* Intelligent File Display */}
            <div className={styles.fileMeta} style={{ color: uploadedFile ? '#10b981' : (draftFileMeta ? '#f59e0b' : '#94a3b8') }}>
                {uploadedFile 
                    ? <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'}}><CheckCircle2 size={14}/> {uploadedFile.name} ready!</span> 
                    : (draftFileMeta ? `Please re-select: ${draftFileMeta.name}` : 'No file selected')
                }
            </div>

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