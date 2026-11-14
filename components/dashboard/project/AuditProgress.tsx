'use client';

import { useEffect, useMemo, useState } from 'react';

type AuditProgressSnapshot = {
  status?: string;
  report_data?: unknown;
  updated_at?: string | null;
};

const STEPS = [
  { state: 'BUILDING_UNDERSTANDING', label: 'Understanding your business', detail: 'Reviewing the website and collecting supported business facts.' },
  { state: 'BUILDING_BUYER_INTENT', label: 'Creating buyer questions', detail: 'Building and checking the buyer-question benchmark.' },
  { state: 'OBSERVING', label: 'Checking AI visibility', detail: 'Asking AI the buyer questions and recording its answers.' },
  { state: 'DIAGNOSING', label: 'Analysing visibility gaps', detail: 'Connecting observed answers to evidence and missing signals.' },
  { state: 'GENERATING_INTERVENTIONS', label: 'Preparing recommendations', detail: 'Prioritising evidence-based actions for the report.' },
] as const;

const STATE_INDEX: Record<string, number> = {
  QUEUED: -1,
  BUILDING_UNDERSTANDING: 0,
  BUILDING_BUYER_INTENT: 1,
  OBSERVING: 2,
  DIAGNOSING: 3,
  GENERATING_INTERVENTIONS: 4,
  COMPLETE: 5,
};

function getEnvelope(value: unknown): { state: string; failure?: string } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.kind !== 'NEW_INTELLIGENCE' || record.version !== 1 || typeof record.state !== 'string') return null;
  const failure = typeof record.failure === 'string' ? record.failure : undefined;
  return { state: record.state, failure };
}

export function AuditProgress({ auditId }: { auditId: string }) {
  const [snapshot, setSnapshot] = useState<AuditProgressSnapshot | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | undefined;

    const refresh = async () => {
      try {
        const response = await fetch(`/api/audits/${encodeURIComponent(auditId)}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('Could not refresh audit progress.');
        const data = await response.json() as AuditProgressSnapshot;
        if (!active) return;
        setSnapshot(data);
        setLoadError('');
        if (!['queued', 'running'].includes(String(data.status ?? '').toLowerCase()) && timer) {
          clearInterval(timer);
          timer = undefined;
        }
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : 'Progress is temporarily unavailable.');
      }
    };

    void refresh();
    timer = setInterval(() => { void refresh(); }, 5000);
    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [auditId]);

  const envelope = useMemo(() => getEnvelope(snapshot?.report_data), [snapshot?.report_data]);
  const status = String(snapshot?.status ?? 'queued').toLowerCase();
  const currentIndex = envelope ? (STATE_INDEX[envelope.state] ?? -1) : -1;
  const isFailed = status === 'failed' || envelope?.state === 'FAILED';
  const isComplete = status === 'completed' || envelope?.state === 'COMPLETE';

  return (
    <section className="mt-6 rounded-2xl border border-[#E4E3EB] bg-white p-5 text-[#171425] shadow-sm" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Audit progress</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isFailed ? 'bg-red-50 text-red-700' : isComplete ? 'bg-emerald-50 text-emerald-700' : 'bg-[#F3F3F6] text-[#524F6D]'}`}>
          {isFailed ? 'Needs attention' : isComplete ? 'Completed' : status === 'queued' ? 'Queued' : 'In progress'}
        </span>
      </div>

      <ol className="mt-5 space-y-4">
        {STEPS.map((step, index) => {
          const done = isComplete || (currentIndex >= 0 && index < currentIndex);
          const current = !isFailed && !isComplete && index === currentIndex;
          return (
            <li key={step.state} className="flex gap-3">
              <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${done ? 'bg-emerald-100 text-emerald-800' : current ? 'bg-[#463EDA] text-white' : 'border border-[#CFD0EE] text-[#676480]'}`}>
                {done ? '✓' : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`text-sm font-semibold ${done || current ? 'text-[#171425]' : 'text-[#676480]'}`}>{step.label}</p>
                  {current && <span className="text-[11px] font-semibold text-[#463EDA]">Working now</span>}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[#64617D]">{step.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {isFailed && (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {envelope?.failure || 'The audit could not finish. Please contact support or try again.'}
        </p>
      )}
      {loadError && <p className="mt-3 text-xs text-amber-700">{loadError}</p>}
      {!isFailed && !isComplete && <p className="mt-4 text-xs text-[#64617D]">This updates automatically every 5 seconds. No AI calls are made to check progress.</p>}
    </section>
  );
}
