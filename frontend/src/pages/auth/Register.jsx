import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios'; // <--- 1. Import Axios
import { 
  User, 
  Mail, 
  Lock, 
  ArrowRight, 
  AlertCircle,
  GraduationCap
} from 'lucide-react';
import styles from './Auth.module.css'; 

const Register = () => {
  const navigate = useNavigate();
  
  // 2. State to hold real user data
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    password: '',
    confirmPassword: '',
    university: '' 
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 3. Update state when user types
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Basic Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    setLoading(true);

    try {
      // 4. REAL BACKEND CALL
      // We send name, email, password to your Node.js server
      const response = await axios.post('http://localhost:5000/api/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password
        // We don't send confirmPassword or University to DB yet as your backend expects name/email/password
      });
      
      console.log("Registration Success:", response.data);
      alert("Account created! Please login.");
      navigate('/login');

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      
      {/* LEFT SIDE: Brand Visuals */}
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

      {/* RIGHT SIDE: Register Form */}
      <div className={styles.formSection}>
        <div className={styles.formWrapper}>
          
          <div className={styles.header}>
            <h2>Create Account</h2>
            <p>Enter your details to get started.</p>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', 
              padding: '10px', borderRadius: '8px', marginBottom: '20px',
              display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem'
            }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleRegister}>
            {/* Full Name */}
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

            {/* University (Optional - Visual only for now) */}
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

            {/* Email */}
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

            {/* Password */}
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

            {/* Confirm Password */}
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

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"} 
              <ArrowRight size={20} />
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