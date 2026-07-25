import React, { useState, useEffect } from 'react';
import EyeIcon from '../components/EyeIcon';

const API = process.env.REACT_APP_API_URL || '';

export default function MyProfile({ agent, token, onUpdate }) {
  const [form, setForm] = useState({
    name: agent.name || '', agency: agent.agency || '',
    specialty: agent.specialty || '', contact: agent.contact || '',
    tone: agent.tone || 'Warm & Conversational',
    emphasis: agent.emphasis || 'Lifestyle & Prestige',
    signature: agent.signature || 'Where your next chapter begins.',
    poster_color: agent.poster_color || '#1a1a5c',
    poster_template_id: agent.poster_template_id || 'editorial'
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [telegramConnected, setTelegramConnected] = useState(!!agent.telegram_chat_id);
  const [connecting, setConnecting] = useState(false);
  const [pollError, setPollError] = useState('');
  const [igConnecting, setIgConnecting] = useState(false);
  const [igConnectError, setIgConnectError] = useState('');
  const [photoUrl, setPhotoUrl] = useState(agent.photo_url || '');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [posterTemplates, setPosterTemplates] = useState([]);
  const [changingEmail, setChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [showEmailPassword, setShowEmailPassword] = useState(false);

  const eyeStyle = {
    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
    cursor: 'pointer', color: 'rgba(248,244,236,0.8)', fontSize: '16px',
    userSelect: 'none', lineHeight: '1'
  };

  useEffect(() => {
    fetch(`${API}/api/poster-templates`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => setPosterTemplates(Array.isArray(data) ? data : []))
      .catch(() => setPosterTemplates([]));
  }, [token]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true); setSuccess(''); setError('');
    try {
      const res = await fetch(`${API}/api/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Save failed');
      onUpdate(data);
      setSuccess('Profile saved successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = async (e) => {
    e.preventDefault();
    setEmailSaving(true); setEmailError(''); setEmailSuccess('');
    try {
      const res = await fetch(`${API}/api/profile/change-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ new_email: newEmail, current_password: emailPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not change email');
      onUpdate(data);
      setEmailSuccess('Email updated successfully.');
      setChangingEmail(false);
      setNewEmail('');
      setEmailPassword('');
    } catch (err) {
      setEmailError(err.message);
    } finally {
      setEmailSaving(false);
    }
  };

  const pollProfile = async () => {
    try {
      const res = await fetch(`${API}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.telegram_chat_id) {
        setTelegramConnected(true);
        onUpdate(data);
        return true;
      }
    } catch (err) {
      // ignore transient poll errors, keep trying
    }
    return false;
  };

  const handleConnectTelegram = async () => {
    setConnecting(true); setPollError('');
    try {
      const res = await fetch(`${API}/api/profile/telegram-connect-link`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not get connect link');
      window.open(data.link, '_blank');

      let elapsed = 0;
      const interval = setInterval(async () => {
        elapsed += 3000;
        const done = await pollProfile();
        if (done || elapsed >= 30000) {
          clearInterval(interval);
          setConnecting(false);
        }
      }, 3000);
    } catch (err) {
      setPollError(err.message);
      setConnecting(false);
    }
  };

  const handleConnectInstagram = async () => {
    setIgConnecting(true); setIgConnectError('');
    try {
      const res = await fetch(`${API}/api/profile/instagram-connect-link`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not get connect link');
      window.location.href = data.link;
    } catch (err) {
      setIgConnectError(err.message);
      setIgConnecting(false);
    }
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoUploading(true); setPhotoError('');
    try {
      const image_data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch(`${API}/api/profile/photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ image_data })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');
      setPhotoUrl(data.photo_url);
      onUpdate({ ...agent, photo_url: data.photo_url });
    } catch (err) {
      setPhotoError(err.message);
    } finally {
      setPhotoUploading(false);
    }
  };

  const toneOptions = ['Warm & Conversational', 'Formal & Professional', 'Bold & Punchy'];
  const emphasisOptions = ['Family Living & Emotional Comfort', 'Investment Returns & Capital Appreciation', 'Lifestyle & Prestige', 'Architecture & Design'];

  return (
    <div className="page-content">
      <div className="page-title">My Profile & Style Settings</div>
      <form onSubmit={handleSave}>
        <div className="section-label">Agent Details</div>

        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {photoUrl ? (
            <img
              src={photoUrl}
              alt="Profile"
              style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(212,175,55,0.4)' }}
            />
          ) : (
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', color: 'rgba(248,244,236,0.4)', textAlign: 'center'
            }}>
              No photo
            </div>
          )}
          <div>
            <label className="btn-gold" style={{ maxWidth: '200px', display: 'inline-block', cursor: 'pointer', textAlign: 'center' }}>
              {photoUploading ? 'Uploading...' : photoUrl ? 'Change Photo' : 'Upload Headshot'}
              <input type="file" accept="image/*" onChange={handlePhotoSelect} disabled={photoUploading} style={{ display: 'none' }} />
            </label>
            <div style={{ fontSize: '11px', color: 'rgba(248,244,236,0.4)', marginTop: '6px' }}>
              Used on your branded listing posters.
            </div>
            {photoError && <div className="error-msg">{photoError}</div>}
          </div>
        </div>

        <div className="form-grid">
          <div>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Agency</label>
              <input className="form-input" value={form.agency} onChange={e => set('agency', e.target.value)} />
            </div>
          </div>
          <div>
            <div className="form-group">
              <label className="form-label">Specialty</label>
              <input className="form-input" value={form.specialty} onChange={e => set('specialty', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Contact</label>
              <input className="form-input" value={form.contact} onChange={e => set('contact', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Poster Background Color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="color"
                  value={form.poster_color}
                  onChange={e => set('poster_color', e.target.value)}
                  style={{ width: '44px', height: '36px', padding: '2px', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '4px', background: 'transparent', cursor: 'pointer' }}
                />
                <input className="form-input" value={form.poster_color} onChange={e => set('poster_color', e.target.value)} style={{ maxWidth: '120px' }} />
              </div>
            </div>
          </div>
        </div>

        {posterTemplates.length > 0 && (
          <div className="form-group">
            <label className="form-label">Poster Style</label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {posterTemplates.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => set('poster_template_id', t.id)}
                  style={{
                    background: form.poster_template_id === t.id ? 'rgba(212,175,55,0.2)' : 'transparent',
                    border: `2px solid ${form.poster_template_id === t.id ? '#D4AF37' : 'rgba(212,175,55,0.25)'}`,
                    borderRadius: '4px',
                    padding: '10px 16px',
                    cursor: 'pointer',
                    color: form.poster_template_id === t.id ? '#F0C84A' : 'rgba(248,244,236,0.7)',
                    fontSize: '13px',
                    fontFamily: "'Montserrat', sans-serif"
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="divider" />
        <div className="section-label">Account Email</div>
        <div className="form-group">
          {!changingEmail ? (
            <>
              <div style={{ fontSize: '13px', color: 'rgba(248,244,236,0.7)', marginBottom: '10px' }}>
                {agent.email}
              </div>
              <button
                type="button"
                className="btn-gold"
                style={{ maxWidth: '200px' }}
                onClick={() => { setChangingEmail(true); setEmailError(''); setEmailSuccess(''); setNewEmail(''); setEmailPassword(''); }}
              >
                Change Email
              </button>
            </>
          ) : (
            <div>
              <div className="form-group">
                <label className="form-label">New Email</label>
                <input
                  className="form-input"
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <div style={{position:'relative'}}>
                  <input
                    className="form-input"
                    type={showEmailPassword ? 'text' : 'password'}
                    value={emailPassword}
                    onChange={e => setEmailPassword(e.target.value)}
                    style={{paddingRight:'40px'}}
                    required
                  />
                  <EyeIcon open={showEmailPassword} onClick={() => setShowEmailPassword(v => !v)} style={eyeStyle} size={20} />
                </div>
              </div>
              {emailError && <div className="error-msg">{emailError}</div>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={emailSaving}
                  onClick={handleChangeEmail}
                  style={{ maxWidth: '200px' }}
                >
                  {emailSaving ? 'Saving...' : 'Save New Email'}
                </button>
                <button
                  type="button"
                  className="btn-gold"
                  style={{ maxWidth: '120px' }}
                  onClick={() => { setChangingEmail(false); setEmailError(''); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {emailSuccess && <div className="success-msg">{emailSuccess}</div>}
        </div>

        <div className="divider" />
        <div className="section-label">My Writing Style</div>

        <div className="form-group">
          <label className="form-label">Writing Tone</label>
          <select className="form-select" value={form.tone} onChange={e => set('tone', e.target.value)}>
            {toneOptions.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">What I Emphasise</label>
          <select className="form-select" value={form.emphasis} onChange={e => set('emphasis', e.target.value)}>
            {emphasisOptions.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">My Signature Phrase</label>
          <textarea className="form-textarea" value={form.signature} onChange={e => set('signature', e.target.value)} rows={3} />
        </div>

        <div className="divider" />
        <div className="section-label">Notifications</div>
        <div className="form-group">
          {telegramConnected ? (
            <div className="success-msg">Connected — new leads on your listings will be sent to your Telegram.</div>
          ) : (
            <>
              <button
                type="button"
                className="btn-gold"
                style={{ maxWidth: '280px' }}
                onClick={handleConnectTelegram}
                disabled={connecting}
              >
                {connecting ? 'Waiting for Telegram...' : 'Connect Telegram'}
              </button>
              {connecting && (
                <button
                  type="button"
                  className="btn-gold"
                  style={{ maxWidth: '280px', marginTop: '8px' }}
                  onClick={pollProfile}
                >
                  I've connected — refresh status
                </button>
              )}
              {pollError && <div className="error-msg">{pollError}</div>}
            </>
          )}
        </div>

        {agent.can_use_instagram_beta && (
          <div className="form-group">
            {agent.instagram_username ? (
              <div className="success-msg">Connected as @{agent.instagram_username} on Instagram.</div>
            ) : (
              <>
                <button
                  type="button"
                  className="btn-gold"
                  style={{ maxWidth: '280px' }}
                  onClick={handleConnectInstagram}
                  disabled={igConnecting}
                >
                  {igConnecting ? 'Redirecting to Instagram...' : 'Connect Instagram'}
                </button>
                {igConnectError && <div className="error-msg">{igConnectError}</div>}
              </>
            )}
          </div>
        )}

        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}
        <button className="btn-primary" type="submit" disabled={loading} style={{maxWidth:'280px', marginTop:'8px'}}>
          {loading ? 'Saving...' : 'Save My Style Settings'}
        </button>
      </form>
    </div>
  );
}
