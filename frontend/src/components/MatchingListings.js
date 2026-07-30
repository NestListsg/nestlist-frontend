import React, { useEffect, useState } from 'react';
import { formatPriceM } from '../utils/format';

const API = process.env.REACT_APP_API_URL || '';

export default function MatchingListings({ token, buyerId }) {
  const [matches, setMatches] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/buyers/${buyerId}/matches`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setMatches(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setMatches([]); setLoading(false); });
  }, [token, buyerId]);

  if (loading) return null;

  return (
    <div style={{
      background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.25)',
      borderRadius: '4px', padding: '20px 24px', marginBottom: '24px'
    }}>
      <div className="section-label" style={{ marginBottom: '12px' }}>🎯 Matching Listings ({matches.length})</div>
      {matches.length === 0 ? (
        <div style={{ fontSize: '13px', color: 'rgba(248,244,236,0.4)', fontStyle: 'italic' }}>
          None of your active listings match this buyer's preferences yet.
        </div>
      ) : (
        matches.map(m => (
          <div key={m.listing_id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: '8px', padding: '10px 0', borderBottom: '1px solid rgba(212,175,55,0.1)'
          }}>
            <div style={{ fontSize: '13px' }}>
              <span style={{ color: 'var(--cream)', fontWeight: 'bold', marginRight: '8px' }}>
                {m.property_type} — {m.location} — SGD {formatPriceM(m.price)}
              </span>
              <div style={{ color: 'rgba(248,244,236,0.5)', fontSize: '12px', marginTop: '2px' }}>
                {m.reasons.join(' · ')}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
