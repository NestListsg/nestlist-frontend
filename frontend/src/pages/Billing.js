import React from 'react';

// Demo/display only -- no payment integration. "Choose plan" buttons are inert.
const PLANS = [
  {
    key: 'classic',
    name: 'Classic',
    price: 100,
    tagline: 'Everything an agent needs to post fast.',
    features: [
      'Unlimited posters — included free',
      'Up to 30 Classic videos / month (AI cinematic slideshow: motion over the agent’s photos + music + captions)',
      'Listing copy + social captions'
    ],
    highlight: false
  },
  {
    key: 'signature',
    name: 'Signature',
    price: 150,
    tagline: 'The premium tier for standout listings.',
    features: [
      'Everything in Classic',
      'Up to 10 Signature videos / month (premium film: agent’s avatar intro + lifestyle walkthrough)',
      'Unlimited Classic videos'
    ],
    highlight: true
  },
  {
    key: 'complete',
    name: 'Complete',
    price: 200,
    tagline: 'Maximum output, top priority.',
    features: [
      'Classic + Signature',
      'Up to 15 Signature videos / month',
      'Unlimited Classic videos',
      'Priority rendering'
    ],
    highlight: false
  }
];

// Demo default: mark Classic as the "current plan" tag.
const CURRENT_PLAN_KEY = 'classic';

export default function Billing() {
  return (
    <div className="page-content">
      <div className="page-title">Billing & Subscription</div>
      <div className="page-subtitle">Choose the plan that fits how much you post. All prices in SGD, per agent, per month.</div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          alignItems: 'stretch'
        }}
      >
        {PLANS.map(plan => (
          <div
            key={plan.key}
            style={{
              position: 'relative',
              background: plan.highlight ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.05)',
              border: plan.highlight ? '1px solid #D4AF37' : '0.5px solid rgba(212,175,55,0.25)',
              borderRadius: '6px',
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: plan.highlight ? '0 0 0 1px rgba(212,175,55,0.15), 0 8px 24px rgba(0,0,0,0.25)' : 'none',
              transform: plan.highlight ? 'translateY(-6px)' : 'none'
            }}
          >
            {plan.highlight && (
              <div
                style={{
                  position: 'absolute',
                  top: '-13px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#D4AF37',
                  color: '#0D2B1D',
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  padding: '5px 14px',
                  borderRadius: '999px',
                  whiteSpace: 'nowrap'
                }}
              >
                ★ Most Popular
              </div>
            )}

            {plan.key === CURRENT_PLAN_KEY && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '10px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'rgba(248,244,236,0.6)',
                  border: '1px solid rgba(248,244,236,0.25)',
                  borderRadius: '3px',
                  padding: '3px 8px',
                  marginBottom: '12px'
                }}
              >
                Current plan
              </div>
            )}

            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '26px',
                letterSpacing: '0.08em',
                color: plan.highlight ? '#F0C84A' : '#F8F4EC',
                marginBottom: '4px'
              }}
            >
              {plan.name}
            </div>

            <div style={{ fontSize: '12px', color: 'rgba(248,244,236,0.55)', marginBottom: '18px' }}>
              {plan.tagline}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '38px', color: '#F8F4EC', fontWeight: 500 }}>
                SGD {plan.price}
              </span>
              <span style={{ fontSize: '13px', color: 'rgba(248,244,236,0.5)' }}> /mo</span>
            </div>

            <ul style={{ listStyle: 'none', flex: 1, marginBottom: '24px' }}>
              {plan.features.map((f, i) => (
                <li
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    fontSize: '13px',
                    lineHeight: 1.6,
                    color: 'rgba(248,244,236,0.85)',
                    marginBottom: '10px'
                  }}
                >
                  <span style={{ color: '#D4AF37', marginTop: '1px' }}>✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              className="btn-primary"
              style={
                plan.highlight
                  ? {}
                  : { background: 'transparent', border: '1px solid rgba(212,175,55,0.4)', color: '#F0C84A' }
              }
            >
              Choose plan
            </button>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: '24px',
          textAlign: 'center',
          fontSize: '12px',
          color: 'rgba(248,244,236,0.5)',
          fontFamily: "'Montserrat', sans-serif"
        }}
      >
        Every plan includes unlimited poster generation, free.
      </div>
    </div>
  );
}
