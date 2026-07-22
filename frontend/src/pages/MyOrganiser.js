import React, { useEffect, useState } from 'react';

const API = process.env.REACT_APP_API_URL || '';

export default function MyOrganiser({ agent, token }) {
  const [listings, setListings] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [removing, setRemoving] = useState({});
  const [removeError, setRemoveError] = useState({});

  useEffect(() => {
    fetch(`${API}/api/listings?status=all`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => setListings(Array.isArray(data) ? data : []))
      .catch(() => setListings([]));
  }, [token]);

  const handleRemovePermanently = async (id) => {
    if (!window.confirm('Permanently delete this listing and all its photos? This cannot be undone.')) return;
    setRemoving(r => ({ ...r, [id]: true }));
    setRemoveError(e => ({ ...e, [id]: '' }));
    try {
      const res = await fetch(`${API}/api/listings/${id}/permanent`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'Failed to permanently delete listing');
      setListings(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      setRemoveError(e => ({ ...e, [id]: err.message }));
    } finally {
      setRemoving(r => ({ ...r, [id]: false }));
    }
  };

  return (
    <div className="page-content">
      <div className="page-title">My Organiser</div>
      {listings.length > 0
        ? <div className="page-subtitle">Full history of every listing you've created -- active or archived.</div>
        : <div className="page-subtitle" style={{ fontStyle: 'italic' }}>No listings yet. Anything you create or delete will show up here.</div>
      }

      {listings.map(l => (
        <div key={l.id} className="listing-card">
          <div className="listing-card-header" onClick={() => setExpanded(expanded === l.id ? null : l.id)}>
            <div className="listing-card-title">
              {l.property_type} — {l.location} — SGD {l.price}
              <span style={{
                marginLeft: 10,
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 3,
                background: l.status === 'archived' ? 'rgba(224,128,128,0.15)' : 'rgba(120,200,140,0.15)',
                color: l.status === 'archived' ? '#e08080' : '#7fcf9a'
              }}>
                {l.status === 'archived' ? 'Archived' : 'Active'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {l.status === 'archived' && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemovePermanently(l.id); }}
                  disabled={removing[l.id]}
                  title="Remove permanently"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '18px',
                    padding: '4px',
                    opacity: removing[l.id] ? 0.4 : 0.7,
                    transition: 'opacity 0.2s'
                  }}
                >
                  🗑️
                </button>
              )}
              <div className="listing-card-date">{l.created_at?.slice(0, 10)} {expanded === l.id ? '▲' : '▼'}</div>
            </div>
          </div>

          {expanded === l.id && (
            <div className="listing-card-body">
              {removeError[l.id] && <div className="error-msg">{removeError[l.id]}</div>}
              {l.images && l.images.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  {l.images.slice(0, 5).map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`Property ${i + 1}`}
                      style={{ width: '110px', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid rgba(212,175,55,0.3)' }}
                    />
                  ))}
                </div>
              )}
              {(l.content || '').replace(/\*\*/g, '').replace(/^#+\s/gm, '').replace(/---/g, '').trim()}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
