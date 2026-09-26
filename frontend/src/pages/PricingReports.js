import React, { useState, useEffect, useMemo } from 'react';
import { formatPriceM } from '../utils/format';

const API = process.env.REACT_APP_API_URL || '';

const PROPERTY_TYPES = [
  '', 'Good Class Bungalow (GCB)', 'Detached/Bungalow', 'Semi-Detached', 'Inter-Terrace', 'Corner Terrace'
];

const WINDOW_OPTIONS = [
  { value: 12, label: 'Past 12 months' },
  { value: 24, label: 'Past 24 months' },
  { value: 36, label: 'Past 36 months' },
];

// contract_date comes from the backend as "MM/YYYY" (see ura_market_pulse.py).
// A plain string sort breaks across year boundaries ("07/2024" < "12/2023"
// lexicographically, though 07/2024 is the more recent one) -- this turns it
// into a single comparable number (year*12 + month) so Date sorting is
// actually chronological. Falls back to 0 for anything unparseable so a
// stray bad value sorts to one end instead of throwing.
function parseContractDateSort(dateStr) {
  const m = /^(\d{1,2})\/(\d{4})$/.exec(dateStr || '');
  if (!m) return 0;
  return Number(m[2]) * 12 + Number(m[1]);
}

// Data-driven so a column can be hidden (e.g. when printing for a buyer who
// doesn't need to see property type) without touching the table markup, and
// so it can be sorted without a separate switch statement -- sortValue
// returns the comparable primitive (a number for numeric/date columns, a
// lowercased string for text ones) that the click-to-sort handler compares.
const COLUMNS = [
  { key: 'street', label: 'Street', render: c => c.street, sortValue: c => (c.street || '').toLowerCase() },
  { key: 'district', label: 'District', render: c => c.district, sortValue: c => (c.district || '').toLowerCase() },
  { key: 'property_type', label: 'Type', render: c => c.property_type, sortValue: c => (c.property_type || '').toLowerCase() },
  { key: 'tenure', label: 'Tenure', render: c => c.tenure, sortValue: c => (c.tenure || '').toLowerCase() },
  { key: 'area_sqft', label: 'Land (sqft)', render: c => c.area_sqft.toLocaleString(), sortValue: c => Number(c.area_sqft) || 0 },
  { key: 'psf', label: 'PSF', render: c => `SGD ${c.psf.toLocaleString()}`, sortValue: c => Number(c.psf) || 0 },
  { key: 'price', label: 'Price', render: c => `SGD ${formatPriceM(c.price)}`, sortValue: c => Number(c.price) || 0 },
  { key: 'contract_date', label: 'Date', render: c => c.contract_date, sortValue: c => parseContractDateSort(c.contract_date) },
];
const DEFAULT_VISIBLE_COLUMNS = COLUMNS.reduce((acc, col) => ({ ...acc, [col.key]: true }), {});
// Default view: latest transaction first -- that's the more useful read for
// an agent eyeballing a freshly generated report (most relevant comps up
// top), and numeric/date columns default to their "biggest first" direction
// generally, while text columns default to A-Z. See handleSort below.
const DEFAULT_SORT_KEY = 'contract_date';
const DEFAULT_SORT_DIR = 'desc';
const DESC_FIRST_COLUMNS = new Set(['area_sqft', 'psf', 'price', 'contract_date']);

// Persisted across tab switches (and browser restarts) so a generated report
// isn't lost just because the agent clicked to another page -- this page's
// component unmounts on tab switch like every other page in the app, so
// plain useState alone would wipe the report out from under them.
const STORAGE_KEY = 'nestlist_pricing_report_state';

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function parseReportDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

// UTC-safe calendar-day count (same approach as the Market Pulse freshness
// badge) so a report generated near midnight can't gain or lose a day
// depending on the viewer's local timezone.
function daysAgoUTC(date) {
  const now = new Date();
  const startUTC = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((nowUTC - startUTC) / (24 * 60 * 60 * 1000));
}

export default function PricingReports({ token }) {
  const persisted = loadPersisted();
  const [street, setStreet] = useState(persisted?.street || '');
  const [propertyType, setPropertyType] = useState(persisted?.propertyType || '');
  const [landSize, setLandSize] = useState(persisted?.landSize || '');
  const [windowMonths, setWindowMonths] = useState(persisted?.windowMonths || 24);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState(persisted?.report || null);
  const [visibleColumns, setVisibleColumns] = useState({ ...DEFAULT_VISIBLE_COLUMNS, ...(persisted?.visibleColumns || {}) });
  const [sortKey, setSortKey] = useState(persisted?.sortKey || DEFAULT_SORT_KEY);
  const [sortDir, setSortDir] = useState(persisted?.sortDir || DEFAULT_SORT_DIR);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ street, propertyType, landSize, windowMonths, report, visibleColumns, sortKey, sortDir }));
    } catch {
      // localStorage unavailable (e.g. private browsing) -- report just won't persist, not fatal
    }
  }, [street, propertyType, landSize, windowMonths, report, visibleColumns, sortKey, sortDir]);

  const toggleColumn = (key) => {
    setVisibleColumns(v => ({ ...v, [key]: !v[key] }));
  };

  // Clicking the active column's heading again flips direction; clicking a
  // different heading switches to it with a sensible starting direction
  // (biggest/latest first for numbers and dates, A-Z for text) rather than
  // always defaulting to ascending, which would put the smallest/oldest
  // comp on top the first time an agent clicks "Price" or "Date".
  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(DESC_FIRST_COLUMNS.has(key) ? 'desc' : 'asc');
    }
  };

  const sortedComparables = useMemo(() => {
    const rows = report?.comparables || [];
    const col = COLUMNS.find(c => c.key === sortKey);
    if (!col) return rows;
    const sorted = [...rows].sort((a, b) => {
      const av = col.sortValue(a);
      const bv = col.sortValue(b);
      if (av < bv) return -1;
      if (av > bv) return 1;
      return 0;
    });
    if (sortDir === 'desc') sorted.reverse();
    return sorted;
  }, [report, sortKey, sortDir]);

  // A saved report persists across browser restarts (see STORAGE_KEY above),
  // so an agent can be looking at one that's weeks old without any signal
  // that the comps are stale. reportDate/reportDaysAgo stay null (never a
  // crash) when generated_at is missing or unparseable, in which case no
  // reminder shows at all.
  const reportDate = report ? parseReportDate(report.generated_at) : null;
  const reportDaysAgo = reportDate ? daysAgoUTC(reportDate) : null;
  const reportIsStale = reportDaysAgo !== null && reportDaysAgo > 14;

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!street.trim()) { setError('Enter a street or area name.'); return; }
    setLoading(true); setError(''); setReport(null);
    try {
      const res = await fetch(`${API}/api/cma/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          street: street.trim(),
          property_type: propertyType,
          land_size: landSize ? Number(landSize) : 0,
          window_months: windowMonths
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to generate report');
      setReport(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content">
      <div className="page-title">Pricing Reports</div>
      <div className="page-subtitle" style={{ marginBottom: '20px' }}>
        Generate a comparable-transaction pricing report from live URA data — for landed properties only, in minutes instead of hours of manual research.
      </div>

      <form onSubmit={handleGenerate} style={{
        background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.25)',
        borderRadius: '4px', padding: '20px 24px', marginBottom: '24px'
      }}>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Street / Area Name</label>
            <input className="form-input" value={street} onChange={e => setStreet(e.target.value)} placeholder="e.g. Nassim Road" />
          </div>
          <div className="form-group">
            <label className="form-label">Property Type (optional)</label>
            <select className="form-select" value={propertyType} onChange={e => setPropertyType(e.target.value)}>
              {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t || 'Any landed type'}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Subject Land Size (sqft, optional)</label>
            <input className="form-input" type="number" value={landSize} onChange={e => setLandSize(e.target.value)} placeholder="e.g. 6500" />
          </div>
          <div className="form-group">
            <label className="form-label">Comparable Window</label>
            <select className="form-select" value={windowMonths} onChange={e => setWindowMonths(Number(e.target.value))}>
              {WINDOW_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <button className="btn-primary" type="submit" disabled={loading} style={{ maxWidth: '220px', marginTop: '4px' }}>
          {loading ? 'Generating...' : '📊 Generate Report'}
        </button>
      </form>

      {report && (
        <div className="print-area">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div className="section-label">Report — {street} · {propertyType || 'Any landed type'} · {WINDOW_OPTIONS.find(o => o.value === windowMonths)?.label}</div>
            <button type="button" className="no-print" onClick={() => window.print()}
              style={{ background: 'transparent', border: '1px solid rgba(212,175,55,0.4)', color: '#F0C84A', padding: '8px 16px', borderRadius: '3px', cursor: 'pointer', fontSize: '12px', fontFamily: "'Montserrat', sans-serif" }}>
              🖨️ Print / Save as PDF
            </button>
          </div>

          {report.comparable_count === 0 ? (
            <div style={{ color: 'rgba(248,244,236,0.5)', fontStyle: 'italic', fontSize: '13px' }}>
              No matching URA transactions found for "{street}" in this window. Try widening the comparable window, removing the property type filter, or checking the street name spelling.
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                {[
                  { label: 'Comparables Found', value: report.comparable_count },
                  { label: 'Avg PSF', value: `SGD ${report.avg_psf.toLocaleString()}` },
                  { label: 'Min PSF', value: `SGD ${report.min_psf.toLocaleString()}` },
                  { label: 'Max PSF', value: `SGD ${report.max_psf.toLocaleString()}` },
                ].map(stat => (
                  <div key={stat.label} style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '4px', padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', color: 'var(--gold-light)', fontFamily: "'Cormorant Garamond', serif" }}>{stat.value}</div>
                    <div style={{ fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(248,244,236,0.4)', marginTop: '4px' }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {report.estimated_value_low > 0 && (
                <div style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '4px', padding: '18px 20px', marginBottom: '24px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(248,244,236,0.5)', marginBottom: '6px' }}>Estimated Value Range</div>
                  <div style={{ fontSize: '28px', color: 'var(--gold-light)', fontFamily: "'Cormorant Garamond', serif" }}>
                    SGD {formatPriceM(report.estimated_value_low)} – {formatPriceM(report.estimated_value_high)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(248,244,236,0.4)', marginTop: '6px' }}>Based on min–max comparable PSF × subject land size</div>
                </div>
              )}

              <div className="section-label" style={{ marginBottom: '10px' }}>Comparable Transactions</div>

              <div className="no-print" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '11px', color: 'rgba(248,244,236,0.4)', marginRight: '2px' }}>Columns to include (e.g. hide before printing for a buyer):</span>
                {COLUMNS.map(col => {
                  const active = visibleColumns[col.key] !== false;
                  return (
                    <button
                      key={col.key}
                      type="button"
                      onClick={() => toggleColumn(col.key)}
                      style={{
                        background: active ? 'rgba(212,175,55,0.2)' : 'transparent',
                        border: `1px solid ${active ? '#D4AF37' : 'rgba(212,175,55,0.25)'}`,
                        color: active ? '#F0C84A' : 'rgba(248,244,236,0.4)',
                        padding: '4px 10px', borderRadius: '3px', cursor: 'pointer',
                        fontSize: '11px', fontFamily: "'Montserrat', sans-serif"
                      }}
                    >
                      {active ? '✓ ' : ''}{col.label}
                    </button>
                  );
                })}
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(212,175,55,0.2)', color: 'rgba(248,244,236,0.4)', textAlign: 'left' }}>
                      {COLUMNS.filter(col => visibleColumns[col.key] !== false).map(col => {
                        const active = sortKey === col.key;
                        return (
                          <th
                            key={col.key}
                            onClick={() => handleSort(col.key)}
                            title={`Sort by ${col.label}`}
                            style={{
                              padding: '6px 10px', fontWeight: 400, fontSize: '11px',
                              cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
                              color: active ? 'rgba(240,200,74,0.85)' : 'rgba(248,244,236,0.4)'
                            }}
                          >
                            {col.label.toUpperCase()}
                            <span
                              aria-hidden="true"
                              style={{
                                marginLeft: '4px',
                                fontSize: active ? '10px' : '9px',
                                color: active ? '#F0C84A' : 'rgba(248,244,236,0.25)'
                              }}
                            >
                              {active ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedComparables.map((c, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(212,175,55,0.08)' }}>
                        {COLUMNS.filter(col => visibleColumns[col.key] !== false).map(col => (
                          <td key={col.key} style={{ padding: '8px 10px', color: 'var(--cream-dim)' }}>{col.render(c)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(248,244,236,0.35)', marginTop: '10px' }}>
                Source: URA Realis PMI_Resi_Transaction data, generated {report.generated_at}.
              </div>
              {reportIsStale && (
                <div className="no-print" style={{
                  fontSize: '12px', color: 'rgba(248,244,236,0.9)', marginTop: '8px',
                  background: 'rgba(255,165,0,0.08)', border: '1px solid rgba(255,165,0,0.35)',
                  borderRadius: '3px', padding: '8px 12px'
                }}>
                  ⚠️ This report was generated on {report.generated_at} ({reportDaysAgo} days ago) — click "Generate Report" above to refresh with the latest URA data.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
