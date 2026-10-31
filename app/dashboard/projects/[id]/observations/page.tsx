'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  listObservationRuns,
  getObservationRun,
  getBuyerIntent,
  startObservation,
  type RunPage,
} from '@/components/dashboard/api';
import {
  RunStatusBadge,
  SectionHeading,
  MetricTile,
  EmptyState,
  LoadingRow,
  ErrorNote,
  StageLink,
  formatCost,
  formatDateTime,
} from '@/components/dashboard/project/kit';
import { useIsOps } from '@/components/dashboard/ViewerContext';
import type { ObservationRun, QuestionObservation, ObservedEntity } from '@/src/ai-observation/types';

const TARGET_TONE: Record<string, string> = {
  MENTIONED: 'bg-presence/10 text-presence border-presence/20',
  NOT_MENTIONED: 'bg-absence/10 text-absence border-absence/20',
  INCONCLUSIVE: 'bg-surface-overlay text-secondary border-rule',
};

function EntityPill({ entity }: { entity: ObservedEntity }) {
  const tone = entity.targetMatch
    ? 'bg-presence/10 text-presence'
    : entity.matchStatus === 'AMBIGUOUS'
      ? 'bg-warning/10 text-warning'
      : 'bg-surface-overlay text-secondary';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${tone}`}>
      {entity.surfaceForm}
      {entity.recommendationStrength === 'RECOMMENDED' || entity.recommendationStrength === 'STRONGLY_RECOMMENDED' ? (
        <span className="ml-0.5 text-[8px]" title={`Recommended (${entity.recommendationStrength})`}>★</span>
      ) : null}
    </span>
  );
}

function ObservationRow({ obs }: { obs: QuestionObservation }) {
  const isOps = useIsOps();
  const tone = TARGET_TONE[obs.targetStatus] ?? TARGET_TONE.INCONCLUSIVE;
  return (
    <div className="flex flex-col gap-2 border-b border-rule px-5 py-4 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <p className="flex-1 text-[14px] font-medium leading-6 text-ink">“{obs.exactQuestion}”</p>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${tone}`}>{obs.targetStatus.replace(/_/g, ' ').toLowerCase()}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(obs.entities ?? []).slice(0, 5).map((e) => (
          <EntityPill key={e.id} entity={e} />
        ))}
        {(obs.entities ?? []).length === 0 && <span className="font-mono text-[10px] text-muted">No entities extracted</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="rounded-full bg-bone px-2.5 py-1 font-mono text-[10px] font-semibold text-secondary">{obs.completeness.toLowerCase()}</span>
        {(obs.sources ?? []).length > 0 && (
          <span className="font-mono text-[10px] text-muted">{(obs.sources ?? []).length} source{(obs.sources ?? []).length === 1 ? '' : 's'} cited</span>
        )}
        {isOps && <span className="font-mono text-[10px] text-muted">{obs.costUsd != null ? formatCost(obs.costUsd) : '—'}</span>}
      </div>
    </div>
  );
}

function RunDetail({ projectId, runId, onBack }: { projectId: string; runId: string; onBack: () => void }) {
  const isOps = useIsOps();
  const [run, setRun] = useState<ObservationRun | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getObservationRun(projectId, runId)
      .then((data) => { if (!cancelled) setRun(data); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load run'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId, runId]);

  if (loading) return <LoadingRow />;
  if (error) return <ErrorNote message={error} />;
  if (!run) return <EmptyState title="Run not found" description="This observation run may have been deleted." />;

  const mentioned = (run.observations ?? []).filter((o) => o.targetStatus === 'MENTIONED').length;
  const total = (run.observations ?? []).length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onBack} className="inline-flex h-9 items-center rounded-full bg-bone px-4 text-[12px] font-semibold text-secondary no-underline hover:text-ink">← Back to list</button>
        <RunStatusBadge status={run.status} />
        {isOps && <span className="font-mono text-[11px] text-muted">{run.provider} · {run.model}</span>}
        <span className="font-mono text-[11px] text-muted">{formatDateTime(run.createdAt)}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <MetricTile label="Mentioned" value={`${mentioned}/${total}`} sub="Questions that name you" />
        <MetricTile label="Answered" value={`${run.completedQuestionCount}/${run.requestedQuestionCount}`} sub={`${run.failedQuestionCount} failed`} />
        {isOps ? (
          <MetricTile label="Cost" value={formatCost(run.costUsd)} sub={`${run.totalTokens?.toLocaleString() ?? '—'} tokens`} />
        ) : (
          <MetricTile label="Sites cited" value={new Set((run.observations ?? []).flatMap((o) => (o.sources ?? []).map((src) => src.domain).filter(Boolean))).size} sub="Websites AI leaned on" />
        )}
        <MetricTile label="Latency" value={run.completedQuestionCount > 0 ? `${Math.round((run.observations ?? []).reduce((s, o) => s + (o.latencyMs ?? 0), 0) / Math.max(1, run.completedQuestionCount) / 1000)}s avg` : '—'} sub="Per question" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-rule bg-paper">
        <div className="divide-y divide-rule">
          {(run.observations ?? []).map((obs) => (
            <ObservationRow key={obs.id} obs={obs} />
          ))}
          {(run.observations ?? []).length === 0 && (
            <p className="px-5 py-6 text-center text-[13px] text-secondary">No observations were returned for this run.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ObservationsPage() {
  const { id } = useParams<{ id: string }>();
  const isOps = useIsOps();
  const [runsPage, setRunsPage] = useState<RunPage<ObservationRun> | null>(null);
  const [questionSetId, setQuestionSetId] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [runs, qs] = await Promise.all([listObservationRuns(id, 12), getBuyerIntent(id)]);
      setRunsPage(runs);
      if (qs?.id && qs.frozen) setQuestionSetId(qs.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load observations');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    load().then(() => void cancelled);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleRun() {
    if (!questionSetId) return;
    setBusy(true);
    setError('');
    try {
      await startObservation(id, questionSetId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start observation');
    } finally {
      setBusy(false);
    }
  }

  if (selectedRunId) {
    return <RunDetail projectId={id} runId={selectedRunId} onBack={() => setSelectedRunId(null)} />;
  }

  if (loading) return (
    <div className="flex flex-col gap-3"><LoadingRow /><LoadingRow /></div>
  );

  if (error) return <ErrorNote message={error} />;

  const runs = runsPage?.runs ?? [];
  const hasUnfrozen = runs.length === 0 || !questionSetId;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <SectionHeading
          index="Evidence"
          title="What AI answers about your business"
          description="We asked AI every buyer question with live Google Search, and recorded who it named and which sources it cited, word for word."
        />
        {!isOps ? null : !questionSetId ? (
          <EmptyState
            title="No frozen question set yet"
            description="A frozen buyer question set must exist before observations can run. Generate and freeze a question set first."
            action={<StageLink href={`/dashboard/projects/${id}/questions`} label="Open Buyer Questions" />}
          />
        ) : (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-rule bg-paper px-5 py-4">
            <p className="flex-1 text-[13px] text-secondary">
              Ready to observe against the frozen question set.
            </p>
            <button
              onClick={handleRun}
              disabled={busy}
              className="inline-flex h-10 items-center rounded-full bg-presence px-5 text-[13px] font-semibold text-white no-underline disabled:opacity-60"
            >
              {busy ? 'Running…' : 'Run new observation'}
            </button>
          </div>
        )}
      </section>

      {runs.length === 0 ? (
        <EmptyState
          title="No observation runs yet"
          description={isOps
            ? 'The first observation answers all buyer questions through Gemini and records the full response, entities, and cited sources.'
            : 'Your audit is in our queue. Once it runs, every AI answer shows up here with the businesses it named and the sources it cited.'}
        />
      ) : (
        <section>
          <SectionHeading title={isOps ? 'Observation runs' : 'Audit checks'} description={isOps ? `${runs.length} most recent runs.` : 'Open a check to read every question and who AI named.'} />
          <div className="overflow-hidden rounded-2xl border border-rule bg-paper">
            <div className="divide-y divide-rule">
              {runs.map((run) => (
                <button
                  key={run.id}
                  type="button"
                  onClick={() => setSelectedRunId(run.id)}
                  className="flex w-full flex-col gap-2 px-5 py-4 text-left transition-colors hover:bg-bone/60 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <RunStatusBadge status={run.status} />
                      <span className="font-mono text-[11px] text-tertiary">{run.completedQuestionCount}/{run.requestedQuestionCount} answered</span>
                      {isOps && <span className="font-mono text-[11px] text-muted">{formatCost(run.costUsd)}</span>}
                    </div>
                    <p className="mt-1 text-[12px] text-secondary">{isOps ? `${run.provider} · ${run.model} · ` : ''}Started {formatDateTime(run.createdAt)}</p>
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-presence">View answers →</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}