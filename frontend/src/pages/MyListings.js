import React, { useEffect, useState } from 'react';

const API = process.env.REACT_APP_API_URL || '';

export default function MyListings({ agent, token }) {
  const [listings, setListings] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [fbResults, setFbResults] = useState({});
  const [fbLoading, setFbLoading] = useState({});

  useEffect(() => {
    fetch(`${API}/api/listings`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setListings).catch(() => {});
  }, [token]);

  const postToFacebook = async (id) => {
    setFbLoading(l => ({ ...l, [id]: true }));
    try {
      const res = await fetch(`${API}/api/listings/${id}/post-facebook`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed');
      setFbResults(r => ({ ...r, [id]: `Posted! Post ID: ${data.post_id}` }));
    } catch (err) {
      setFbResults(r => ({ ...r, [id]: `Failed: ${err.message}` }));
    } finally {
      setFbLoading(l => ({ ...l, [id]: false }));
    }
  };

  return (
    <div className="page-content">
      <div className="page-title">My Listings</div>
      {listings.length > 0
        ? <div className="page-subtitle">You have {listings.length} listing(s).</div>
        : <div className="page-subtitle" style={{fontStyle:'italic'}}>No listings yet. Go to New Listing to create your first one.</div>
      }
      {listings.map(l => (
        <div key={l.id} className="listing-card">
          <div className="listing-card-header" onClick={() => setExpanded(expanded === l.id ? null : l.id)}>
            <div className="listing-card-title">{l.property_type} — {l.location} — SGD {l.price}</div>
            <div className="listing-card-date">{l.created_at?.slice(0,10)} {expanded === l.id ? '▲' : '▼'}</div>
          </div>
          {expanded === l.id && (
            <>
              {l.images && l.images.length > 0 && (
                <div style={{padding:'16px 20px 0', display:'flex', gap:'8px', flexWrap:'wrap'}}>
                  {l.images.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`Property ${i+1}`}
                      style={{width:'150px', height:'110px', objectFit:'cover', borderRadius:'4px', border:'1px solid rgba(212,175,55,0.3)'}}
                    />
                  ))}
                </div>
              )}
              <div className="listing-card-body">{l.content}</div>
              <div style={{padding:'0 20px 16px', display:'flex', gap:'12px', flexWrap:'wrap', alignItems:'center'}}>
                <button className="btn-gold" style={{maxWidth:'260px'}} onClick={() => postToFacebook(l.id)} disabled={fbLoading[l.id]}>
                  {fbLoading[l.id] ? 'Posting...' : 'Post to Facebook'}
                </button>
              </div>
              {fbResults[l.id] && (
                <div className={fbResults[l.id].startsWith('Posted') ? 'success-msg' : 'error-msg'} style={{margin:'0 20px 16px'}}>
                  {fbResults[l.id]}
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
