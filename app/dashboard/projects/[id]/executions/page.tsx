'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  listExecutionRuns,
  getExecutionRun,
  postExecutionAction,
  getBusinessUnderstanding,
  type RunPage,
} from '@/components/dashboard/api';
import {
  RunStatusBadge,
  SectionHeading,
  MetricTile,
  EmptyState,
  LoadingRow,
  ErrorNote,
  formatCost,
  formatDateTime,
} from '@/components/dashboard/project/kit';
import { useIsOps } from '@/components/dashboard/ViewerContext';
import type { ExecutionRun } from '@/src/execution/types';

const STEP_TONE: Record<string, string> = {
  SUCCEEDED: 'bg-presence/10 text-presence border-presence/20',
  RUNNING: 'bg-warning/10 text-warning border-warning/20',
  PENDING: 'bg-surface-overlay text-secondary border-rule',
  FAILED: 'bg-absence/10 text-absence border-absence/20',
  CANCELLED: 'bg-surface-overlay text-secondary border-rule',
  UNKNOWN: 'bg-surface-overlay text-secondary border-rule',
};

function Actions({ run, projectId, onMutated }: { run: ExecutionRun; projectId: string; onMutated: () => void }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const plan = run.activePlan;
  const payloadHash = run.approvals?.find((a) => a.status === 'REQUIRED_APPROVAL')?.payloadHash ?? plan?.payloadHash ?? undefined;
  const waitingApproval = plan?.approvalStatus === 'REQUIRED_APPROVAL' || run.approvals?.some((a) => a.status === 'REQUIRED_APPROVAL');
  const canCancel = ['QUEUED', 'RUNNING', 'WAITING_FOR_INPUT', 'WAITING_FOR_APPROVAL'].includes(run.status);
  const canRetry = (run.status === 'FAILED' || run.status === 'BLOCKED') && run.activePlan?.retrySafety !== 'UNSAFE_TO_RETRY';

  const knownActions: Array<{ key: 'approve' | 'reject' | 'cancel' | 'retry'; label: string; tone: string; show: boolean }> = [
    { key: 'approve', label: 'Approve', tone: 'bg-presence text-white', show: Boolean(waitingApproval && payloadHash) },
    { key: 'reject', label: 'Reject', tone: 'bg-bone text-absence', show: Boolean(waitingApproval && payloadHash) },
    { key: 'cancel', label: 'Cancel', tone: 'bg-bone text-secondary', show: canCancel },
    { key: 'retry', label: 'Retry', tone: 'bg-bone text-secondary', show: canRetry },
  ];

  async function act(key: 'approve' | 'reject' | 'cancel' | 'retry') {
    setBusy(key);
    setError('');
    try {
      await postExecutionAction(projectId, run.id, key, payloadHash);
      onMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy('');
    }
  }

  const visible = knownActions.filter((a) => a.show);
  if (visible.length === 0 && !(run.approvals?.some((a) => a.status === 'REQUIRED_APPROVAL'))) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {visible.map((a) => (
        <button key={a.key} onClick={() => act(a.key)} disabled={busy !== ''} className={`inline-flex h-9 items-center rounded-full px-4 text-[12px] font-semibold no-underline disabled:opacity-60 ${a.tone}`}>
          {busy === a.key ? 'Working…' : a.label}
        </button>
      ))}
      {run.approvals?.some((a) => a.status === 'REQUIRED_APPROVAL') && !payloadHash && (
        <span className="rounded-full bg-warning/10 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-warning">approval recorded, hash not readable</span>
      )}
      {error && <span className="text-[12px] leading-5 text-absence">{error}</span>}
    </div>
  );
}

function Detail({ projectId, runId, onBack }: { projectId: string; runId: string; onBack: () => void }) {
  const [run, setRun] = useState<ExecutionRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function refresh() {
    const data = await getExecutionRun(projectId, runId);
    setRun(data);
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getExecutionRun(projectId, runId)
      .then((data) => { if (!cancelled) setRun(data); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId, runId]);

  if (loading) return <LoadingRow />;
  if (error) return <ErrorNote message={error} />;
  if (!run) return <EmptyState title="Execution not found" description="This execution run may have been deleted." />;

  const plan = run.activePlan;
  const steps = run.steps ?? [];
  const approvals = run.approvals ?? [];
  const events = run.events ?? [];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onBack} className="inline-flex h-9 items-center rounded-full bg-bone px-4 text-[12px] font-semibold text-secondary no-underline hover:text-ink">← Back to list</button>
        <RunStatusBadge status={run.status} />
        <span className="font-mono text-[11px] text-muted">attempt {run.attemptNumber} · {formatDateTime(run.createdAt)}</span>
        <span className="flex-1" />
        <Actions run={run} projectId={projectId} onMutated={refresh} />
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <MetricTile label="Status" value={<RunStatusBadge status={run.status} />} sub={run.errorMessage ?? 'Live state from the execution engine'} />
        <MetricTile label="Cost" value={formatCost(run.estimatedCostUsd)} sub={`${run.providerCallCount} provider calls`} />
        <MetricTile label="Steps" value={steps.length} sub={`${steps.filter((s) => s.status === 'SUCCEEDED').length} succeeded`} />
        <MetricTile label="Approval" value={plan?.approvalStatus?.replace(/_/g, ' ').toLowerCase() ?? '—'} sub={run.activePlan ? `Risk: ${run.activePlan.risk.toLowerCase()}` : undefined} />
      </div>

      {plan && (
        <section className="rounded-2xl border border-rule bg-paper px-6 py-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-tertiary">Active plan</p>
          <p className="mt-2 text-[15px] font-semibold text-ink">{plan.payload?.action ?? plan.id}</p>
          <p className="mt-1 max-w-[72ch] text-[13px] leading-6 text-secondary">{plan.payload?.objective}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-bone px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-secondary">{plan.adapterId.replace(/_/g, ' ').toLowerCase()}</span>
            <span className="rounded-full bg-bone px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-secondary">{plan.targetSurface.replace(/_/g, ' ').toLowerCase()}</span>
            {plan.rollback?.supported && <span className="rounded-full bg-bone px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-secondary">rollback supported</span>}
          </div>
          {(plan.requiredInputs ?? []).length > 0 && (
            <div className="mt-4 flex flex-col gap-1.5">
              {plan.requiredInputs.map((input) => (
                <p key={input.inputKey} className="text-[12px] leading-5 text-secondary">
                  <span className={`font-semibold ${input.satisfied ? 'text-presence' : 'text-warning'}`}>{input.satisfied ? '✓' : '•'}</span>{' '}
                  {input.description} <span className="text-muted">({input.inputType.replace(/_/g, ' ').toLowerCase()})</span>
                </p>
              ))}
            </div>
          )}
        </section>
      )}

      {plan && (plan.acceptanceCriteria ?? []).length > 0 && (
        <section className="rounded-2xl border border-rule bg-paper px-6 py-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-tertiary">Acceptance criteria</p>
          <ul className="mt-3 flex flex-col gap-1.5">
            {plan.acceptanceCriteria.map((c, i) => (
              <li key={i} className="flex gap-2 text-[13px] leading-6 text-secondary"><span className="text-presence">✓</span>{c}</li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <SectionHeading title="Steps" description={steps.length === 0 ? 'No steps recorded yet.' : `${steps.length} step${steps.length === 1 ? '' : 's'} in plan order.`} />
        <div className="overflow-hidden rounded-2xl border border-rule bg-paper">
          {steps.length === 0 ? (
            <p className="px-5 py-6 text-center text-[13px] text-secondary">This execution has not started its steps yet.</p>
          ) : (
            <div className="divide-y divide-rule">
              {[...steps].sort((a, b) => a.sequence - b.sequence).map((step) => (
                <div key={step.id} className="flex flex-col gap-1.5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[14px] font-medium text-ink"><span className="font-mono text-[11px] text-tertiary">S{step.sequence}</span> · {step.name}</p>
                    {step.artifact?.artifactType && (
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-presence">
                        {step.artifact.artifactType.replace(/_/g, ' ')} · {step.artifact.mediaType}
                      </p>
                    )}
                    {step.evidence?.confirmation && <p className="mt-1 text-[12px] leading-5 text-secondary">{step.evidence.confirmation}</p>}
                    {step.errorMessage && <p className="mt-1 text-[12px] text-absence">{step.errorMessage}</p>}
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${STEP_TONE[step.status] ?? STEP_TONE.UNKNOWN}`}>
                    {step.status.toLowerCase()} {step.attemptCount > 1 ? `· attempt ${step.attemptCount}` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {approvals.length > 0 && (
        <section>
          <SectionHeading title="Approvals" description="Approval trail recorded by the execution engine." />
          <div className="overflow-hidden rounded-2xl border border-rule bg-paper">
            <div className="divide-y divide-rule">
              {approvals.map((a) => (
                <div key={a.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[13px] font-medium text-ink">{a.requestedAction}</p>
                    <p className="text-[12px] text-secondary">{a.requestedScope}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted">requested {formatDateTime(a.requestedAt)}</span>
                    <RunStatusBadge status={a.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {events.length > 0 && (
        <section>
          <SectionHeading title="Timeline" description="Execution events in order." />
          <div className="flex flex-col gap-2">
            {[...events].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-xl border border-rule bg-paper px-4 py-2.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-presence" aria-hidden="true" />
                <span className="font-mono text-[11px] text-secondary">{e.eventType.replace(/_/g, ' ').toLowerCase()}</span>
                <span className="flex-1" />
                <span className="font-mono text-[10px] text-muted">{formatDateTime(e.createdAt)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function ExecutionsPage() {
  const { id } = useParams<{ id: string }>();
  const isOps = useIsOps();
  const router = useRouter();
  const [runsPage, setRunsPage] = useState<RunPage<ExecutionRun> | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [hasInterventions, setHasInterventions] = useState(false);
  const [hasUnderstanding, setHasUnderstanding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [runs, understanding] = await Promise.all([listExecutionRuns(id, 12), getBusinessUnderstanding(id)]);
      setRunsPage(runs);
      setHasInterventions(runs.runs.length > 0);
      setHasUnderstanding(understanding != null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Execution is run by our team; clients follow progress on the fix plan.
    if (!isOps) { router.replace(`/dashboard/projects/${id}/interventions`); return; }
    let cancelled = false;
    load().then(() => void cancelled);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isOps]);

  if (!isOps) return <LoadingRow />;
  if (selectedRunId) return <Detail projectId={id} runId={selectedRunId} onBack={() => setSelectedRunId(null)} />;
  if (loading) return <div className="flex flex-col gap-3"><LoadingRow /><LoadingRow /></div>;
  if (error) return <ErrorNote message={error} />;

  const runs = runsPage?.runs ?? [];
  return (
    <div className="flex flex-col gap-8">
      <section>
        <SectionHeading
          index="Execution · Stage 06"
          title="Approved and in motion"
          description="Each execution turns one intervention into an auditable plan with steps, artifacts, approvals, and a timeline."
        />
        <div className="rounded-2xl border border-rule bg-paper px-5 py-5">
          <p className="max-w-[72ch] text-[13px] leading-6 text-secondary">
            Execution starts from a specific intervention on the Interventions page — “Start execution” there creates the plan, then approvals and steps run here.
          </p>
          {!hasUnderstanding && (
            <p className="mt-2 text-[12px] leading-5 text-warning">No business understanding recorded yet — generate it before executing anything.</p>
          )}
        </div>
      </section>

      {runs.length === 0 ? (
        <EmptyState
          title="No executions yet"
          description="Open the Interventions page and start execution on a fix. Once created, its plan, steps, approvals, and timeline appear here."
          action={<a href={`/dashboard/projects/${id}/interventions`} className="text-[13px] font-semibold text-presence no-underline">Go to Interventions →</a>}
        />
      ) : (
        <section>
          <SectionHeading title="Execution runs" description={`${runs.length} most recent runs.`} />
          <div className="overflow-hidden rounded-2xl border border-rule bg-paper">
            <div className="divide-y divide-rule">
              {runs.map((run) => (
                <button key={run.id} type="button" onClick={() => setSelectedRunId(run.id)} className="flex w-full flex-col gap-2 px-5 py-4 text-left transition-colors hover:bg-bone/60 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <RunStatusBadge status={run.status} />
                      <span className="font-mono text-[11px] text-tertiary">attempt {run.attemptNumber}</span>
                      <span className="font-mono text-[11px] text-muted">{formatCost(run.estimatedCostUsd)}</span>
                      <span className="font-mono text-[11px] text-muted">{run.providerCallCount} calls</span>
                    </div>
                    <p className="mt-1 text-[12px] text-secondary">{run.activePlan?.adapterId?.replace(/_/g, ' ').toLowerCase() ?? 'execution'} · {formatDateTime(run.createdAt)}{run.errorMessage ? ` · ${run.errorMessage.slice(0, 90)}` : ''}</p>
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-presence">View plan →</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}