import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { formatPriceM, sanitizeLocation } from '../utils/format';

const API = process.env.REACT_APP_API_URL || '';
const LOGO = '/logo_2.png';

const emptyForm = { client_name: '', phone: '', email: '', message: '', website: '' };

export default function PublicListing() {
  const { listingId } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    fetch(`${API}/api/public/listings/${listingId}`)
      .then(r => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then(setListing)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [listingId]);

  const cleanContent = (text) => (text || '').replace(/\*\*/g, '').replace(/---/g, '').replace(/# /g, '').trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.client_name) { setError('Please enter your name.'); return; }
    setSubmitting(true); setError('');
    try {
      const res = await fetch(`${API}/api/public/enquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId, ...form })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Something went wrong. Please try again.');
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const wrapStyle = { maxWidth: '720px', margin: '0 auto', padding: '40px 24px 80px' };

  if (loading) {
    return <div style={wrapStyle}><div style={{ color: 'var(--cream-dim)', fontSize: '13px' }}>Loading listing...</div></div>;
  }

  if (notFound) {
    return (
      <div style={wrapStyle}>
        <img src={LOGO} alt="NestList" style={{ height: '40px', marginBottom: '32px' }} />
        <div className="page-title">Listing Not Found</div>
        <div className="page-subtitle">This listing may have been removed or the link is incorrect.</div>
      </div>
    );
  }

  return (
    <div style={wrapStyle}>
      <img src={LOGO} alt="NestList" style={{ height: '40px', marginBottom: '32px' }} />

      {listing.images && listing.images.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: listing.images.length > 1 ? '1fr 1fr' : '1fr', gap: '8px', marginBottom: '28px', borderRadius: '4px', overflow: 'hidden' }}>
          {listing.images.slice(0, 6).map((url, i) => (
            <img key={i} src={url} alt={`Property ${i + 1}`} style={{ width: '100%', height: '260px', objectFit: 'cover' }} />
          ))}
        </div>
      )}

      <div className="section-label">{listing.property_type}</div>
      <div className="page-title" style={{ marginBottom: '4px' }}>{sanitizeLocation(listing.location)}</div>
      <div style={{ fontSize: '20px', color: 'var(--gold-light)', marginBottom: '20px', fontFamily: "'Cormorant Garamond', serif" }}>
        SGD {formatPriceM(listing.price)}
      </div>

      {(listing.bedrooms || listing.land_size > 0 || listing.built_up > 0) && (
        <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', fontSize: '13px', color: 'var(--cream-dim)', flexWrap: 'wrap' }}>
          {listing.bedrooms && <div>{listing.bedrooms}</div>}
          {listing.land_size > 0 && <div>Land: {listing.land_size.toLocaleString()} sqft</div>}
          {listing.built_up > 0 && <div>Built-up: {listing.built_up.toLocaleString()} sqft</div>}
        </div>
      )}

      <div style={{ fontSize: '15px', lineHeight: '1.8', color: 'var(--cream-dim)', whiteSpace: 'pre-wrap', marginBottom: '32px' }}>
        {cleanContent(listing.content)}
      </div>

      {listing.agent && listing.agent.name && (
        <div style={{ fontSize: '13px', color: 'var(--cream-faint)', marginBottom: '32px', borderTop: '1px solid rgba(212,175,55,0.2)', paddingTop: '16px' }}>
          Listed by {listing.agent.name}{listing.agent.agency ? ` · ${listing.agent.agency}` : ''}
        </div>
      )}

      <div style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: '4px', padding: '24px' }}>
        {submitted ? (
          <div className="success-msg">
            Thank you — your enquiry has been sent to the listing agent, who will be in touch shortly.
          </div>
        ) : (
          <>
            <div className="section-label" style={{ marginBottom: '16px' }}>Enquire About This Property</div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Your Name *</label>
                <input className="form-input" value={form.client_name} onChange={e => set('client_name', e.target.value)} placeholder="e.g. Mr Tan Wei Ming" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="e.g. +65 9123 4567" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="e.g. you@email.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea className="form-textarea" value={form.message} onChange={e => set('message', e.target.value)} placeholder="Tell us about your budget, timeline, and what you're looking for..." rows={4} />
              </div>
              <input
                type="text"
                name="website"
                value={form.website}
                onChange={e => set('website', e.target.value)}
                autoComplete="off"
                tabIndex={-1}
                style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px' }}
                aria-hidden="true"
              />
              {error && <div className="error-msg">{error}</div>}
              <button className="btn-primary" type="submit" disabled={submitting}>
                {submitting ? 'Sending...' : 'Send Enquiry'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
