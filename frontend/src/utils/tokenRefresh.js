// Sliding login sessions. The backend adds an `X-Refresh-Token` response header
// to authed API responses when the login token is close to expiring. Almost
// every response has no such header, in which case this does nothing.
//
// Every authed call in the app is a plain fetch() (no shared client), so rather
// than editing ~90 call sites we wrap window.fetch once, at startup (index.js).
// Strictly additive: the request is passed through untouched and the original
// Response is returned untouched; we only peek at one header on the way back.

import { API_URL } from '../config';

const TOKEN_KEY = 'nl_token'; // same key App.js uses for login/logout
const HEADER = 'X-Refresh-Token';

function apiOrigin() {
  try {
    return new URL(API_URL || window.location.origin, window.location.href).origin;
  } catch (e) {
    return null;
  }
}

function requestUrl(input) {
  try {
    const raw = typeof input === 'string' ? input : (input && input.url) || String(input);
    return new URL(raw, window.location.href);
  } catch (e) {
    return null;
  }
}

export function installTokenRefresh() {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  if (window.__nlTokenRefreshInstalled) return;
  window.__nlTokenRefreshInstalled = true;

  const origin = apiOrigin();
  const originalFetch = window.fetch.bind(window);

  window.fetch = function (input, init) {
    const p = originalFetch(input, init);
    return p.then((res) => {
      try {
        // Only our own API, and only if someone is currently logged in (so a
        // response landing after logout can never silently log them back in).
        const u = requestUrl(input);
        if (u && origin && u.origin === origin && localStorage.getItem(TOKEN_KEY)) {
          const fresh = res && res.headers && res.headers.get(HEADER);
          if (fresh && fresh.trim()) {
            localStorage.setItem(TOKEN_KEY, fresh.trim());
          }
        }
      } catch (e) {
        // Never let token bookkeeping break a real API call.
      }
      return res;
    });
  };
}
