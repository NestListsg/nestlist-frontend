import React, { useState, useEffect } from 'react';
import { LOGO_B64 } from '../config';
import EyeIcon from '../components/EyeIcon';

const API = '';

// Keeps a handle typed (or auto-derived from the name) URL-safe as the user
// types, rather than only validating on submit -- so spaces/uppercase/symbols
// never make it into the field at all.
const slugifyHandle = (s) => s
  .toLowerCase()
  .replace(/\s+/g, '-')
  .replace(/[^a-z0-9-]/g, '')
  .replace(/-+/g, '-');

export default function Login({ onLogin }) {
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [handleTouched, setHandleTouched] = useState(false);
  const [handleChecking, setHandleChecking] = useState(false);
  const [handleStatus, setHandleStatus] = useState(null);
  const [registerSuggestions, setRegisterSuggestions] = useState([]);
  const [agency, setAgency] = useState('');
  const [specialty, setSpecialty] = useState('Landed. GCB. Penthouses');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const eyeStyle = {
    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
    cursor: 'pointer', color: 'rgba(248,244,236,0.8)', fontSize: '16px',
    userSelect: 'none', lineHeight: '1'
  };

  const handleNameChange = (v) => {
    setName(v);
    // Auto-derive the handle from the name only until the agent edits the
    // handle field themselves -- handleTouched flips permanently at that
    // point, so we never clobber a deliberate choice.
    if (!handleTouched) setHandle(slugifyHandle(v));
  };

  const handleHandleChange = (v) => {
    setHandleTouched(true);
    setHandle(slugifyHandle(v));
  };

  const pickSuggestion = (s) => {
    setHandleTouched(true);
    setHandle(s);
    setRegisterSuggestions([]);
  };

  // The backend trims leading/trailing hyphens when it slugifies the
  // handle, but the input itself must not trim on every keystroke -- that
  // would stop an agent typing a hyphen in the middle of a handle. So the
  // raw `handle` stays the field's value, and this derived, untrimmed-at-
  // the-edges view is what we show/check against, to match what actually
  // gets stored ("-john" previews and checks as "john").
  const cleanHandle = handle.replace(/^-+|-+$/g, '');

  // Debounced availability check. Runs whenever `cleanHandle` settles for
  // ~400ms; the cleanup cancels the pending fetch's timer on every
  // keystroke so only the latest value is ever checked. `API` is a
  // module-level constant, not a reactive value, so it's intentionally
  // left out of the dependency array -- exhaustive-deps doesn't flag it.
  useEffect(() => {
    if (!cleanHandle) { setHandleStatus(null); setHandleChecking(false); return; }
    setHandleChecking(true);
    const timer = setTimeout(() => {
      fetch(`${API}/api/public/handle-available/${cleanHandle}`)
        .then(r => r.json())
        .then(data => setHandleStatus(data))
        .catch(() => setHandleStatus(null))
        .finally(() => setHandleChecking(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [cleanHandle]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Login failed');
      onLogin(data.token, data.agent);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await fetch(`${API}/api/password-reset/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      });
      setResetSent(true); // backend always returns a generic success shape
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== password2) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setError(''); setRegisterSuggestions([]); setLoading(true);
    try {
      const res = await fetch(`${API}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, agency, specialty, username: handle })
      });
      const data = await res.json();
      if (!res.ok) {
        if (Array.isArray(data.suggestions)) setRegisterSuggestions(data.suggestions);
        throw new Error(data.detail || 'Registration failed');
      }
      onLogin(data.token, data.agent);
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

        <div className="login-tabs">
          <button className={`login-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setError(''); }}>Login</button>
          <button className={`login-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => { setTab('register'); setError(''); }}>Register</button>
        </div>

        {tab === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" name="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{position:'relative'}}>
                <input className="form-input" type={showPassword ? 'text' : 'password'} name="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} style={{paddingRight:'40px'}} required />
                <EyeIcon open={showPassword} onClick={() => setShowPassword(v => !v)} style={eyeStyle} />
              </div>
            </div>
            <div style={{ textAlign: 'right', marginTop: '-10px', marginBottom: '16px', fontSize: '12px' }}>
              <span style={{ color: '#F0C84A', cursor: 'pointer' }} onClick={() => { setTab('forgot'); setError(''); setResetSent(false); }}>Forgot Password?</span>
            </div>
            {error && <div className="error-msg">{error}</div>}
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>
        )}

        {tab === 'forgot' && (
          resetSent ? (
            <div className="success-msg">If that email is registered with NestList, a reset link has been sent. Check your inbox (and spam folder).</div>
          ) : (
            <form onSubmit={handleForgotPassword}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" name="email" autoComplete="username" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required />
              </div>
              {error && <div className="error-msg">{error}</div>}
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '12px' }}>
                <span style={{ color: '#F0C84A', cursor: 'pointer' }} onClick={() => { setTab('login'); setError(''); }}>Back to Login</span>
              </div>
            </form>
          )
        )}

        {tab === 'register' && (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" name="name" autoComplete="name" value={name} onChange={e => handleNameChange(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Your NestList Handle</label>
              <input className="form-input" name="handle" autoComplete="off" value={handle} onChange={e => handleHandleChange(e.target.value)} required />
              <div style={{ fontSize: '11px', color: 'rgba(248,244,236,0.5)', marginTop: '6px' }}>
                Your listings will live at nestlist.sg/{cleanHandle || '<handle>'}/…
              </div>
              {cleanHandle && (
                <div style={{ fontSize: '11px', marginTop: '4px' }}>
                  {handleChecking ? (
                    <span style={{ color: 'rgba(248,244,236,0.5)' }}>Checking availability...</span>
                  ) : handleStatus && handleStatus.available ? (
                    <span style={{ color: '#4CAF50' }}>✓ available</span>
                  ) : handleStatus && handleStatus.available === false ? (
                    <span style={{ color: '#ff6b6b' }}>✗ {handleStatus.reason || 'That handle is taken'}</span>
                  ) : null}
                </div>
              )}
              {handleStatus && handleStatus.available === false && Array.isArray(handleStatus.suggestions) && handleStatus.suggestions.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                  {handleStatus.suggestions.map(s => (
                    <span
                      key={s}
                      onClick={() => pickSuggestion(s)}
                      style={{ fontSize: '11px', padding: '3px 9px', border: '1px solid rgba(240,200,74,0.4)', borderRadius: '12px', color: '#F0C84A', cursor: 'pointer' }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" name="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Agency</label>
              <input className="form-input" value={agency} onChange={e => setAgency(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Specialty</label>
              <select className="form-select" value={specialty} onChange={e => setSpecialty(e.target.value)}>
                <option>Landed. GCB. Penthouses. Ultra Luxury</option>
                <option>Luxury Condominiums</option>
                <option>HDB Resale</option>
                <option>Commercial Properties</option>
                <option>Industrial Properties</option>
                <option>Residential (All Types)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{position:'relative'}}>
                <input className="form-input" type={showPassword ? 'text' : 'password'} name="new-password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} style={{paddingRight:'40px'}} required />
                <EyeIcon open={showPassword} onClick={() => setShowPassword(v => !v)} style={eyeStyle} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <div style={{position:'relative'}}>
                <input className="form-input" type={showPassword2 ? 'text' : 'password'} name="confirm-password" autoComplete="new-password" value={password2} onChange={e => setPassword2(e.target.value)} style={{paddingRight:'40px'}} required />
                <EyeIcon open={showPassword2} onClick={() => setShowPassword2(v => !v)} style={eyeStyle} />
              </div>
            </div>
            {error && <div className="error-msg">{error}</div>}
            {registerSuggestions.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                {registerSuggestions.map(s => (
                  <span
                    key={s}
                    onClick={() => pickSuggestion(s)}
                    style={{ fontSize: '11px', padding: '3px 9px', border: '1px solid rgba(240,200,74,0.4)', borderRadius: '12px', color: '#F0C84A', cursor: 'pointer' }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
