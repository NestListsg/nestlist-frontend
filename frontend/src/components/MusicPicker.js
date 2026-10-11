/* eslint-disable */
import React, { useEffect, useRef, useState } from 'react';

const API = process.env.REACT_APP_API_URL || '';

// Preview audio is behind the agent's login, so a plain <audio src> would 401 (the
// browser can't attach the Authorization header to it). We fetch the mp3 ourselves
// with the header, turn it into a blob URL, and play that. Blob URLs are cached at
// module level (keyed by track id) so a second Play never re-downloads, and they
// survive the picker re-mounting when a listing card is collapsed and reopened.
const blobCache = new Map();

// Only one preview should ever sound at a time, even if more than one picker is on
// screen: whoever starts registers its stop function here, and the next one to
// start calls it first.
let stopActivePreview = null;

// A 44-byte silent WAV. iOS Safari only lets audio start inside a tap; our real
// audio arrives after an async download (outside the tap), so we "unlock" the
// element with this instant silent clip during the tap, then swap in the real song.
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

export const MUSIC_AUTO = 'auto';

const gold = '#D4AF37';
const goldLight = '#F0C84A';
const cream = 'rgba(248,244,236,0.75)';

/**
 * "Choose your music" picker for the video section.
 *
 * Props:
 *  - tracks:   [{id, mood, feel}] from GET /api/music-tracks. Empty -> renders nothing.
 *  - value:    selected track id, or 'auto'.
 *  - onChange: (id) => void
 *  - token:    agent bearer token (for the preview download)
 *  - disabled: lock the choice while a video is rendering
 */
export default function MusicPicker({ tracks, value, onChange, token, disabled }) {
  const [playingId, setPlayingId] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState('');
  const audioRef = useRef(null);
  const requestRef = useRef(0); // bumps on every click so a slow download can't start late
  const unlockedRef = useRef(false);

  const stopLocal = () => {
    requestRef.current += 1;
    const a = audioRef.current;
    if (a) {
      try { a.pause(); } catch { /* ignore */ }
      a.onended = null;
      a.onerror = null;
    }
    setPlayingId(null);
    setLoadingId(null);
  };

  const stopLocalRef = useRef(stopLocal);
  stopLocalRef.current = stopLocal;

  // Stop sound if the picker goes away (card collapsed, navigated off the page).
  useEffect(() => () => {
    // These refs hold the live audio element / stop function, not DOM nodes, so
    // reading .current at cleanup time is exactly what we want.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const a = audioRef.current;
    if (a) {
      try { a.pause(); } catch { /* ignore */ }
      a.onended = null;
      a.onerror = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    if (stopActivePreview === stopLocalRef.current) stopActivePreview = null;
  }, []);

  // If the chosen track list changes under us (refresh after a bad id), drop any
  // preview that is for a track that no longer exists.
  useEffect(() => {
    if (playingId && !(tracks || []).some(t => t.id === playingId)) stopLocal();
    // eslint-disable-next-line
  }, [tracks]);

  if (!tracks || tracks.length === 0) return null;

  const togglePreview = async (id) => {
    if (playingId === id || loadingId === id) {
      stopLocal();
      return;
    }
    // Stop anything else that is sounding, in this picker or another one.
    if (stopActivePreview && stopActivePreview !== stopLocalRef.current) stopActivePreview();
    stopLocal();
    const myRequest = requestRef.current;
    setError('');
    setLoadingId(id);

    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;

    // Unlock for iOS while we are still inside the tap (see SILENT_WAV).
    if (!unlockedRef.current) {
      unlockedRef.current = true;
      try {
        audio.src = SILENT_WAV;
        const p = audio.play();
        if (p && p.catch) p.catch(() => {});
      } catch { /* ignore */ }
    }

    try {
      let url = blobCache.get(id);
      if (!url) {
        const res = await fetch(`${API}/api/music-tracks/${encodeURIComponent(id)}/audio`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(res.status === 404 ? 'That track is no longer available.' : 'Could not load the preview.');
        const blob = await res.blob();
        url = URL.createObjectURL(blob);
        blobCache.set(id, url);
      }
      // The agent tapped something else (or Stop) while we were downloading.
      if (requestRef.current !== myRequest) return;

      audio.onended = () => { setPlayingId(null); };
      audio.onerror = () => {
        setPlayingId(null);
        setLoadingId(null);
        setError('Could not play the preview on this device.');
      };
      audio.src = url;
      audio.currentTime = 0;
      await audio.play();
      if (requestRef.current !== myRequest) { audio.pause(); return; }
      stopActivePreview = stopLocalRef.current;
      setLoadingId(null);
      setPlayingId(id);
    } catch (e) {
      if (requestRef.current !== myRequest) return;
      setLoadingId(null);
      setPlayingId(null);
      setError(
        e && e.name === 'NotAllowedError'
          ? 'Your browser blocked the sound. Tap Preview again.'
          : (e && e.message) || 'Could not load the preview.'
      );
    }
  };

  const optionStyle = (selected) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    borderRadius: '3px',
    border: `1px solid ${selected ? gold : 'rgba(212,175,55,0.25)'}`,
    background: selected ? 'rgba(212,175,55,0.14)' : 'transparent',
    opacity: disabled ? 0.6 : 1,
  });

  const selectBtnStyle = {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    background: 'transparent',
    border: 'none',
    padding: 0,
    textAlign: 'left',
    cursor: disabled ? 'default' : 'pointer',
    fontFamily: "'Montserrat', sans-serif",
    color: cream,
  };

  const dot = (selected) => (
    <span
      aria-hidden="true"
      style={{
        flex: '0 0 auto',
        width: '14px',
        height: '14px',
        marginTop: '2px',
        borderRadius: '50%',
        border: `1px solid ${selected ? gold : 'rgba(212,175,55,0.5)'}`,
        background: selected ? gold : 'transparent',
        boxShadow: selected ? 'inset 0 0 0 3px #0F2A22' : 'none',
      }}
    />
  );

  const autoSelected = value === MUSIC_AUTO;

  return (
    <div style={{ marginBottom: '12px' }}>
      <div
        style={{
          fontSize: '11px',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: goldLight,
          fontFamily: "'Montserrat', sans-serif",
          marginBottom: '8px',
        }}
      >
        🎵 Music
      </div>
      <div role="radiogroup" aria-label="Video music" style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '520px' }}>
        <div style={optionStyle(autoSelected)}>
          <button
            type="button"
            role="radio"
            aria-checked={autoSelected}
            disabled={disabled}
            onClick={() => onChange(MUSIC_AUTO)}
            style={selectBtnStyle}
          >
            {dot(autoSelected)}
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: '13px', color: autoSelected ? goldLight : '#F8F4EC' }}>
                Auto (recommended)
              </span>
              <span style={{ display: 'block', fontSize: '11px', color: 'rgba(248,244,236,0.55)', lineHeight: 1.4, marginTop: '2px' }}>
                We pick the music that suits the listing.
              </span>
            </span>
          </button>
        </div>

        {tracks.map(t => {
          const selected = value === t.id;
          const playing = playingId === t.id;
          const loading = loadingId === t.id;
          return (
            <div key={t.id} style={optionStyle(selected)}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={disabled}
                onClick={() => onChange(t.id)}
                style={selectBtnStyle}
              >
                {dot(selected)}
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: '13px', color: selected ? goldLight : '#F8F4EC' }}>
                    {t.mood || t.id}
                  </span>
                  {t.feel && (
                    <span style={{ display: 'block', fontSize: '11px', color: 'rgba(248,244,236,0.55)', lineHeight: 1.4, marginTop: '2px' }}>
                      {t.feel}
                    </span>
                  )}
                </span>
              </button>
              <button
                type="button"
                onClick={() => togglePreview(t.id)}
                aria-label={`${playing || loading ? 'Stop' : 'Preview'} ${t.mood || t.id}`}
                style={{
                  flex: '0 0 auto',
                  minWidth: '84px',
                  minHeight: '36px',
                  background: playing ? 'rgba(212,175,55,0.25)' : 'transparent',
                  border: '1px solid rgba(212,175,55,0.45)',
                  color: goldLight,
                  padding: '6px 10px',
                  borderRadius: '3px',
                  fontSize: '11px',
                  fontFamily: "'Montserrat', sans-serif",
                  cursor: 'pointer',
                }}
              >
                {loading ? 'Loading…' : playing ? '⏸ Stop' : '▶ Preview'}
              </button>
            </div>
          );
        })}
      </div>
      {error && (
        <div role="alert" style={{ color: '#e08080', fontSize: '12px', marginTop: '6px' }}>{error}</div>
      )}
    </div>
  );
}
