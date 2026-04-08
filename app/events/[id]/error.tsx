'use client';

import { useEffect } from 'react';

export default function EventBoardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('EventBoard render error:', error);
  }, [error]);

  return (
    <div style={{ minHeight: '100vh', background: '#070c0e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#ff6666', background: '#1a0000', border: '1px solid #440000', padding: '16px', maxWidth: '600px', width: '100%', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        <div style={{ color: '#ff4444', marginBottom: '8px', fontWeight: 'bold' }}>RENDER ERROR (error.tsx caught this)</div>
        <div>{error.message}</div>
        {error.stack && <div style={{ marginTop: '8px', opacity: 0.7 }}>{error.stack}</div>}
        {error.digest && <div style={{ marginTop: '8px', opacity: 0.5 }}>digest: {error.digest}</div>}
      </div>
      <button
        type="button"
        onClick={reset}
        style={{ marginTop: '16px', padding: '8px 24px', background: '#1a0000', border: '1px solid #ff4444', color: '#ff8888', fontFamily: 'monospace', fontSize: '11px', cursor: 'pointer' }}
      >
        Retry
      </button>
    </div>
  );
}
