import React, { useState } from 'react';

const API = process.env.REACT_APP_API_URL || '';

export default function MyProfile({ agent, token, onUpdate }) {
  const [form, setForm] = useState({
    name: agent.name || '', agency: agent.agency || '',
    specialty: agent.specialty || '', contact: agent.contact || '',
    tone: agent.tone || 'Warm & Conversational',
    emphasis: agent.emphasis || 'Lifestyle & Prestige',
    signature: agent.signature || 'Where your next chapter begins.'
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

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

  const toneOptions = ['Warm & Conversational', 'Formal & Professional', 'Bold & Punchy'];
  const emphasisOptions = ['Family Living & Emotional Comfort', 'Investment Returns & Capital Appreciation', 'Lifestyle & Prestige', 'Architecture & Design'];

  return (
    <div className="page-content">
      <div className="page-title">My Profile & Style Settings</div>
      <form onSubmit={handleSave}>
        <div className="section-label">Agent Details</div>
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
          </div>
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

        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}
        <button className="btn-primary" type="submit" disabled={loading} style={{maxWidth:'280px', marginTop:'8px'}}>
          {loading ? 'Saving...' : 'Save My Style Settings'}
        </button>
      </form>
    </div>
  );
}
