import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Folder, FileText, CheckSquare, Trash2, Maximize2, 
  X, Loader2, AlertTriangle, BookOpen, FileQuestion 
} from 'lucide-react';
import styles from './Library.module.css';

const Library = () => {
  const [libraryData, setLibraryData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // State for the Split-Screen Viewer
  const [viewingFile, setViewingFile] = useState(null);
  const [activeGeneratedTab, setActiveGeneratedTab] = useState(null);

  useEffect(() => {
    fetchLibraryItems();
  }, []);

  const fetchLibraryItems = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // Replace with your actual endpoint if different
      const res = await axios.get('http://localhost:5000/api/library/items', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Group items by Subject/Category
      const grouped = res.data.reduce((acc, item) => {
        const cat = item.category || 'Uncategorized';
        if (!acc[cat]) acc[cat] = { uploaded: [], generated: [] };
        
        if (item.type === 'pdf' || item.type === 'uploaded' || item.type === 'file') {
            acc[cat].uploaded.push(item);
        } else {
            acc[cat].generated.push(item);
        }
        return acc;
      }, {});

      setLibraryData(grouped);
    } catch (err) {
      console.error(err);
      // For development/UI testing without a backend, we inject mock data matching your image
      setLibraryData({
        "Database Management System": {
          uploaded: [
            { id: 1, title: "dbms_notes.pdf", type: "file", created_at: "3/22/2026", fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" }
          ],
          generated: [
            { id: 101, title: "DBMS Basics MCQ", type: "quiz", created_at: "3/23/2026", content: "Question 1: What is a tuple?..." },
            { id: 102, title: "SQL Queries Flashcards", type: "notes", created_at: "3/24/2026", content: "Notes on SELECT, UPDATE, DELETE..." }
          ]
        }
      });
      setError("Using offline mock data. Ensure backend is running to fetch live files.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, type) => {
    if(!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/library/item/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchLibraryItems(); // Refresh
    } catch {
      alert("Failed to delete item.");
    }
  };

  const openSplitView = (uploadedFile, generatedItems) => {
    setViewingFile({ ...uploadedFile, associatedGenerated: generatedItems });
    if (generatedItems && generatedItems.length > 0) {
      setActiveGeneratedTab(generatedItems[0]);
    } else {
      setActiveGeneratedTab(null);
    }
  };

  if (loading) return <div className={styles.centerMsg}><Loader2 className={styles.spin} size={48}/></div>;

  return (
    <div className={styles.libraryContainer}>
      <header className={styles.header}>
        <h1>Your Library</h1>
        <p>Manage your uploaded materials and generated practice sets.</p>
      </header>

      {error && <div className={styles.errorBanner}><AlertTriangle size={18}/> {error}</div>}

      {/* --- LIBRARY LIST VIEW --- */}
      <div className={styles.subjectList}>
        {Object.keys(libraryData).length === 0 && !error ? (
           <p className={styles.emptyMsg}>Your library is empty. Upload materials in the Practice Lab!</p>
        ) : (
          Object.keys(libraryData).map((subject, index) => {
            const { uploaded, generated } = libraryData[subject];
            return (
              <div key={index} className={`${styles.subjectCard} ${styles.animateFadeInUp}`}>
                <div className={styles.subjectHeader}>
                  <Folder size={24} color="#3b82f6" />
                  <h2>{subject}</h2>
                </div>

                <div className={styles.fileGroups}>
                  {uploaded.map((file) => (
                    <div key={file.id} className={styles.masterFileRow}>
                      
                      {/* Left: The Uploaded File */}
                      <div className={styles.uploadedFileCard}>
                        <div className={styles.fileInfo}>
                          <FileText size={20} color="#10b981" />
                          <div>
                            <h4>{file.title}</h4>
                            <span className={styles.fileDate}>FILE • {file.created_at}</span>
                          </div>
                        </div>
                        <div className={styles.actionBtns}>
                          <button className={styles.viewBtn} onClick={() => openSplitView(file, generated)}>
                            <Maximize2 size={16} /> Split View
                          </button>
                          <button className={styles.deleteBtn} onClick={() => handleDelete(file.id, 'uploaded')}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Right: Associated Generated Material (Side by Side) */}
                      <div className={styles.generatedMaterialsContainer}>
                        <h5 className={styles.generatedLabel}>ASSOCIATED GENERATED MATERIAL</h5>
                        <div className={styles.generatedScrollList}>
                          {generated.length === 0 ? (
                            <span className={styles.noGeneratedMsg}>No generated practice sets yet.</span>
                          ) : (
                            generated.map(genItem => (
                              <div key={genItem.id} className={styles.generatedCard}>
                                <div className={styles.genIconWrapper}>
                                  {genItem.type === 'quiz' ? <CheckSquare size={16} color="#f59e0b" /> : <BookOpen size={16} color="#8b5cf6" />}
                                </div>
                                <div className={styles.genCardContent}>
                                  <span className={styles.genTitle}>{genItem.title}</span>
                                  <span className={styles.genType}>{genItem.type.toUpperCase()}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* --- SPLIT SCREEN VIEWER OVERLAY --- */}
      {viewingFile && (
        <div className={styles.splitViewOverlay}>
          <div className={styles.splitViewHeader}>
            <div className={styles.headerLeft}>
              <FileText size={20} color="#10b981" />
              <h3>{viewingFile.title}</h3>
            </div>
            <button className={styles.closeBtn} onClick={() => setViewingFile(null)}>
              <X size={24} />
            </button>
          </div>

          <div className={styles.splitViewBody}>
            
            {/* LEFT PANE: Uploaded PDF/Text */}
            <div className={styles.paneLeft}>
              {viewingFile.fileUrl ? (
                <iframe 
                  src={viewingFile.fileUrl} 
                  title="PDF Viewer" 
                  className={styles.pdfFrame}
                />
              ) : (
                <div className={styles.placeholderPane}>
                  <FileText size={48} color="#64748b" />
                  <p>PDF Viewer is ready. Wire up the actual fileUrl from your database.</p>
                </div>
              )}
            </div>

            {/* RIGHT PANE: Generated Materials */}
            <div className={styles.paneRight}>
              {viewingFile.associatedGenerated.length === 0 ? (
                <div className={styles.placeholderPane}>
                  <FileQuestion size={48} color="#64748b" />
                  <p>No generated quizzes or notes to show for this file.</p>
                </div>
              ) : (
                <div className={styles.generatedContentView}>
                  <div className={styles.generatedTabs}>
                    {viewingFile.associatedGenerated.map(item => (
                      <button 
                        key={item.id} 
                        className={`${styles.tabBtn} ${activeGeneratedTab?.id === item.id ? styles.activeTab : ''}`}
                        onClick={() => setActiveGeneratedTab(item)}
                      >
                        {item.type === 'quiz' ? <CheckSquare size={14}/> : <BookOpen size={14}/>}
                        {item.title}
                      </button>
                    ))}
                  </div>
                  
                  <div className={styles.generatedContentArea}>
                    <h3 className={styles.contentTitle}>{activeGeneratedTab?.title}</h3>
                    <div className={styles.contentText}>
                       {/* This is where your actual quiz component or notes string would render */}
                       {activeGeneratedTab?.content || "Content is currently empty or loading..."}
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Library;