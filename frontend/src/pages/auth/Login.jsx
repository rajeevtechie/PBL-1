import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  Layout, 
  BookOpen, 
  AlertCircle,
  Eye,      // <--- NEW IMPORT
  EyeOff    // <--- NEW IMPORT
} from 'lucide-react';
import styles from './Auth.module.css';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState('student');
  const [showPassword, setShowPassword] = useState(false); // <--- NEW STATE
  
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', formData);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      
      {/* === LEFT SIDE: BRANDING SECTION === */}
      <div className={styles.brandSection}>
        <div className={styles.circle1}></div>
        <div className={styles.circle2}></div>

        <div className={styles.brandContent}>
          <div className={styles.logoBadge}>IE</div>
          <h1>Unlock Your <br /> Academic Potential</h1>
          <p>
            InsightED bridges the gap between your university syllabus and 
            industry demands using advanced AI analysis.
          </p>

          <div className={styles.featureList}>
            <div className={styles.feature}>
              <span className={styles.dot}></span> AI-Powered Syllabus Analysis
            </div>
            <div className={styles.feature}>
              <span className={styles.dot}></span> Automated Roadmap Generation
            </div>
            <div className={styles.feature}>
              <span className={styles.dot}></span> Smart Gap Analysis
            </div>
          </div>
        </div>
      </div>

      {/* === RIGHT SIDE: FORM SECTION === */}
      <div className={styles.formSection}>
        <div className={styles.formWrapper}>
          
          <div className={styles.header}>
            <h2>Welcome Back</h2>
            <p>Please enter your details to sign in.</p>
          </div>

          <div className={styles.roleToggle}>
            <button 
              className={role === 'student' ? styles.activeRole : ''}
              onClick={() => setRole('student')}
              type="button"
            >
              <Layout size={18} /> Student
            </button>
            <button 
              className={role === 'educator' ? styles.activeRole : ''}
              onClick={() => setRole('educator')}
              type="button"
            >
              <BookOpen size={18} /> Educator
            </button>
          </div>

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)', 
              color: '#ef4444', 
              padding: '10px', 
              borderRadius: '8px',
              marginBottom: '20px',
              display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem'
            }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            
            {/* Email Input */}
            <div className={styles.inputGroup}>
              <Mail className={styles.inputIcon} size={20} />
              <input 
                type="email" 
                name="email" 
                placeholder="Email Address" 
                value={formData.email} 
                onChange={handleChange} 
                required 
              />
            </div>

            {/* Password Input (Updated with Toggle) */}
            <div className={styles.inputGroup}>
              <Lock className={styles.inputIcon} size={20} />
              <input 
                type={showPassword ? "text" : "password"} // <--- DYNAMIC TYPE
                name="password" 
                placeholder="Password" 
                value={formData.password} 
                onChange={handleChange} 
                required 
                style={{ paddingRight: '45px' }} // Prevent text overlapping icon
              />
              
              {/* <--- SHOW/HIDE BUTTON ---> */}
              <button 
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className={styles.options}>
              <label className={styles.checkbox}>
                <input type="checkbox" /> Remember me
              </label>
              <a href="#" className={styles.forgotLink}>Forgot Password?</a>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? "Signing in..." : "Sign in"} 
              <ArrowRight size={20} />
            </button>
          </form>

          <p className={styles.footerText}>
            Don't have an account? <Link to="/register">Create free account</Link>
          </p>

        </div>
      </div>
    </div>
  );
};

export default Login;