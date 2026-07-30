import React, { useState } from 'react';
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

export default function PricingReports({ token }) {
  const [street, setStreet] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [landSize, setLandSize] = useState('');
  const [windowMonths, setWindowMonths] = useState(24);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);

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
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(212,175,55,0.2)', color: 'rgba(248,244,236,0.4)', textAlign: 'left' }}>
                      <th style={{ padding: '6px 10px', fontWeight: 400, fontSize: '11px' }}>STREET</th>
                      <th style={{ padding: '6px 10px', fontWeight: 400, fontSize: '11px' }}>TYPE</th>
                      <th style={{ padding: '6px 10px', fontWeight: 400, fontSize: '11px' }}>LAND (SQFT)</th>
                      <th style={{ padding: '6px 10px', fontWeight: 400, fontSize: '11px' }}>PSF</th>
                      <th style={{ padding: '6px 10px', fontWeight: 400, fontSize: '11px' }}>PRICE</th>
                      <th style={{ padding: '6px 10px', fontWeight: 400, fontSize: '11px' }}>DATE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.comparables.map((c, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(212,175,55,0.08)' }}>
                        <td style={{ padding: '8px 10px', color: 'var(--cream-dim)' }}>{c.street}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--cream-dim)' }}>{c.property_type}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--cream-dim)' }}>{c.area_sqft.toLocaleString()}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--cream-dim)' }}>SGD {c.psf.toLocaleString()}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--cream-dim)' }}>SGD {formatPriceM(c.price)}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--cream-dim)' }}>{c.contract_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(248,244,236,0.35)', marginTop: '10px' }}>
                Source: URA Realis PMI_Resi_Transaction data, generated {report.generated_at}.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
