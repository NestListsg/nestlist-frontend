import React, { useEffect, useState } from 'react';

const API = process.env.REACT_APP_API_URL || '';

const TEMP_STYLE = {
  HOT: { color: '#ff6b6b', emoji: '🔥' },
  WARM: { color: '#F0C84A', emoji: '🌤️' },
  COLD: { color: '#7ab4dc', emoji: '❄️' }
};

function buildWhatsAppUrl(buyer, listingSummary) {
  const digits = (buyer.phone || '').replace(/\D/g, '');
  if (!digits) return null;
  const withCountryCode = digits.length === 8 ? `65${digits}` : digits;
  const message = `Hi ${buyer.name}, I have a new listing that matches what you're looking for — ${listingSummary}. Would you like to know more?`;
  return `https://wa.me/${withCountryCode}?text=${encodeURIComponent(message)}`;
}

export default function MatchingBuyers({ token, listingId, listingSummary }) {
  const [matches, setMatches] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/listings/${listingId}/matches`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setMatches(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setMatches([]); setLoading(false); });
  }, [token, listingId]);

  if (loading) return null;

  return (
    <div style={{
      margin: '8px 20px 0', background: 'rgba(212,175,55,0.06)',
      border: '1px solid rgba(212,175,55,0.25)', borderRadius: '4px', padding: '16px'
    }}>
      <div className="section-label" style={{ marginBottom: '8px' }}>🎯 Matching Buyers ({matches.length})</div>
      {matches.length === 0 ? (
        <div style={{ fontSize: '12px', color: 'rgba(248,244,236,0.4)', fontStyle: 'italic' }}>
          No buyer preferences match this listing yet.
        </div>
      ) : (
        matches.map(m => {
          const temp = TEMP_STYLE[m.temperature] || TEMP_STYLE.WARM;
          const waUrl = buildWhatsAppUrl(m, listingSummary);
          return (
            <div key={m.buyer_id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: '8px', padding: '8px 0', borderBottom: '1px solid rgba(212,175,55,0.1)'
            }}>
              <div style={{ fontSize: '13px' }}>
                <span style={{ color: temp.color, fontWeight: 'bold', marginRight: '8px' }}>{temp.emoji} {m.name}</span>
                <span style={{ color: 'rgba(248,244,236,0.5)', fontSize: '12px' }}>{m.reasons.join(' · ')}</span>
              </div>
              {waUrl && (
                <a href={waUrl} target="_blank" rel="noreferrer"
                  style={{
                    color: '#25D366', border: '1px solid rgba(37,211,102,0.4)', borderRadius: '3px',
                    padding: '4px 10px', fontSize: '11px', textDecoration: 'none', whiteSpace: 'nowrap'
                  }}>
                  💬 Send on WhatsApp
                </a>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
