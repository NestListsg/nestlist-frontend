import React, { useEffect, useState } from 'react';
import { formatPriceM } from '../utils/format';
import BuyerFormModal from '../components/BuyerFormModal';
import PropertyFormModal from '../components/PropertyFormModal';

const API = process.env.REACT_APP_API_URL || '';

const TEMP_STYLE = {
  HOT: { color: '#e05252', bg: 'rgba(224,82,82,0.25)', emoji: '🔥' },
  WARM: { color: '#F0C84A', bg: 'rgba(240,200,74,0.25)', emoji: '🌤️' },
  COLD: { color: '#7ab4dc', bg: 'rgba(120,170,220,0.25)', emoji: '❄️' }
};

const SECTIONS = [
  { kind: 'viewed_me', title: '🏠 Viewed with me', addLabel: '+ Log Viewing' },
  { kind: 'recommended', title: '⭐ My Recommendations', addLabel: '+ Recommend' },
  { kind: 'viewed_other', title: '👀 Viewed with Other Agents', addLabel: '+ Add' }
];

const INTEREST_LABEL = { interested: 'Interested', considering: 'Considering', not_keen: 'Not Keen' };

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <div style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(248,244,236,0.4)', marginBottom: '3px' }}>{label}</div>
      <div style={{ fontSize: '13px', color: 'var(--cream-dim)' }}>{value}</div>
    </div>
  );
}

export default function BuyerProfile({ token, buyerId, onBack }) {
  const [buyer, setBuyer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [propertyModal, setPropertyModal] = useState(null); // { kind, entry }

  const load = () => {
    setLoading(true);
    fetch(`${API}/api/buyers/${buyerId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => { setBuyer(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(load, [token, buyerId]);

  const handleTempChange = async (temperature) => {
    const res = await fetch(`${API}/api/buyers/${buyerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...buyer, temperature })
    });
    const data = await res.json();
    setBuyer(b => ({ ...b, temperature: data.temperature }));
  };

  const handleDeleteBuyer = async () => {
    if (!window.confirm(`Delete ${buyer.name} and all their property records?`)) return;
    await fetch(`${API}/api/buyers/${buyerId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    onBack();
  };

  const handleDeleteProperty = async (propertyId) => {
    if (!window.confirm('Delete this property record?')) return;
    await fetch(`${API}/api/buyers/${buyerId}/properties/${propertyId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
    });
    setBuyer(b => ({ ...b, properties: b.properties.filter(p => p.id !== propertyId) }));
  };

  if (loading) return <div className="page-content"><div style={{ color: 'rgba(248,244,236,0.4)', fontSize: '13px' }}>Loading...</div></div>;
  if (!buyer) return <div className="page-content"><div style={{ color: 'rgba(248,244,236,0.4)', fontSize: '13px' }}>Buyer not found.</div></div>;

  const temp = TEMP_STYLE[buyer.temperature] || TEMP_STYLE.WARM;

  return (
    <div className="page-content">
      <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--gold-light)', cursor: 'pointer', fontSize: '13px', marginBottom: '16px', padding: 0 }}>
        ← Back to Buyers
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div className="page-title" style={{ marginBottom: '6px' }}>{buyer.name}</div>
          <div style={{ fontSize: '12px', color: 'rgba(248,244,236,0.5)' }}>
            <span style={{ textTransform: 'capitalize' }}>{buyer.status}</span>
            {buyer.contact_date && <span> · Contacted {buyer.contact_date}</span>}
            {buyer.contact_via && <span> via {buyer.contact_via}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-gold" style={{ maxWidth: '100px' }} onClick={() => setShowEdit(true)}>Edit</button>
          <button onClick={handleDeleteBuyer}
            style={{ background: 'transparent', border: '1px solid rgba(255,107,107,0.4)', color: '#ff6b6b', padding: '10px 16px', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}>
            Delete
          </button>
        </div>
      </div>

      <div style={{ margin: '20px 0' }}>
        {['HOT', 'WARM', 'COLD'].map(t => {
          const ts = TEMP_STYLE[t];
          const active = buyer.temperature === t;
          return (
            <button key={t} onClick={() => handleTempChange(t)}
              style={{
                background: active ? ts.bg : 'transparent',
                border: `1px solid ${active ? ts.color : 'rgba(212,175,55,0.3)'}`,
                color: active ? ts.color : 'rgba(248,244,236,0.6)',
                padding: '8px 18px', borderRadius: '3px', cursor: 'pointer', marginRight: '8px',
                fontFamily: "'Montserrat', sans-serif", fontSize: '12px', fontWeight: 600
              }}>
              {ts.emoji} {t}
            </button>
          );
        })}
      </div>

      <div style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: '4px', padding: '20px 24px', marginBottom: '24px' }}>
        <div className="section-label" style={{ marginBottom: '16px' }}>Preferences & Contact</div>
        <div className="form-grid" style={{ rowGap: '16px' }}>
          <Field label="Budget Range" value={
            (buyer.budget_min || buyer.budget_max)
              ? `SGD ${buyer.budget_min ? formatPriceM(buyer.budget_min) : '—'} – ${buyer.budget_max ? formatPriceM(buyer.budget_max) : '—'}`
              : ''
          } />
          <Field label="Districts" value={buyer.districts ? buyer.districts.split(',').join(', ') : ''} />
          <Field label="Property Types" value={buyer.property_types ? buyer.property_types.split(',').join(', ') : ''} />
          <Field label="Min Land" value={buyer.land_min ? `${Number(buyer.land_min).toLocaleString()} sqft` : ''} />
          <Field label="Tenure Preference" value={buyer.tenure_pref} />
          <Field label="Timeline" value={buyer.timeline} />
          <Field label="Financing" value={buyer.financing} />
          <Field label="Buying For" value={buyer.buying_for} />
          <Field label="Sold House Yet?" value={buyer.sold_house} />
          <Field label="Phone" value={buyer.phone} />
          <Field label="Email" value={buyer.email} />
        </div>
        {(buyer.must_haves || buyer.deal_breakers || buyer.notes) && (
          <div style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Field label="Must-haves" value={buyer.must_haves} />
            <Field label="Deal-breakers" value={buyer.deal_breakers} />
            <Field label="General Feedback / Notes" value={buyer.notes} />
          </div>
        )}
      </div>

      {SECTIONS.map(section => {
        const entries = (buyer.properties || []).filter(p => p.kind === section.kind);
        return (
          <div key={section.kind} style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div className="section-label">{section.title} ({entries.length})</div>
              <button className="btn-gold" style={{ maxWidth: '160px' }} onClick={() => setPropertyModal({ kind: section.kind, entry: null })}>
                {section.addLabel}
              </button>
            </div>
            {entries.length === 0 ? (
              <div style={{ color: 'rgba(248,244,236,0.4)', fontStyle: 'italic', fontSize: '13px' }}>None recorded.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(212,175,55,0.2)', color: 'rgba(248,244,236,0.4)', textAlign: 'left' }}>
                      <th style={{ padding: '6px 10px', fontWeight: 400, fontSize: '11px' }}>PROPERTY</th>
                      <th style={{ padding: '6px 10px', fontWeight: 400, fontSize: '11px' }}>DATE</th>
                      <th style={{ padding: '6px 10px', fontWeight: 400, fontSize: '11px' }}>INTEREST</th>
                      <th style={{ padding: '6px 10px', fontWeight: 400, fontSize: '11px' }}>FEEDBACK</th>
                      {section.kind === 'viewed_other' && <th style={{ padding: '6px 10px', fontWeight: 400, fontSize: '11px' }}>AGENT</th>}
                      <th style={{ padding: '6px 10px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(212,175,55,0.08)' }}>
                        <td style={{ padding: '8px 10px', color: 'var(--cream-dim)' }}>
                          {p.address}{p.price ? ` — SGD ${formatPriceM(p.price)}` : ''}
                        </td>
                        <td style={{ padding: '8px 10px', color: 'var(--cream-dim)' }}>{p.date || '—'}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--cream-dim)' }}>{INTEREST_LABEL[p.interest] || '—'}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--cream-dim)' }}>{p.feedback || '—'}</td>
                        {section.kind === 'viewed_other' && <td style={{ padding: '8px 10px', color: 'var(--cream-dim)' }}>{p.agent_name || '—'}</td>}
                        <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                          <button onClick={() => setPropertyModal({ kind: section.kind, entry: p })}
                            style={{ background: 'transparent', border: 'none', color: 'var(--gold-light)', cursor: 'pointer', fontSize: '12px', marginRight: '10px' }}>Edit</button>
                          <button onClick={() => handleDeleteProperty(p.id)}
                            style={{ background: 'transparent', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {showEdit && (
        <BuyerFormModal
          token={token}
          buyer={buyer}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => { setShowEdit(false); setBuyer(b => ({ ...b, ...updated })); }}
        />
      )}

      {propertyModal && (
        <PropertyFormModal
          token={token}
          buyerId={buyerId}
          kind={propertyModal.kind}
          entry={propertyModal.entry}
          onClose={() => setPropertyModal(null)}
          onSaved={(saved) => {
            setPropertyModal(null);
            setBuyer(b => {
              const exists = (b.properties || []).some(p => p.id === saved.id);
              const properties = exists
                ? b.properties.map(p => p.id === saved.id ? saved : p)
                : [saved, ...(b.properties || [])];
              return { ...b, properties };
            });
          }}
        />
      )}
    </div>
  );
}
