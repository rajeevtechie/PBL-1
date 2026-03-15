import React, { useState } from 'react';
import { User, Bell, Lock, Moon, Save, LogOut, Camera } from 'lucide-react';
import styles from './Settings.module.css';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile'); // profile, account, preferences

  return (
    <div className={styles.settingsContainer}>
      
      {/* 1. HEADER */}
      <header className={styles.header}>
        <h1>Settings</h1>
        <p>Manage your account settings and preferences.</p>
      </header>

      <div className={styles.contentGrid}>
        
        {/* 2. SIDEBAR NAVIGATION */}
        <aside className={styles.settingsNav}>
          <button 
            className={`${styles.navBtn} ${activeTab === 'profile' ? styles.active : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={18} /> Profile
          </button>
          <button 
            className={`${styles.navBtn} ${activeTab === 'preferences' ? styles.active : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            <Bell size={18} /> Preferences
          </button>
          <button 
            className={`${styles.navBtn} ${activeTab === 'account' ? styles.active : ''}`}
            onClick={() => setActiveTab('account')}
          >
            <Lock size={18} /> Security
          </button>
        </aside>

        {/* 3. MAIN CONTENT AREA */}
        <main className={styles.settingsPanel}>
          
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className={styles.tabContent}>
              <h2>Public Profile</h2>
              
              <div className={styles.avatarSection}>
                <div className={styles.avatarPlaceholder}>RG</div>
                <button className={styles.changePhotoBtn}>
                  <Camera size={16} /> Change Photo
                </button>
              </div>

              <form className={styles.form}>
                <div className={styles.inputGroup}>
                  <label>Full Name</label>
                  <input type="text" defaultValue="Rajeev Gupta" />
                </div>
                
                <div className={styles.row}>
                  <div className={styles.inputGroup}>
                    <label>University</label>
                    <input type="text" defaultValue="SIT Pune" />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Stream/Major</label>
                    <input type="text" defaultValue="Computer Science" />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label>Bio</label>
                  <textarea defaultValue="Full Stack Developer | AI Enthusiast" rows="3"></textarea>
                </div>

                <button className={styles.saveBtn}>
                  <Save size={18} /> Save Changes
                </button>
              </form>
            </div>
          )}

          {/* PREFERENCES TAB */}
          {activeTab === 'preferences' && (
            <div className={styles.tabContent}>
              <h2>App Preferences</h2>
              
              <div className={styles.settingItem}>
                <div>
                  <h3>Dark Mode</h3>
                  <p>Adjust the appearance of the application.</p>
                </div>
                <label className={styles.switch}>
                  <input type="checkbox" defaultChecked />
                  <span className={styles.slider}></span>
                </label>
              </div>

              <div className={styles.settingItem}>
                <div>
                  <h3>Email Notifications</h3>
                  <p>Receive weekly study summaries.</p>
                </div>
                <label className={styles.switch}>
                  <input type="checkbox" defaultChecked />
                  <span className={styles.slider}></span>
                </label>
              </div>

              <div className={styles.settingItem}>
                <div>
                  <h3>Study Reminders</h3>
                  <p>Push notifications for scheduled sessions.</p>
                </div>
                <label className={styles.switch}>
                  <input type="checkbox" defaultChecked />
                  <span className={styles.slider}></span>
                </label>
              </div>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'account' && (
            <div className={styles.tabContent}>
              <h2>Security</h2>
              
              <form className={styles.form}>
                <div className={styles.inputGroup}>
                  <label>Current Password</label>
                  <input type="password" />
                </div>
                <div className={styles.inputGroup}>
                  <label>New Password</label>
                  <input type="password" />
                </div>
                <button className={styles.saveBtn}>Update Password</button>
              </form>

              <div className={styles.dangerZone}>
                <h3>Danger Zone</h3>
                <p>Once you delete your account, there is no going back.</p>
                <button className={styles.deleteBtn}>
                  <LogOut size={16} /> Delete Account
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