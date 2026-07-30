import React, { useEffect, useState } from 'react';
import { formatPriceM } from '../utils/format';
import BuyerFormModal from '../components/BuyerFormModal';

const API = process.env.REACT_APP_API_URL || '';

const TEMP_STYLE = {
  HOT: { color: '#ff6b6b', emoji: '🔥' },
  WARM: { color: '#F0C84A', emoji: '🌤️' },
  COLD: { color: '#7ab4dc', emoji: '❄️' }
};

export default function Buyers({ token, onSelectBuyer }) {
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tempFilter, setTempFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const load = () => {
    fetch(`${API}/api/buyers`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => { setBuyers(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(load, [token]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this buyer and all their property records?')) return;
    await fetch(`${API}/api/buyers/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setBuyers(b => b.filter(x => x.id !== id));
  };

  const filtered = buyers.filter(b => {
    if (tempFilter && b.temperature !== tempFilter) return false;
    if (statusFilter && b.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const haystack = [b.name, b.phone, b.districts, b.property_types].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const hotCount = buyers.filter(b => b.temperature === 'HOT').length;

  const budgetRange = (b) => {
    if (b.budget_min && b.budget_max) return `SGD ${formatPriceM(b.budget_min)} – ${formatPriceM(b.budget_max)}`;
    if (b.budget_max) return `Up to SGD ${formatPriceM(b.budget_max)}`;
    if (b.budget_min) return `From SGD ${formatPriceM(b.budget_min)}`;
    return '—';
  };

  return (
    <div className="page-content">
      <div className="page-title">Buyer Management</div>
      <div className="page-subtitle" style={{ marginBottom: '20px' }}>
        Track your buyers, their preferences, and every property they've seen.
      </div>

      <button className="btn-gold" style={{ maxWidth: '220px', marginBottom: '20px' }} onClick={() => setShowAdd(true)}>
        + Add Buyer
      </button>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
        <input
          className="form-input"
          style={{ maxWidth: '280px' }}
          placeholder="Search name, phone, district, budget..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="form-select" style={{ maxWidth: '160px' }} value={tempFilter} onChange={e => setTempFilter(e.target.value)}>
          <option value="">All temps</option>
          <option value="HOT">🔥 HOT</option>
          <option value="WARM">🌤️ WARM</option>
          <option value="COLD">❄️ COLD</option>
        </select>
        <select className="form-select" style={{ maxWidth: '160px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {['new', 'contacted', 'viewing', 'offer', 'closed', 'cold'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div style={{ fontSize: '12px', color: 'rgba(248,244,236,0.5)', marginBottom: '18px' }}>
        {filtered.length} of {buyers.length} buyers · {hotCount} HOT to focus on · sorted HOT first
      </div>

      {loading && <div style={{ color: 'rgba(248,244,236,0.4)', fontSize: '13px' }}>Loading...</div>}

      {!loading && filtered.length === 0 && (
        <div style={{ color: 'rgba(248,244,236,0.4)', fontStyle: 'italic', fontSize: '13px' }}>
          {buyers.length === 0 ? 'No buyers yet. Click Add Buyer to begin.' : 'No buyers match your search/filters.'}
        </div>
      )}

      {filtered.map(b => {
        const temp = TEMP_STYLE[b.temperature] || TEMP_STYLE.WARM;
        return (
          <div key={b.id} className="listing-card" style={{ cursor: 'pointer' }} onClick={() => onSelectBuyer(b.id)}>
            <div className="listing-card-header">
              <div className="listing-card-title">
                <span style={{ color: temp.color, fontWeight: 'bold', marginRight: '10px' }}>{temp.emoji} {b.temperature}</span>
                {b.name}
                {b.phone && <span style={{ marginLeft: '10px', fontSize: '12px', color: 'rgba(248,244,236,0.4)' }}>{b.phone}</span>}
              </div>
              <div className="listing-card-date">{b.status}</div>
            </div>
            <div style={{ padding: '0 20px 16px', display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '12px', color: 'rgba(248,244,236,0.6)' }}>
              <div>
                <span style={{ color: 'rgba(248,244,236,0.4)' }}>Looking for: </span>
                {b.property_types ? b.property_types.split(',').join(', ') : '—'}
                {b.districts ? ` in ${b.districts.split(',').join(', ')}` : ''}
              </div>
              <div><span style={{ color: 'rgba(248,244,236,0.4)' }}>Budget: </span>{budgetRange(b)}</div>
              <div><span style={{ color: 'rgba(248,244,236,0.4)' }}>Viewed: </span>{b.viewed_count || 0}</div>
              <div><span style={{ color: 'rgba(248,244,236,0.4)' }}>Rec'd: </span>{b.recommended_count || 0}</div>
              <button onClick={(e) => handleDelete(e, b.id)}
                style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid rgba(255,107,107,0.4)', color: '#ff6b6b', borderRadius: '3px', padding: '2px 10px', cursor: 'pointer', fontSize: '11px' }}>
                Delete
              </button>
            </div>
          </div>
        );
      })}

      {showAdd && (
        <BuyerFormModal
          token={token}
          onClose={() => setShowAdd(false)}
          onSaved={(newBuyer) => { setShowAdd(false); setBuyers(b => [newBuyer, ...b]); }}
        />
      )}
    </div>
  );
}
