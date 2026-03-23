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
  
  const [viewingFile, setViewingFile] = useState(null);
  const [activeGeneratedTab, setActiveGeneratedTab] = useState(null);

  useEffect(() => {
    fetchLibraryItems();
  }, []);

  const fetchLibraryItems = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/library/items', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
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
      setError("Failed to load library items. Please ensure backend is running.");
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
      fetchLibraryItems(); 
      
      if (viewingFile && viewingFile.id === id) {
          closeSplitView();
      }
    } catch (err) {
      alert("Failed to delete item.");
    }
  };

  const openSplitView = async (uploadedFile, generatedItems) => {
    const safeGeneratedItems = generatedItems || [];
    
    setViewingFile({ 
        ...uploadedFile, 
        associatedGenerated: safeGeneratedItems, 
        objectUrl: null, 
        isFetchingPdf: true 
    });
    
    setActiveGeneratedTab(safeGeneratedItems.length > 0 ? safeGeneratedItems[0] : null);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5000/api/library/file/${uploadedFile.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob' 
      });
      
      const pdfBlob = new Blob([res.data], { type: 'application/pdf' });
      const objectUrl = URL.createObjectURL(pdfBlob);
      
      setViewingFile(prev => ({ ...prev, objectUrl, isFetchingPdf: false }));
    } catch (err) {
      console.error("Failed to load PDF", err);
      setViewingFile(prev => ({ ...prev, isFetchingPdf: false, fetchError: true }));
    }
  };

  const closeSplitView = () => {
    if (viewingFile?.objectUrl) {
      URL.revokeObjectURL(viewingFile.objectUrl);
    }
    setViewingFile(null);
  };

  // ✅ THE FIX: Smart JSON Renderer for Quizzes and Notes
  const renderGeneratedContent = (rawContent) => {
      if (!rawContent) return <p>No content available.</p>;

      let content = rawContent;
      
      // 1. Safety check: Parse if it's a stringified JSON
      if (typeof rawContent === 'string') {
          try {
              content = JSON.parse(rawContent);
          } catch (e) {
              // If it fails parsing, it's just normal text (like a summary note)
              return <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#cbd5e1' }}>{rawContent}</p>;
          }
      }

      // 2. Extract the actual Array of questions/notes
      let itemsToRender = [];
      if (Array.isArray(content)) {
          itemsToRender = content;
      } else if (content.items && Array.isArray(content.items)) {
          itemsToRender = content.items; // Catches your specific AI output!
      } else if (content.questions && Array.isArray(content.questions)) {
          itemsToRender = content.questions;
      }

      // 3. Render the beautifully formatted Quiz/Notes
      if (itemsToRender.length > 0) {
          return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {itemsToRender.map((item, idx) => (
                      <div key={idx} style={{ 
                          background: 'rgba(30, 41, 59, 0.7)', 
                          padding: '24px', 
                          borderRadius: '12px', 
                          border: '1px solid rgba(255,255,255,0.05)',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                      }}>
                          <h4 style={{ margin: '0 0 16px 0', color: '#f8fafc', fontSize: '1.1rem', lineHeight: '1.5' }}>
                              <span style={{color: '#3b82f6', marginRight: '8px'}}>Q{idx + 1}.</span> 
                              {item.question || item.topic || 'Question'}
                          </h4>
                          
                          {/* MCQ Options Renderer */}
                          {item.options && Array.isArray(item.options) && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                                  {item.options.map((opt, i) => {
                                      const isCorrect = (item.answer || item.correctAnswer) === opt;
                                      return (
                                          <div key={i} style={{ 
                                              padding: '12px 16px', 
                                              background: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(15, 23, 42, 0.6)',
                                              border: `1px solid ${isCorrect ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.05)'}`,
                                              borderRadius: '8px',
                                              color: isCorrect ? '#10b981' : '#cbd5e1',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '12px',
                                              fontSize: '0.95rem'
                                          }}>
                                              <div style={{ 
                                                  width: '24px', height: '24px', 
                                                  borderRadius: '50%', 
                                                  background: isCorrect ? '#10b981' : 'transparent',
                                                  border: `1px solid ${isCorrect ? '#10b981' : '#64748b'}`, 
                                                  color: isCorrect ? '#fff' : '#cbd5e1',
                                                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                                  fontSize: '0.75rem', fontWeight: 'bold' 
                                              }}>
                                                {String.fromCharCode(65 + i)}
                                              </div>
                                              {opt}
                                          </div>
                                      )
                                  })}
                              </div>
                          )}
                          
                          {/* Explanation & Answer Renderer */}
                          <div style={{ 
                              background: 'rgba(16, 185, 129, 0.05)', 
                              padding: '16px', 
                              borderRadius: '8px', 
                              borderLeft: '4px solid #10b981',
                              marginTop: '12px'
                          }}>
                              {(item.answer || item.correctAnswer) && !item.options && (
                                  <div style={{ color: '#10b981', fontSize: '1rem', fontWeight: '600', marginBottom: item.explanation ? '8px' : '0' }}>
                                      Answer: {item.answer || item.correctAnswer}
                                  </div>
                              )}
                              {item.explanation && (
                                  <div style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6' }}>
                                      <strong style={{ color: '#cbd5e1' }}>Explanation:</strong> {item.explanation}
                                  </div>
                              )}
                          </div>
                      </div>
                  ))}
              </div>
          );
      }

      // 4. Ultimate Fallback (If AI output is completely unrecognizable)
      return (
          <pre style={{ whiteSpace: 'pre-wrap', color: '#cbd5e1', fontSize: '0.9rem', background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '8px', overflowX: 'auto' }}>
              {JSON.stringify(content, null, 2)}
          </pre>
      );
  };

  if (loading) return <div className={styles.centerMsg}><Loader2 className={styles.spin} size={48}/></div>;

  return (
    <div className={styles.libraryContainer}>
      <header className={styles.header}>
        <h1>Your Library</h1>
        <p>Manage your uploaded materials and generated practice sets.</p>
      </header>

      {error && <div className={styles.errorBanner}><AlertTriangle size={18}/> {error}</div>}

      <div className={styles.subjectList}>
        {Object.keys(libraryData).length === 0 && !error ? (
           <p style={{color: '#94a3b8', marginTop: '20px'}}>Your library is empty. Upload materials in the Practice Lab!</p>
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
            <button className={styles.closeBtn} onClick={closeSplitView}>
              <X size={24} />
            </button>
          </div>

          <div className={styles.splitViewBody}>
            
            {/* LEFT PANE */}
            <div className={styles.paneLeft}>
              {viewingFile.isFetchingPdf ? (
                <div className={styles.placeholderPane}>
                  <Loader2 size={48} className={styles.spin} color="#3b82f6" />
                  <p>Decrypting and loading PDF...</p>
                </div>
              ) : viewingFile.fetchError ? (
                <div className={styles.placeholderPane}>
                  <AlertTriangle size={48} color="#ef4444" />
                  <p>Failed to load the document.</p>
                </div>
              ) : viewingFile.objectUrl ? (
                <iframe 
                  src={viewingFile.objectUrl} 
                  title="PDF Viewer" 
                  className={styles.pdfFrame}
                />
              ) : (
                <div className={styles.placeholderPane}>
                   <FileText size={48} color="#64748b" />
                   <p>No document available.</p>
                </div>
              )}
            </div>

            {/* RIGHT PANE: Clean UI Renderer */}
            <div className={styles.paneRight}>
              {!viewingFile.associatedGenerated || viewingFile.associatedGenerated.length === 0 ? (
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
                    
                    {/* 🔥 THE MAGIC HAPPENS HERE 🔥 */}
                    <div className={styles.contentText}>
                       {renderGeneratedContent(activeGeneratedTab?.content)}
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