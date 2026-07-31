import React, { useState } from 'react';
import { millionsToFullNumber, fullNumberToMillions } from '../utils/format';

const API = process.env.REACT_APP_API_URL || '';

const PROPERTY_TYPES = [
  '', 'Good Class Bungalow (GCB)', 'Detached/Bungalow', 'Semi-Detached',
  'Inter-Terrace', 'Corner Terrace', 'Penthouse'
];
const MANDATE_OPTIONS = ['', 'Exclusive', 'Open (Non-Exclusive)', 'Co-broke'];

const emptyForm = {
  seller_name: '', seller_phone: '', seller_email: '', location: '', property_type: '',
  priceMillions: '', land_size: '', motivation: '', timeline: '', mandate_type: '',
  temperature: 'WARM', seller_notes: ''
};

export default function SellerFormModal({ token, seller, initialValues, onClose, onSaved }) {
  const isEditing = !!seller;
  const [form, setForm] = useState(() => seller ? {
    seller_name: seller.seller_name || '', seller_phone: seller.seller_phone || '',
    seller_email: seller.seller_email || '', location: seller.location || '',
    property_type: seller.property_type || '',
    priceMillions: seller.price ? fullNumberToMillions(seller.price) : '',
    land_size: seller.land_size || '', motivation: seller.motivation || '',
    timeline: seller.timeline || '', mandate_type: seller.mandate_type || '',
    temperature: seller.temperature || 'WARM', seller_notes: seller.seller_notes || ''
  } : { ...emptyForm, ...(initialValues || {}) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.seller_name) { setError('Seller name is required.'); return; }
    setSaving(true); setError('');
    const payload = {
      seller_name: form.seller_name,
      seller_phone: form.seller_phone,
      seller_email: form.seller_email,
      location: form.location,
      property_type: form.property_type,
      price: form.priceMillions ? millionsToFullNumber(form.priceMillions) : '',
      land_size: form.land_size ? Number(form.land_size) : 0,
      motivation: form.motivation,
      timeline: form.timeline,
      mandate_type: form.mandate_type,
      temperature: form.temperature,
      seller_notes: form.seller_notes
    };
    try {
      const url = isEditing ? `${API}/api/sellers/${seller.id}` : `${API}/api/sellers`;
      const res = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to save seller');
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
          borderRadius: '6px', padding: '28px', maxWidth: '760px', width: '100%'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="page-title" style={{ marginBottom: '18px' }}>
          {isEditing ? 'Edit Seller Lead' : 'Add Seller Lead'}
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Seller Name</label>
              <input className="form-input" value={form.seller_name} onChange={e => set('seller_name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={form.seller_phone} onChange={e => set('seller_phone', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.seller_email} onChange={e => set('seller_email', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Property Address</label>
              <input className="form-input" value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. 12 Nassim Road, District 10" />
            </div>
            <div className="form-group">
              <label className="form-label">Property Type</label>
              <select className="form-select" value={form.property_type} onChange={e => set('property_type', e.target.value)}>
                {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t || '-- Not Yet Known --'}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Asking Price Expectation (SGD, in Millions)</label>
              <input className="form-input" type="number" step="0.1" value={form.priceMillions} onChange={e => set('priceMillions', e.target.value)} placeholder="e.g. 12.5" />
            </div>
            <div className="form-group">
              <label className="form-label">Land Size (sqft, if known)</label>
              <input className="form-input" type="number" value={form.land_size} onChange={e => set('land_size', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Mandate Type</label>
              <select className="form-select" value={form.mandate_type} onChange={e => set('mandate_type', e.target.value)}>
                {MANDATE_OPTIONS.map(o => <option key={o} value={o}>{o || '-- Select --'}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Timeline</label>
              <input className="form-input" value={form.timeline} onChange={e => set('timeline', e.target.value)} placeholder="e.g. Wants to sell within 3 months" />
            </div>
            <div className="form-group">
              <label className="form-label">Motivation for Selling</label>
              <input className="form-input" value={form.motivation} onChange={e => set('motivation', e.target.value)} placeholder="e.g. Upgrading, relocating, downsizing" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Temperature</label>
            <div>
              {['HOT', 'WARM', 'COLD'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('temperature', t)}
                  style={{
                    background: form.temperature === t ? (t === 'HOT' ? 'rgba(224,82,82,0.25)' : t === 'WARM' ? 'rgba(240,200,74,0.25)' : 'rgba(120,170,220,0.25)') : 'transparent',
                    border: `1px solid ${form.temperature === t ? (t === 'HOT' ? '#e05252' : t === 'WARM' ? '#D4AF37' : '#7ab4dc') : 'rgba(212,175,55,0.3)'}`,
                    color: form.temperature === t ? (t === 'HOT' ? '#e05252' : t === 'WARM' ? '#F0C84A' : '#7ab4dc') : 'rgba(248,244,236,0.6)',
                    padding: '8px 18px', borderRadius: '3px', cursor: 'pointer', marginRight: '8px',
                    fontFamily: "'Montserrat', sans-serif", fontSize: '12px', fontWeight: 600
                  }}
                >
                  {t === 'HOT' ? '🔥 HOT — ready to mandate' : t === 'WARM' ? '🌤️ WARM — considering' : '❄️ COLD — not ready'}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes (must-know things — expectations, other agents involved, tenant situation, etc.)</label>
            <textarea className="form-textarea" rows={3} value={form.seller_notes} onChange={e => set('seller_notes', e.target.value)} />
          </div>

          {error && <div className="error-msg">{error}</div>}
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button className="btn-primary" type="submit" disabled={saving} style={{ maxWidth: '200px' }}>
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Seller Lead'}
            </button>
            <button type="button" className="btn-gold" style={{ maxWidth: '140px' }} onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
