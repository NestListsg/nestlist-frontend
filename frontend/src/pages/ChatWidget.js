import React, { useState, useRef, useEffect } from 'react';

const API = process.env.REACT_APP_API_URL || '';

// Mary's avatar -- a gold monogram in the same visual language as the app's other
// branded marks (the video Card style's "N" monogram, the gold-on-dark palette
// throughout), rather than a generic chatbot face/emoji.
function MaryAvatar({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <circle cx="20" cy="20" r="18.5" fill="#14231b" stroke="#D4AF37" strokeWidth="1.5" />
      <text x="20" y="27" textAnchor="middle" fontFamily="Georgia, 'Cormorant Garamond', serif" fontSize="17" fill="#F0C84A">M</text>
    </svg>
  );
}

// Floating assistant available on every page. If the agent has a listing card
// expanded in My Listings, activeListingId is passed through so "this property"
// questions work without the agent retyping any numbers -- see App.js/MyListings.js.
export default function ChatWidget({ token, activeListingId }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, loading, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const nextMessages = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: nextMessages, listing_id: activeListingId || undefined })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'The assistant is temporarily unavailable.');
      setMessages(m => [...m, { role: 'assistant', content: data.reply, sources: data.sources || [] }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title="Ask Mary"
        style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000,
          width: '56px', height: '56px', borderRadius: '50%',
          background: '#D4AF37', border: 'none', cursor: 'pointer',
          boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
          fontSize: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#14231b'
        }}
      >
        {open ? '✕' : <MaryAvatar size={34} />}
      </button>

      {open && (
        <div style={{
          position: 'fixed', bottom: '92px', right: '24px', zIndex: 1000,
          width: '360px', maxWidth: 'calc(100vw - 32px)', height: '480px', maxHeight: 'calc(100vh - 140px)',
          background: '#14231b', border: '1px solid rgba(212,175,55,0.4)', borderRadius: '8px',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)'
        }}>
          <div style={{
            padding: '14px 16px', borderBottom: '1px solid rgba(212,175,55,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontFamily: "'Cormorant Garamond', serif", color: '#F0C84A', fontSize: '17px'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MaryAvatar size={26} />
              Mary
            </span>
            {activeListingId && (
              <span style={{ fontSize: '10px', fontFamily: "'Montserrat', sans-serif", color: 'rgba(248,244,236,0.5)', letterSpacing: '0.05em' }}>
                LISTING OPEN
              </span>
            )}
          </div>

          <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.length === 0 && (
              <div style={{ color: 'rgba(248,244,236,0.5)', fontSize: '12.5px', lineHeight: '1.6' }}>
                Hi, I'm Mary. Ask me anything property-related — land area conversions, PSF, stamp duty, mortgage estimates, current market rates, how to use NestList, or a question about a listing you have open.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                display: 'flex', gap: '8px', maxWidth: '92%',
                flexDirection: m.role === 'user' ? 'row-reverse' : 'row'
              }}>
                {m.role === 'assistant' && <MaryAvatar size={22} />}
                <div style={{
                  background: m.role === 'user' ? 'rgba(212,175,55,0.18)' : 'rgba(248,244,236,0.06)',
                  border: `1px solid ${m.role === 'user' ? 'rgba(212,175,55,0.35)' : 'rgba(248,244,236,0.12)'}`,
                  borderRadius: '6px', padding: '9px 12px',
                  fontSize: '13px', lineHeight: '1.55', color: '#F8F4EC', whiteSpace: 'pre-wrap'
                }}>
                  {m.content}
                  {m.sources && m.sources.length > 0 && (
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(248,244,236,0.1)', fontSize: '10.5px' }}>
                      {m.sources.filter(s => s.url).slice(0, 4).map((s, si) => (
                        <a key={si} href={s.url} target="_blank" rel="noreferrer"
                          style={{ display: 'block', color: '#B8912E', textDecoration: 'none', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.title || s.url}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(248,244,236,0.5)', fontSize: '12.5px', fontStyle: 'italic' }}>
                <MaryAvatar size={22} />
                Mary is thinking...
              </div>
            )}
            {error && (
              <div style={{ color: '#e08080', fontSize: '12px' }}>{error}</div>
            )}
          </div>

          <div style={{ padding: '12px', borderTop: '1px solid rgba(212,175,55,0.2)', display: 'flex', gap: '8px' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question..."
              rows={1}
              style={{
                flex: 1, resize: 'none', background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(212,175,55,0.25)', borderRadius: '4px',
                color: '#F8F4EC', padding: '9px 10px', fontSize: '13px',
                fontFamily: "'Montserrat', sans-serif"
              }}
            />
            <button
              type="button"
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                background: '#D4AF37', border: 'none', borderRadius: '4px',
                color: '#14231b', padding: '0 16px', cursor: 'pointer',
                fontFamily: "'Montserrat', sans-serif", fontSize: '13px', fontWeight: 'bold',
                opacity: (loading || !input.trim()) ? 0.5 : 1
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
