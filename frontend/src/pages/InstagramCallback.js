import React, { useEffect, useState } from 'react';
import { LOGO_B64 } from '../config';

const API = process.env.REACT_APP_API_URL || '';

export default function InstagramCallback() {
  const [status, setStatus] = useState('connecting');
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const oauthError = params.get('error_description') || params.get('error');

      if (oauthError) {
        setError(oauthError);
        setStatus('error');
        return;
      }
      if (!code || !state) {
        setError('Missing connection details from Instagram. Please try connecting again.');
        setStatus('error');
        return;
      }

      try {
        const res = await fetch(`${API}/api/instagram/oauth-callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, state })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Could not connect Instagram');

        setUsername(data.instagram_username || '');

        const token = localStorage.getItem('nl_token');
        if (token) {
          try {
            const profileRes = await fetch(`${API}/api/profile`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (profileRes.ok) {
              const freshAgent = await profileRes.json();
              localStorage.setItem('nl_agent', JSON.stringify(freshAgent));
            }
          } catch (err) {
            // non-fatal — agent can refresh from My Profile if this fails
          }
        }

        setStatus('success');
      } catch (err) {
        setError(err.message);
        setStatus('error');
      }
    };
    run();
  }, []);

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">
          <img src={LOGO_B64} alt="NestList" />
        </div>
        <div className="login-tagline">Smarter Listings. Better Results.</div>

        {status === 'connecting' && (
          <div className="form-group" style={{ textAlign: 'center' }}>
            Connecting your Instagram account...
          </div>
        )}

        {status === 'success' && (
          <>
            <div className="success-msg">
              {username ? `Connected as @${username} on Instagram.` : 'Instagram connected.'}
            </div>
            <button className="btn-primary" onClick={() => { window.location.href = '/'; }} style={{ marginTop: '12px' }}>
              Continue to NestList
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="error-msg">{error}</div>
            <button className="btn-primary" onClick={() => { window.location.href = '/'; }} style={{ marginTop: '12px' }}>
              Back to NestList
            </button>
          </>
        )}
      </div>
    </div>
  );
}
