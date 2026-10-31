'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ensureAccountClaim } from '@/lib/client/account-claim';

/** Asks for this business's audit. Nothing runs or is charged until we run it. */
export function RequestAuditButton({ projectId, label = 'Request my audit', buttonClassName }: { projectId: string; label?: string; buttonClassName?: string }) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'sending'>('idle');
  const [error, setError] = useState('');

  async function request() {
    setState('sending');
    setError('');
    try {
      const claim = await ensureAccountClaim();
      if (!claim.allowed) throw new Error(claim.message ?? 'Your account can’t request a free audit.');
      const res = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.redirected || (!res.ok && res.status !== 409)) {
        throw new Error(typeof data.error === 'string' ? data.error : 'We couldn’t request your audit. Try again.');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We couldn’t request your audit. Try again.');
      setState('idle');
    }
  }

  return (
    <div className="sr-request">
      <button type="button" className={buttonClassName ?? 'sr-hero-cta sr-request-btn'} onClick={request} disabled={state === 'sending'}>
        {state === 'sending' ? 'Requesting…' : label} <span aria-hidden="true">→</span>
      </button>
      {error && <p className="sr-request-error" role="alert">{error}</p>}
    </div>
  );
}
