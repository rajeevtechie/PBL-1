import React, { useState, useRef } from 'react';
import axios from 'axios';
import { UploadCloud, FileText, CheckCircle, X, Loader2, AlertCircle, AlertTriangle } from 'lucide-react';
import styles from './UploadModal.module.css';

const UploadModal = ({ isOpen, onClose, onComplete }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Added 'conflict' to the available steps
  const [step, setStep] = useState('upload'); // upload, processing, done, error, conflict
  
  const [errorMessage, setErrorMessage] = useState("");
  const [resultData, setResultData] = useState(null);
  
  // --- NEW: State for Duplicate Handling ---
  const [conflictData, setConflictData] = useState(null);
  const [syllabusId, setSyllabusId] = useState(null);
  
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleDropZoneClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setErrorMessage("Please upload a valid PDF file.");
      setStep('error');
      return;
    }

    startUpload(file);
  };

  const startUpload = async (file) => {
    setIsUploading(true);
    setStep('upload');
    setErrorMessage("");
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');

    if (!token) {
        setErrorMessage("You must be logged in to upload.");
        setStep('error');
        setIsUploading(false);
        return;
    }

    try {
      const response = await axios.post('http://localhost:5000/api/syllabus/upload', formData, {
        headers: { 
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}` 
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          
          if (percentCompleted < 90) {
            setProgress(percentCompleted);
          } else {
            setStep('processing');
            setProgress(100);
          }
        }
      });

      // ✅ Success (No Duplicates)
      setResultData(response.data.data);
      setSyllabusId(response.data.syllabusId);
      setStep('done');

    } catch (error) {
      console.error("Upload Error:", error);
      
      // --- DUPLICATE DETECTED ---
      if (error.response && error.response.status === 409) {
        setConflictData(error.response.data);
        setStep('conflict');
      } 
      // Handle standard errors
      else if (error.response?.status === 401) {
          setErrorMessage("Session expired. Please login again.");
          setStep('error');
      } else {
          setErrorMessage(error.response?.data?.message || "Connection failed. Is Backend running?");
          setStep('error');
      }
    } finally {
      setIsUploading(false);
    }
  };

  // --- NEW: Handle the Overwrite Confirmation ---
  const handleConfirmOverwrite = async () => {
    setStep('processing'); // Go back to loading screen while saving
    setErrorMessage('');
    
    try {
      const token = localStorage.getItem('token');
      
      // Send the AI parsed data back to overwrite the old record
      const response = await axios.post('http://localhost:5000/api/syllabus/confirm-upload', {
        parsedData: conflictData.parsedData,
        existingId: conflictData.existingId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setResultData(response.data.data);
      setSyllabusId(response.data.syllabusId);
      setStep('done');

    } catch (err) {
      setErrorMessage('Failed to overwrite the syllabus. Please try again.');
      setStep('error');
    }
  };

  const handleClose = () => {
    setStep('upload');
    setProgress(0);
    setErrorMessage("");
    setConflictData(null);
    setResultData(null);
    setSyllabusId(null);
    onClose();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={handleClose}><X size={20} /></button>
        
        {/* === STEP 1: UPLOAD & ERROR === */}
        {(step === 'upload' || step === 'error') && (
          <div className={styles.uploadState}>
            <div className={styles.iconCircle}>
              <UploadCloud size={32} />
            </div>
            <h2>Upload Syllabus</h2>
            <p>Upload your university PDF to generate a dual-track roadmap.</p>
            
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".pdf" 
                style={{ display: 'none' }} 
            />

            <div className={styles.dropZone} onClick={handleDropZoneClick} style={{ cursor: 'pointer' }}>
              <FileText size={24} className={styles.fileIcon} />
              <span>Click to Select PDF</span>
            </div>

            {isUploading && (
              <div className={styles.progressContainer}>
                <div className={styles.progressBar} style={{ width: `${progress}%` }}></div>
                <span style={{fontSize: '12px', color: '#666'}}>Uploading... {progress}%</span>
              </div>
            )}

            {step === 'error' && (
                <div style={{ marginTop: '15px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', justifyContent: 'center' }}>
                    <AlertCircle size={16} />
                    {errorMessage}
                </div>
            )}
          </div>
        )}

        {/* === STEP 2: AI PROCESSING === */}
        {step === 'processing' && (
          <div className={styles.processingState} style={{ textAlign: 'center', padding: '20px 0' }}>
            <Loader2 size={48} className={styles.spinner} style={{ animation: 'spin 2s linear infinite', color: '#3b82f6', margin: '0 auto 20px auto', display: 'block' }} />
            <h3 style={{ color: '#f8fafc', marginBottom: '15px' }}>InsightED AI is working...</h3>
            <ul style={{ textAlign: 'left', color: '#94a3b8', listStyle: 'none', padding: 0, margin: '0 auto', maxWidth: '250px' }}>
              <li style={{ marginBottom: '8px' }}>📥 PDF Uploaded Successfully</li>
              <li style={{ marginBottom: '8px' }}>🧠 Gemini Analyzing Topics...</li>
              <li>📝 Extracting Units & Chapters...</li>
            </ul>
          </div>
        )}

        {/* === STEP 3: DUPLICATE CONFLICT WARNING === */}
        {step === 'conflict' && conflictData && (
          <div style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '12px', padding: '25px', textAlign: 'center' }}>
            <AlertTriangle size={48} color="#eab308" style={{ marginBottom: '15px' }} />
            <h3 style={{ color: '#eab308', margin: '0 0 10px 0', fontSize: '1.3rem' }}>Syllabus Already Exists</h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.95rem', margin: '0 0 25px 0', lineHeight: '1.5' }}>
              You already have a roadmap saved for <strong>"{conflictData.parsedData.courseTitle}"</strong>. 
              Do you want to overwrite your old data with this new file?
            </p>
            
            <div style={{ display: 'flex', gap: '15px' }}>
              <button 
                onClick={() => {
                    setConflictData(null);
                    setStep('upload');
                }} 
                style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #475569', color: '#f8fafc', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmOverwrite} 
                style={{ flex: 1, padding: '12px', background: '#eab308', border: 'none', color: '#1e293b', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}
              >
                Yes, Overwrite
              </button>
            </div>
          </div>
        )}

        {/* === STEP 4: SUCCESS / DONE === */}
        {step === 'done' && resultData && (
          <div className={styles.doneState} style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle size={56} color="#10b981" style={{ margin: '0 auto 20px auto', display: 'block' }} />
            <h3 style={{ color: '#f8fafc', fontSize: '1.5rem', marginBottom: '10px' }}>Roadmap Generated!</h3>
            <p style={{ color: '#94a3b8', marginBottom: '25px', lineHeight: '1.5' }}>
                Successfully extracted <strong>{resultData.courseTitle}</strong> with 
                <strong> {resultData.units.length} Units</strong>.
            </p>
            <button 
                className={styles.primaryBtn} 
                // Passes the new syllabusId to the Dashboard so it knows what to load
                onClick={() => onComplete(syllabusId)}
                style={{ width: '100%', padding: '14px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              View Roadmap
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default UploadModal;