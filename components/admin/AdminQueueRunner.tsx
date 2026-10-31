'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface QueueRunResult {
  status?: 'empty' | 'completed' | 'failed' | 'cap_reached';
  message?: string;
  error?: string;
  reportUrl?: string;
  costInr?: number;
}

/** Runs one queued engine job. Rendered as the content of the console's ink card. */
export function AdminQueueRunner({ pendingCount }: { pendingCount: number }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<QueueRunResult | null>(null);

  async function runNextJob() {
    if (running) return;
    setRunning(true);
    setResult(null);
    try {
      const response = await fetch('/api/admin/queue/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const body = await response.json().catch(() => ({})) as QueueRunResult;
      if (!response.ok) throw new Error(body.error ?? body.message ?? 'Queue job failed');
      setResult(body);
      router.refresh();
    } catch (error) {
      setResult({ status: 'failed', error: error instanceof Error ? error.message : 'Queue job failed' });
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <p className="zw-label zw-label-mint"><i aria-hidden="true" />Queue worker</p>
      <h2>{pendingCount > 0 ? `${pendingCount} ${pendingCount === 1 ? 'job' : 'jobs'} waiting` : 'Nothing waiting'}</h2>
      <p>
        {pendingCount > 0
          ? 'Runs the next engine stage now. Keep this page open until it finishes.'
          : 'Queue an audit, then run it from here.'}
      </p>
      <button type="button" onClick={runNextJob} disabled={running || pendingCount === 0} className="zw-ink-link">
        {running ? 'Running…' : pendingCount > 0 ? 'Run next job' : 'Queue is empty'}
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M8 5h7v7" /></svg>
      </button>
      <div aria-live="polite" className="zw-feedback">
        {result?.status === 'completed' && (
          <p className="is-ok">
            {result.message ?? 'Job completed'}
            {typeof result.costInr === 'number' ? ` · ₹${result.costInr.toFixed(2)}` : ''}
            {result.reportUrl ? <> · <a href={result.reportUrl} target="_blank" rel="noreferrer">Open report</a></> : null}
          </p>
        )}
        {result?.status === 'empty' && <p>The queue is empty.</p>}
        {result?.status === 'cap_reached' && <p className="is-warn">{result.message}</p>}
        {result?.status === 'failed' && <p className="is-error" role="alert">{result.error ?? result.message}</p>}
      </div>
    </>
  );
}
