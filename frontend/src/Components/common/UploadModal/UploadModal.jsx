import React, { useState, useRef } from 'react';
import axios from 'axios';
import { UploadCloud, FileText, CheckCircle, X, Loader2, AlertCircle } from 'lucide-react';
import styles from './UploadModal.module.css';

const UploadModal = ({ isOpen, onClose, onComplete }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState('upload'); // upload, processing, done, error
  const [errorMessage, setErrorMessage] = useState("");
  const [resultData, setResultData] = useState(null);
  
  // Ref to trigger hidden file input
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // 1. Trigger the hidden file input when user clicks the box
  const handleDropZoneClick = () => {
    fileInputRef.current.click();
  };

  // 2. Handle File Selection & Auto-Start Upload
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate PDF
    if (file.type !== "application/pdf") {
      setErrorMessage("Please upload a valid PDF file.");
      setStep('error');
      return;
    }

    startUpload(file);
  };

  // 3. The Real Upload Logic (SECURED)
  const startUpload = async (file) => {
    setIsUploading(true);
    setStep('upload');
    setErrorMessage("");
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    // [NEW] Get the token we saved during Login
    const token = localStorage.getItem('token');

    // If no token, stop immediately
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
            'Authorization': `Bearer ${token}` // <--- [CRITICAL] Send the Token!
        },
        
        // Tracking Upload Progress (Green Bar)
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          
          // We cap UI progress at 90% until the AI actually finishes
          if (percentCompleted < 90) {
            setProgress(percentCompleted);
          } else {
            // If upload is done but we are waiting for AI response, move to 'processing'
            setStep('processing');
            setProgress(100);
          }
        }
      });

      // ✅ Success!
      setResultData(response.data.data);
      setStep('done');

    } catch (error) {
      console.error("Upload Error:", error);
      
      // Handle "Unauthorized" specifically (Token expired)
      if (error.response?.status === 401) {
          setErrorMessage("Session expired. Please login again.");
      } else {
          setErrorMessage(error.response?.data?.message || "Connection failed. Is Backend running?");
      }
      setStep('error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setStep('upload');
    setProgress(0);
    setErrorMessage("");
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
            
            {/* Hidden Input */}
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".pdf" 
                style={{ display: 'none' }} 
            />

            {/* Clickable Drop Zone */}
            <div className={styles.dropZone} onClick={handleDropZoneClick} style={{ cursor: 'pointer' }}>
              <FileText size={24} className={styles.fileIcon} />
              <span>Click to Select PDF</span>
            </div>

            {/* Progress Bar */}
            {isUploading && (
              <div className={styles.progressContainer}>
                <div className={styles.progressBar} style={{ width: `${progress}%` }}></div>
                <span style={{fontSize: '12px', color: '#666'}}>Uploading... {progress}%</span>
              </div>
            )}

            {/* Error Message */}
            {step === 'error' && (
                <div style={{ marginTop: '15px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <AlertCircle size={16} />
                    {errorMessage}
                </div>
            )}
          </div>
        )}

        {/* === STEP 2: AI PROCESSING === */}
        {step === 'processing' && (
          <div className={styles.processingState}>
            <Loader2 size={48} className={styles.spinner} />
            <h3>InsightED AI is working...</h3>
            <ul style={{ textAlign: 'left', marginTop: '15px', color: '#555' }}>
              <li>📥 PDF Uploaded Successfully</li>
              <li>🧠 Gemini 2.0 Analyzing Topics...</li>
              <li>📝 Extracting Units & Chapters...</li>
            </ul>
          </div>
        )}

        {/* === STEP 3: SUCCESS / DONE === */}
        {step === 'done' && resultData && (
          <div className={styles.doneState}>
            <CheckCircle size={48} className={styles.successIcon} />
            <h3>Roadmap Generated!</h3>
            <p>
                Successfully extracted <strong>{resultData.courseTitle}</strong> with 
                <strong> {resultData.units.length} Units</strong>.
            </p>
            <button 
                className={styles.primaryBtn} 
                onClick={() => onComplete(resultData)}
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