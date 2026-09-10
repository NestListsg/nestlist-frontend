import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

const API = process.env.REACT_APP_API_URL || '';

// Keeps a handle typed (or auto-derived from a name) URL-safe as the user
// types, rather than only validating on submit -- so spaces/uppercase/symbols
// never make it into the field at all. Allowed characters are lowercase
// letters, digits, "." and "-"; spaces become "-"; runs of 2+ separator
// characters (whichever mix of "." and "-") collapse to just the first one
// in the run, so "Steven Tan" -> "steven-tan" but "steven.tan" is left
// alone -- the dot is a real, meaningful separator here, not noise to strip.
const slugifyHandle = (s) => (s || '')
  .toLowerCase()
  .replace(/\s+/g, '-')
  .replace(/[^a-z0-9.-]/g, '')
  .replace(/[-.]{2,}/g, (run) => run[0]);

// Shared handle-picker UI: an input that auto-fills from `liveName` (while
// untouched), a live nestlist.sg/<handle>/... preview, a debounced
// availability check against the public handle-available endpoint, and
// clickable suggestion chips when the checked handle is taken. Used by both
// the registration form and the "claim your handle" prompt for agents who
// registered before handles existed.
//
// This is deliberately uncontrolled: the current value isn't pushed up to
// the parent on every keystroke. Callers read it at submit time via the ref
// (getValue), and can push a value back down -- e.g. a suggestion chip
// rendered outside this component, returned from a 409 on submit -- via
// setValue. That avoids needing an onChange callback (whose identity a
// parent may not keep stable) inside any effect's dependency array.
const HandlePicker = forwardRef(function HandlePicker({ label, initialName, liveName, currentHandle }, ref) {
  const [handle, setHandle] = useState(() => slugifyHandle(initialName));
  const [touched, setTouched] = useState(false);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState(null);

  // Auto-derives the handle from the name while the agent hasn't edited the
  // handle field directly. Works both for a name that changes live (the
  // register form, where liveName tracks the Full Name field keystroke for
  // keystroke) and a static one (the claim-handle prompt, which only ever
  // passes the agent's existing name -- unchanging, so this just seeds the
  // initial value once).
  useEffect(() => {
    if (!touched && liveName !== undefined) setHandle(slugifyHandle(liveName));
  }, [liveName, touched]);

  // The backend trims leading/trailing separators ("." and "-") when it
  // slugifies the handle server-side, but the input itself must not trim on
  // every keystroke -- that would stop an agent typing a dot or hyphen in
  // the middle of a handle (or right before adding more after it). So
  // `handle` stays the field's raw value, and this derived, edge-trimmed
  // view is what's previewed/checked, to match what actually gets stored.
  const cleanHandle = handle.replace(/^[-.]+|[-.]+$/g, '');

  // If the caller tells us this picker's current owner already holds
  // `currentHandle` (the change-handle control in My Profile passes the
  // agent's own code), and the field is still showing that same handle,
  // there's nothing to check -- the public availability endpoint has no way
  // to know the agent already owns it and would otherwise report it as
  // taken, which reads as a confusing bug in the change-handle flow.
  // Register and the claim-handle modal never pass currentHandle, so this
  // is always false there and their behaviour is unchanged.
  const isCurrentHandle = !!currentHandle && cleanHandle.toLowerCase() === currentHandle.toLowerCase();

  // Debounced availability check. Runs whenever `cleanHandle` settles for
  // ~400ms; the cleanup cancels the pending fetch's timer on every keystroke
  // so only the latest value is ever checked. `API` is a module-level
  // constant, not a reactive value, so it's intentionally left out of the
  // dependency array -- exhaustive-deps doesn't flag it.
  useEffect(() => {
    if (isCurrentHandle || !cleanHandle) { setStatus(null); setChecking(false); return; }
    setChecking(true);
    const timer = setTimeout(() => {
      fetch(`${API}/api/public/handle-available/${cleanHandle}`)
        .then(r => r.json())
        .then(data => setStatus(data))
        .catch(() => setStatus(null))
        .finally(() => setChecking(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [cleanHandle, isCurrentHandle]);

  useImperativeHandle(ref, () => ({
    getValue: () => handle,
    setValue: (v) => { setTouched(true); setHandle(v); }
  }), [handle]);

  const onInputChange = (raw) => {
    setTouched(true);
    setHandle(slugifyHandle(raw));
  };

  const pickSuggestion = (s) => {
    setTouched(true);
    setHandle(s);
  };

  return (
    <div className="form-group">
      <label className="form-label">{label || 'Your NestList Handle'}</label>
      <input className="form-input" name="handle" autoComplete="off" value={handle} onChange={e => onInputChange(e.target.value)} required />
      <div style={{ fontSize: '11px', color: 'rgba(248,244,236,0.5)', marginTop: '6px' }}>
        Your listings will live at nestlist.sg/{cleanHandle || '<handle>'}/…
      </div>
      {cleanHandle && (
        <div style={{ fontSize: '11px', marginTop: '4px' }}>
          {isCurrentHandle ? (
            <span style={{ color: '#4CAF50' }}>✓ This is your current handle</span>
          ) : checking ? (
            <span style={{ color: 'rgba(248,244,236,0.5)' }}>Checking availability...</span>
          ) : status && status.available ? (
            <span style={{ color: '#4CAF50' }}>✓ available</span>
          ) : status && status.available === false ? (
            <span style={{ color: '#ff6b6b' }}>✗ {status.reason || 'That handle is taken'}</span>
          ) : null}
        </div>
      )}
      {status && status.available === false && Array.isArray(status.suggestions) && status.suggestions.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
          {status.suggestions.map(s => (
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
    </div>
  );
});

export default HandlePicker;
