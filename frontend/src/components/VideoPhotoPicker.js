/* eslint-disable */
import React from 'react';

export const VIDEO_PHOTO_MAX = 6;

const gold = '#D4AF37';
const goldLight = '#F0C84A';
const cream = 'rgba(248,244,236,0.75)';

/**
 * "Photos in the video" picker for the Classic video section.
 *
 * The default is Auto: nothing is sent to the server and the video is built exactly as
 * it always has been. "Choose photos" lets the agent tap photos to build an ordered
 * list (max 6): the first photo opens the video, the last one closes it.
 *
 * Props:
 *  - photos:   the listing's photo URLs (listing.images)
 *  - mode:     'auto' | 'custom'
 *  - urls:     the chosen photo URLs, in video order (already limited to photos that
 *              still exist on the listing -- the parent derives this)
 *  - onChange: ({ mode, urls }) => void
 *  - disabled: lock the choice while a video is rendering
 */
export default function VideoPhotoPicker({ photos, mode, urls, onChange, disabled }) {
  const all = Array.isArray(photos) ? photos.filter(Boolean) : [];
  // With a single photo there is nothing to choose or order.
  if (all.length < 2) return null;

  const custom = mode === 'custom';
  const chosen = Array.isArray(urls) ? urls : [];
  const atMax = chosen.length >= VIDEO_PHOTO_MAX;

  const setMode = (m) => { if (!disabled && m !== mode) onChange({ mode: m, urls: chosen }); };
  const toggle = (url) => {
    if (disabled) return;
    if (chosen.includes(url)) {
      onChange({ mode: 'custom', urls: chosen.filter(u => u !== url) });
    } else if (!atMax) {
      onChange({ mode: 'custom', urls: [...chosen, url] });
    }
  };
  const move = (i, delta) => {
    if (disabled) return;
    const j = i + delta;
    if (j < 0 || j >= chosen.length) return;
    const next = chosen.slice();
    const tmp = next[i]; next[i] = next[j]; next[j] = tmp;
    onChange({ mode: 'custom', urls: next });
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
  const smallBtn = (enabled) => ({
    background: 'transparent',
    border: '1px solid rgba(212,175,55,0.4)',
    color: enabled ? goldLight : 'rgba(248,244,236,0.25)',
    width: '36px',
    height: '36px',
    borderRadius: '3px',
    fontSize: '13px',
    lineHeight: 1,
    cursor: enabled && !disabled ? 'pointer' : 'default',
    fontFamily: "'Montserrat', sans-serif",
    flex: '0 0 auto',
  });

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
        🖼 Photos in the video
      </div>
      <div role="radiogroup" aria-label="Photos in the video" style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '520px' }}>
        <div style={optionStyle(!custom)}>
          <button type="button" role="radio" aria-checked={!custom} disabled={disabled} onClick={() => setMode('auto')} style={selectBtnStyle}>
            {dot(!custom)}
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: '13px', color: !custom ? goldLight : '#F8F4EC' }}>
                Auto (recommended)
              </span>
              <span style={{ display: 'block', fontSize: '11px', color: 'rgba(248,244,236,0.55)', lineHeight: 1.4, marginTop: '2px' }}>
                We pick the best photos and the order for you.
              </span>
            </span>
          </button>
        </div>
        <div style={optionStyle(custom)}>
          <button type="button" role="radio" aria-checked={custom} disabled={disabled} onClick={() => setMode('custom')} style={selectBtnStyle}>
            {dot(custom)}
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: '13px', color: custom ? goldLight : '#F8F4EC' }}>
                Choose photos
              </span>
              <span style={{ display: 'block', fontSize: '11px', color: 'rgba(248,244,236,0.55)', lineHeight: 1.4, marginTop: '2px' }}>
                Pick up to {VIDEO_PHOTO_MAX} and set their order.
              </span>
            </span>
          </button>
        </div>
      </div>

      {custom && (
        <div style={{ marginTop: '10px', maxWidth: '520px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(248,244,236,0.65)', lineHeight: 1.5, marginBottom: '8px' }}>
            Tap photos in the order you want them. The first one opens the video and the last one closes it.{' '}
            <span style={{ color: atMax ? goldLight : 'rgba(248,244,236,0.65)' }}>
              {chosen.length} of {VIDEO_PHOTO_MAX} chosen{atMax ? ' (that is the maximum -- remove one to swap it)' : ''}.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {all.map((url, i) => {
              const pos = chosen.indexOf(url);
              const picked = pos >= 0;
              const blocked = !picked && atMax;
              return (
                <button
                  key={url + i}
                  type="button"
                  aria-pressed={picked}
                  aria-label={picked ? `Photo ${i + 1}, number ${pos + 1} in the video. Tap to remove.` : `Photo ${i + 1}. Tap to add to the video.`}
                  disabled={disabled || blocked}
                  onClick={() => toggle(url)}
                  style={{
                    position: 'relative',
                    padding: 0,
                    background: 'transparent',
                    border: picked ? `2px solid ${goldLight}` : '1px solid rgba(212,175,55,0.3)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    width: '88px',
                    height: '66px',
                    flex: '0 0 auto',
                    cursor: disabled || blocked ? 'default' : 'pointer',
                    opacity: blocked ? 0.35 : 1,
                  }}
                >
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  {picked && (
                    <span
                      aria-hidden="true"
                      style={{
                        position: 'absolute', top: '3px', left: '3px',
                        minWidth: '22px', height: '22px', padding: '0 4px', boxSizing: 'border-box',
                        borderRadius: '11px', background: goldLight, color: '#0F2A22',
                        fontSize: '12px', fontWeight: 700, lineHeight: '22px', textAlign: 'center',
                        fontFamily: "'Montserrat', sans-serif",
                      }}
                    >
                      {pos + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {chosen.length === 0 ? (
            <div style={{ fontSize: '11px', color: 'rgba(248,244,236,0.55)', lineHeight: 1.5 }}>
              Nothing chosen yet -- until you pick at least one photo, the video will use Auto.
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '11px', color: goldLight, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px', fontFamily: "'Montserrat', sans-serif" }}>
                Your video order
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {chosen.map((url, i) => (
                  <div
                    key={url}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px',
                      border: '1px solid rgba(212,175,55,0.25)', borderRadius: '3px',
                    }}
                  >
                    <span style={{ flex: '0 0 auto', width: '20px', textAlign: 'center', color: goldLight, fontSize: '13px', fontWeight: 700, fontFamily: "'Montserrat', sans-serif" }}>
                      {i + 1}
                    </span>
                    <img src={url} alt="" style={{ width: '56px', height: '42px', objectFit: 'cover', borderRadius: '2px', flex: '0 0 auto' }} />
                    <span style={{ flex: '1 1 auto', minWidth: 0, fontSize: '11px', color: 'rgba(248,244,236,0.6)' }}>
                      {chosen.length > 1 && i === 0 ? 'Opens the video' : chosen.length > 1 && i === chosen.length - 1 ? 'Closes the video' : ''}
                    </span>
                    <button type="button" aria-label={`Move photo ${i + 1} earlier`} disabled={disabled || i === 0} onClick={() => move(i, -1)} style={smallBtn(i > 0)}>▲</button>
                    <button type="button" aria-label={`Move photo ${i + 1} later`} disabled={disabled || i === chosen.length - 1} onClick={() => move(i, 1)} style={smallBtn(i < chosen.length - 1)}>▼</button>
                    <button type="button" aria-label={`Remove photo ${i + 1} from the video`} disabled={disabled} onClick={() => toggle(url)} style={smallBtn(true)}>✕</button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange({ mode: 'custom', urls: [] })}
                style={{
                  background: 'transparent', border: 'none', padding: '8px 0 0', cursor: disabled ? 'default' : 'pointer',
                  color: 'rgba(248,244,236,0.65)', fontSize: '11px', textDecoration: 'underline',
                  fontFamily: "'Montserrat', sans-serif",
                }}
              >
                Clear my choice
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
