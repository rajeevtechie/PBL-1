import React, { useState } from 'react';
import axios from 'axios';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); 
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        try {
            const response = await axios.post('http://localhost:5000/api/auth/forgot-password', { email });
            navigate('/reset-password', { state: { email: email, message: response.data.message } });
        } catch (error) {
            setStatus('error');
            setMessage(error.response?.data?.message || 'Something went wrong. Please try again.');
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: '400px', padding: '20px' }}>
                <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '30px', fontSize: '0.9rem' }}>
                    <ArrowLeft size={16} /> Back to Login
                </button>
                <h2 style={{ fontSize: '1.8rem', marginBottom: '8px', fontWeight: 'bold' }}>Forgot Password</h2>
                <p style={{ color: '#94a3b8', marginBottom: '30px', fontSize: '0.95rem', lineHeight: '1.5' }}>
                    Enter the email address associated with your account and we'll send you a 6-digit verification code.
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required
                        style={{ width: '100%', padding: '14px 16px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                    {status === 'error' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontSize: '0.85rem' }}>
                            <AlertCircle size={16} /> {message}
                        </div>
                    )}
                    <button type="submit" disabled={status === 'loading'}
                        style={{ width: '100%', padding: '14px', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: status === 'loading' ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'background-color 0.2s' }}
                    >
                        {status === 'loading' ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : 'Send Reset Code'}
                    </button>
                </form>
            </div>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default ForgotPassword;