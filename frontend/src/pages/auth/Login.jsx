import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  AlertCircle,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';
import styles from './Auth.module.css';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(
        'http://localhost:5000/api/auth/login',
        formData
      );

      // 🧹 SECURE CLEANUP: The token is now safely inside the HttpOnly Cookie!
      // We no longer save the token here. We only save basic UI data.
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      if (res.data.user?.name) {
          localStorage.setItem('userName', res.data.user.name);
      }

      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
        'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      
      {/* LEFT SIDE: Branding */}
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

      {/* RIGHT SIDE: Form */}
      <div className={styles.formSection}>
        <div className={styles.formWrapper}>
          
          <div className={styles.header}>
            <h2>Student Login</h2>
            <p>Please enter your details to sign in.</p>
          </div>

          {error && (
            <div className={styles.errorBox}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            
            {/* Email */}
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

            {/* Password */}
            <div className={styles.inputGroup}>
              <Lock className={styles.inputIcon} size={20} />
              <input 
                type={showPassword ? "text" : "password"}
                name="password" 
                placeholder="Password" 
                value={formData.password} 
                onChange={handleChange} 
                required 
                style={{ paddingRight: '45px' }}
              />
              
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
                <input type="checkbox" /> 
                <span>Remember me</span>
              </label>
              <a href="#" className={styles.forgotLink}>Forgot Password?</a>
            </div>

            <button 
              type="submit" 
              className={styles.submitBtn} 
              disabled={loading}
            >
              {loading ? (
                <Loader2 className={styles.spin} size={20} />
              ) : (
                <>Sign in <ArrowRight size={20} /></>
              )}
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