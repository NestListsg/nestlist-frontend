import React, { useEffect, useState } from 'react';

const API = process.env.REACT_APP_API_URL || '';

export default function Dashboard({ agent, token, setPage }) {
  const [listings, setListings] = useState([]);
  const [pulse, setPulse] = useState(null);
  const [editing, setEditing] = useState(false);
  const [pulseForm, setPulseForm] = useState(null);
  const [pulseSaving, setPulseSaving] = useState(false);
  const [pulseSaved, setPulseSaved] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = agent?.email === 'leesbjane@gmail.com';

  useEffect(() => {
    fetch(`${API}/api/listings`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setListings).catch(() => {});
    fetch(`${API}/api/market-pulse`)
      .then(r => r.json()).then(data => { setPulse(data); setPulseForm(data); }).catch(() => {});
  }, [token]);

  const savePulse = async () => {
    setPulseSaving(true);
    try {
      const res = await fetch(`${API}/api/market-pulse`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(pulseForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to save');
      setPulse({ ...pulseForm });
      setEditing(false);
      setPulseSaved(true);
      setTimeout(() => setPulseSaved(false), 3000);
    } catch (err) {
      alert(err.message);
    } finally {
      setPulseSaving(false);
    }
  };

  const refreshPulse = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${API}/api/market-pulse/refresh`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Refresh failed');
      setPulse(data);
      setPulseForm(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const pulseFields = pulse ? [
    ['GCB Transactions', pulse.gcb_transactions, 'gcb_transactions'],
    ['Total GCB Value', pulse.gcb_total_value, 'gcb_total_value'],
    ['Avg. GCB Price psf', pulse.gcb_avg_psf, 'gcb_avg_psf'],
    ['Largest Transaction', pulse.gcb_largest, 'gcb_largest'],
    ['Nassim Road Price Range', pulse.nassim_range, 'nassim_range'],
  ] : [];

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
          <div className="market-title" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <span style={{display:'flex', alignItems:'center', gap:'8px'}}>
              Singapore Market Pulse
              {pulse?.source === 'ura_api' ? (
                <span style={{fontSize:'10px', color:'#4CAF50', border:'1px solid rgba(76,175,80,0.4)', borderRadius:'3px', padding:'2px 6px', letterSpacing:'0.03em'}}>LIVE · URA</span>
              ) : (
                <span style={{fontSize:'10px', color:'rgba(248,244,236,0.4)', border:'1px solid rgba(248,244,236,0.2)', borderRadius:'3px', padding:'2px 6px', letterSpacing:'0.03em'}}>MANUAL</span>
              )}
            </span>
            {isAdmin && !editing && (
              <div style={{display:'flex', gap:'6px'}}>
                <button
                  onClick={refreshPulse}
                  disabled={refreshing}
                  style={{fontSize:'11px', background:'transparent', border:'1px solid rgba(212,175,55,0.4)', color:'rgba(212,175,55,0.7)', padding:'3px 10px', borderRadius:'3px', cursor:'pointer', fontFamily:"'Montserrat', sans-serif"}}
                >
                  {refreshing ? 'Refreshing...' : 'Refresh from URA'}
                </button>
                <button
                  onClick={() => setEditing(true)}
                  style={{fontSize:'11px', background:'transparent', border:'1px solid rgba(212,175,55,0.4)', color:'rgba(212,175,55,0.7)', padding:'3px 10px', borderRadius:'3px', cursor:'pointer', fontFamily:"'Montserrat', sans-serif"}}
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <div style={{marginTop:'12px'}}>
              {[
                ['GCB Transactions', 'gcb_transactions'],
                ['Total GCB Value', 'gcb_total_value'],
                ['Avg. GCB Price psf', 'gcb_avg_psf'],
                ['Largest Transaction', 'gcb_largest'],
                ['Nassim Road Price Range', 'nassim_range'],
              ].map(([label, key]) => (
                <div key={key} style={{marginBottom:'10px'}}>
                  <div style={{fontSize:'11px', color:'rgba(248,244,236,0.5)', marginBottom:'3px'}}>{label}</div>
                  <input
                    value={pulseForm[key] || ''}
                    onChange={e => setPulseForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(212,175,55,0.3)', color:'#F0C84A', padding:'6px 10px', borderRadius:'3px', fontSize:'13px', fontFamily:"'Montserrat', sans-serif", boxSizing:'border-box'}}
                  />
                </div>
              ))}
              <div style={{display:'flex', gap:'8px', marginTop:'12px'}}>
                <button
                  onClick={savePulse}
                  disabled={pulseSaving}
                  style={{background:'rgba(212,175,55,0.2)', border:'1px solid rgba(212,175,55,0.5)', color:'#F0C84A', padding:'6px 16px', borderRadius:'3px', cursor:'pointer', fontSize:'12px', fontFamily:"'Montserrat', sans-serif"}}
                >
                  {pulseSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => { setEditing(false); setPulseForm(pulse); }}
                  style={{background:'transparent', border:'1px solid rgba(255,255,255,0.2)', color:'rgba(248,244,236,0.5)', padding:'6px 16px', borderRadius:'3px', cursor:'pointer', fontSize:'12px', fontFamily:"'Montserrat', sans-serif"}}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {pulseFields.map(([label, value]) => (
                <div key={label} className="market-item">
                  <div className="market-label">{label}</div>
                  <div className="market-value">{value}</div>
                </div>
              ))}
            </>
          )}

          {pulseSaved && <div style={{marginTop:'10px', color:'#4CAF50', fontSize:'12px'}}>Market data updated successfully.</div>}

          <div className="market-disclaimer">
            ℹ <strong style={{color:'rgba(212,175,55,0.8)'}}>Disclaimer:</strong> GCB figures are computed from URA's Private Residential Property Transactions data service, filtered to Detached-house transactions within URA's 39 gazetted Good Class Bungalow Areas over the trailing 12 months. Figures are indicative. NestList does not warrant the accuracy of market data. Always verify with URA or a licensed professional before making property decisions.
          </div>
          <div className="market-source">
            Source: URA Data Service API &nbsp;|&nbsp; Last updated: {pulse?.last_updated || 'Jan 2026'}
          </div>
        </div>
      </div>
    </div>
  );
}
