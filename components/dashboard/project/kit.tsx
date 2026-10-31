import type { ReactNode } from 'react';
import Link from 'next/link';

export type Tone = 'green' | 'amber' | 'red' | 'slate';

const TONE_CLASSES: Record<Tone, string> = {
  green: 'bg-presence/10 text-presence border-presence/20',
  amber: 'bg-warning/10 text-warning border-warning/20',
  red: 'bg-absence/10 text-absence border-absence/20',
  slate: 'bg-surface-overlay text-secondary border-rule',
};

export function statusTone(status: string | null | undefined): Tone {
  switch (String(status ?? '').toUpperCase()) {
    case 'SUCCESS':
    case 'SUCCEEDED':
    case 'COMPLETED':
    case 'PARTIALLY_SUCCEEDED':
    case 'PARTIAL_SUCCESS':
    case 'READY':
      return 'green';
    case 'PENDING':
    case 'PROCESSING':
    case 'RUNNING':
    case 'QUEUED':
    case 'PLANNED':
    case 'WAITING_FOR_INPUT':
    case 'WAITING_FOR_APPROVAL':
      return 'amber';
    case 'FAILED':
    case 'BLOCKED':
    case 'NO_USABLE_EVIDENCE':
    case 'MANUAL_REQUIRED':
    case 'REJECTED':
      return 'red';
    default:
      return 'slate';
  }
}

export function statusLabel(status: string | null | undefined): string {
  return (status ?? '—').replace(/_/g, ' ').toLowerCase();
}

export function RunStatusBadge({ status }: { status: string | null | undefined }) {
  const tone = statusTone(status);
  const live = tone === 'amber';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${TONE_CLASSES[tone]}`}>
      {live && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning" aria-hidden="true" />}
      {statusLabel(status)}
    </span>
  );
}

export function SectionHeading({
  index,
  title,
  description,
  action,
}: {
  index?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {index && <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-tertiary">{index}</p>}
        <h2 className="mt-2 font-display text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink">{title}</h2>
        {description && <p className="mt-2 max-w-[62ch] text-[14px] leading-6 text-secondary">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function MetricTile({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-paper px-5 py-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-tertiary">{label}</p>
      <p className="mt-2 font-display text-[28px] font-semibold tabular-nums tracking-[-0.03em] text-ink">{value}</p>
      {sub && <p className="mt-1 text-[12px] leading-5 text-muted">{sub}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-rule bg-paper px-6 py-10 text-center">
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-[52ch] text-[13px] leading-6 text-secondary">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function LoadingRow() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-rule bg-paper px-5 py-4">
      <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-presence/20 border-t-presence" aria-hidden="true" />
      <p className="text-[13px] text-secondary">Loading…</p>
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-absence/20 bg-absence/5 px-4 py-3 text-[13px] leading-6 text-absence" role="alert">
      {message}
    </p>
  );
}

export function StageLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-[13px] font-semibold text-presence no-underline hover:text-presence-bright">
      {label} <span aria-hidden="true">→</span>
    </Link>
  );
}

export function formatCost(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  if (value === 0) return '~$0.00';
  if (value < 0.01) return `~$${value.toFixed(4)}`;
  return `~$${value.toFixed(2)}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function plural(count: number, singular: string, pluralForm?: string): string {
  return `${count} ${count === 1 ? singular : (pluralForm ?? `${singular}s`)}`;
}

export type StageKey =
  | 'businessUnderstanding'
  | 'buyerQuestions'
  | 'observations'
  | 'diagnosis'
  | 'interventions'
  | 'execution';

export type ProjectStageMap = Partial<Record<StageKey, string>>;

export const PIPELINE_STAGES: Array<{ key: StageKey; label: string }> = [
  { key: 'businessUnderstanding', label: 'Understanding' },
  { key: 'buyerQuestions', label: 'Questions' },
  { key: 'observations', label: 'Observations' },
  { key: 'diagnosis', label: 'Diagnosis' },
  { key: 'interventions', label: 'Interventions' },
  { key: 'execution', label: 'Execution' },
];

const CHIP_TONE: Record<Tone, string> = {
  green: 'border-presence/20 bg-presence/10 text-presence',
  amber: 'border-warning/20 bg-warning/10 text-warning',
  red: 'border-absence/20 bg-absence/10 text-absence',
  slate: 'border-rule bg-surface-overlay text-tertiary',
};

const CHIP_DOT: Record<Tone, string> = {
  green: 'bg-presence',
  amber: 'bg-warning',
  red: 'bg-absence',
  slate: 'bg-rule',
};

export function StageChip({ stage, status }: { stage: StageKey; status?: string | null }) {
  const label = PIPELINE_STAGES.find((s) => s.key === stage)?.label ?? stage;
  const tone = status ? statusTone(status) : 'slate';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-wider ${CHIP_TONE[tone]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${CHIP_DOT[tone]}`} aria-hidden="true" />
      {label}
    </span>
  );
}