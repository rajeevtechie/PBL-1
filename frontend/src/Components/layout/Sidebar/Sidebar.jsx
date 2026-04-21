import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  LayoutDashboard, Map, Clock, Calendar, BarChart2, 
  CheckSquare, Zap, Library, Settings, LogOut 
} from 'lucide-react';
import styles from './Sidebar.module.css';

const Sidebar = () => {
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:5000/api/auth/logout', {}, { withCredentials: true });
    } catch (error) {
      console.error("Backend logout failed, but clearing local session anyway.", error);
    } finally {
      Object.keys(localStorage).forEach(key => {
          if (!key.startsWith('hasSeen') && key !== 'appPreferences' && key !== 'darkMode') {
              localStorage.removeItem(key);
          }
      });
      sessionStorage.clear();
      navigate('/login');
    }
  };

  return (
    <aside className={styles.sidebar}>
      
      {/* 1. BRANDING HEADER */}
      <div className={styles.logoContainer} onClick={handleLogoClick}>
        <div className={styles.logoIcon}>IE</div>
        <span className={styles.logoText}>InsightED</span>
      </div>

      {/* 2. NAVIGATION LINKS */}
      <nav className={styles.navMenu}>
        <NavLink to="/dashboard" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
          <div className={styles.navItemIcon}><LayoutDashboard size={20} /></div>
          <span className={styles.navItemText}>Dashboard</span>
        </NavLink>

        <NavLink to="/roadmap" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
          <div className={styles.navItemIcon}><Map size={20} /></div>
          <span className={styles.navItemText}>Roadmap</span>
        </NavLink>

        <NavLink to="/focus" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
          <div className={styles.navItemIcon}><Clock size={20} /></div>
          <span className={styles.navItemText}>Focus Mode</span>
        </NavLink>

        {/* 🚨 This now points strictly to /calendar to match App.jsx */}
        <NavLink to="/calendar" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
          <div className={styles.navItemIcon}><Calendar size={20} /></div>
          <span className={styles.navItemText}>Schedule</span>
        </NavLink>

        <NavLink to="/analytics" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
          <div className={styles.navItemIcon}><BarChart2 size={20} /></div>
          <span className={styles.navItemText}>Analytics</span>
        </NavLink>

        <NavLink to="/assessment" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
          <div className={styles.navItemIcon}><CheckSquare size={20} /></div>
          <span className={styles.navItemText}>Practice Lab</span>
        </NavLink>

        <NavLink to="/library" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
          <div className={styles.navItemIcon}><Library size={20} /></div>
          <span className={styles.navItemText}>Library</span>
        </NavLink>

        <NavLink to="/insights" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
          <div className={styles.navItemIcon}><Zap size={20} /></div>
          <span className={styles.navItemText}>AI Insights</span>
        </NavLink>

        <div className={styles.divider}></div>

        <NavLink to="/settings" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
          <div className={styles.navItemIcon}><Settings size={20} /></div>
          <span className={styles.navItemText}>Settings</span>
        </NavLink>
      </nav>

      {/* 3. FOOTER ACTIONS */}
      <div className={styles.footer}>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <div className={styles.navItemIcon}><LogOut size={20} /></div>
          <span>Logout</span>
        </button>
      </div>

    </aside>
  );
};

export default Sidebar;