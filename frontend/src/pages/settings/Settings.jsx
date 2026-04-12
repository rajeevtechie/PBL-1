import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { User, Bell, Lock, Save, LogOut, Camera, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import styles from './Settings.module.css';

const Settings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile'); 
  
  // --- PROFILE STATE ---
  const [profileData, setProfileData] = useState({
    fullName: '',
    university: '',
    major: '',
    bio: '',
    avatarTrigger: Date.now() 
  });
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const fileInputRef = useRef(null);

  // --- PREFERENCES STATE ---
  const [preferences, setPreferences] = useState({
    darkMode: true,
    emailNotifs: true,
    studyReminders: true
  });

  // --- GUARDIAN CC STATE ---
  const [parentEmail, setParentEmail] = useState(localStorage.getItem('parentEmail') || '');
  const [isParentSaving, setIsParentSaving] = useState(false);

  // --- SECURITY STATE ---
  const [passwords, setPasswords] = useState({ current: '', new: '' });
  const [isSecSaving, setIsSecSaving] = useState(false);
  const [secMessage, setSecMessage] = useState({ type: '', text: '' });

  // --- FETCH DATA ON MOUNT ---
  useEffect(() => {
    setProfileData(prev => ({
      ...prev,
      fullName: localStorage.getItem('userName') || 'Rajeev Gupta',
      university: localStorage.getItem('userUniversity') || 'SIT Pune',
      major: localStorage.getItem('userMajor') || 'Computer Science',
      bio: localStorage.getItem('userBio') || 'Full Stack Developer | AI Enthusiast'
    }));

    const savedPrefs = JSON.parse(localStorage.getItem('appPreferences'));
    if (savedPrefs) setPreferences(savedPrefs);
  }, []);

  // --- 1. PROFILE HANDLERS ---
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setIsProfileSaving(true);
    setProfileSuccess(false);

    setTimeout(() => {
      localStorage.setItem('userName', profileData.fullName);
      localStorage.setItem('userUniversity', profileData.university);
      localStorage.setItem('userMajor', profileData.major);
      localStorage.setItem('userBio', profileData.bio);
      
      window.dispatchEvent(new Event('profileUpdated'));

      setIsProfileSaving(false);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    }, 800);
  };

  const handlePhotoClick = () => {
    fileInputRef.current.click(); 
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        localStorage.setItem('userAvatar', base64String);
        window.dispatchEvent(new Event('profileUpdated'));
        setProfileData(prev => ({ ...prev, avatarTrigger: Date.now() })); 
      };
      reader.readAsDataURL(file);
    }
  };

  // --- 2. PREFERENCES HANDLERS ---
  const handleTogglePreference = async (key) => {
    setPreferences(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('appPreferences', JSON.stringify(next));
      
      if (key === 'darkMode') {
        if (next.darkMode) document.body.classList.remove('light-theme');
        else document.body.classList.add('light-theme');
      }
      return next;
    });

    if (key === 'emailNotifs') {
      try {
        const newEmailState = !preferences.emailNotifs; 
        
        await axios.put('http://localhost:5000/api/users/preferences', 
          { emailNotifs: newEmailState },
          { withCredentials: true } // 🛡️ Using secure cookie
        );
      } catch (error) {
        console.error("Failed to save email preference to database:", error);
      }
    }
  };

  // --- GUARDIAN CC HANDLER ---
  const handleSaveParentEmail = async () => {
    setIsParentSaving(true);
    try {
      await axios.put('http://localhost:5000/api/users/parent-email', 
        { parentEmail },
        { withCredentials: true } // 🛡️ Using secure cookie
      );
      localStorage.setItem('parentEmail', parentEmail);
      alert("Guardian email saved successfully!"); 
    } catch (error) {
      console.error("Failed to save guardian email:", error);
    } finally {
      setIsParentSaving(false);
    }
  };

  // --- 3. SECURITY HANDLERS ---
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswords(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!passwords.current || !passwords.new) {
      setSecMessage({ type: 'error', text: 'Please fill out both fields.' });
      return;
    }
    if (passwords.new.length < 8) {
      setSecMessage({ type: 'error', text: 'New password must be at least 8 characters.' });
      return;
    }

    setIsSecSaving(true);
    setSecMessage({ type: '', text: '' });

    try {
      // 🛡️ THE REAL API CALL
      const response = await axios.put('http://localhost:5000/api/users/update-password', {
        currentPassword: passwords.current,
        newPassword: passwords.new
      }, { withCredentials: true });

      setSecMessage({ type: 'success', text: response.data.message || 'Password securely updated!' });
      setPasswords({ current: '', new: '' });
    } catch (error) {
      setSecMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update password.' });
    } finally {
      setIsSecSaving(false);
      setTimeout(() => setSecMessage({ type: '', text: '' }), 4000);
    }
  };

  // --- 4. SMART DELETE HANDLING ---
  const handleDeleteAccount = async () => {
    const isConfirmed = window.confirm("Are you sure you want to deactivate your account? You will lose access to your personal data, though shared cached materials may remain active for the community.");
    
    if (isConfirmed) {
      try {
        // Tell the backend to flip the is_active switch to false
        await axios.delete('http://localhost:5000/api/users/delete-account', { withCredentials: true });
        
        // 🛡️ THE SMART CLEAR: Wipes user data but protects Tour Guides and Preferences!
        Object.keys(localStorage).forEach(key => {
            if (!key.startsWith('hasSeen') && key !== 'appPreferences' && key !== 'darkMode') {
                localStorage.removeItem(key);
            }
        });
        
        navigate('/login');   
      } catch (error) {
        console.error("Failed to deactivate account:", error);
        alert("An error occurred while trying to deactivate your account. Please try again.");
      }
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className={styles.settingsContainer}>
      
      <header className={`${styles.header} ${styles.animateFadeInUp}`}>
        <h1>Settings</h1>
        <p>Manage your account settings and preferences.</p>
      </header>

      <div className={styles.contentGrid}>
        
        {/* SIDEBAR NAVIGATION */}
        <aside className={`${styles.settingsNav} ${styles.animateFadeInUp}`} style={{ animationDelay: '0.1s' }}>
          <button 
            className={`${styles.navBtn} ${activeTab === 'profile' ? styles.active : ''} ${styles.btnPulseHover}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={18} /> Profile
          </button>
          <button 
            className={`${styles.navBtn} ${activeTab === 'preferences' ? styles.active : ''} ${styles.btnPulseHover}`}
            onClick={() => setActiveTab('preferences')}
          >
            <Bell size={18} /> Preferences
          </button>
          <button 
            className={`${styles.navBtn} ${activeTab === 'account' ? styles.active : ''} ${styles.btnPulseHover}`}
            onClick={() => setActiveTab('account')}
          >
            <Lock size={18} /> Security
          </button>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main key={activeTab} className={`${styles.settingsPanel} ${styles.animateFadeInUp}`} style={{ animationDelay: '0.2s' }}>
          
          {/* --- PROFILE TAB --- */}
          {activeTab === 'profile' && (
            <div className={styles.tabContent}>
              <h2>Public Profile</h2>
              
              <div className={styles.avatarSection}>
                {localStorage.getItem('userAvatar') ? (
                  <img 
                    src={localStorage.getItem('userAvatar')} 
                    alt="Profile" 
                    className={styles.avatarPlaceholder} 
                    style={{ objectFit: 'cover', padding: 0, border: 'none' }} 
                  />
                ) : (
                  <div className={styles.avatarPlaceholder}>{getInitials(profileData.fullName)}</div>
                )}
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  accept="image/png, image/jpeg" 
                  onChange={handlePhotoChange} 
                />
                <button type="button" onClick={handlePhotoClick} className={`${styles.changePhotoBtn} ${styles.btnPulseHover}`}>
                  <Camera size={16} /> Change Photo
                </button>
              </div>

              <form className={styles.form} onSubmit={handleSaveProfile}>
                <div className={styles.inputGroup}>
                  <label>Full Name</label>
                  <input type="text" name="fullName" value={profileData.fullName} onChange={handleProfileChange} required />
                </div>
                
                <div className={styles.row}>
                  <div className={styles.inputGroup}>
                    <label>University</label>
                    <input type="text" name="university" value={profileData.university} onChange={handleProfileChange} />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Stream/Major</label>
                    <input type="text" name="major" value={profileData.major} onChange={handleProfileChange} />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label>Bio</label>
                  <textarea name="bio" value={profileData.bio} onChange={handleProfileChange} rows="3"></textarea>
                </div>

                <div className={styles.actionRow}>
                  <button type="submit" className={`${styles.saveBtn} ${styles.btnPulseHover}`} disabled={isProfileSaving}>
                    {isProfileSaving ? <Loader2 size={18} className={styles.spin} /> : <Save size={18} />}
                    {isProfileSaving ? 'Saving...' : 'Save Changes'}
                  </button>

                  {profileSuccess && (
                    <div className={`${styles.successMsg} ${styles.animateFadeInUp}`}>
                      <CheckCircle size={16} /> Profile updated successfully!
                    </div>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* --- PREFERENCES TAB --- */}
          {activeTab === 'preferences' && (
            <div className={styles.tabContent}>
              <h2>App Preferences</h2>
              
              <div className={styles.settingItem}>
                <div>
                  <h3>Dark Mode</h3>
                  <p>Adjust the appearance of the application.</p>
                </div>
                <label className={styles.switch}>
                  <input type="checkbox" checked={preferences.darkMode} onChange={() => handleTogglePreference('darkMode')} />
                  <span className={styles.slider}></span>
                </label>
              </div>

              <div className={styles.settingItem}>
                <div>
                  <h3>Email Notifications</h3>
                  <p>Receive weekly study summaries.</p>
                </div>
                <label className={styles.switch}>
                  <input type="checkbox" checked={preferences.emailNotifs} onChange={() => handleTogglePreference('emailNotifs')} />
                  <span className={styles.slider}></span>
                </label>
              </div>

              {/* GUARDIAN CC INPUT (Shows only when Email Notifications are ON) */}
              {preferences.emailNotifs && (
                <div className={styles.settingItem} style={{ borderTop: 'none', paddingTop: '0', paddingLeft: '20px', display: 'block' }}>
                  <p style={{ marginBottom: '8px', fontSize: '13px', color: 'var(--text-dim)' }}>
                    <strong>Guardian CC (Optional):</strong> Send a copy of your weekly report to a parent or mentor.
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input 
                      type="email" 
                      placeholder="parent@example.com" 
                      value={parentEmail}
                      onChange={(e) => setParentEmail(e.target.value)}
                      style={{ 
                        flex: 1, 
                        padding: '8px 12px', 
                        borderRadius: '6px', 
                        border: '1px solid var(--border-color)', 
                        background: 'var(--bg-panel)',
                        color: 'var(--text-main)'
                      }}
                    />
                    <button 
                      onClick={handleSaveParentEmail} 
                      disabled={isParentSaving}
                      className={`${styles.saveBtn} ${styles.btnPulseHover}`}
                      style={{ padding: '8px 16px', margin: 0, height: 'auto' }}
                    >
                      {isParentSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )}

              <div className={styles.settingItem}>
                <div>
                  <h3>Study Reminders</h3>
                  <p>Push notifications for scheduled sessions.</p>
                </div>
                <label className={styles.switch}>
                  <input type="checkbox" checked={preferences.studyReminders} onChange={() => handleTogglePreference('studyReminders')} />
                  <span className={styles.slider}></span>
                </label>
              </div>
            </div>
          )}

          {/* --- SECURITY TAB --- */}
          {activeTab === 'account' && (
            <div className={styles.tabContent}>
              <h2>Security</h2>
              
              <form className={styles.form} onSubmit={handleUpdatePassword}>
                <div className={styles.inputGroup}>
                  <label>Current Password</label>
                  <input type="password" name="current" value={passwords.current} onChange={handlePasswordChange} placeholder="Enter current password" />
                </div>
                <div className={styles.inputGroup}>
                  <label>New Password</label>
                  <input type="password" name="new" value={passwords.new} onChange={handlePasswordChange} placeholder="Minimum 6 characters" />
                </div>
                
                <div className={styles.actionRow} style={{ marginTop: '0' }}>
                  <button type="submit" className={`${styles.saveBtn} ${styles.btnPulseHover}`} disabled={isSecSaving}>
                    {isSecSaving ? <Loader2 size={18} className={styles.spin} /> : <Lock size={18} />}
                    {isSecSaving ? 'Updating...' : 'Update Password'}
                  </button>

                  {secMessage.text && (
                    <div className={`${secMessage.type === 'error' ? styles.errorMsg : styles.successMsg} ${styles.animateFadeInUp}`}>
                      {secMessage.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />} 
                      {secMessage.text}
                    </div>
                  )}
                </div>
              </form>

              <div className={styles.dangerZone}>
                <h3>Danger Zone</h3>
                <p>Once you deactivate your account, your personal data becomes inaccessible, but cached materials will remain.</p>
                <button type="button" onClick={handleDeleteAccount} className={`${styles.deleteBtn} ${styles.btnPulseHover}`}>
                  <LogOut size={16} /> Deactivate Account
                </button>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default Settings;