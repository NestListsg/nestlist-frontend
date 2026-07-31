import React, { useEffect, useState } from 'react';
import { formatPriceM } from '../utils/format';
import SellerFormModal from '../components/SellerFormModal';

const API = process.env.REACT_APP_API_URL || '';

const TEMP_STYLE = {
  HOT: { color: '#e05252', bg: 'rgba(224,82,82,0.25)', emoji: '🔥' },
  WARM: { color: '#F0C84A', bg: 'rgba(240,200,74,0.25)', emoji: '🌤️' },
  COLD: { color: '#7ab4dc', bg: 'rgba(120,170,220,0.25)', emoji: '❄️' }
};

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <div style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(248,244,236,0.4)', marginBottom: '3px' }}>{label}</div>
      <div style={{ fontSize: '13px', color: 'var(--cream-dim)' }}>{value}</div>
    </div>
  );
}

export default function SellerProfile({ token, sellerId, onBack, onConvertToListing }) {
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);

  const load = () => {
    setLoading(true);
    fetch(`${API}/api/sellers/${sellerId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => { setSeller(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(load, [token, sellerId]);

  const handleTempChange = async (temperature) => {
    const res = await fetch(`${API}/api/sellers/${sellerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...seller, temperature })
    });
    const data = await res.json();
    setSeller(s => ({ ...s, temperature: data.temperature }));
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${seller.seller_name}'s seller lead?`)) return;
    await fetch(`${API}/api/sellers/${sellerId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    onBack();
  };

  if (loading) return <div className="page-content"><div style={{ color: 'rgba(248,244,236,0.4)', fontSize: '13px' }}>Loading...</div></div>;
  if (!seller) return <div className="page-content"><div style={{ color: 'rgba(248,244,236,0.4)', fontSize: '13px' }}>Seller not found.</div></div>;

  const temp = TEMP_STYLE[seller.temperature] || TEMP_STYLE.WARM;

  return (
    <div className="page-content">
      <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--gold-light)', cursor: 'pointer', fontSize: '13px', marginBottom: '16px', padding: 0 }}>
        ← Back to Sellers
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div className="page-title" style={{ marginBottom: '6px' }}>{seller.seller_name}</div>
          <div style={{ fontSize: '12px', color: 'rgba(248,244,236,0.5)' }}>
            {seller.mandate_type || 'No mandate yet'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-gold" style={{ maxWidth: '100px' }} onClick={() => setShowEdit(true)}>Edit</button>
          <button onClick={handleDelete}
            style={{ background: 'transparent', border: '1px solid rgba(255,107,107,0.4)', color: '#ff6b6b', padding: '10px 16px', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}>
            Delete
          </button>
        </div>
      </div>

      <div style={{ margin: '20px 0' }}>
        {['HOT', 'WARM', 'COLD'].map(t => {
          const ts = TEMP_STYLE[t];
          const active = seller.temperature === t;
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
        <div className="section-label" style={{ marginBottom: '16px' }}>Property & Seller Details</div>
        <div className="form-grid" style={{ rowGap: '16px' }}>
          <Field label="Property Address" value={seller.location} />
          <Field label="Property Type" value={seller.property_type} />
          <Field label="Asking Price Expectation" value={seller.price ? `SGD ${formatPriceM(seller.price)}` : ''} />
          <Field label="Land Size" value={seller.land_size ? `${Number(seller.land_size).toLocaleString()} sqft` : ''} />
          <Field label="Mandate Type" value={seller.mandate_type} />
          <Field label="Timeline" value={seller.timeline} />
          <Field label="Motivation for Selling" value={seller.motivation} />
          <Field label="Phone" value={seller.seller_phone} />
          <Field label="Email" value={seller.seller_email} />
        </div>
        {seller.seller_notes && (
          <div style={{ marginTop: '18px' }}>
            <Field label="Notes" value={seller.seller_notes} />
          </div>
        )}
      </div>

      <div style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '4px', padding: '20px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '13px', color: 'rgba(248,244,236,0.6)', marginBottom: '14px' }}>
          Mandate signed and ready to market? Convert this lead into a live listing.
        </div>
        <button className="btn-primary" style={{ maxWidth: '260px', margin: '0 auto' }} onClick={() => onConvertToListing(seller)}>
          🏡 Convert to Listing
        </button>
      </div>

      {showEdit && (
        <SellerFormModal
          token={token}
          seller={seller}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => { setShowEdit(false); setSeller(s => ({ ...s, ...updated })); }}
        />
      )}
    </div>
  );
}
