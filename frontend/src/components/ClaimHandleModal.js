import React, { useRef, useState } from 'react';
import HandlePicker from './HandlePicker';

const API = process.env.REACT_APP_API_URL || '';

// Prompts an already-registered agent who predates handles (agent.code is
// falsy) to claim one, so their memorable public link
// (nestlist.sg/<handle>/<listingCode>) starts working. Mounted from App.js
// whenever the logged-in agent has no code yet -- covers both a fresh login
// and an already-open session that had no code when it started.
export default function ClaimHandleModal({ agent, token, onClaimed, onDismiss }) {
  const handleRef = useRef(null);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuggestions([]); setLoading(true);
    try {
      const res = await fetch(`${API}/api/agent/handle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: handleRef.current ? handleRef.current.getValue() : '' })
      });
      const data = await res.json();
      if (!res.ok) {
        if (Array.isArray(data.suggestions)) setSuggestions(data.suggestions);
        throw new Error(data.detail || 'That handle could not be set. Please try another.');
      }
      onClaimed(data.agent);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const pickSuggestion = (s) => {
    if (handleRef.current) handleRef.current.setValue(s);
    setSuggestions([]);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      zIndex: 700, padding: '40px 16px', overflowY: 'auto'
    }}>
      <div style={{
        background: 'var(--green-dark)', border: '1px solid rgba(212,175,55,0.3)',
        borderRadius: '6px', padding: '28px', maxWidth: '460px', width: '100%'
      }}>
        <div className="page-title" style={{ fontSize: '22px', marginBottom: '4px' }}>
          Claim your NestList link
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(248,244,236,0.6)', marginBottom: '18px', lineHeight: '1.6' }}>
          Pick a short, memorable handle so the links you share for your listings read
          nestlist.sg/&lt;handle&gt;/&lt;listing&gt; instead of a long random one.
        </div>
        <form onSubmit={handleSubmit}>
          <HandlePicker ref={handleRef} initialName={agent?.name || ''} />
          {error && <div className="error-msg">{error}</div>}
          {suggestions.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
              {suggestions.map(s => (
                <span
                  key={s}
                  onClick={() => pickSuggestion(s)}
                  style={{ fontSize: '11px', padding: '3px 9px', border: '1px solid rgba(240,200,74,0.4)', borderRadius: '12px', color: '#F0C84A', cursor: 'pointer' }}
                >
                  {s}
                </span>
              ))}
            </div>
          )}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Setting handle...' : 'Set my handle'}
          </button>
          <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '12px' }}>
            <span style={{ color: 'rgba(248,244,236,0.45)', cursor: 'pointer' }} onClick={onDismiss}>
              Maybe later
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
