import React, { useEffect, useState } from 'react';

const API = process.env.REACT_APP_API_URL || '';

const emptyForm = {
  client_name: '', phone: '', email: '', client_type: 'Buyer',
  budget: '', property_interest: '', notes: '', status: 'Active'
};

export default function Enquiries({ agent, token }) {
  const [enquiries, setEnquiries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    fetch(`${API}/api/enquiries`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setEnquiries).catch(() => {});
  }, [token]);

  const handleSave = async () => {
    if (!form.client_name) { setError('Client name is required.'); return; }
    setSaving(true); setError('');
    try {
      if (editing) {
        const res = await fetch(`${API}/api/enquiries/${editing}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(form)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to update');
        setEnquiries(e => e.map(x => x.id === editing ? data : x));
      } else {
        const res = await fetch(`${API}/api/enquiries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(form)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to save');
        setEnquiries(e => [data, ...e]);
      }
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (enq) => {
    setForm({
      client_name: enq.client_name || '',
      phone: enq.phone || '',
      email: enq.email || '',
      client_type: enq.client_type || 'Buyer',
      budget: enq.budget || '',
      property_interest: enq.property_interest || '',
      notes: enq.notes || '',
      status: enq.status || 'Active'
    });
    setEditing(enq.id);
    setShowForm(true);
    setExpanded(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this client record?')) return;
    await fetch(`${API}/api/enquiries/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
    });
    setEnquiries(e => e.filter(x => x.id !== id));
  };

  const statusColor = (s) => s === 'Active' ? '#4CAF50' : 'rgba(248,244,236,0.4)';
  const scoreColor = (s) => s === 'Hot' ? '#ff6b6b' : s === 'Warm' ? '#F0C84A' : s === 'Cold' ? 'rgba(248,244,236,0.4)' : null;
  const scoreEmoji = (s) => s === 'Hot' ? '🔥' : s === 'Warm' ? '🌤️' : s === 'Cold' ? '❄️' : '';
  const scoreRank = (s) => s === 'Hot' ? 0 : s === 'Warm' ? 1 : s === 'Cold' ? 2 : 3;
  const sortedEnquiries = [...enquiries].sort((a, b) => scoreRank(a.lead_score) - scoreRank(b.lead_score));

  return (
    <div className="page-content">
      <div className="page-title">Client Notes</div>
      <div className="page-subtitle" style={{marginBottom:'20px'}}>
        Record and manage your buyer and seller client details.
      </div>

      <button
        className="btn-gold"
        style={{maxWidth:'220px', marginBottom:'24px'}}
        onClick={() => { setForm(emptyForm); setEditing(null); setShowForm(true); setError(''); }}
      >
        + Add New Client
      </button>

      {showForm && (
        <div style={{background:'rgba(212,175,55,0.06)', border:'1px solid rgba(212,175,55,0.25)', borderRadius:'4px', padding:'20px 24px', marginBottom:'24px'}}>
          <div className="section-label" style={{marginBottom:'16px'}}>{editing ? 'Edit Client' : 'New Client'}</div>
          <div className="form-grid">
            <div>
              <div className="form-group">
                <label className="form-label">Client Name *</label>
                <input className="form-input" value={form.client_name} onChange={e => set('client_name', e.target.value)} placeholder="e.g. Mr Tan Wei Ming" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="e.g. +65 9123 4567" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="e.g. client@email.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-select" value={form.client_type} onChange={e => set('client_type', e.target.value)}>
                  <option>Buyer</option>
                  <option>Seller</option>
                  <option>Both</option>
                </select>
              </div>
            </div>
            <div>
              <div className="form-group">
                <label className="form-label">Budget / Asking Price (SGD)</label>
                <input className="form-input" value={form.budget} onChange={e => set('budget', e.target.value)} placeholder="e.g. 25,000,000" />
              </div>
              <div className="form-group">
                <label className="form-label">Property Interest</label>
                <input className="form-input" value={form.property_interest} onChange={e => set('property_interest', e.target.value)} placeholder="e.g. GCB in Nassim Road area" />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                  <option>Active</option>
                  <option>Closed</option>
                </select>
              </div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Important details, preferences, timeline, source of referral..." rows={4} />
          </div>
          {error && <div className="error-msg">{error}</div>}
          <div style={{display:'flex', gap:'12px', marginTop:'8px'}}>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Client'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); setError(''); }}
              style={{background:'transparent', border:'1px solid rgba(212,175,55,0.4)', color:'#F0C84A', padding:'10px 20px', borderRadius:'3px', cursor:'pointer', fontSize:'13px', fontFamily:"'Montserrat', sans-serif"}}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {enquiries.length === 0 && !showForm && (
        <div style={{color:'rgba(248,244,236,0.4)', fontStyle:'italic', fontSize:'13px'}}>
          No client records yet. Click Add New Client to begin.
        </div>
      )}

      {sortedEnquiries.map(enq => (
        <div key={enq.id} className="listing-card">
          <div className="listing-card-header" onClick={() => setExpanded(expanded === enq.id ? null : enq.id)}>
            <div className="listing-card-title">
              {enq.client_name}
              {enq.lead_score && (
                <span style={{marginLeft:'10px', fontSize:'11px', color:scoreColor(enq.lead_score), fontWeight:'bold'}}>
                  {scoreEmoji(enq.lead_score)} {enq.lead_score}
                </span>
              )}
              <span style={{marginLeft:'10px', fontSize:'11px', color:statusColor(enq.status), fontWeight:'normal'}}>
                {enq.status}
              </span>
              <span style={{marginLeft:'10px', fontSize:'11px', color:'rgba(248,244,236,0.4)', fontWeight:'normal'}}>
                {enq.client_type}
              </span>
            </div>
            <div className="listing-card-date">{enq.created_at?.slice(0,10)} {expanded === enq.id ? '▲' : '▼'}</div>
          </div>
          {expanded === enq.id && (
            <div style={{padding:'16px 20px'}}>
              {enq.source === 'Public Listing Page' && (
                <div style={{marginBottom:'10px', fontSize:'11px', color:'var(--gold-light)', letterSpacing:'0.05em'}}>
                  📍 From Public Listing
                </div>
              )}
              {enq.ai_summary && (
                <div style={{marginBottom:'12px', fontSize:'13px', background:'rgba(212,175,55,0.08)', padding:'10px 12px', borderRadius:'3px', borderLeft:'3px solid var(--gold)'}}>
                  <span style={{color:'rgba(248,244,236,0.5)'}}>AI Summary: </span>{enq.ai_summary}
                </div>
              )}
              {enq.phone && <div style={{marginBottom:'8px', fontSize:'13px'}}><span style={{color:'rgba(248,244,236,0.5)'}}>Phone: </span>{enq.phone}</div>}
              {enq.email && <div style={{marginBottom:'8px', fontSize:'13px'}}><span style={{color:'rgba(248,244,236,0.5)'}}>Email: </span>{enq.email}</div>}
              {enq.budget && <div style={{marginBottom:'8px', fontSize:'13px'}}><span style={{color:'rgba(248,244,236,0.5)'}}>Budget: </span>SGD {enq.budget}</div>}
              {enq.property_interest && <div style={{marginBottom:'8px', fontSize:'13px'}}><span style={{color:'rgba(248,244,236,0.5)'}}>Interest: </span>{enq.property_interest}</div>}
              {enq.notes && (
                <div style={{marginBottom:'12px', fontSize:'13px'}}>
                  <span style={{color:'rgba(248,244,236,0.5)'}}>Notes: </span>
                  <span style={{whiteSpace:'pre-wrap'}}>{enq.notes}</span>
                </div>
              )}
              <div style={{display:'flex', gap:'10px', marginTop:'12px'}}>
                <button className="btn-gold" style={{maxWidth:'120px'}} onClick={() => handleEdit(enq)}>Edit</button>
                <button onClick={() => handleDelete(enq.id)}
                  style={{background:'transparent', border:'1px solid rgba(255,107,107,0.4)', color:'#ff6b6b', padding:'8px 16px', borderRadius:'3px', cursor:'pointer', fontSize:'12px', fontFamily:"'Montserrat', sans-serif"}}>
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
