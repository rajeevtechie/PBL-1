import React, { useState } from 'react';
import axios from 'axios';
import { ArrowLeft, Loader2, CheckCircle, AlertCircle, KeyRound } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const ResetPassword = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const [email, setEmail] = useState(location.state?.email || '');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    
    const [status, setStatus] = useState('idle'); 
    const [message, setMessage] = useState(location.state?.message || '');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        try {
            const response = await axios.post('http://localhost:5000/api/auth/reset-password', { email, otp, newPassword });
            setStatus('success');
            setMessage(response.data.message);
            setTimeout(() => navigate('/login'), 3000);
        } catch (error) {
            setStatus('error');
            setMessage(error.response?.data?.message || 'Verification failed. Please try again.');
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: '400px', padding: '20px' }}>
                <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '30px', fontSize: '0.9rem' }}>
                    <ArrowLeft size={16} /> Back to Login
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <KeyRound size={28} color="#6366f1" />
                    <h2 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 'bold' }}>Reset Password</h2>
                </div>
                
                <p style={{ color: '#94a3b8', marginBottom: '20px', fontSize: '0.95rem', lineHeight: '1.5' }}>
                    Enter the 6-digit code sent to <strong>{email || 'your email'}</strong>, along with your new password.
                </p>

                {status === 'success' ? (
                    <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                        <CheckCircle size={40} color="#10b981" style={{ margin: '0 auto 15px auto' }} />
                        <p style={{ color: '#10b981', fontWeight: '500' }}>{message}</p>
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '10px' }}>Redirecting to login...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
                        <input type="text" placeholder="6-Digit OTP Code" maxLength="6" value={otp} onChange={(e) => setOtp(e.target.value)} required style={{...inputStyle, letterSpacing: '3px', fontWeight: 'bold'}} />
                        <input type="password" placeholder="New Password (min 8 chars, 1 uppercase, 1 special)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength="8" style={inputStyle} />

                        {(message || status === 'error') && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', marginTop: '5px', color: status === 'error' ? '#ef4444' : '#38bdf8' }}>
                                <AlertCircle size={16} /> {message}
                            </div>
                        )}

                        <button type="submit" disabled={status === 'loading'}
                            style={{ width: '100%', padding: '14px', marginTop: '10px', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: status === 'loading' ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'background-color 0.2s' }}
                        >
                            {status === 'loading' ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : 'Update Password'}
                        </button>
                    </form>
                )}
            </div>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

const inputStyle = { width: '100%', padding: '14px 16px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' };

export default ResetPassword;