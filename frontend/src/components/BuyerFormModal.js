import React, { useState } from 'react';
import { millionsToFullNumber, fullNumberToMillions } from '../utils/format';

const API = process.env.REACT_APP_API_URL || '';

const DISTRICTS = Array.from({ length: 28 }, (_, i) => `D${i + 1}`);
const PROPERTY_TYPES = [
  'Good Class Bungalow (GCB)', 'Detached/Bungalow', 'Semi-Detached',
  'Inter-Terrace', 'Corner Terrace', 'Penthouse'
];
const TENURE_OPTIONS = ['', 'Freehold', '999-year Leasehold', '99-year Leasehold', 'Any'];
const BUYING_FOR_OPTIONS = ['', 'Own stay', 'Investment', 'Both'];
const SOLD_HOUSE_OPTIONS = ['', 'Yes', 'No', 'N/A'];

const emptyForm = {
  name: '', phone: '', email: '', temperature: 'WARM', status: 'new',
  contact_date: '', contact_via: '', budget_min: '', budget_max: '',
  timeline: '', districts: '', property_types: '', land_min: '',
  tenure_pref: '', buying_for: '', sold_house: '', financing: '',
  must_haves: '', deal_breakers: '', notes: ''
};

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: active ? 'rgba(212,175,55,0.25)' : 'transparent',
        border: `1px solid ${active ? '#D4AF37' : 'rgba(212,175,55,0.3)'}`,
        color: active ? '#F0C84A' : 'rgba(248,244,236,0.6)',
        padding: '5px 12px',
        borderRadius: '3px',
        cursor: 'pointer',
        fontSize: '11px',
        fontFamily: "'Montserrat', sans-serif",
        marginRight: '6px',
        marginBottom: '6px'
      }}
    >
      {children}
    </button>
  );
}

export default function BuyerFormModal({ token, buyer, initialValues, onClose, onSaved }) {
  const isEditing = !!buyer;
  const [form, setForm] = useState(() => buyer ? {
    name: buyer.name || '', phone: buyer.phone || '', email: buyer.email || '',
    temperature: buyer.temperature || 'WARM', status: buyer.status || 'new',
    contact_date: buyer.contact_date || '', contact_via: buyer.contact_via || '',
    budget_min: buyer.budget_min ? fullNumberToMillions(buyer.budget_min) : '',
    budget_max: buyer.budget_max ? fullNumberToMillions(buyer.budget_max) : '',
    timeline: buyer.timeline || '', districts: buyer.districts || '',
    property_types: buyer.property_types || '', land_min: buyer.land_min || '',
    tenure_pref: buyer.tenure_pref || '', buying_for: buyer.buying_for || '',
    sold_house: buyer.sold_house || '', financing: buyer.financing || '',
    must_haves: buyer.must_haves || '', deal_breakers: buyer.deal_breakers || '',
    notes: buyer.notes || ''
  } : { ...emptyForm, ...(initialValues || {}) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const selectedDistricts = form.districts ? form.districts.split(',').filter(Boolean) : [];
  const toggleDistrict = (d) => {
    const next = selectedDistricts.includes(d) ? selectedDistricts.filter(x => x !== d) : [...selectedDistricts, d];
    set('districts', next.join(','));
  };
  const selectedTypes = form.property_types ? form.property_types.split(',').filter(Boolean) : [];
  const toggleType = (t) => {
    const next = selectedTypes.includes(t) ? selectedTypes.filter(x => x !== t) : [...selectedTypes, t];
    set('property_types', next.join(','));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) { setError('Name is required.'); return; }
    setSaving(true); setError('');
    const payload = {
      ...form,
      budget_min: form.budget_min ? Number(millionsToFullNumber(form.budget_min)) : 0,
      budget_max: form.budget_max ? Number(millionsToFullNumber(form.budget_max)) : 0,
      land_min: form.land_min ? Number(form.land_min) : 0,
    };
    try {
      const url = isEditing ? `${API}/api/buyers/${buyer.id}` : `${API}/api/buyers`;
      const res = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to save buyer');
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
          {isEditing ? 'Edit Buyer' : 'Add Buyer'}
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                {['new', 'contacted', 'viewing', 'offer', 'closed', 'cold'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Budget Min (SGD, in Millions)</label>
              <input className="form-input" type="number" step="0.1" value={form.budget_min} onChange={e => set('budget_min', e.target.value)} placeholder="e.g. 8" />
            </div>
            <div className="form-group">
              <label className="form-label">Budget Max (SGD, in Millions)</label>
              <input className="form-input" type="number" step="0.1" value={form.budget_max} onChange={e => set('budget_max', e.target.value)} placeholder="e.g. 10" />
            </div>
            <div className="form-group">
              <label className="form-label">Min Land (sqft)</label>
              <input className="form-input" type="number" value={form.land_min} onChange={e => set('land_min', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Tenure Preference</label>
              <select className="form-select" value={form.tenure_pref} onChange={e => set('tenure_pref', e.target.value)}>
                {TENURE_OPTIONS.map(t => <option key={t} value={t}>{t || '-- Select --'}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Timeline</label>
              <input className="form-input" value={form.timeline} onChange={e => set('timeline', e.target.value)} placeholder="e.g. ASAP, 3-6 months" />
            </div>
            <div className="form-group">
              <label className="form-label">Financing</label>
              <input className="form-input" value={form.financing} onChange={e => set('financing', e.target.value)} placeholder="e.g. Cash-heavy, small loan" />
            </div>
            <div className="form-group">
              <label className="form-label">Buying For</label>
              <select className="form-select" value={form.buying_for} onChange={e => set('buying_for', e.target.value)}>
                {BUYING_FOR_OPTIONS.map(o => <option key={o} value={o}>{o || '-- Select --'}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Sold House Yet?</label>
              <select className="form-select" value={form.sold_house} onChange={e => set('sold_house', e.target.value)}>
                {SOLD_HOUSE_OPTIONS.map(o => <option key={o} value={o}>{o || '-- Select --'}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date Contacted</label>
              <input className="form-input" type="date" value={form.contact_date} onChange={e => set('contact_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">How They Contacted</label>
              <input className="form-input" value={form.contact_via} onChange={e => set('contact_via', e.target.value)} placeholder="e.g. Walk-in at open house" />
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
                  {t === 'HOT' ? '🔥 HOT' : t === 'WARM' ? '🌤️ WARM' : '❄️ COLD'}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Districts</label>
            <div>{DISTRICTS.map(d => <Chip key={d} active={selectedDistricts.includes(d)} onClick={() => toggleDistrict(d)}>{d}</Chip>)}</div>
          </div>

          <div className="form-group">
            <label className="form-label">Property Types</label>
            <div>{PROPERTY_TYPES.map(t => <Chip key={t} active={selectedTypes.includes(t)} onClick={() => toggleType(t)}>{t}</Chip>)}</div>
          </div>

          <div className="form-group">
            <label className="form-label">Must-haves</label>
            <textarea className="form-textarea" rows={2} value={form.must_haves} onChange={e => set('must_haves', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Deal-breakers</label>
            <textarea className="form-textarea" rows={2} value={form.deal_breakers} onChange={e => set('deal_breakers', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">General Feedback / Notes</label>
            <textarea className="form-textarea" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>

          {error && <div className="error-msg">{error}</div>}
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button className="btn-primary" type="submit" disabled={saving} style={{ maxWidth: '200px' }}>
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Buyer'}
            </button>
            <button type="button" className="btn-gold" style={{ maxWidth: '140px' }} onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
