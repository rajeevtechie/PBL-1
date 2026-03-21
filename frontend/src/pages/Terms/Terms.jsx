import React from 'react';

const Terms = () => {
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>Terms and Conditions</h1>
        <p style={styles.lastUpdated}>Last Updated: {new Date().toLocaleDateString()}</p>

        <section style={styles.section}>
          <h2>1. User Consent</h2>
          <p>By creating an account on InsightED, you consent to the terms outlined in this agreement. If you do not agree with these terms, please do not use our services.</p>
        </section>

        <section style={styles.section}>
          <h2>2. Data Collection</h2>
          <p>We collect information that you provide directly to us, including your name, email address, university name, and the academic syllabi you upload. We also track your progress through the generated roadmaps to provide a personalized learning experience.</p>
        </section>

        <section style={styles.section}>
          <h2>3. How We Use Your Data</h2>
          <p>Your data is used strictly to provide and improve the InsightED platform. We use your uploaded syllabi in conjunction with AI tools (like Google Gemini) to generate personalized study plans and career insights. We do not sell your personal data to third parties.</p>
        </section>

        <section style={styles.section}>
          <h2>4. Data Security</h2>
          <p>We implement industry-standard security measures, including encrypted passwords and secure JWT authentication, to protect your personal information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.</p>
        </section>

        <section style={styles.section}>
          <h2>5. Changes to These Terms</h2>
          <p>We reserve the right to update or modify these Terms and Conditions at any time without prior notice. Any changes will be effective immediately upon posting to this page. Your continued use of the platform constitutes your acceptance of the revised terms.</p>
        </section>

      </div>
    </div>
  );
};

// Simple inline styles to match your dark theme quickly
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f172a', // Matches your app's dark background
    color: '#cbd5e1',
    padding: '40px 20px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: '#1e293b',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
  },
  title: {
    color: '#f8fafc',
    fontSize: '2rem',
    marginBottom: '10px'
  },
  lastUpdated: {
    color: '#94a3b8',
    fontSize: '0.9rem',
    marginBottom: '30px',
    borderBottom: '1px solid #334155',
    paddingBottom: '20px'
  },
  section: {
    marginBottom: '24px'
  }
};

export default Terms;