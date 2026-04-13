import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, Timer, Sparkles, Folder, Save, Loader2, CheckCircle2, ListChecks } from 'lucide-react';
import axios from 'axios';
import TourGuide from '../../Components/common/TourGuide/TourGuide'; 
import styles from './practise_lab.module.css';
import { markTourCompleted } from '../../utils/tourSync'; 

const TOPICS_KEY = 'practiceTopics';
const SELECTED_KEY = 'practiceSelectedTopics';
const SETTINGS_KEY = 'practiceSettings';
const DRAFT_TEXT_KEY = 'practiceDraftText';
const DRAFT_FILE_META_KEY = 'practiceDraftFileMeta';

const PracticeLab = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const passedSubject = location.state?.subjectName;
  const [selectedSubject, setSelectedSubject] = useState(passedSubject ? { course_title: passedSubject } : null);
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(!passedSubject);

  const [uploadedFile, setUploadedFile] = useState(null);
  const [textInput, setTextInput] = useState(() => sessionStorage.getItem(DRAFT_TEXT_KEY) || '');
  const [draftFileMeta, setDraftFileMeta] = useState(() => JSON.parse(sessionStorage.getItem(DRAFT_FILE_META_KEY) || 'null'));

  // 🛡️ DUAL-TRACK ARCHITECTURE STATE
  const [contentSource, setContentSource] = useState('syllabus'); 

  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  
  const savedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  const [activeMode, setActiveMode] = useState(savedSettings.mode || 'Quiz (MCQ)');
  const [difficulty, setDifficulty] = useState(savedSettings.difficulty || 'Medium');
  const [questionCount, setQuestionCount] = useState(savedSettings.questionCount || 15);
  const [timerEnabled, setTimerEnabled] = useState(savedSettings.timerEnabled ?? true);
  const [timerDuration, setTimerDuration] = useState(savedSettings.timerDuration || 25);
  
  const [isSavingFile, setIsSavingFile] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [fileTitle, setFileTitle] = useState('');
  const [fileTitleError, setFileTitleError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  const [runTour, setRunTour] = useState(false);
  const tourSteps = [
    {
      target: '#tour-lab-upload',
      content: (
        <div>
          <h3 style={{ margin: '0 0 10px 0', color: '#f8fafc' }}>Context Engine 🧠</h3>
          <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.95rem' }}>Sync directly with your AI Roadmap, or override it by uploading a custom document or past exam paper.</p>
        </div>
      ),
      disableBeacon: true,
    },
    {
      target: '#tour-lab-mode',
      content: (
        <div>
          <h3 style={{ margin: '0 0 10px 0', color: '#f8fafc' }}>Pick a Format 📝</h3>
          <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.95rem' }}>Want multiple choice? Long answers? A full mock test? Select the format that best matches your upcoming exam.</p>
        </div>
      ),
    },
    {
      target: '#tour-lab-settings',
      content: (
        <div>
          <h3 style={{ margin: '0 0 10px 0', color: '#f8fafc' }}>Set the Stakes ⚙️</h3>
          <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.95rem' }}>Dial up the difficulty or set a strict timer to simulate real exam pressure.</p>
        </div>
      ),
    }
  ];

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
          const res = await axios.get('http://localhost:5000/api/syllabus/list', { withCredentials: true });
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

  useEffect(() => {
      const hasSeenTour = localStorage.getItem('hasSeenPracticeTour');
      
      if (selectedSubject && !hasSeenTour) {
          const checkDOM = setInterval(() => {
              const targetEl = document.querySelector('#tour-lab-upload');
              if (targetEl) {
                  setRunTour(true);
                  markTourCompleted('hasSeenPracticeTour'); 
                  clearInterval(checkDOM);
              }
          }, 100);

          return () => clearInterval(checkDOM);
      }
  }, [selectedSubject]);

  useEffect(() => { 
      sessionStorage.setItem(DRAFT_TEXT_KEY, textInput); 
  }, [textInput]);

  useEffect(() => {
    const settings = { mode: activeMode, difficulty, questionCount, timerEnabled, timerDuration };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [activeMode, difficulty, questionCount, timerEnabled, timerDuration]);

  const handleSelectSubject = (subject) => {
    setSelectedSubject(subject);
    localStorage.setItem('practiceSubject', subject.course_title);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    handleFileUpload(event.dataTransfer.files?.[0]);
  };

  const handleFileUpload = (file) => {
    if (file) {
      setUploadedFile(file);
      setExtractError('');
      const meta = { name: file.name, size: file.size };
      setDraftFileMeta(meta);
      sessionStorage.setItem(DRAFT_FILE_META_KEY, JSON.stringify(meta));
    }
  };

  // 🛡️ DUAL-TRACK LOGIC
  const handleExtractTopics = async () => {
    setExtractError(''); 
    setIsExtracting(true);
    
    try {
      let extractedTopics = [];

      // 🔀 TRACK A: SYLLABUS SYNC
      if (contentSource === 'syllabus') {
          const response = await axios.post('http://localhost:5000/api/practice/extract-syllabus-topics', { 
              subjectId: selectedSubject.id,
              subjectName: selectedSubject.course_title
          }, { withCredentials: true });
          extractedTopics = Array.isArray(response.data.topics) ? response.data.topics : [];
      } 
      // 🔀 TRACK B: CUSTOM OVERRIDE
      else {
          if (!uploadedFile && !textInput.trim()) {
            if (draftFileMeta && !uploadedFile) {
                setExtractError('Browser security requires you to re-select your PDF file before extracting.');
            } else {
                setExtractError('Please upload a custom PDF or paste text.');
            }
            setIsExtracting(false); 
            return;
          }
          const formData = new FormData();
          if (uploadedFile) formData.append('file', uploadedFile);
          if (textInput.trim()) formData.append('text', textInput.trim());

          const response = await axios.post('http://localhost:5000/api/practice/extract-topics', formData, { withCredentials: true });
          extractedTopics = Array.isArray(response.data.topics) ? response.data.topics : [];
      }

      localStorage.setItem(TOPICS_KEY, JSON.stringify(extractedTopics));
      localStorage.setItem(SELECTED_KEY, JSON.stringify([]));
      sessionStorage.removeItem(DRAFT_TEXT_KEY); 
      sessionStorage.removeItem(DRAFT_FILE_META_KEY);
      
      navigate('/practice-topics');
    } catch (error) {
      setExtractError(error.response?.data?.message || 'Topic extraction failed. Please try again.');
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
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('title', titleValue.trim());
      formData.append('category', selectedSubject.course_title); 

      await axios.post('http://localhost:5000/api/library/save-file', formData, { withCredentials: true });

      setIsFileModalOpen(false); 
      setFileTitle(''); 
      setFileTitleError('');
      setSaveSuccess('Saved to library. You can now extract topics!');
    } catch (error) {
      setSaveError(error.response?.data?.message || 'Failed to save file.');
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
              <Loader2 size={40} className={styles.spin || "spin"} color="#3b82f6" />
          </div>
        ) : (
          <div className={styles.splitGrid}>
            {subjects.length === 0 ? (
               <div className={styles.sectionCard}>
                   <p style={{color: 'var(--text-dim)'}}>No subjects found. Upload a syllabus from the Dashboard first.</p>
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

  return (
    <div className={styles.labContainer}>
        
      <TourGuide 
        steps={tourSteps} 
        run={runTour} 
        onComplete={() => {
          localStorage.setItem('hasSeenPracticeTour', 'true');
          setRunTour(false);
        }} 
      />

      <header className={styles.header}>
        <div className={styles.animateFadeInUp}>
          <span className={styles.badge}>Subject: {selectedSubject.course_title}</span>
          <h2>Build your practice set in minutes</h2>
          <p className={styles.subText}>Select your data source, extract topics, then generate the format you want.</p>
        </div>
      </header>

      {/* 🛡️ STEP 1: THE DUAL-TRACK UI */}
      <section id="tour-lab-upload" className={`${styles.sectionCard} ${styles.animateFadeInUp}`} style={{animationDelay: '0.1s'}}>
        <div className={styles.sectionHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
              <div className={styles.stepBadge}>Step 1</div>
              <h3>Content Source</h3>
              <p>Where should we pull the topics from?</p>
          </div>
          {(textInput.trim() || draftFileMeta) && !uploadedFile && contentSource === 'custom' && (
              <span style={{ fontSize: '0.75rem', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Draft Restored
              </span>
          )}
        </div>

        {/* THE TOGGLE SWITCH */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: 'var(--bg-main)', padding: '5px', borderRadius: '12px', width: 'fit-content' }}>
            <button 
                onClick={() => setContentSource('syllabus')}
                style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', background: contentSource === 'syllabus' ? '#38bdf8' : 'transparent', color: contentSource === 'syllabus' ? '#fff' : 'var(--text-dim)', transition: 'all 0.2s' }}
            >
                📚 Sync with Syllabus
            </button>
            <button 
                onClick={() => setContentSource('custom')}
                style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', background: contentSource === 'custom' ? '#8b5cf6' : 'transparent', color: contentSource === 'custom' ? '#fff' : 'var(--text-dim)', transition: 'all 0.2s' }}
            >
                📄 Upload Custom Notes
            </button>
        </div>
        
        {contentSource === 'syllabus' ? (
            // 🔀 TRACK A UI: Syllabus Sync
            <div style={{ background: 'var(--bg-main)', border: '1px dashed var(--border-color)', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
                <Sparkles size={40} color="#38bdf8" style={{ margin: '0 auto 15px auto' }} />
                <h4 style={{ color: 'var(--text-main)', fontSize: '1.2rem', margin: '0 0 10px 0' }}>AI Roadmap Integration</h4>
                <p style={{ color: 'var(--text-dim)', marginBottom: '20px', maxWidth: '500px', margin: '0 auto 25px auto' }}>We will automatically pull the curriculum directly from your saved {selectedSubject.course_title} roadmap.</p>
                <button className={`${styles.primaryAction} ${styles.btnPulseHover}`} onClick={handleExtractTopics} disabled={isExtracting} style={{ margin: '0 auto' }}>
                    {isExtracting ? <Loader2 className={styles.spin || "spin"} size={18} /> : <ListChecks size={18} />} 
                    {isExtracting ? 'Syncing Topics...' : 'Load Syllabus Topics'}
                </button>
            </div>
        ) : (
            // 🔀 TRACK B UI: Upload/Paste (Original)
            <>
                <div className={styles.uploadGrid}>
                  <div className={styles.uploadPanel} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
                    <div className={styles.uploadIcon}><UploadCloud size={28} /></div>
                    <h4>Upload PDF</h4>
                    <p>Drop a custom worksheet, past paper, or slides.</p>
                    <label className={styles.fileButton}>
                      <input type="file" accept=".pdf" onChange={(event) => handleFileUpload(event.target.files?.[0])} hidden />
                      Choose File
                    </label>
                    <div className={styles.fileMeta} style={{ color: uploadedFile ? '#10b981' : (draftFileMeta ? '#f59e0b' : 'var(--text-dim)') }}>
                        {uploadedFile 
                          ? <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'}}><CheckCircle2 size={14}/> {uploadedFile.name} ready!</span> 
                          : (draftFileMeta ? `Please re-select: ${draftFileMeta.name}` : 'No file selected')
                        }
                    </div>
                    
                    {uploadedFile && (
                        <button 
                          className={`${styles.secondaryAction} ${styles.btnPulseHover}`} 
                          onClick={openFileModal} 
                          disabled={isSavingFile} 
                          style={{ marginTop: '12px' }}
                        >
                            <Save size={16}/> {isSavingFile ? 'Saving...' : 'Save to Library'}
                        </button>
                    )}
                  </div>
                  
                  <div className={styles.textPanel}>
                    <div className={styles.panelHeader}>
                        <FileText size={20} /><span>Paste Text</span>
                    </div>
                    <textarea 
                      className={styles.textArea} 
                      placeholder="Paste specific topics or study notes here..." 
                      value={textInput} 
                      onChange={(event) => { setTextInput(event.target.value); setExtractError(''); }} 
                    />
                  </div>
                </div>
                
                <div className={styles.extractActionRow} style={{ marginTop: '20px' }}>
                  <button className={`${styles.primaryAction} ${styles.btnPulseHover}`} onClick={handleExtractTopics} disabled={(!uploadedFile && !textInput.trim()) || isExtracting}>
                    {isExtracting ? <Loader2 className={styles.spin || "spin"} size={18} /> : <Sparkles size={18} />} 
                    {isExtracting ? 'Extracting Topics...' : 'Extract Custom Topics'}
                  </button>
                </div>
            </>
        )}
        
        {extractError && <div className={styles.extractError}>{extractError}</div>}
        {saveError && <div className={styles.extractError}>{saveError}</div>}
        {saveSuccess && <div className={styles.successMessage}>{saveSuccess}</div>}
      </section>

      {/* --- REMAINDER OF UI REMAINS IDENTICAL --- */}
      {isFileModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <h3 className={styles.modalTitle}>Save to Library</h3>
            <p className={styles.modalText}>Enter a name for this file.</p>
            <input 
              className={styles.modalInput} 
              value={fileTitle} 
              onChange={(event) => { setFileTitle(event.target.value); setFileTitleError(''); }} 
              placeholder="e.g., Mock Test Override" 
            />
            {fileTitleError && <div className={styles.modalError}>{fileTitleError}</div>}
            <div className={styles.modalActions}>
              <button className={styles.secondaryAction} onClick={() => setIsFileModalOpen(false)}>Cancel</button>
              <button className={styles.finalAction} onClick={submitFileTitle} disabled={isSavingFile}>
                  {isSavingFile ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.splitGrid}>
        <section id="tour-lab-mode" className={`${styles.sectionCard} ${styles.animateFadeInUp}`} style={{animationDelay: '0.2s'}}>
          <div className={styles.sectionHeader}>
              <div className={styles.stepBadge}>Step 2</div>
              <h3>Mode Selection</h3>
              <p>Select how you want to practice.</p>
          </div>
          <div className={styles.modeGrid}>
            {modes.map((mode) => (
                <button 
                  key={mode} 
                  className={activeMode === mode ? styles.modeBtnActive : styles.modeBtn} 
                  onClick={() => setActiveMode(mode)}
                >
                    {mode}
                </button>
            ))}
          </div>
        </section>

        <section id="tour-lab-settings" className={`${styles.sectionCard} ${styles.animateFadeInUp}`} style={{animationDelay: '0.3s'}}>
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
                          <button 
                            key={level} 
                            className={difficulty === level ? styles.difficultyBtnActive : styles.difficultyBtn} 
                            onClick={() => setDifficulty(level)}
                          >
                              {level}
                          </button>
                      ))}
                  </div>
              </div>
            </div>
            
            {activeMode !== 'Study Notes' && (
              <div className={styles.settingRow}>
                  <div>
                      <span className={styles.settingLabel}>Number of Questions</span>
                      <input 
                        type="number" 
                        min="5" 
                        max="50" 
                        value={questionCount} 
                        onChange={(event) => setQuestionCount(Number(event.target.value))} 
                        className={styles.numberInput} 
                      />
                  </div>
              </div>
            )}
            
            <div className={styles.settingRow} style={{ alignItems: 'flex-start' }}>
              <div>
                 <div className={styles.timerToggle}>
                     <Timer size={18} /><span>Timer (Mock Test)</span>
                 </div>
                 {timerEnabled && (
                     <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                         <input 
                           type="number" 
                           min="1" 
                           max="180" 
                           value={timerDuration} 
                           onChange={(e) => setTimerDuration(Number(e.target.value))} 
                           className={styles.numberInput} 
                           style={{ width: '80px', padding: '6px 10px' }} 
                         />
                         <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Minutes</span>
                     </div>
                 )}
              </div>
              <button 
                className={timerEnabled ? styles.toggleActive : styles.toggleInactive} 
                onClick={() => setTimerEnabled(!timerEnabled)}
              >
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