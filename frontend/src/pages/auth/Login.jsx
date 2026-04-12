import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff, Loader2, CheckCircle2, KeyRound } from 'lucide-react';
import styles from './Auth.module.css';

const Login = () => {
  const navigate = useNavigate();

  // --- LOGIN STATE ---
  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // --- UNVERIFIED OTP STATE ---
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);

  // --- FORGOT PASSWORD STATE ---
  // Step 0: Hidden | Step 1: Request Email | Step 2: Enter OTP | Step 3: New Password
  const [forgotStep, setForgotStep] = useState(0); 
  const [forgotData, setForgotData] = useState({ email: '', otp: '', newPassword: '', confirmPassword: '' });
  const [resetToken, setResetToken] = useState('');
  const [forgotMsg, setForgotMsg] = useState({ type: '', text: '' });
  const [isForgotLoading, setIsForgotLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    setError('');
  };

  const handleForgotChange = (e) => {
    setForgotData({ ...forgotData, [e.target.name]: e.target.value });
    setForgotMsg({ type: '', text: '' });
  };

  // --- LOGIN FLOW ---
  const handleLogin = async (e) => {
    if(e) e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', formData, { withCredentials: true });
      
      if (res.data.success) {
        localStorage.setItem('user', JSON.stringify(res.data.user));
        if (res.data.user?.name) localStorage.setItem('userName', res.data.user.name);

        // 🛡️ THE HYBRID SYNC: Catch the DB flags and load them into local memory instantly
        const dbTourFlags = res.data.user.tour_flags || {}; 
        Object.keys(dbTourFlags).forEach(key => {
            if (dbTourFlags[key] === true) {
                localStorage.setItem(key, 'true');
            }
        });

        navigate('/dashboard');
      }
    } catch (err) {
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
              setShowOtpModal(false);
              handleLogin(e);
          }
      } catch (err) {
          setError(err.response?.data?.message || 'Verification failed. Invalid code.');
      } finally {
          setVerifying(false);
      }
  };

  // --- FORGOT PASSWORD FLOW ---
  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!forgotData.email) return setForgotMsg({ type: 'error', text: 'Please enter your email.' });
    
    setIsForgotLoading(true);
    try {
      await axios.post('http://localhost:5000/api/auth/forgot-password', { email: forgotData.email });
      setForgotStep(2);
      setForgotMsg({ type: 'success', text: 'If an account exists, an OTP has been sent.' });
    } catch {
      setForgotMsg({ type: 'error', text: 'Failed to process request.' });
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleVerifyResetOtp = async (e) => {
    e.preventDefault();
    if (forgotData.otp.length !== 6) return setForgotMsg({ type: 'error', text: 'Enter a valid 6-digit OTP.' });

    setIsForgotLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/verify-reset-otp', { email: forgotData.email, otp: forgotData.otp });
      setResetToken(res.data.resetToken);
      setForgotStep(3);
      setForgotMsg({ type: '', text: '' });
    } catch (err) {
      setForgotMsg({ type: 'error', text: err.response?.data?.message || 'Invalid OTP.' });
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleSetNewPassword = async (e) => {
    e.preventDefault();
    if (forgotData.newPassword !== forgotData.confirmPassword) {
      return setForgotMsg({ type: 'error', text: 'Passwords do not match.' });
    }

    setIsForgotLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/reset-password', { 
        resetToken, 
        newPassword: forgotData.newPassword 
      });
      setForgotMsg({ type: 'success', text: res.data.message });
      
      // Auto-fill login form and close modal after 2 seconds
      setFormData(prev => ({ ...prev, email: forgotData.email, password: forgotData.newPassword }));
      setTimeout(() => setForgotStep(0), 2000);
    } catch (err) {
      setForgotMsg({ type: 'error', text: err.response?.data?.message || 'Failed to reset password.' });
    } finally {
      setIsForgotLoading(false);
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
              <label className={styles.checkbox}>
                <input type="checkbox" name="rememberMe" checked={formData.rememberMe} onChange={handleChange} /> 
                <span>Remember me</span>
              </label>
              <button type="button" onClick={() => setForgotStep(1)} className={styles.forgotLink} style={{ background:'none', border:'none', cursor:'pointer' }}>
                Forgot Password?
              </button>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? <Loader2 className={styles.spin} size={20} /> : <>Sign in <ArrowRight size={20} /></>}
            </button>
          </form>

          <p className={styles.footerText}>Don't have an account? <Link to="/register">Create free account</Link></p>
        </div>
      </div>

      {/* --- FORGOT PASSWORD MODAL FLOW --- */}
      {forgotStep > 0 && (
        <div className={styles.otpOverlay}>
          <div className={styles.otpCard}>
            <div className={styles.otpIcon}><KeyRound size={32} /></div>
            
            {forgotStep === 1 && (
              <>
                <h2 style={{ margin: '0 0 10px 0', color: 'white' }}>Reset Password</h2>
                <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: '0 0 20px 0' }}>Enter your email address and we'll send you an OTP to reset your password.</p>
                
                {forgotMsg.text && <div className={styles.errorBox} style={{ backgroundColor: forgotMsg.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : '', color: forgotMsg.type === 'success' ? '#10b981' : '' }}>{forgotMsg.text}</div>}

                <form onSubmit={handleRequestReset}>
                  <input type="email" name="email" placeholder="student@university.edu" className={styles.inputGroup} style={{ width:'100%', padding:'12px', borderRadius:'8px', border:'1px solid #334155', background:'#0f172a', color:'white', marginBottom:'20px' }} value={forgotData.email} onChange={handleForgotChange} required />
                  <button type="submit" className={styles.submitBtn} disabled={isForgotLoading}>
                    {isForgotLoading ? <Loader2 className={styles.spin} size={20} /> : 'Send Reset OTP'}
                  </button>
                </form>
              </>
            )}

            {forgotStep === 2 && (
              <>
                <h2 style={{ margin: '0 0 10px 0', color: 'white' }}>Enter Reset OTP</h2>
                <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: '0 0 20px 0' }}>We sent a code to <strong>{forgotData.email}</strong>.</p>
                
                {forgotMsg.text && <div className={styles.errorBox} style={{ backgroundColor: forgotMsg.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : '', color: forgotMsg.type === 'success' ? '#10b981' : '' }}>{forgotMsg.text}</div>}

                <form onSubmit={handleVerifyResetOtp}>
                  <input type="text" name="otp" maxLength="6" placeholder="••••••" className={styles.otpInput} value={forgotData.otp} onChange={(e) => setForgotData({ ...forgotData, otp: e.target.value.replace(/\D/g, '') })} autoFocus required />
                  <button type="submit" className={styles.submitBtn} disabled={isForgotLoading || forgotData.otp.length !== 6}>
                    {isForgotLoading ? <Loader2 className={styles.spin} size={20} /> : 'Verify Code'}
                  </button>
                </form>
              </>
            )}

            {forgotStep === 3 && (
              <>
                <h2 style={{ margin: '0 0 10px 0', color: 'white' }}>Create New Password</h2>
                <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: '0 0 20px 0' }}>Your new password must be at least 8 characters.</p>
                
                {forgotMsg.text && <div className={styles.errorBox} style={{ backgroundColor: forgotMsg.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : '', color: forgotMsg.type === 'success' ? '#10b981' : '' }}>{forgotMsg.text}</div>}

                <form onSubmit={handleSetNewPassword}>
                  <input type="password" name="newPassword" placeholder="New Password" style={{ width:'100%', padding:'12px', borderRadius:'8px', border:'1px solid #334155', background:'#0f172a', color:'white', marginBottom:'10px' }} value={forgotData.newPassword} onChange={handleForgotChange} required />
                  <input type="password" name="confirmPassword" placeholder="Confirm New Password" style={{ width:'100%', padding:'12px', borderRadius:'8px', border:'1px solid #334155', background:'#0f172a', color:'white', marginBottom:'20px' }} value={forgotData.confirmPassword} onChange={handleForgotChange} required />
                  <button type="submit" className={styles.submitBtn} disabled={isForgotLoading || forgotMsg.type === 'success'}>
                    {isForgotLoading ? <Loader2 className={styles.spin} size={20} /> : 'Update Password'}
                  </button>
                </form>
              </>
            )}

            <button onClick={() => setForgotStep(0)} style={{ background:'none', border:'none', color:'#64748b', marginTop:'15px', cursor:'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* --- UNVERIFIED LOGIN OTP MODAL --- */}
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
                          type="text" maxLength="6" placeholder="••••••" className={styles.otpInput}
                          value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} autoFocus required
                      />
                      <button type="submit" className={styles.submitBtn} disabled={verifying || otp.length !== 6}>
                          {verifying ? <Loader2 className={styles.spin} size={20} /> : <>Verify & Login <CheckCircle2 size={20} /></>}
                      </button>
                  </form>
                  <button onClick={() => setShowOtpModal(false)} style={{ background:'none', border:'none', color:'#64748b', marginTop:'15px', cursor:'pointer' }}>Cancel</button>
              </div>
          </div>
      )}
    </div>
  );
};

export default Login;