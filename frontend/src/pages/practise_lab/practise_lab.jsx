import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, Sliders, Timer, Sparkles } from 'lucide-react';
import styles from './practise_lab.module.css';

const TOPICS_KEY = 'practiceTopics';
const SELECTED_KEY = 'practiceSelectedTopics';
const SETTINGS_KEY = 'practiceSettings';

const Assessment = () => {
  const navigate = useNavigate();
  const [uploadedFile, setUploadedFile] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [activeMode, setActiveMode] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [questionCount, setQuestionCount] = useState(15);
  const [timerEnabled, setTimerEnabled] = useState(true);

  const modes = useMemo(() => (
    ['Quiz (MCQ)', 'Short Answer', 'Long Answer', 'Case Study', 'Mock Test', 'AI Ask']
  ), []);

  const difficulties = ['Easy', 'Medium', 'Hard', 'Exam Level'];

  useEffect(() => {
    const storedSelected = JSON.parse(localStorage.getItem(SELECTED_KEY) || '[]');
    setSelectedTopics(Array.isArray(storedSelected) ? storedSelected : []);
  }, []);

  useEffect(() => {
    const settings = {
      mode: activeMode,
      difficulty,
      questionCount,
      timerEnabled
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [activeMode, difficulty, questionCount, timerEnabled]);

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

      if (uploadedFile) {
        formData.append('file', uploadedFile);
      }

      if (textInput.trim()) {
        formData.append('text', textInput.trim());
      }

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

  const hasInput = Boolean(uploadedFile) || Boolean(textInput.trim());
  const canExtract = hasInput && !isExtracting;
  const modeStep = 2;
  const settingsStep = 3;

  return (
    <div className={styles.labContainer}>
      <header className={styles.header}>
        <div>
          <span className={styles.badge}>Practice Lab</span>
          <h2>Build your practice set in minutes</h2>
          <p className={styles.subText}>Upload syllabus or notes, pick topics, then generate the format you want.</p>
        </div>
        <button className={styles.primaryAction} onClick={handleExtractTopics} disabled={!canExtract}>
          <Sparkles size={18} /> {isExtracting ? 'Extracting...' : 'Extract Topics'}
        </button>
      </header>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div className={styles.stepBadge}>Step 1</div>
          <h3>Upload Content</h3>
          <p>Drag & drop a PDF or paste your text.</p>
        </div>

        <div className={styles.uploadGrid}>
          <div className={styles.uploadPanel}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <div className={styles.uploadIcon}><UploadCloud size={28} /></div>
            <h4>Upload PDF</h4>
            <p>Drop your study Material here or browse.</p>
            <label className={styles.fileButton}>
              <input
                type="file"
                accept=".pdf"
                onChange={(event) => setUploadedFile(event.target.files?.[0] || null)}
                hidden
              />
              Choose File
            </label>
            <div className={styles.fileMeta}>
              {uploadedFile ? uploadedFile.name : 'No file selected'}
            </div>
          </div>

          <div className={styles.textPanel}>
            <div className={styles.panelHeader}>
              <FileText size={20} />
              <span>Paste Text</span>
            </div>
            <textarea
              className={styles.textArea}
              placeholder="Paste your topics or study notes here..."
              value={textInput}
              onChange={(event) => {
                setTextInput(event.target.value);
                setExtractError('');
              }}
            />
          </div>
        </div>
        {extractError && (
          <div className={styles.extractError}>{extractError}</div>
        )}
      </section>

      <div className={styles.splitGrid}>
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div className={styles.stepBadge}>Step {modeStep}</div>
            <h3>Mode Selection</h3>
            <p>Select how you want to practice.</p>
          </div>
          <div className={styles.modeGrid}>
            {modes.map((mode) => (
              <button
                key={mode}
                className={activeMode === mode ? styles.modeBtnActive : styles.modeBtn}
                onClick={() => {
                  setActiveMode(mode);
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div className={styles.stepBadge}>Step {settingsStep}</div>
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

            <div className={styles.settingRow}>
              <div>
                <span className={styles.settingLabel}>Number of Questions</span>
                <input
                  type="number"
                  min="5"
                  max="50"
                  value={questionCount}
                  onChange={(event) => {
                    setQuestionCount(Number(event.target.value));
                  }}
                  className={styles.numberInput}
                />
              </div>
            </div>

            <div className={styles.settingRow}>
              <div className={styles.timerToggle}>
                <Timer size={18} />
                <span>Timer (Mock Test)</span>
              </div>
              <button
                className={timerEnabled ? styles.toggleActive : styles.toggleInactive}
                onClick={() => setTimerEnabled(!timerEnabled)}
              >
                {timerEnabled ? 'On' : 'Off'}
              </button>
            </div>

            <button className={styles.secondaryAction}>
              <Sliders size={18} /> Save Settings
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Assessment;