import React, { useEffect, useState } from 'react';

const API = process.env.REACT_APP_API_URL || '';

function generateCaption(listing, platform, style) {
  const listingUrl = `nestlist.sg/l/${listing.id}`;
  const cleanContent = (listing.content || '')
    .replace(/^---/gm, '')
    .replace(/\*\*/g, '')
    .replace(/^#+\s/gm, '')
    .replace(/\|/g, '')
    .trim();
  const body = cleanContent.slice(0, 800);
  const shortBody = cleanContent.slice(0, 300);

  const bullets = `• ${listing.land_size ? listing.land_size.toLocaleString() + ' sqft land' : 'Land on request'}
• ${listing.built_up ? listing.built_up.toLocaleString() + ' sqft built-up' : 'Built-up on request'}
• ${listing.bedrooms || 'Bedrooms on request'}
• ${listing.features || 'Premium features throughout'}`;

  const tldr = {
    facebook: `🏡 ${listing.property_type} | ${listing.location}
💰 SGD ${listing.price}

${bullets}

Interested? Visit ${listingUrl} or drop us a message.

#NestList #NestListPrestige #SingaporeProperty #GCB #LandedProperty #PropertySG #RealEstate #Singapore #LuxuryProperty`,

    instagram: `🏡 ${listing.property_type}
📍 ${listing.location}
💰 SGD ${listing.price}

${bullets}

DM me or visit ${listingUrl} 🏡

#NestList #NestListPrestige #SingaporeProperty #SingaporeRealEstate #GCB #LandedProperty #LuxuryHomes #PropertySingapore #HomeSweetHome #SingaporeHome #PropertyAgent #RealEstateSingapore #LuxuryLiving #DreamHome #PropertyForSale`,

    linkedin: `🏡 New Listing | ${listing.property_type}
📍 ${listing.location}
💰 SGD ${listing.price}

Key details:
${bullets}

Available for private viewing. Connect with me or visit ${listingUrl}.

#SingaporeRealEstate #LuxuryProperty #GCB #PropertyInvestment #SingaporeProperty #NestList`,

    whatsapp: `Hi! Quick summary of a new listing:

🏡 *${listing.property_type}*
📍 ${listing.location}
💰 SGD ${listing.price}

${bullets}

Reply to arrange a private viewing or visit ${listingUrl}. Thank you! 🙏`
  };

  const long = {
    facebook: `🏡 NEW LISTING | ${listing.property_type}
📍 ${listing.location}
💰 SGD ${listing.price}

${body}...

Interested? Visit ${listingUrl} or drop us a message.

#NestList #NestListPrestige #SingaporeProperty #GCB #LandedProperty #PropertySG #RealEstate #Singapore #LuxuryProperty #HomeSweetHome`,

    instagram: `✨ ${listing.property_type} for sale ✨

📍 ${listing.location}
💰 SGD ${listing.price}

${shortBody}...

DM me or visit ${listingUrl} to find out more 🏡

#NestList #NestListPrestige #SingaporeProperty #SingaporeRealEstate #GCB #LandedProperty #LuxuryHomes #PropertySingapore #HomeSweetHome #SingaporeHome #PropertyAgent #RealEstateSingapore #LuxuryLiving #DreamHome #SingaporeLife #PropertyInvestment #LandedHouse #Bungalow #PenthouseLiving #PropertyForSale`,

    linkedin: `🏡 New Property Listing | ${listing.property_type}

📍 Location: ${listing.location}
💰 Asking Price: SGD ${listing.price}

${listing.content?.slice(0, 600) || ''}...

This is a rare opportunity in one of Singapore's most sought-after addresses. Whether you are an investor or an owner-occupier seeking the finest in Singapore living, I would welcome a private conversation.

Reach me at ${listingUrl} or reply directly to this post.

#SingaporeRealEstate #LuxuryProperty #GCB #PropertyInvestment #SingaporeProperty #RealEstate #LandedProperty #HighNetWorth #PropertySG #NestList`,

    whatsapp: `Hi! I have a new property listing that may interest you.

🏡 *${listing.property_type}*
📍 ${listing.location}
💰 SGD ${listing.price}

${listing.content?.slice(0, 400) || ''}...

For more details and to arrange a private viewing, please reply to this message or visit ${listingUrl}.

Thank you! 🙏`
  };

  const combined = {
    facebook: `🏡 NEW LISTING | ${listing.property_type}
📍 ${listing.location}
💰 SGD ${listing.price}

⚡ AT A GLANCE
${bullets}

📖 THE FULL STORY
${body}...

Interested? Visit ${listingUrl} or drop us a message.

#NestList #NestListPrestige #SingaporeProperty #GCB #LandedProperty #PropertySG #RealEstate #Singapore #LuxuryProperty #HomeSweetHome`,

    instagram: `🏡 ${listing.property_type}
📍 ${listing.location}
💰 SGD ${listing.price}

⚡ AT A GLANCE
${bullets}

📖 THE STORY
${shortBody}...

DM me or visit ${listingUrl} 🏡

#NestList #NestListPrestige #SingaporeProperty #SingaporeRealEstate #GCB #LandedProperty #LuxuryHomes #PropertySingapore #HomeSweetHome #SingaporeHome #PropertyAgent #RealEstateSingapore #LuxuryLiving #DreamHome #PropertyForSale`,

    linkedin: `🏡 New Property Listing | ${listing.property_type}
📍 ${listing.location}
💰 SGD ${listing.price}

⚡ AT A GLANCE
${bullets}

📖 THE FULL STORY
${listing.content?.slice(0, 600) || ''}...

Available for private viewing. Reach me at ${listingUrl} or reply directly.

#SingaporeRealEstate #LuxuryProperty #GCB #PropertyInvestment #SingaporeProperty #RealEstate #LandedProperty #HighNetWorth #PropertySG #NestList`,

    whatsapp: `Hi! I have a new property listing that may interest you.

🏡 *${listing.property_type}*
📍 ${listing.location}
💰 SGD ${listing.price}

⚡ AT A GLANCE
${bullets}

📖 THE FULL STORY
${listing.content?.slice(0, 400) || ''}...

Reply to arrange a private viewing or visit ${listingUrl}. Thank you! 🙏`
  };

  const tiktok = {
    tiktok: `${listing.property_type} in ${listing.location} 🏡
SGD ${listing.price}
${listing.land_size ? listing.land_size.toLocaleString() + ' sqft' : ''} | ${listing.bedrooms || ''}
Upload your property video and use this caption 👆
DM to arrange viewing 🔑

#SingaporeProperty #PropertySG #LandedSG #RealEstateSG #SGProperty`
  };

  if (platform === 'tiktok') return tiktok.tiktok || '';
  if (style === 'tldr') return tldr[platform] || '';
  if (style === 'combined') return combined[platform] || '';
  return long[platform] || '';
}

const PLATFORMS = [
  { key: 'facebook', label: 'Facebook', emoji: '📘', url: 'https://www.facebook.com' },
  { key: 'instagram', label: 'Instagram', emoji: '📸', url: 'https://www.instagram.com' },
  { key: 'linkedin', label: 'LinkedIn', emoji: '💼', url: 'https://www.linkedin.com/feed' },
  { key: 'whatsapp', label: 'WhatsApp', emoji: '💬', url: 'https://web.whatsapp.com' },
  { key: 'tiktok', label: 'TikTok', emoji: '🎵', url: 'https://www.tiktok.com/upload' },
];

const STYLES = [
  { key: 'long', label: '📖 Full Story' },
  { key: 'tldr', label: '⚡ Quick Summary' },
  { key: 'combined', label: '📖⚡ Both' },
];

export default function MyListings({ agent, token, onEdit }) {
  const [listings, setListings] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [activePlatform, setActivePlatform] = useState({});
  const [captionStyle, setCaptionStyle] = useState({});
  const [copied, setCopied] = useState({});
  const [deleting, setDeleting] = useState({});
  const [downloading, setDownloading] = useState({});
  const [shareStatus, setShareStatus] = useState({});
  const [posterLoading, setPosterLoading] = useState({});
  const [posterError, setPosterError] = useState({});
  const [posterPhotoIndex, setPosterPhotoIndex] = useState({});
  const [deletingPhoto, setDeletingPhoto] = useState({});

  useEffect(() => {
    fetch(`${API}/api/listings`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => setListings(Array.isArray(data) ? data : []))
      .catch(() => setListings([]));
  }, [token]);

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

  const handleDownloadAll = async (listing) => {
    if (!listing.images || listing.images.length === 0) return;
    setDownloading(d => ({ ...d, [listing.id]: true }));
    try {
      const res = await fetch(`${API}/api/listings/${listing.id}/download-images`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `listing-photos-${listing.id.slice(0, 8)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download photos. Please save images individually.');
    } finally {
      setDownloading(d => ({ ...d, [listing.id]: false }));
    }
  };

  const handleWebShare = async (listing, platform, caption) => {
    if (!navigator.share) {
      alert('Web sharing is not supported on this browser. Please use Copy Caption instead.');
      return;
    }
    try {
      await navigator.share({
        title: `${listing.property_type} | ${listing.location}`,
        text: caption,
        url: `https://nestlist.sg/l/${listing.id}`
      });
      setShareStatus(s => ({ ...s, [`${listing.id}-${platform}`]: 'Shared!' }));
      setTimeout(() => setShareStatus(s => ({ ...s, [`${listing.id}-${platform}`]: '' })), 2500);
    } catch (err) {
      if (err.name !== 'AbortError') {
        alert('Share failed. Please use Copy Caption instead.');
      }
    }
  };

  const handleGeneratePoster = async (listing) => {
    setPosterLoading(p => ({ ...p, [listing.id]: true }));
    setPosterError(e => ({ ...e, [listing.id]: '' }));
    try {
      const photoIndex = posterPhotoIndex[listing.id] || 0;
      const res = await fetch(`${API}/api/listings/${listing.id}/generate-poster?photo_index=${photoIndex}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to generate poster');
      setListings(prev => prev.map(l => l.id === listing.id ? { ...l, poster_url: data.poster_url } : l));
    } catch (err) {
      setPosterError(e => ({ ...e, [listing.id]: err.message }));
    } finally {
      setPosterLoading(p => ({ ...p, [listing.id]: false }));
    }
  };

  const handleDeletePhoto = async (listing, index) => {
    if (!window.confirm('Remove this photo from the listing?')) return;
    setDeletingPhoto(d => ({ ...d, [`${listing.id}-${index}`]: true }));
    try {
      const res = await fetch(`${API}/api/listings/${listing.id}/images/${index}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to delete photo');
      setListings(prev => prev.map(l => l.id === listing.id ? { ...l, images: data.images } : l));
      setPosterPhotoIndex(p => ({ ...p, [listing.id]: 0 }));
    } catch (err) {
      alert('Failed to delete photo.');
    } finally {
      setDeletingPhoto(d => ({ ...d, [`${listing.id}-${index}`]: false }));
    }
  };

  const getActivePlatform = (listingId) => activePlatform[listingId] || 'facebook';
  const getCaptionStyle = (listingId) => captionStyle[listingId] || 'long';
  const canWebShare = !!navigator.share;

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
                onClick={(e) => { e.stopPropagation(); onEdit(l); }}
                title="Edit listing"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '4px',
                  opacity: 0.7,
                  transition: 'opacity 0.2s'
                }}
              >
                ✏️
              </button>
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
            <div>
              {l.images && l.images.length > 0 && (
                <div style={{ padding: '16px 20px 0' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    {l.images.map((url, i) => {
                      const isPosterPhoto = (posterPhotoIndex[l.id] || 0) === i;
                      return (
                        <div key={i} style={{ position: 'relative' }}>
                          <img
                            src={url}
                            alt={`Property ${i + 1}`}
                            onClick={() => setPosterPhotoIndex(p => ({ ...p, [l.id]: i }))}
                            style={{
                              width: '150px', height: '110px', objectFit: 'cover', borderRadius: '4px',
                              border: isPosterPhoto ? '2px solid #F0C84A' : '1px solid rgba(212,175,55,0.3)',
                              cursor: 'pointer'
                            }}
                          />
                          {isPosterPhoto && (
                            <div style={{
                              position: 'absolute', top: '4px', left: '4px',
                              background: 'rgba(240,200,74,0.9)', color: '#1a1a2e',
                              borderRadius: '3px', fontSize: '9px', padding: '2px 6px', fontWeight: 'bold'
                            }}>
                              ★ POSTER
                            </div>
                          )}
                          <button
                            onClick={() => handleDeletePhoto(l, i)}
                            disabled={deletingPhoto[`${l.id}-${i}`]}
                            title="Remove this photo"
                            style={{
                              position: 'absolute', top: '4px', right: '4px',
                              background: 'rgba(0,0,0,0.7)', border: 'none',
                              color: '#ff6b6b', borderRadius: '50%',
                              width: '20px', height: '20px',
                              cursor: 'pointer', fontSize: '12px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              lineHeight: '1'
                            }}
                          >
                            ×
                          </button>
                          <a
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
                      );
                    })}
                  </div>
                  <button
                    onClick={() => handleDownloadAll(l)}
                    disabled={downloading[l.id]}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(212,175,55,0.4)',
                      color: '#F0C84A',
                      padding: '8px 16px',
                      borderRadius: '3px',
                      cursor: downloading[l.id] ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      fontFamily: "'Montserrat', sans-serif",
                      opacity: downloading[l.id] ? 0.5 : 1,
                      marginBottom: '4px'
                    }}
                  >
                    {downloading[l.id] ? 'Preparing ZIP...' : `⬇ Download All ${l.images.length} Photos as ZIP`}
                  </button>
                </div>
              )}

              <div className="listing-card-body">{(l.content || '').replace(/\*\*/g, '').replace(/^#+\s/gm, '').replace(/---/g, '').trim()}</div>

              <div style={{
                margin: '8px 20px 20px',
                background: 'rgba(212,175,55,0.06)',
                border: '1px solid rgba(212,175,55,0.25)',
                borderRadius: '4px',
                padding: '16px'
              }}>
                <div className="section-label" style={{ marginBottom: '4px' }}>📲 Share This Listing</div>
                <div style={{ fontSize: '12px', color: 'rgba(248,244,236,0.5)', marginBottom: '14px' }}>
                  Select a platform and caption style. Copy and paste directly into your own account.
                </div>

                <div style={{
                  marginBottom: '16px',
                  paddingBottom: '16px',
                  borderBottom: '1px solid rgba(212,175,55,0.15)'
                }}>
                  <div style={{ fontSize: '12px', color: 'rgba(248,244,236,0.5)', marginBottom: '10px' }}>
                    Branded poster for your post/story. Click a photo above (marked ★ POSTER) to choose the background.
                  </div>
                  {l.poster_url && (
                    <div style={{ marginBottom: '10px' }}>
                      <img
                        src={l.poster_url}
                        alt="Branded poster"
                        style={{ maxWidth: '220px', borderRadius: '4px', border: '1px solid rgba(212,175,55,0.3)', display: 'block' }}
                      />
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      className="btn-primary"
                      style={{ maxWidth: '220px' }}
                      onClick={() => handleGeneratePoster(l)}
                      disabled={posterLoading[l.id]}
                    >
                      {posterLoading[l.id] ? 'Generating...' : l.poster_url ? '🖼️ Regenerate Poster' : '🖼️ Generate Poster'}
                    </button>
                    {l.poster_url && (
                      <a
                        href={l.poster_url}
                        download
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(212,175,55,0.4)',
                          color: '#F0C84A',
                          padding: '10px 16px',
                          borderRadius: '3px',
                          fontSize: '12px',
                          fontFamily: "'Montserrat', sans-serif",
                          textDecoration: 'none'
                        }}
                      >
                        ⬇ Download
                      </a>
                    )}
                  </div>
                  {posterError[l.id] && (
                    <div style={{ color: '#e08080', fontSize: '12px', marginTop: '8px' }}>{posterError[l.id]}</div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
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

                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                  {STYLES.map(s => (
                    <button
                      key={s.key}
                      onClick={() => setCaptionStyle(c => ({ ...c, [l.id]: s.key }))}
                      style={{
                        background: getCaptionStyle(l.id) === s.key ? 'rgba(212,175,55,0.15)' : 'transparent',
                        border: `1px solid ${getCaptionStyle(l.id) === s.key ? '#D4AF37' : 'rgba(212,175,55,0.2)'}`,
                        color: getCaptionStyle(l.id) === s.key ? '#F0C84A' : 'rgba(248,244,236,0.5)',
                        padding: '5px 12px',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontFamily: "'Montserrat', sans-serif",
                        transition: 'all 0.2s'
                      }}
                    >
                      {s.label}
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
                      {generateCaption(l, p.key, getCaptionStyle(l.id))}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <button
                        className="btn-primary"
                        style={{ maxWidth: '180px' }}
                        onClick={() => handleCopy(l.id, p.key, generateCaption(l, p.key, getCaptionStyle(l.id)))}
                      >
                        {copied[`${l.id}-${p.key}`] ? '✅ Copied!' : '📋 Copy Caption'}
                      </button>

                      {canWebShare && (
                        <button
                          onClick={() => handleWebShare(l, p.key, generateCaption(l, p.key, getCaptionStyle(l.id)))}
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(212,175,55,0.4)',
                            color: '#F0C84A',
                            padding: '10px 16px',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontFamily: "'Montserrat', sans-serif"
                          }}
                        >
                          {shareStatus[`${l.id}-${p.key}`] || '📤 Share'}
                        </button>
                      )}

                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(212,175,55,0.4)',
                          color: '#F0C84A',
                          padding: '10px 20px',
                          borderRadius: '3px',
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
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
