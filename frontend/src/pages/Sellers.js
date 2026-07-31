import React, { useEffect, useState } from 'react';
import { formatPriceM } from '../utils/format';
import SellerFormModal from '../components/SellerFormModal';

const API = process.env.REACT_APP_API_URL || '';

const TEMP_STYLE = {
  HOT: { color: '#ff6b6b', emoji: '🔥' },
  WARM: { color: '#F0C84A', emoji: '🌤️' },
  COLD: { color: '#7ab4dc', emoji: '❄️' }
};

export default function Sellers({ token, onSelectSeller }) {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tempFilter, setTempFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const load = () => {
    fetch(`${API}/api/sellers`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => { setSellers(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(load, [token]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this seller lead?')) return;
    await fetch(`${API}/api/sellers/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setSellers(s => s.filter(x => x.id !== id));
  };

  const filtered = sellers.filter(s => {
    if (tempFilter && s.temperature !== tempFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const haystack = [s.seller_name, s.seller_phone, s.location].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const hotCount = sellers.filter(s => s.temperature === 'HOT').length;

  return (
    <div className="page-content">
      <div className="page-title">Sellers</div>
      <div className="page-subtitle" style={{ marginBottom: '20px' }}>
        Track sellers you're pitching before their mandate is signed — convert to a live listing when ready.
      </div>

      <button className="btn-gold" style={{ maxWidth: '220px', marginBottom: '20px' }} onClick={() => setShowAdd(true)}>
        + Add Seller Lead
      </button>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
        <input
          className="form-input"
          style={{ maxWidth: '280px' }}
          placeholder="Search name, phone, address..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="form-select" style={{ maxWidth: '160px' }} value={tempFilter} onChange={e => setTempFilter(e.target.value)}>
          <option value="">All temps</option>
          <option value="HOT">🔥 HOT</option>
          <option value="WARM">🌤️ WARM</option>
          <option value="COLD">❄️ COLD</option>
        </select>
      </div>

      <div style={{ fontSize: '12px', color: 'rgba(248,244,236,0.5)', marginBottom: '18px' }}>
        {filtered.length} of {sellers.length} sellers · {hotCount} HOT to focus on · sorted HOT first
      </div>

      {loading && <div style={{ color: 'rgba(248,244,236,0.4)', fontSize: '13px' }}>Loading...</div>}

      {!loading && filtered.length === 0 && (
        <div style={{ color: 'rgba(248,244,236,0.4)', fontStyle: 'italic', fontSize: '13px' }}>
          {sellers.length === 0 ? 'No seller leads yet. Click Add Seller Lead to begin.' : 'No sellers match your search/filters.'}
        </div>
      )}

      {filtered.map(s => {
        const temp = TEMP_STYLE[s.temperature] || TEMP_STYLE.WARM;
        return (
          <div key={s.id} className="listing-card" style={{ cursor: 'pointer' }} onClick={() => onSelectSeller(s.id)}>
            <div className="listing-card-header">
              <div className="listing-card-title">
                <span style={{ color: temp.color, fontWeight: 'bold', marginRight: '10px' }}>{temp.emoji} {s.temperature}</span>
                {s.seller_name}
                {s.seller_phone && <span style={{ marginLeft: '10px', fontSize: '12px', color: 'rgba(248,244,236,0.4)' }}>{s.seller_phone}</span>}
              </div>
              <div className="listing-card-date">{s.mandate_type || 'No mandate yet'}</div>
            </div>
            <div style={{ padding: '0 20px 16px', display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '12px', color: 'rgba(248,244,236,0.6)' }}>
              <div><span style={{ color: 'rgba(248,244,236,0.4)' }}>Property: </span>{s.location || 'Address not yet given'}{s.property_type ? ` (${s.property_type})` : ''}</div>
              <div><span style={{ color: 'rgba(248,244,236,0.4)' }}>Asking: </span>{s.price ? `SGD ${formatPriceM(s.price)}` : '—'}</div>
              <div><span style={{ color: 'rgba(248,244,236,0.4)' }}>Timeline: </span>{s.timeline || '—'}</div>
              <button onClick={(e) => handleDelete(e, s.id)}
                style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid rgba(255,107,107,0.4)', color: '#ff6b6b', borderRadius: '3px', padding: '2px 10px', cursor: 'pointer', fontSize: '11px' }}>
                Delete
              </button>
            </div>
          </div>
        );
      })}

      {showAdd && (
        <SellerFormModal
          token={token}
          onClose={() => setShowAdd(false)}
          onSaved={(newSeller) => { setShowAdd(false); setSellers(s => [newSeller, ...s]); }}
        />
      )}
    </div>
  );
}
