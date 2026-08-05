import React, { useState, useMemo } from 'react';

// IRAS residential property tax rate tables (progressive, applied to Annual Value).
// Owner-occupier rates effective 1 Jan 2025; non-owner-occupier rates effective
// 1 Jan 2024. These are IRAS's published, publicly available rate tables --
// verify against iras.gov.sg/taxes/property-tax/property-owners/property-tax-rates
// if a rate revision is ever suspected, since IRAS revises these periodically.
const OWNER_OCCUPIER_BANDS = [
  { upTo: 12000, rate: 0.00 },
  { upTo: 40000, rate: 0.04 },
  { upTo: 50000, rate: 0.06 },
  { upTo: 75000, rate: 0.10 },
  { upTo: 85000, rate: 0.14 },
  { upTo: 100000, rate: 0.20 },
  { upTo: 140000, rate: 0.26 },
  { upTo: Infinity, rate: 0.32 },
];

const NON_OWNER_OCCUPIER_BANDS = [
  { upTo: 30000, rate: 0.12 },
  { upTo: 45000, rate: 0.20 },
  { upTo: 60000, rate: 0.28 },
  { upTo: Infinity, rate: 0.36 },
];

// One-off Budget 2026 rebate on Owner-Occupied residential property tax --
// 15% for HDB flats, 10% (capped at SGD 500) for private residential property.
// Does not apply to non-owner-occupied properties.
const REBATE_2026_HDB_RATE = 0.15;
const REBATE_2026_PRIVATE_RATE = 0.10;
const REBATE_2026_PRIVATE_CAP = 500;

function computeProgressiveTax(av, bands) {
  const breakdown = [];
  let tax = 0;
  let lower = 0;
  for (const band of bands) {
    if (av <= lower) break;
    const taxableInBand = Math.min(av, band.upTo) - lower;
    if (taxableInBand > 0) {
      const bandTax = taxableInBand * band.rate;
      tax += bandTax;
      breakdown.push({ from: lower, to: Math.min(av, band.upTo), rate: band.rate, taxableInBand, bandTax });
    }
    lower = band.upTo;
  }
  return { tax, breakdown };
}

function fmt(n) {
  return n.toLocaleString('en-SG', { maximumFractionDigits: 0 });
}

export default function PropertyTaxCalculator() {
  const [annualValue, setAnnualValue] = useState('');
  const [occupancy, setOccupancy] = useState('owner'); // 'owner' | 'non-owner'
  const [propertyKind, setPropertyKind] = useState('private'); // 'private' | 'hdb' -- only matters for the 2026 rebate
  const [applyRebate, setApplyRebate] = useState(true);

  const av = Number(annualValue) || 0;

  const result = useMemo(() => {
    const bands = occupancy === 'owner' ? OWNER_OCCUPIER_BANDS : NON_OWNER_OCCUPIER_BANDS;
    const { tax: grossTax, breakdown } = computeProgressiveTax(av, bands);

    let rebate = 0;
    if (applyRebate && occupancy === 'owner' && grossTax > 0) {
      rebate = propertyKind === 'hdb'
        ? grossTax * REBATE_2026_HDB_RATE
        : Math.min(grossTax * REBATE_2026_PRIVATE_RATE, REBATE_2026_PRIVATE_CAP);
    }

    const netTax = Math.max(0, grossTax - rebate);
    const effectiveRate = av > 0 ? (netTax / av) * 100 : 0;

    return { grossTax, breakdown, rebate, netTax, effectiveRate };
  }, [av, occupancy, propertyKind, applyRebate]);

  const hasResult = av > 0;

  return (
    <div className="page-content">
      <div className="page-title">Property Tax Calculator</div>
      <div className="page-subtitle" style={{ marginBottom: '20px' }}>
        Estimate IRAS property tax from a property's Annual Value — in seconds instead of digging through IRAS's rate tables by hand.
      </div>

      <div style={{
        background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.25)',
        borderRadius: '4px', padding: '14px 18px', marginBottom: '24px',
        fontSize: '12px', color: 'rgba(248,244,236,0.6)', lineHeight: '1.6'
      }}>
        This calculates tax from an Annual Value (AV) you provide, using IRAS's published rate tables — it does not look up a property's actual live AV. There's no public API for that; only the owner can see it for free, via login at{' '}
        <a href="https://mytax.iras.gov.sg" target="_blank" rel="noreferrer" style={{ color: '#F0C84A' }}>mytax.iras.gov.sg</a>.
        Anyone can look up any property's current AV for a $2.50 fee via IRAS's{' '}
        <a href="https://mytax.iras.gov.sg/portal/property/check-annual-value" target="_blank" rel="noreferrer" style={{ color: '#F0C84A' }}>Check Annual Value of Property</a> service — enter the figure it gives you below.
      </div>

      <div style={{
        background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.25)',
        borderRadius: '4px', padding: '20px 24px', marginBottom: '24px'
      }}>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Annual Value (SGD)</label>
            <input
              className="form-input"
              type="number"
              min="0"
              value={annualValue}
              onChange={e => setAnnualValue(e.target.value)}
              placeholder="e.g. 96000"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Occupancy</label>
            <select className="form-select" value={occupancy} onChange={e => setOccupancy(e.target.value)}>
              <option value="owner">Owner-Occupied</option>
              <option value="non-owner">Not Owner-Occupied</option>
            </select>
          </div>
          {occupancy === 'owner' && (
            <div className="form-group">
              <label className="form-label">Property Type (for 2026 rebate)</label>
              <select className="form-select" value={propertyKind} onChange={e => setPropertyKind(e.target.value)}>
                <option value="private">Private Residential</option>
                <option value="hdb">HDB Flat</option>
              </select>
            </div>
          )}
        </div>

        {occupancy === 'owner' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '12px', color: 'rgba(248,244,236,0.7)', cursor: 'pointer' }}>
            <input type="checkbox" checked={applyRebate} onChange={e => setApplyRebate(e.target.checked)} />
            Apply the 2026 one-off Owner-Occupier property tax rebate ({propertyKind === 'hdb' ? '15% off' : '10% off, capped at SGD 500'})
          </label>
        )}
      </div>

      {hasResult && (
        <div className="print-area">
          <div className="section-label" style={{ marginBottom: '10px' }}>
            Result — AV SGD {fmt(av)} · {occupancy === 'owner' ? 'Owner-Occupied' : 'Not Owner-Occupied'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '24px' }}>
            {[
              { label: 'Gross Annual Tax', value: `SGD ${fmt(result.grossTax)}` },
              { label: '2026 Rebate', value: result.rebate > 0 ? `− SGD ${fmt(result.rebate)}` : 'None' },
              { label: 'Net Tax Payable', value: `SGD ${fmt(result.netTax)}` },
              { label: 'Effective Rate', value: `${result.effectiveRate.toFixed(2)}%` },
            ].map(stat => (
              <div key={stat.label} style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '4px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', color: 'var(--gold-light)', fontFamily: "'Cormorant Garamond', serif" }}>{stat.value}</div>
                <div style={{ fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(248,244,236,0.4)', marginTop: '4px' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '4px', padding: '18px 20px', marginBottom: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(248,244,236,0.5)', marginBottom: '6px' }}>Net Property Tax Payable</div>
            <div style={{ fontSize: '28px', color: 'var(--gold-light)', fontFamily: "'Cormorant Garamond', serif" }}>
              SGD {fmt(result.netTax)} / year
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(248,244,236,0.4)', marginTop: '6px' }}>≈ SGD {fmt(result.netTax / 12)} / month</div>
          </div>

          <div className="section-label" style={{ marginBottom: '10px' }}>Rate Band Breakdown</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(212,175,55,0.2)', color: 'rgba(248,244,236,0.4)', textAlign: 'left' }}>
                  <th style={{ padding: '6px 10px', fontWeight: 400, fontSize: '11px' }}>AV BAND (SGD)</th>
                  <th style={{ padding: '6px 10px', fontWeight: 400, fontSize: '11px' }}>RATE</th>
                  <th style={{ padding: '6px 10px', fontWeight: 400, fontSize: '11px' }}>TAXABLE AMOUNT</th>
                  <th style={{ padding: '6px 10px', fontWeight: 400, fontSize: '11px' }}>TAX FOR BAND</th>
                </tr>
              </thead>
              <tbody>
                {result.breakdown.map((b, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(212,175,55,0.08)' }}>
                    <td style={{ padding: '8px 10px', color: 'var(--cream-dim)' }}>
                      {fmt(b.from)} – {b.to === Infinity ? 'above' : fmt(b.to)}
                    </td>
                    <td style={{ padding: '8px 10px', color: 'var(--cream-dim)' }}>{(b.rate * 100).toFixed(0)}%</td>
                    <td style={{ padding: '8px 10px', color: 'var(--cream-dim)' }}>SGD {fmt(b.taxableInBand)}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--cream-dim)' }}>SGD {fmt(b.bandTax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(248,244,236,0.35)', marginTop: '10px' }}>
            Source: IRAS published property tax rate tables (owner-occupier rates effective 1 Jan 2025, non-owner-occupier rates effective 1 Jan 2024) plus the 2026 one-off rebate. Always confirm against a property's actual tax bill or iras.gov.sg before advising a client.
          </div>
        </div>
      )}
    </div>
  );
}
