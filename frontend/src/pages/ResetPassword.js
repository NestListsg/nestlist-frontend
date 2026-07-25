import React, { useState } from 'react';
import { LOGO_B64 } from '../config';

const API = process.env.REACT_APP_API_URL || '';

export default function ResetPassword() {
  const token = new URLSearchParams(window.location.search).get('token') || '';
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

  const eyeStyle = {
    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
    cursor: 'pointer', color: 'rgba(248,244,236,0.8)', fontSize: '16px',
    userSelect: 'none', lineHeight: '1'
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!token) { setError('This reset link is invalid or has expired. Please request a new one from the login page.'); return; }
    if (password !== password2) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/password-reset/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not reset password');
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">
          <img src={LOGO_B64} alt="NestList" />
        </div>
        <div className="login-tagline">Smarter Listings. Better Results.</div>
        {done ? (
          <>
            <div className="success-msg">Your password has been reset. You can now log in.</div>
            <button className="btn-primary" onClick={() => { window.location.href = '/'; }} style={{ marginTop: '12px' }}>
              Go to Login
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <div style={{position:'relative'}}>
                <input className="form-input" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} style={{paddingRight:'40px'}} required />
                <span style={eyeStyle} onClick={() => setShowPassword(v => !v)}>
                  {showPassword ? '🙈' : '👁'}
                </span>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <div style={{position:'relative'}}>
                <input className="form-input" type={showPassword2 ? 'text' : 'password'} value={password2} onChange={e => setPassword2(e.target.value)} style={{paddingRight:'40px'}} required />
                <span style={eyeStyle} onClick={() => setShowPassword2(v => !v)}>
                  {showPassword2 ? '🙈' : '👁'}
                </span>
              </div>
            </div>
            {error && <div className="error-msg">{error}</div>}
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
