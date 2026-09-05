import React, { useEffect, useState } from 'react';

const API = process.env.REACT_APP_API_URL || '';

// NestList Auto-Reply: one click turns a buyer enquiry into a personalized WhatsApp
// reply that carries the listing's video, poster and link -- not just plain text.
export default function AutoReplyModal({ token, enquiry, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetch(`${API}/api/enquiries/${enquiry.id}/auto-reply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async r => {
        const data = await r.json().catch(() => null);
        if (!r.ok) {
          throw new Error((data && data.detail) || `Could not generate a reply right now (${r.status}). Please try again.`);
        }
        return data;
      })
      .then(data => {
        if (cancelled) return;
        setResult(data);
        setMessage(data.message || '');
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err.message || 'Could not generate a reply right now. Please try again.');
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [enquiry.id, token]);

  const handleCopy = async () => {
    const text = result && result.listing_link ? `${message}\n\n${result.listing_link}` : message;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      setError('Could not copy to clipboard -- please select and copy the text manually.');
    }
  };

  const hasWhatsApp = result && result.whatsapp_link;
  const hasAssets = result && (result.video_url || result.poster_url || result.listing_link);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      zIndex: 600, padding: '40px 16px', overflowY: 'auto'
    }} onClick={onClose}>
      <div
        style={{
          background: 'var(--green-dark)', border: '1px solid rgba(212,175,55,0.3)',
          borderRadius: '6px', padding: '28px', maxWidth: '560px', width: '100%'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="page-title" style={{ fontSize: '22px', marginBottom: '4px' }}>
          Auto-Reply
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(248,244,236,0.5)', marginBottom: '18px' }}>
          For {enquiry.client_name}
        </div>

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', padding: '20px 0', color: 'rgba(248,244,236,0.6)', fontSize: '13px' }}>
            Generating a personalized reply...
          </div>
        )}

        {!loading && error && (
          <div>
            <div className="error-msg">{error}</div>
            <button type="button" onClick={onClose}>Close</button>
          </div>
        )}

        {!loading && !error && result && (
          <div>
            <div className="form-group">
              <label className="form-label">Message (editable)</label>
              <textarea
                className="form-textarea"
                rows={7}
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
            </div>
            {hasAssets && (
              <div style={{
                background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)',
                borderRadius: '4px', padding: '12px 14px', marginBottom: '16px'
              }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(248,244,236,0.6)', marginBottom: '10px' }}>
                  Included with your reply:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {result.video_url && (
                    <a href={result.video_url} target="_blank" rel="noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cream)', fontSize: '13px', textDecoration: 'none' }}>
                      Video tour
                    </a>
                  )}
                  {result.poster_url && (
                    <a href={result.poster_url} target="_blank" rel="noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--cream)', fontSize: '13px', textDecoration: 'none' }}>
                      <img
                        src={result.poster_url}
                        alt="Listing poster"
                        style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '3px', border: '1px solid rgba(212,175,55,0.3)' }}
                      />
                      Poster
                    </a>
                  )}
                  {result.listing_link && (
                    <a href={result.listing_link} target="_blank" rel="noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cream)', fontSize: '13px', textDecoration: 'none', wordBreak: 'break-all' }}>
                      Listing page
                    </a>
                  )}
                </div>
              </div>
            )}
            <div>hasWhatsApp: {String(hasWhatsApp)}, copied: {String(copied)}</div>
            <button type="button" className="btn-gold" onClick={handleCopy}>Copy message</button>
            <button type="button" onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
