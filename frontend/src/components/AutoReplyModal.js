import React from 'react';

export default function AutoReplyModal({ token, enquiry, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div style={{ background: 'var(--green-dark)', padding: '24px' }} onClick={e => e.stopPropagation()}>
        Auto-Reply stub for {enquiry.client_name}
      </div>
    </div>
  );
}
