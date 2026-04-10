import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import styles from './Auth.module.css';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // --- OTP STATE FOR UNVERIFIED USERS ---
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);

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
      localStorage.setItem('user', JSON.stringify(res.data.user));
      if (res.data.user?.name) localStorage.setItem('userName', res.data.user.name);
      navigate('/dashboard');
    } catch (err) {
      // If the backend blocks them because they aren't verified, show the OTP modal!
      if (err.response?.data?.requireVerification) {
          setShowOtpModal(true);
      } else {
          setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
      e.preventDefault();
      setVerifying(true);
      setError('');
      try {
          const res = await axios.post('http://localhost:5000/api/auth/verify-email', {
              email: formData.email,
              otp: otp
          });
          if (res.data.success) {
              localStorage.setItem('user', JSON.stringify(res.data.user));
              if (res.data.user?.name) localStorage.setItem('userName', res.data.user.name);
              navigate('/dashboard');
          }
      } catch (err) {
          setError(err.response?.data?.message || 'Verification failed. Invalid code.');
      } finally {
          setVerifying(false);
      }
  };

  return (
    <div className={styles.authContainer}>
      
      {/* LEFT SIDE: Branding */}
      <div className={styles.brandSection}>
        <div className={styles.circle1}></div><div className={styles.circle2}></div>
        <div className={styles.brandContent}>
          <div className={styles.logoBadge}>IE</div>
          <h1>Unlock Your <br /> Academic Potential</h1>
          <p>InsightED bridges the gap between your university syllabus and industry demands using advanced AI analysis.</p>
        </div>
      </div>

      {/* RIGHT SIDE: Form */}
      <div className={styles.formSection}>
        <div className={styles.formWrapper}>
          
          <div className={styles.header}>
            <h2>Student Login</h2>
            <p>Please enter your details to sign in.</p>
          </div>

          {error && !showOtpModal && <div className={styles.errorBox}><AlertCircle size={16} /> {error}</div>}

          <form onSubmit={handleLogin}>
            <div className={styles.inputGroup}>
              <Mail className={styles.inputIcon} size={20} />
              <input type="email" name="email" placeholder="Email Address" value={formData.email} onChange={handleChange} required />
            </div>

            <div className={styles.inputGroup}>
              <Lock className={styles.inputIcon} size={20} />
              <input type={showPassword ? "text" : "password"} name="password" placeholder="Password" value={formData.password} onChange={handleChange} required style={{ paddingRight: '45px' }} />
              <button type="button" className={styles.passwordToggle} onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className={styles.options}>
              <label className={styles.checkbox}><input type="checkbox" /> <span>Remember me</span></label>
              <a href="#" className={styles.forgotLink}>Forgot Password?</a>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? <Loader2 className={styles.spin} size={20} /> : <>Sign in <ArrowRight size={20} /></>}
            </button>
          </form>

          <p className={styles.footerText}>Don't have an account? <Link to="/register">Create free account</Link></p>
        </div>
      </div>

      {/* --- OTP VERIFICATION MODAL (If they try to login without verifying first) --- */}
      {showOtpModal && (
          <div className={styles.otpOverlay}>
              <div className={styles.otpCard}>
                  <div className={styles.otpIcon}><Mail size={32} /></div>
                  <h2 style={{ margin: '0 0 10px 0', color: 'white' }}>Account Not Verified</h2>
                  <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>
                      We sent a verification code to <strong>{formData.email}</strong> when you registered. Enter it below to unlock your account.
                  </p>
                  
                  {error && <div className={styles.errorBox} style={{ marginTop: '15px' }}><AlertCircle size={16} /> {error}</div>}

                  <form onSubmit={handleVerifyOtp}>
                      <input 
                          type="text" 
                          maxLength="6" 
                          placeholder="••••••" 
                          className={styles.otpInput}
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                          autoFocus
                          required
                      />
                      <button type="submit" className={styles.submitBtn} disabled={verifying || otp.length !== 6}>
                          {verifying ? <Loader2 className={styles.spin} size={20} /> : <>Verify & Login <CheckCircle2 size={20} /></>}
                      </button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default Login;