import React from 'react';

const CATEGORIES = [
  {
    title: 'Maps, Zoning & Planning',
    links: [
      { name: 'OneMap', url: 'https://www.onemap.gov.sg', desc: "Singapore's official national map — land info, MRT & bus distances, nearby schools." },
      { name: 'URA Space (Master Plan)', url: 'https://eservice.ura.gov.sg/maps/?service=mp', desc: 'Zoning, plot ratio, and planned developments for any address.' },
      { name: 'Google Maps', url: 'https://www.google.com/maps', desc: 'Street view, satellite imagery, and directions.' },
    ],
  },
  {
    title: 'Transactions, Analytics & Valuation',
    links: [
      { name: 'URA Property Transactions', url: 'https://eservice.ura.gov.sg/property-market-information/pmiResidentialTransactionSearch', desc: 'Search actual private residential transaction prices.' },
      { name: 'EdgeProp', url: 'https://www.edgeprop.sg/', desc: 'Property news, transaction data, and market analytics.' },
      { name: 'SRX X-Value', url: 'https://www.srx.com.sg/xvalue-pricing', desc: 'Computer-generated market value estimates for any unit.' },
      { name: 'PropertyGuru', url: 'https://www.propertyguru.com.sg', desc: "Singapore's largest listing portal — check comparables fast." },
      { name: '99.co', url: 'https://www.99.co', desc: 'Property listings and price trends.' },
    ],
  },
  {
    title: 'Regulatory & Compliance',
    links: [
      { name: 'CEA Public Register', url: 'https://eservices.cea.gov.sg/aceas/public-register/', desc: "Verify any agent's registration and licence status." },
      { name: 'IRAS', url: 'https://www.iras.gov.sg', desc: 'Stamp duty, property tax rates and calculators.' },
      { name: 'URA Development Control Guidelines', url: 'https://www.ura.gov.sg/Corporate/Guidelines/Development-Control', desc: 'Official building and zoning rules for landed housing.' },
    ],
  },
];

export default function Resources() {
  return (
    <div className="page-content">
      <div className="page-title">Resources</div>
      <div className="page-subtitle">
        Every property research tool an agent needs, one click away — no need to leave NestList.
      </div>

      {CATEGORIES.map(cat => (
        <div key={cat.title} style={{ marginTop: '28px' }}>
          <div className="section-label" style={{ marginBottom: '12px' }}>{cat.title}</div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '14px'
          }}>
            {cat.links.map(link => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'block',
                  textDecoration: 'none',
                  background: 'rgba(212,175,55,0.05)',
                  border: '1px solid rgba(212,175,55,0.25)',
                  borderRadius: '5px',
                  padding: '16px 18px',
                  transition: 'border-color 0.15s ease, background 0.15s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#D4AF37'; e.currentTarget.style.background = 'rgba(212,175,55,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.25)'; e.currentTarget.style.background = 'rgba(212,175,55,0.05)'; }}
              >
                <div style={{
                  color: '#F0C84A',
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0.03em',
                  marginBottom: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  {link.name}
                  <span style={{ opacity: 0.6, fontSize: '12px' }}>↗</span>
                </div>
                <div style={{ color: 'rgba(248,244,236,0.65)', fontSize: '12px', lineHeight: '1.5' }}>
                  {link.desc}
                </div>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
