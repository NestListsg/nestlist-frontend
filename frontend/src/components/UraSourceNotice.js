import React from 'react';

// The Singapore Open Data Licence requires the source to be stated wherever
// URA-derived figures are shown -- on screen AND in printed/exported reports.
// The backend sends the exact wording on every CMA and Market Pulse response
// (source_attribution / source_licence_url / source_disclaimer); these
// fallbacks are the same words, used only when a response predates that (an
// older backend, or a report saved in the browser before this change), so the
// notice can never be missing. No URA logo and nothing implying endorsement.
const FALLBACK_ATTRIBUTION = 'Contains information from the URA Data Service, made available under the Singapore Open Data Licence.';
const FALLBACK_LICENCE_URL = 'https://data.gov.sg/open-data-licence';
const FALLBACK_DISCLAIMER = 'Indicative only; verify with official records.';

function clean(v) {
  return typeof v === 'string' && v.trim() ? v.trim() : '';
}

// Only an https link is ever rendered as a link (the URL arrives in an API
// response, so it is treated as data).
function safeUrl(v) {
  const u = clean(v);
  return /^https:\/\//i.test(u) ? u : FALLBACK_LICENCE_URL;
}

export default function UraSourceNotice({ data, style }) {
  const attribution = clean(data && data.source_attribution) || FALLBACK_ATTRIBUTION;
  const disclaimer = clean(data && data.source_disclaimer) || FALLBACK_DISCLAIMER;
  const licenceUrl = safeUrl(data && data.source_licence_url);
  return (
    <div style={{ fontSize: '11px', lineHeight: 1.5, color: 'rgba(248,244,236,0.5)', ...(style || {}) }}>
      {attribution}{' '}
      <a href={licenceUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(212,175,55,0.8)' }}>
        Licence terms
      </a>
      <span> ({licenceUrl})</span>. {disclaimer}
    </div>
  );
}
