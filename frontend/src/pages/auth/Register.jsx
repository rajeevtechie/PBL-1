import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { User, Mail, Lock, ArrowRight, AlertCircle, GraduationCap, Loader2, CheckCircle2, RefreshCw, Wand2, Eye, EyeOff } from 'lucide-react';
import styles from './Auth.module.css';

const Register = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '', university: '' });
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // --- OTP STATE ---
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  
  // --- RESEND TIMER STATE ---
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  // 🪄 MAGIC PASSWORD GENERATOR
  const handleGeneratePassword = () => {
      const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const lower = "abcdefghijklmnopqrstuvwxyz";
      const nums = "0123456789";
      const symbols = "!@#$%^&*()_-+=<>?";
      const all = upper + lower + nums + symbols;

      let newPass = "";
      newPass += upper[Math.floor(Math.random() * upper.length)];
      newPass += lower[Math.floor(Math.random() * lower.length)];
      newPass += nums[Math.floor(Math.random() * nums.length)];
      newPass += symbols[Math.floor(Math.random() * symbols.length)];

      for (let i = 0; i < 10; i++) { 
          newPass += all[Math.floor(Math.random() * all.length)];
      }

      newPass = newPass.split('').sort(() => 0.5 - Math.random()).join('');

      setFormData({ ...formData, password: newPass, confirmPassword: newPass });
      setShowPassword(true); 
      setError('');
  };

  // Timer Logic
  useEffect(() => {
      let timer;
      if (resendCooldown > 0 && showOtpModal) {
          timer = setInterval(() => {
              setResendCooldown((prev) => prev - 1);
          }, 1000);
      }
      return () => clearInterval(timer);
  }, [resendCooldown, showOtpModal]);

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // 🛡️ EXPLICIT FRONTEND VALIDATION (Prevents silent browser failures)
    if (!formData.name.trim()) return setError("Please enter your Full Name.");
    if (!formData.email.trim()) return setError("Please enter your Email Address.");
    if (!formData.password) return setError("Please create a Password.");
    if (formData.password !== formData.confirmPassword) return setError("Passwords do not match!");
    if (!agree) return setError("You must agree to Terms & Conditions.");

    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password
      });
      
      if (res.data.requireVerification) {
          setRegisteredEmail(res.data.email);
          setShowOtpModal(true);
          setResendCooldown(60); 
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
      e.preventDefault();
      setVerifying(true);
      setError('');
      setResendMessage('');

      try {
          const res = await axios.post('http://localhost:5000/api/auth/verify-email', {
              email: registeredEmail,
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

  const handleResendOTP = async () => {
      if (resendCooldown > 0 || isResending) return;
      
      setIsResending(true);
      setError('');
      setResendMessage('');

      try {
          const res = await axios.post('http://localhost:5000/api/auth/resend-otp', {
              email: registeredEmail
          });
          
          if (res.data.success) {
              setResendMessage('A new code has been sent!');
              setResendCooldown(60); 
          }
      } catch (err) {
          setError(err.response?.data?.message || 'Failed to resend code. Please try again.');
      } finally {
          setIsResending(false);
      }
  };

  return (
    <div className={styles.authContainer}>
      
      <div className={styles.brandSection}>
        <div className={styles.brandContent}>
          <div className={styles.logoBadge}>IE</div>
          <h1>Join InsightED</h1>
          <p>Create your account to start bridging the gap between your university studies and your dream career.</p>
          <div className={styles.featureList}>
            <div className={styles.feature}><div className={styles.dot}></div> AI Syllabus Parsing</div>
            <div className={styles.feature}><div className={styles.dot}></div> Personalized Study Plans</div>
            <div className={styles.feature}><div className={styles.dot}></div> Industry Skill Matching</div>
          </div>
        </div>
        <div className={styles.circle1}></div><div className={styles.circle2}></div>
      </div>

      <div className={styles.formSection}>
        <div className={styles.formWrapper}>
          
          <div className={styles.header}>
            <h2>Create Account</h2>
            <p>Enter your details to get started.</p>
          </div>

          {error && !showOtpModal && <div className={styles.errorBox}><AlertCircle size={16} /> {error}</div>}

          {/* 🛡️ ADDED noValidate so we can handle errors beautifully instead of silently! */}
          <form onSubmit={handleRegister} noValidate>
            <div className={styles.inputGroup}>
              <User size={20} className={styles.inputIcon} />
              <input type="text" name="name" placeholder="Full Name" value={formData.name} onChange={handleChange} required />
            </div>

            <div className={styles.inputGroup}>
              <GraduationCap size={20} className={styles.inputIcon} />
              <input type="text" name="university" placeholder="University Name" value={formData.university} onChange={handleChange} />
            </div>

            <div className={styles.inputGroup}>
              <Mail size={20} className={styles.inputIcon} />
              <input type="email" name="email" placeholder="Email Address" value={formData.email} onChange={handleChange} required />
            </div>

            <div className={styles.inputGroup} style={{ marginBottom: '8px' }}>
              <Lock size={20} className={styles.inputIcon} />
              <input 
                  type={showPassword ? "text" : "password"} 
                  name="password" 
                  placeholder="Create Password" 
                  value={formData.password} 
                  onChange={handleChange} 
                  required 
                  style={{ paddingRight: '45px' }}
              />
              <button type="button" className={styles.passwordToggle} onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className={styles.inputGroup} style={{ marginBottom: '8px' }}>
              <Lock size={20} className={styles.inputIcon} />
              <input 
                  type={showPassword ? "text" : "password"} 
                  name="confirmPassword" 
                  placeholder="Confirm Password" 
                  value={formData.confirmPassword} 
                  onChange={handleChange} 
                  required 
                  style={{ paddingRight: '45px' }}
              />
            </div>

            <button 
                type="button" 
                onClick={handleGeneratePassword} 
                style={{
                    background: 'transparent', 
                    border: 'none', 
                    color: 'var(--primary, #6366f1)', 
                    fontSize: '0.85rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    cursor: 'pointer', 
                    marginBottom: '15px',
                    fontWeight: '500',
                    width: 'fit-content'
                }}
            >
               <Wand2 size={14}/> Generate secure password
            </button>

            <div className={styles.terms}>
              <label className={styles.checkbox}>
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span>I agree to the <Link to="/terms" className={styles.link}>Terms & Conditions</Link></span>
              </label>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading || !agree}>
              {loading ? <Loader2 className={styles.spin} size={20} /> : <>Create Account <ArrowRight size={20} /></>}
            </button>
          </form>

          <p className={styles.footerText}>Already have an account? <Link to="/login">Sign In</Link></p>
        </div>
      </div>

      {showOtpModal && (
          <div className={styles.otpOverlay}>
              <div className={styles.otpCard}>
                  <div className={styles.otpIcon}><Mail size={32} /></div>
                  <h2 style={{ margin: '0 0 10px 0', color: 'white' }}>Check your inbox</h2>
                  <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: '0 0 15px 0' }}>
                      We sent a 6-digit verification code to <strong>{registeredEmail}</strong>. <br/>
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>(Don't forget to check your Spam folder!)</span>
                  </p>
                  
                  {error && <div className={styles.errorBox} style={{ marginBottom: '15px' }}><AlertCircle size={16} /> {error}</div>}
                  {resendMessage && <div className={styles.errorBox} style={{ marginBottom: '15px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.2)' }}><CheckCircle2 size={16} /> {resendMessage}</div>}

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
                          {verifying ? <Loader2 className={styles.spin} size={20} /> : <>Verify Account <CheckCircle2 size={20} /></>}
                      </button>
                  </form>
                  
                  <div style={{ marginTop: '20px' }}>
                      <button 
                          onClick={handleResendOTP}
                          disabled={resendCooldown > 0 || isResending}
                          style={{ 
                              background: 'transparent', 
                              border: 'none', 
                              color: resendCooldown > 0 ? '#64748b' : '#6366f1', 
                              cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              width: '100%',
                              fontWeight: '500'
                          }}
                      >
                          {isResending ? <Loader2 className={styles.spin} size={16} /> : <RefreshCw size={16} />}
                          {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Verification Code'}
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default Register;