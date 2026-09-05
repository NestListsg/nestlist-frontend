import React, { useEffect, useState } from 'react';

// Demo/display only -- no payment integration, nothing here talks to the backend.
// Upgrade/Downgrade just moves a "current plan" pointer around in client state
// (persisted to localStorage so it survives a reload during the demo).
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

const PLAN_ORDER = PLANS.map(p => p.key); // classic < signature < complete
const DEFAULT_PLAN_KEY = 'classic';
const STORAGE_KEY = 'nestlist_billing_current_plan';

function loadStoredPlan() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return PLAN_ORDER.includes(stored) ? stored : DEFAULT_PLAN_KEY;
  } catch (e) {
    // localStorage unavailable (private mode, etc.) -- fall back quietly, demo still works.
    return DEFAULT_PLAN_KEY;
  }
}

export default function Billing() {
  const [currentPlanKey, setCurrentPlanKey] = useState(loadStoredPlan);
  const [pendingPlanKey, setPendingPlanKey] = useState(null); // plan awaiting confirmation
  const [toast, setToast] = useState(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, currentPlanKey);
    } catch (e) {
      // ignore -- demo state just won't persist across reloads
    }
  }, [currentPlanKey]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const pendingPlan = pendingPlanKey ? PLANS.find(p => p.key === pendingPlanKey) : null;
  const isUpgrade = pendingPlanKey && PLAN_ORDER.indexOf(pendingPlanKey) > PLAN_ORDER.indexOf(currentPlanKey);

  function confirmChange() {
    if (!pendingPlanKey) return;
    const plan = PLANS.find(p => p.key === pendingPlanKey);
    setCurrentPlanKey(pendingPlanKey);
    setPendingPlanKey(null);
    if (plan) setToast(`You're now on the ${plan.name} plan`);
  }

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
        {PLANS.map(plan => {
          const isCurrent = plan.key === currentPlanKey;
          const isHigher = PLAN_ORDER.indexOf(plan.key) > PLAN_ORDER.indexOf(currentPlanKey);

          return (
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

              {isCurrent && (
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

              {isCurrent ? (
                <button
                  type="button"
                  disabled
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: 'transparent',
                    border: '1px solid rgba(248,244,236,0.25)',
                    color: 'rgba(248,244,236,0.5)',
                    borderRadius: '2px',
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: '12px',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    cursor: 'not-allowed'
                  }}
                >
                  Current Plan
                </button>
              ) : isHigher ? (
                <button
                  type="button"
                  className="btn-primary"
                  style={plan.highlight ? {} : { background: 'transparent', border: '1px solid rgba(212,175,55,0.4)', color: '#F0C84A' }}
                  onClick={() => setPendingPlanKey(plan.key)}
                >
                  ⬆ Upgrade
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setPendingPlanKey(plan.key)}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: 'transparent',
                    border: '1px solid rgba(248,244,236,0.2)',
                    color: 'rgba(248,244,236,0.55)',
                    borderRadius: '2px',
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: '12px',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Downgrade
                </button>
              )}
            </div>
          );
        })}
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

      {pendingPlan && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(13,43,29,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setPendingPlanKey(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#123124',
              border: '1px solid #D4AF37',
              borderRadius: '6px',
              padding: '28px 30px',
              maxWidth: '340px',
              width: '90%',
              boxShadow: '0 12px 40px rgba(0,0,0,0.4)'
            }}
          >
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '22px',
                color: '#F8F4EC',
                letterSpacing: '0.04em',
                marginBottom: '10px'
              }}
            >
              {isUpgrade ? 'Upgrade' : 'Downgrade'} to {pendingPlan.name}?
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(248,244,236,0.7)', marginBottom: '24px', lineHeight: 1.6 }}>
              {pendingPlan.name} — SGD {pendingPlan.price}/month. This is a demo change only, no payment will be processed.
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setPendingPlanKey(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'transparent',
                  border: '1px solid rgba(248,244,236,0.25)',
                  color: 'rgba(248,244,236,0.7)',
                  borderRadius: '2px',
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '12px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ flex: 1, width: 'auto', marginTop: 0 }}
                onClick={confirmChange}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '28px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#D4AF37',
            color: '#0D2B1D',
            padding: '12px 22px',
            borderRadius: '4px',
            fontFamily: "'Montserrat', sans-serif",
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            zIndex: 1001
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
