import React, { useEffect, useState } from 'react';

const API = process.env.REACT_APP_API_URL || '';

function generateCaption(listing, platform) {
  const body = listing.content?.slice(0, 800) || '';

  if (platform === 'facebook') {
    return `🏡 NEW LISTING | ${listing.property_type}
📍 ${listing.location}
💰 SGD ${listing.price}

${body}...

Interested? Visit nestlist.sg or drop us a message.

#NestList #NestListPrestige #SingaporeProperty #GCB #LandedProperty #PropertySG #RealEstate #Singapore #LuxuryProperty #HomeSweetHome`;
  }

  if (platform === 'instagram') {
    return `✨ ${listing.property_type} for sale ✨

📍 ${listing.location}
💰 SGD ${listing.price}

${listing.content?.slice(0, 300) || ''}...

DM me or visit nestlist.sg to find out more 🏡

#NestList #NestListPrestige #SingaporeProperty #SingaporeRealEstate #GCB #LandedProperty #LuxuryHomes #PropertySingapore #HomeSweetHome #SingaporeHome #PropertyAgent #RealEstateSingapore #LuxuryLiving #DreamHome #SingaporeLife #PropertyInvestment #LandedHouse #Bungalow #PenthouseLiving #PropertyForSale`;
  }

  if (platform === 'linkedin') {
    return `🏡 New Property Listing | ${listing.property_type}

📍 Location: ${listing.location}
💰 Asking Price: SGD ${listing.price}

${listing.content?.slice(0, 600) || ''}...

This is a rare opportunity in one of Singapore's most sought-after addresses. Whether you are an investor or an owner-occupier seeking the finest in Singapore living, I would welcome a private conversation.

Reach me at nestlist.sg or reply directly to this post.

#SingaporeRealEstate #LuxuryProperty #GCB #PropertyInvestment #SingaporeProperty #RealEstate #LandedProperty #HighNetWorth #PropertySG #NestList`;
  }

  if (platform === 'whatsapp') {
    return `Hi! I have a new property listing that may interest you.

🏡 *${listing.property_type}*
📍 ${listing.location}
💰 SGD ${listing.price}

${listing.content?.slice(0, 400) || ''}...

For more details and to arrange a private viewing, please reply to this message or visit nestlist.sg.

Thank you! 🙏`;
  }

  return '';
}

const PLATFORMS = [
  { key: 'facebook', label: 'Facebook', emoji: '📘', url: 'https://www.facebook.com' },
  { key: 'instagram', label: 'Instagram', emoji: '📸', url: 'https://www.instagram.com' },
  { key: 'linkedin', label: 'LinkedIn', emoji: '💼', url: 'https://www.linkedin.com/feed' },
  { key: 'whatsapp', label: 'WhatsApp', emoji: '💬', url: 'https://web.whatsapp.com' },
];

export default function MyListings({ agent, token }) {
  const [listings, setListings] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [fbResults, setFbResults] = useState({});
  const [fbLoading, setFbLoading] = useState({});
  const [activePlatform, setActivePlatform] = useState({});
  const [copied, setCopied] = useState({});
  const [deleting, setDeleting] = useState({});

  useEffect(() => {
    fetch(`${API}/api/listings`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => setListings(Array.isArray(data) ? data : []))
      .catch(() => setListings([]));
  }, [token]);

  const postToFacebook = async (id) => {
    setFbLoading(l => ({ ...l, [id]: true }));
    try {
      const res = await fetch(`${API}/api/listings/${id}/post-facebook`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
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

  const handleCopy = (listingId, platform, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(c => ({ ...c, [`${listingId}-${platform}`]: true }));
      setTimeout(() => setCopied(c => ({ ...c, [`${listingId}-${platform}`]: false })), 2500);
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this listing? This cannot be undone.')) return;
    setDeleting(d => ({ ...d, [id]: true }));
    try {
      await fetch(`${API}/api/listings/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setListings(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      alert('Failed to delete listing.');
    } finally {
      setDeleting(d => ({ ...d, [id]: false }));
    }
  };

  const getActivePlatform = (listingId) => activePlatform[listingId] || 'facebook';

  return (
    <div className="page-content">
      <div className="page-title">My Listings</div>
      {listings.length > 0
        ? <div className="page-subtitle">You have {listings.length} listing(s).</div>
        : <div className="page-subtitle" style={{ fontStyle: 'italic' }}>No listings yet. Go to New Listing to create your first one.</div>
      }

      {listings.map(l => (
        <div key={l.id} className="listing-card">
          <div className="listing-card-header" onClick={() => setExpanded(expanded === l.id ? null : l.id)}>
            <div className="listing-card-title">{l.property_type} — {l.location} — SGD {l.price}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(l.id); }}
                disabled={deleting[l.id]}
                title="Delete listing"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  padding: '4px',
                  opacity: deleting[l.id] ? 0.4 : 0.7,
                  transition: 'opacity 0.2s'
                }}
              >
                🗑️
              </button>
              <div className="listing-card-date">{l.created_at?.slice(0, 10)} {expanded === l.id ? '▲' : '▼'}</div>
            </div>
          </div>

          {expanded === l.id && (
            <>
              {l.images && l.images.length > 0 && (
                <div style={{ padding: '16px 20px 0', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {l.images.map((url, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <img
                        src={url}
                        alt={`Property ${i + 1}`}
                        style={{ width: '150px', height: '110px', objectFit: 'cover', borderRadius: '4px', border: '1px solid rgba(212,175,55,0.3)' }}
                      />
                      
                        href={url}
                        download
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          position: 'absolute', bottom: '4px', right: '4px',
                          background: 'rgba(0,0,0,0.6)', color: '#F0C84A',
                          borderRadius: '3px', fontSize: '10px', padding: '2px 6px',
                          textDecoration: 'none'
                        }}
                      >
                        ⬇ Save
                      </a>
                    </div>
                  ))}
                </div>
              )}

              <div className="listing-card-body">{l.content}</div>

              <div style={{ padding: '0 20px 8px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button className="btn-gold" style={{ maxWidth: '260px' }} onClick={() => postToFacebook(l.id)} disabled={fbLoading[l.id]}>
                  {fbLoading[l.id] ? 'Posting...' : '📘 Auto-Post to NestList Facebook'}
                </button>
              </div>
              {fbResults[l.id] && (
                <div className={fbResults[l.id].startsWith('Posted') ? 'success-msg' : 'error-msg'} style={{ margin: '0 20px 8px' }}>
                  {fbResults[l.id]}
                </div>
              )}

              <div style={{
                margin: '8px 20px 20px',
                background: 'rgba(212,175,55,0.06)',
                border: '1px solid rgba(212,175,55,0.25)',
                borderRadius: '4px',
                padding: '16px'
              }}>
                <div className="section-label" style={{ marginBottom: '12px' }}>📲 Share This Listing</div>
                <div style={{ fontSize: '12px', color: 'rgba(248,244,236,0.5)', marginBottom: '14px' }}>
                  Select a platform, copy the caption, then paste it directly into your own account.
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  {PLATFORMS.map(p => (
                    <button
                      key={p.key}
                      onClick={() => setActivePlatform(a => ({ ...a, [l.id]: p.key }))}
                      style={{
                        background: getActivePlatform(l.id) === p.key ? 'rgba(212,175,55,0.25)' : 'transparent',
                        border: `1px solid ${getActivePlatform(l.id) === p.key ? '#D4AF37' : 'rgba(212,175,55,0.3)'}`,
                        color: getActivePlatform(l.id) === p.key ? '#F0C84A' : 'rgba(248,244,236,0.6)',
                        padding: '6px 14px',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontFamily: "'Montserrat', sans-serif",
                        transition: 'all 0.2s'
                      }}
                    >
                      {p.emoji} {p.label}
                    </button>
                  ))}
                </div>

                {PLATFORMS.map(p => getActivePlatform(l.id) === p.key && (
                  <div key={p.key}>
                    <div style={{
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(212,175,55,0.2)',
                      borderRadius: '4px',
                      padding: '14px',
                      fontSize: '12px',
                      color: 'rgba(248,244,236,0.85)',
                      whiteSpace: 'pre-wrap',
                      maxHeight: '220px',
                      overflowY: 'auto',
                      marginBottom: '12px',
                      lineHeight: '1.6'
                    }}>
                      {generateCaption(l, p.key)}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        className="btn-primary"
                        style={{ maxWidth: '180px' }}
                        onClick={() => handleCopy(l.id, p.key, generateCaption(l, p.key))}
                      >
                        {copied[`${l.id}-${p.key}`] ? '✅ Copied!' : '📋 Copy Caption'}
                      </button>

                      
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(212,175,55,0.4)',
                          color: '#F0C84A',
                          padding: '10px 20px',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontFamily: "'Montserrat', sans-serif",
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}
                      >
                        {p.emoji} Open {p.label}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
