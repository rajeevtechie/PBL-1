import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from "../Sidebar/Sidebar";
import styles from './MainLayout.module.css';

const MainLayout = () => {
  const location = useLocation();

  // Helper to get a clean title from the URL path
  const getPageTitle = () => {
    const path = location.pathname.split('/')[1];
    if (!path || path === 'dashboard') return "Dashboard";
    
    // Convert "focus-mode" to "Focus Mode" etc.
    return path
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className={styles.layoutContainer}>
      <Sidebar />
      <main className={styles.mainContent}>
        {/* TOP NAVIGATION BAR */}
        <div className={styles.topHeader}>
          <h2>{getPageTitle()}</h2>
          <div className={styles.userProfile}>RG</div>
        </div>

        {/* PAGE CONTENT AREA */}
        <div className={styles.scrollArea}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;