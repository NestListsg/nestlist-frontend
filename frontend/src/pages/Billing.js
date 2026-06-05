import React from 'react';
export default function Billing() {
  return (
    <div className="page-content">
      <div className="page-title">Billing & Subscription</div>
      <div className="listing-output" style={{marginTop:'0'}}>
        <div style={{fontFamily:"'Cormorant Garamond',serif", fontSize:'24px', color:'#F8F4EC', letterSpacing:'0.1em', marginBottom:'8px'}}>NestList Prestige</div>
        <div style={{color:'#D4AF37', fontSize:'22px', fontFamily:"'Bodoni Moda',serif"}}>SGD 149 <span style={{fontSize:'13px', opacity:'0.6'}}>/month</span></div>
        <div style={{marginTop:'16px', color:'rgba(248,244,236,0.5)', fontSize:'13px'}}>Stripe payment integration coming soon.</div>
      </div>
    </div>
  );
}
