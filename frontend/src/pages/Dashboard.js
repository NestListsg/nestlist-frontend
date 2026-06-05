import React, { useEffect, useState } from 'react';

const API = process.env.REACT_APP_API_URL || '';

export default function Dashboard({ agent, token, setPage }) {
  const [listings, setListings] = useState([]);

  useEffect(() => {
    fetch(`${API}/api/listings`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setListings).catch(() => {});
  }, [token]);

  return (
    <div className="nl-content">
      <div className="section-label">Dashboard Overview</div>
      <div className="stats">
        <div className="stat"><div className="stat-num">{listings.length}</div><div className="stat-lbl">Active Listings</div></div>
        <div className="stat"><div className="stat-num">0</div><div className="stat-lbl">Total Enquiries</div></div>
        <div className="stat"><div className="stat-num">0</div><div className="stat-lbl">Total Views</div></div>
        <div className="stat"><div className="stat-num">0</div><div className="stat-lbl">Serious Buyers</div></div>
      </div>

      <div className="panels">
        <div className="panel">
          <div className="panel-title">Recent Listings</div>
          {listings.length > 0 ? listings.slice(0, 3).map(l => (
            <div key={l.id} className="listing-item" onClick={() => setPage('My Listings')}>
              {l.location} — SGD {l.price}
            </div>
          )) : (
            <p style={{color:'rgba(248,244,236,0.4)', fontSize:'13px', fontStyle:'italic'}}>
              No listings yet. Go to New Listing to begin.
            </p>
          )}
        </div>
        <div className="panel">
          <div className="panel-title">Quick Actions</div>
          <div className="panel-actions">
            <button className="btn-gold" onClick={() => setPage('New Listing')}>Create New Listing</button>
            <button className="btn-gold" onClick={() => setPage('My Profile')}>Update My Profile</button>
          </div>
        </div>
      </div>

      <div className="bottom-row">
        <div className="hero-panel">
          <div className="hero-overlay" />
          <div className="hero-text">
            <div className="hero-line" />
            <div className="hero-title">Where Singapore's Finest<br/>Properties Find Their <span>Buyers</span></div>
            <div className="hero-sub">NestList Prestige &nbsp;·&nbsp; Est. 2026</div>
          </div>
        </div>
        <div className="market-panel">
          <div className="market-title">Singapore Market Pulse</div>
          {[
            ['GCB Transactions 2025', '~36 units'],
            ['Total GCB Value 2025', 'SGD 1.36B'],
            ['Avg. GCB Price psf 2025', 'SGD 2,134'],
            ['Largest 2025 Transaction', 'SGD 148M'],
            ['Nassim Road Price Range', 'SGD 2,500–4,000 psf'],
          ].map(([label, value]) => (
            <div key={label} className="market-item">
              <div className="market-label">{label}</div>
              <div className="market-value">{value}</div>
            </div>
          ))}
          <div className="market-disclaimer">
            ℹ <strong style={{color:'rgba(212,175,55,0.8)'}}>Disclaimer:</strong> Data sourced from URA Realis & EdgeProp Singapore. Figures are indicative and updated periodically. NestList does not warrant the accuracy of market data. Always verify with URA or a licensed professional before making property decisions.
          </div>
          <div className="market-source">Source: URA Realis / EdgeProp &nbsp;|&nbsp; Last updated: Jan 2026 &nbsp;|&nbsp; Live URA API integration coming soon</div>
        </div>
      </div>
    </div>
  );
}
