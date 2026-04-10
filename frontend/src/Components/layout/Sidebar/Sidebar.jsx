import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  LayoutDashboard, 
  Map, 
  Clock, 
  BarChart2, 
  CheckSquare, 
  Zap, 
  Library,
  Settings, 
  LogOut 
} from 'lucide-react';
import styles from './Sidebar.module.css';

const Sidebar = () => {
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    try {
      // 1. Tell the backend to destroy the secure HttpOnly cookie
      await axios.post('http://localhost:5000/api/auth/logout', {}, { withCredentials: true });
    } catch (error) {
      console.error("Backend logout failed, but clearing local session anyway.", error);
    } finally {
      // 2. 🛡️ Nuke the browser memory (This forces the tours to reset for the next user!)
      localStorage.clear();
      
      // 3. Send them back to the login page
      navigate('/login');
    }
  };

  return (
    <aside className={styles.sidebar}>
      
      {/* 1. BRANDING HEADER */}
      <div 
        className={styles.logoContainer} 
        onClick={handleLogoClick} 
        style={{ cursor: 'pointer' }}
      >
        <div className={styles.logoIcon}>IE</div>
        <span className={styles.logoText}>InsightED</span>
      </div>

      {/* 2. NAVIGATION MENU */}
      <nav className={styles.navMenu}>
        <NavLink 
          to="/dashboard" 
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink 
          to="/roadmap" 
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <Map size={20} />
          <span>Roadmap</span>
        </NavLink>

        <NavLink 
          to="/study" 
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <Clock size={20} />
          <span>Focus Mode</span>
        </NavLink>

        <NavLink 
          to="/analytics" 
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <BarChart2 size={20} />
          <span>Analytics</span>
        </NavLink>

        <NavLink 
          to="/assessment" 
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <CheckSquare size={20} />
          <span>Practice Lab</span>
        </NavLink>

        <NavLink 
          to="/library" 
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <Library size={20} />
          <span>Library</span>
        </NavLink>

        <NavLink 
          to="/insights" 
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <Zap size={20} />
          <span>AI Insights</span>
        </NavLink>

        <div className={styles.divider}></div>

        <NavLink 
          to="/settings" 
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <Settings size={20} />
          <span>Settings</span>
        </NavLink>
      </nav>

      {/* 3. FOOTER ACTIONS */}
      <div className={styles.footer}>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>

    </aside>
  );
};

export default Sidebar;