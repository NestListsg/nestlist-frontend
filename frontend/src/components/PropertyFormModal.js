import React, { useEffect, useState } from 'react';
import { formatPriceM, millionsToFullNumber, fullNumberToMillions } from '../utils/format';

const API = process.env.REACT_APP_API_URL || '';

const KIND_LABELS = {
  viewed_me: 'Viewed with me',
  recommended: 'Recommendation',
  viewed_other: 'Viewed with another agent'
};

export default function PropertyFormModal({ token, buyerId, kind, entry, onClose, onSaved }) {
  const isEditing = !!entry;
  const [useListing, setUseListing] = useState(!!(entry?.listing_id));
  const [listings, setListings] = useState([]);
  const [form, setForm] = useState({
    listing_id: entry?.listing_id || '',
    address: entry?.address || '',
    rawPrice: entry?.price || 0,
    priceMillions: entry?.price && !entry?.listing_id ? fullNumberToMillions(entry.price) : '',
    date: entry?.date || '',
    agent_name: entry?.agent_name || '',
    interest: entry?.interest || '',
    feedback: entry?.feedback || ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    fetch(`${API}/api/listings`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setListings).catch(() => {});
  }, [token]);

  const handleListingPick = (id) => {
    set('listing_id', id);
    const l = listings.find(x => x.id === id);
    if (l) {
      set('address', l.location || '');
      set('rawPrice', l.price || 0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.address) { setError('Property address is required.'); return; }
    setSaving(true); setError('');
    const price = useListing ? Number(form.rawPrice) || 0 : Number(millionsToFullNumber(form.priceMillions)) || 0;
    const payload = {
      listing_id: useListing ? form.listing_id : '',
      address: form.address,
      price,
      kind,
      date: form.date,
      agent_name: form.agent_name,
      interest: form.interest,
      feedback: form.feedback
    };
    try {
      const url = isEditing
        ? `${API}/api/buyers/${buyerId}/properties/${entry.id}`
        : `${API}/api/buyers/${buyerId}/properties`;
      const res = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to save');
      onSaved(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      zIndex: 500, padding: '40px 16px', overflowY: 'auto'
    }} onClick={onClose}>
      <div
        style={{
          background: 'var(--green-dark)', border: '1px solid rgba(212,175,55,0.3)',
          borderRadius: '6px', padding: '28px', maxWidth: '560px', width: '100%'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="page-title" style={{ marginBottom: '18px' }}>
          {isEditing ? 'Edit Entry' : `${KIND_LABELS[kind]} — Add Entry`}
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Property</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <button type="button" onClick={() => setUseListing(true)}
                style={{
                  flex: 1, padding: '8px', borderRadius: '3px', cursor: 'pointer',
                  background: useListing ? 'rgba(212,175,55,0.2)' : 'transparent',
                  border: `1px solid ${useListing ? '#D4AF37' : 'rgba(212,175,55,0.3)'}`,
                  color: useListing ? '#F0C84A' : 'rgba(248,244,236,0.6)', fontSize: '12px'
                }}>My NestList Listing</button>
              <button type="button" onClick={() => setUseListing(false)}
                style={{
                  flex: 1, padding: '8px', borderRadius: '3px', cursor: 'pointer',
                  background: !useListing ? 'rgba(212,175,55,0.2)' : 'transparent',
                  border: `1px solid ${!useListing ? '#D4AF37' : 'rgba(212,175,55,0.3)'}`,
                  color: !useListing ? '#F0C84A' : 'rgba(248,244,236,0.6)', fontSize: '12px'
                }}>Other Address</button>
            </div>
            {useListing ? (
              <select className="form-select" value={form.listing_id} onChange={e => handleListingPick(e.target.value)}>
                <option value="">-- Select a Listing --</option>
                {listings.map(l => (
                  <option key={l.id} value={l.id}>{l.location} — SGD {formatPriceM(l.price)}</option>
                ))}
              </select>
            ) : (
              <input className="form-input" value={form.address} onChange={e => set('address', e.target.value)} placeholder="e.g. 12 Nassim Road" />
            )}
          </div>

          {!useListing && (
            <div className="form-group">
              <label className="form-label">Price (SGD, in Millions)</label>
              <input className="form-input" type="number" step="0.1" value={form.priceMillions} onChange={e => set('priceMillions', e.target.value)} placeholder="e.g. 12.5" />
            </div>
          )}

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Interest Level</label>
              <select className="form-select" value={form.interest} onChange={e => set('interest', e.target.value)}>
                <option value="">-- Select --</option>
                <option value="interested">Interested</option>
                <option value="considering">Considering</option>
                <option value="not_keen">Not Keen</option>
              </select>
            </div>
          </div>

          {kind === 'viewed_other' && (
            <div className="form-group">
              <label className="form-label">Other Agent's Name</label>
              <input className="form-input" value={form.agent_name} onChange={e => set('agent_name', e.target.value)} />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Feedback</label>
            <textarea className="form-textarea" rows={3} value={form.feedback} onChange={e => set('feedback', e.target.value)} placeholder="Buyer's reaction, thoughts, next steps..." />
          </div>

          {error && <div className="error-msg">{error}</div>}
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button className="btn-primary" type="submit" disabled={saving} style={{ maxWidth: '200px' }}>
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Entry'}
            </button>
            <button type="button" className="btn-gold" style={{ maxWidth: '140px' }} onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
