import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  User, 
  Mail, 
  Lock, 
  ArrowRight, 
  AlertCircle,
  GraduationCap,
  Loader2
} from 'lucide-react';
import styles from './Auth.module.css'; 

const Register = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    password: '',
    confirmPassword: '',
    university: '' 
  });

  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    if (!agree) {
      setError("You must agree to Terms & Conditions.");
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password
      });
      
      // 🧹 SECURE CLEANUP: Token is securely handled via cookies automatically!
      // Because our backend sends the cookie immediately on register, 
      // we can save their UI data and push them straight to the dashboard!
      localStorage.setItem('user', JSON.stringify(res.data.user));
      if (res.data.user?.name) {
          localStorage.setItem('userName', res.data.user.name);
      }
      
      navigate('/dashboard');

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      
      {/* LEFT SIDE */}
      <div className={styles.brandSection}>
        <div className={styles.brandContent}>
          <div className={styles.logoBadge}>IE</div>
          <h1>Join InsightED</h1>
          <p>
            Create your account to start bridging the gap between your 
            university studies and your dream career.
          </p>

          <div className={styles.featureList}>
            <div className={styles.feature}><div className={styles.dot}></div> AI Syllabus Parsing</div>
            <div className={styles.feature}><div className={styles.dot}></div> Personalized Study Plans</div>
            <div className={styles.feature}><div className={styles.dot}></div> Industry Skill Matching</div>
          </div>
        </div>

        <div className={styles.circle1}></div>
        <div className={styles.circle2}></div>
      </div>

      {/* RIGHT SIDE */}
      <div className={styles.formSection}>
        <div className={styles.formWrapper}>
          
          <div className={styles.header}>
            <h2>Create Account</h2>
            <p>Enter your details to get started.</p>
          </div>

          {error && (
            <div className={styles.errorBox}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleRegister}>
            
            <div className={styles.inputGroup}>
              <User size={20} className={styles.inputIcon} />
              <input 
                type="text" 
                name="name"
                placeholder="Full Name" 
                value={formData.name}
                onChange={handleChange}
                required 
              />
            </div>

            <div className={styles.inputGroup}>
              <GraduationCap size={20} className={styles.inputIcon} />
              <input 
                type="text" 
                name="university"
                placeholder="University Name" 
                value={formData.university}
                onChange={handleChange}
              />
            </div>

            <div className={styles.inputGroup}>
              <Mail size={20} className={styles.inputIcon} />
              <input 
                type="email" 
                name="email"
                placeholder="Email Address" 
                value={formData.email}
                onChange={handleChange}
                required 
              />
            </div>

            <div className={styles.inputGroup}>
              <Lock size={20} className={styles.inputIcon} />
              <input 
                type="password" 
                name="password"
                placeholder="Create Password" 
                value={formData.password}
                onChange={handleChange}
                required 
              />
            </div>

            <div className={styles.inputGroup}>
              <Lock size={20} className={styles.inputIcon} />
              <input 
                type="password" 
                name="confirmPassword"
                placeholder="Confirm Password" 
                value={formData.confirmPassword}
                onChange={handleChange}
                required 
              />
            </div>

            <div className={styles.terms}>
              <label className={styles.checkbox}>
                <input 
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                />
                <span>
                  I agree to the{' '}
                  <Link to="/terms" target="_blank" rel="noopener noreferrer" className={styles.link}>
                    Terms & Conditions
                  </Link>
                </span>
              </label>
            </div>

            <button 
              type="submit" 
              className={styles.submitBtn} 
              disabled={loading || !agree}
            >
              {loading ? (
                <Loader2 className={styles.spin} size={20} />
              ) : (
                <>Create Account <ArrowRight size={20} /></>
              )}
            </button>

          </form>

          <p className={styles.footerText}>
            Already have an account? <Link to="/login">Sign In</Link>
          </p>

        </div>
      </div>

    </div>
  );
};

export default Register;