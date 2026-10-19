import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { formatPriceDisplay } from '../utils/format';
import { isCondoOnly } from '../utils/propertyTypes';

const API = process.env.REACT_APP_API_URL || '';
const LOGO = '/logo_2.png';

// "SGD 1.5M (Negotiable)", "From SGD 1.5M", "SGD 1.5M · View to Offer".
function labelledPrice(price, label) {
  const amount = formatPriceDisplay(price);
  if (!amount) return label === 'View to Offer' ? 'View to Offer' : 'Price on request';
  if (label === 'From') return `From SGD ${amount}`;
  if (label === 'Negotiable') return `SGD ${amount} (Negotiable)`;
  if (label === 'View to Offer') return `SGD ${amount} · View to Offer`;
  return `SGD ${amount}`;
}

const EC_ELIGIBILITY_TEXT = {
  citizens_prs: 'Singapore Citizens and PRs only',
  all_buyers: 'Open to all buyers, including foreigners'
};

const emptyForm = { client_name: '', phone: '', email: '', message: '', website: '' };

export default function PublicListing() {
  const { listingId, handle, listingCode } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const loadListing = () => {
    setLoading(true);
    setNotFound(false);
    setUnavailable(false);
    const url = (handle && listingCode)
      ? `${API}/api/public/enquiry/${handle}/${listingCode}`
      : `${API}/api/public/listings/${listingId}`;
    fetch(url)
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null; }
        if (!r.ok) { setUnavailable(true); return null; }
        return r.json();
      })
      .then(data => { if (data) setListing(data); })
      .catch(() => setUnavailable(true))
      .finally(() => setLoading(false));
  };

  // Note: this project's ESLint config does not register the react-hooks plugin, so a
  // `// eslint-disable-next-line react-hooks/exhaustive-deps` comment here is itself a
  // build-breaking error ("Definition for rule ... was not found"). There is no
  // exhaustive-deps warning to suppress -- leave this dependency list as-is.
  useEffect(() => {
    loadListing();
  }, [listingId, handle, listingCode]);

  const cleanContent = (text) => (text || '').replace(/\*\*/g, '').replace(/---/g, '').replace(/# /g, '').trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.client_name) { setError('Please enter your name.'); return; }
    setSubmitting(true); setError('');
    try {
      const res = await fetch(`${API}/api/public/enquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listing?.id || listingId, ...form })
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

  if (unavailable) {
    return (
      <div style={wrapStyle}>
        <img src={LOGO} alt="NestList" style={{ height: '40px', marginBottom: '32px' }} />
        <div className="page-title">Just a Moment</div>
        <div className="page-subtitle">
          This listing is fine — the page just couldn't load right now. Please try again in a moment.
        </div>
        <button className="btn-primary" style={{ marginTop: '20px', maxWidth: '200px' }} onClick={loadListing}>
          Try Again
        </button>
      </div>
    );
  }

  // Buyer-facing condo facts: only the normalised tenure (one of the three
  // standard values -- an "Other" free-text tenure is agent-only) and the
  // floor BAND. Never the project name, which the backend does not send.
  const publicTenure = ['Freehold', '99-year leasehold', '999-year leasehold'].includes(listing?.tenure) ? listing.tenure : '';
  const publicFloor = ['Low', 'Mid', 'High'].includes(listing?.floor_level) ? listing.floor_level : '';

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

      {/* Signature (4:3) takes priority over Classic (9:16) when both exist. If
          neither video exists this renders nothing -- no empty player, no
          placeholder. The two tiers are different shapes so aspectRatio/maxWidth
          are set per-tier, matching the agent-facing player in MyListings.js.
          Not muted: nothing autoplays here, so muting would only rob the buyer
          of the score -- these films carry a real scored piano bed. */}
      {(listing.signature_video_url || listing.video_url) && (
        <div style={{ marginBottom: '28px' }}>
          <div
            style={{
              width: '100%',
              maxWidth: listing.signature_video_url ? '460px' : '320px',
              aspectRatio: listing.signature_video_url ? '4 / 3' : '9 / 16',
              margin: '0 auto',
              borderRadius: '4px',
              border: '1px solid rgba(212,175,55,0.3)',
              overflow: 'hidden',
              background: '#000'
            }}
          >
            <video
              src={listing.signature_video_url || listing.video_url}
              controls
              playsInline
              preload="metadata"
              poster={listing.images?.[0]}
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            />
          </div>
        </div>
      )}

      <div className="section-label">{listing.property_type}</div>
      {/* Buyer-facing: only the district may show here, never the street --
          "hide the road". If this listing predates district_label, show
          nothing rather than falling back to the raw location/street. */}
      {/* A condo's project name is public unless the agent hid it (the server
          then leaves project_name out of this payload). */}
      {typeof listing.project_name === 'string' && listing.project_name.trim() && (
        <div className="page-title" style={{ marginBottom: '4px' }}>{listing.project_name.trim()}</div>
      )}
      {listing.district_label && (
        <div className={listing.project_name ? '' : 'page-title'} style={listing.project_name ? { fontSize: '14px', color: 'var(--cream-dim)', marginBottom: '8px' } : { marginBottom: '4px' }}>{listing.district_label}</div>
      )}
      <div style={{ fontSize: '20px', color: 'var(--gold-light)', marginBottom: '20px', fontFamily: "'Cormorant Garamond', serif" }}>
        {isCondoOnly(listing) ? labelledPrice(listing.price, listing.price_label) : (formatPriceDisplay(listing.price) ? `SGD ${formatPriceDisplay(listing.price)}` : 'Price on request')}
      </div>
      {EC_ELIGIBILITY_TEXT[listing.ec_eligibility] && (
        <div style={{ fontSize: '13px', color: 'var(--cream-dim)', marginBottom: '16px' }}>
          Eligibility: {EC_ELIGIBILITY_TEXT[listing.ec_eligibility]}
        </div>
      )}

      {(listing.bedrooms || listing.land_size > 0 || listing.built_up > 0 || publicTenure || publicFloor) && (
        <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', fontSize: '13px', color: 'var(--cream-dim)', flexWrap: 'wrap' }}>
          {listing.bedrooms && <div>{String(listing.bedrooms).trim() === '0' ? (isCondoOnly(listing) ? 'Studio' : null) : listing.bedrooms}</div>}
          {listing.land_size > 0 && <div>Land: {listing.land_size.toLocaleString()} sqft</div>}
          {listing.built_up > 0 && <div>{isCondoOnly(listing) ? 'Floor area' : 'Built-up'}: {listing.built_up.toLocaleString()} sqft</div>}
          {publicTenure && <div>{publicTenure}</div>}
          {publicFloor && <div>{publicFloor} floor</div>}
        </div>
      )}

      <div style={{ fontSize: '15px', lineHeight: '1.8', color: 'var(--cream-dim)', whiteSpace: 'pre-wrap', marginBottom: '32px' }}>
        {cleanContent(listing.content)}
      </div>

      {listing.agent && listing.agent.name && (
        <div style={{ fontSize: '13px', color: 'var(--cream-faint)', marginBottom: '32px', borderTop: '1px solid rgba(212,175,55,0.2)', paddingTop: '16px' }}>
          Listed by {listing.agent.name}{listing.agent.agency ? ` · ${listing.agent.agency}` : ''}
          {/* CEA details: condo-family listings only, and only when all are present. */}
          {isCondoOnly(listing) && listing.agent.cea_reg_no && listing.agent.agency_name && listing.agent.agency_licence_no && (
            <div style={{ marginTop: '6px', lineHeight: 1.6 }}>
              {listing.agent.contact && <div>{listing.agent.name} | {listing.agent.contact}</div>}
              <div>CEA Reg No: {listing.agent.cea_reg_no}</div>
              <div>Agency: {listing.agent.agency_name} (Licence No: {listing.agent.agency_licence_no})</div>
            </div>
          )}
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
