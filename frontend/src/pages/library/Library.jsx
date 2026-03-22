import React, { useEffect, useMemo, useState } from 'react';
import styles from './Library.module.css';

const Library = () => {
  const [uploadedItems, setUploadedItems] = useState([]);
  const [generatedItems, setGeneratedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState('');

  const endpoints = useMemo(() => ({
    uploaded: 'http://localhost:5000/api/library/uploaded',
    generated: 'http://localhost:5000/api/library/generated'
  }), []);

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      setError('');
      setSelected(null);
      setDeleteError('');
      setDeleteSuccess('');

      try {
        const token = localStorage.getItem('token');
        const [uploadedResponse, generatedResponse] = await Promise.all([
          fetch(endpoints.uploaded, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          }),
          fetch(endpoints.generated, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          })
        ]);

        if (!uploadedResponse.ok) {
          const data = await uploadedResponse.json();
          throw new Error(data.message || 'Failed to load uploaded items.');
        }

        if (!generatedResponse.ok) {
          const data = await generatedResponse.json();
          throw new Error(data.message || 'Failed to load generated items.');
        }

        const uploadedData = await uploadedResponse.json();
        const generatedData = await generatedResponse.json();
        setUploadedItems(Array.isArray(uploadedData) ? uploadedData : []);
        setGeneratedItems(Array.isArray(generatedData) ? generatedData : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [endpoints]);

  const formatDate = (value) => {
    if (!value) return 'Unknown';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleDateString();
  };

  const getDisplayType = (item) => {
    if (item.category === 'uploaded') {
      const url = item.file_url || '';
      const ext = url.split('.').pop()?.toUpperCase();
      return ext || 'FILE';
    }
    return item.type?.toUpperCase() || 'CONTENT';
  };

  const handleView = (item) => {
    if (item.category === 'uploaded' && item.file_url) {
      window.open(`http://localhost:5000${item.file_url}`, '_blank');
      return;
    }

    setSelected(item);
  };

  const requestDelete = (item) => {
    setDeleteTarget(item);
    setDeleteError('');
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/library/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete item.');
      }

      if (deleteTarget.category === 'uploaded') {
        setUploadedItems((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      } else {
        setGeneratedItems((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      }
      setDeleteTarget(null);
      setDeleteSuccess('Item deleted.');
    } catch (err) {
      setDeleteError(err.message);
    }
  };

  return (
    <div className={styles.libraryContainer}>
      <header className={styles.header}>
        <div>
          <span className={styles.badge}>Library</span>
          <h2>Saved Materials</h2>
          <p className={styles.subText}>Access your uploaded files and generated content anytime.</p>
        </div>
        <div className={styles.sectionHint}>Uploaded materials and generated content are listed separately.</div>
      </header>

      {loading && <div className={styles.status}>Loading library...</div>}
      {error && <div className={styles.error}>{error}</div>}
      {deleteError && <div className={styles.error}>{deleteError}</div>}
      {deleteSuccess && <div className={styles.success}>{deleteSuccess}</div>}

      {!loading && !error && (
        <div className={styles.sections}>
          <section className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <h3>Uploaded Materials</h3>
              <p>PDFs, PPTs, and other uploads.</p>
            </div>
            <div className={styles.grid}>
              {uploadedItems.length === 0 ? (
                <div className={styles.empty}>No uploaded items saved yet.</div>
              ) : (
                uploadedItems.map((item) => (
                  <div key={item.id} className={styles.card}>
                    <div>
                      <div className={styles.cardTitle}>{item.title}</div>
                      <div className={styles.cardMeta}>
                        <span className={styles.typeBadge}>{getDisplayType(item)}</span>
                        <span>{formatDate(item.created_at)}</span>
                      </div>
                    </div>
                    <div className={styles.cardActions}>
                      <button className={styles.viewButton} onClick={() => handleView(item)}>View</button>
                      <button className={styles.deleteButton} onClick={() => requestDelete(item)}>Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <h3>Generated Content</h3>
              <p>Saved practice sets and AI responses.</p>
            </div>
            <div className={styles.grid}>
              {generatedItems.length === 0 ? (
                <div className={styles.empty}>No generated items saved yet.</div>
              ) : (
                generatedItems.map((item) => (
                  <div key={item.id} className={styles.card}>
                    <div>
                      <div className={styles.cardTitle}>{item.title}</div>
                      <div className={styles.cardMeta}>
                        <span className={styles.typeBadge}>{getDisplayType(item)}</span>
                        <span>{formatDate(item.created_at)}</span>
                      </div>
                    </div>
                    <div className={styles.cardActions}>
                      <button className={styles.viewButton} onClick={() => handleView(item)}>View</button>
                      <button className={styles.deleteButton} onClick={() => requestDelete(item)}>Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      {selected && selected.content && (
        <section className={styles.detailPanel}>
          <div className={styles.detailHeader}>
            <div>
              <h3>{selected.title}</h3>
              <p>Type: {selected.type}</p>
            </div>
            <button className={styles.closeBtn} onClick={() => setSelected(null)}>Close</button>
          </div>
          <pre className={styles.detailBody}>{JSON.stringify(selected.content, null, 2)}</pre>
        </section>
      )}

      {deleteTarget && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <h3 className={styles.modalTitle}>Delete item?</h3>
            <p className={styles.modalText}>
              Are you sure you want to delete "{deleteTarget.title}"?
            </p>
            <div className={styles.modalActions}>
              <button className={styles.secondaryBtn} onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button className={styles.deleteConfirm} onClick={confirmDelete}>
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Library;
