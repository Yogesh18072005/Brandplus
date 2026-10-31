'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  listDiagnosisRuns,
  getDiagnosisRun,
  getDiagnosisQuestions,
  listObservationRuns,
  startDiagnosis,
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
import type { EvidenceDiagnosisRun, QuestionDiagnosis } from '@/src/evidence-diagnosis/types';

function classificationTone(cls: string) {
  if (cls.includes('NO_TARGET')) return 'bg-absence/10 text-absence';
  if (cls.includes('RELEVANCE_GAP') || cls.includes('SPECIFICITY_GAP') || cls.includes('CITATION_GAP') || cls.includes('AUTHORITY_GAP')) return 'bg-warning/10 text-warning';
  if (cls.includes('MENTIONED_WEAKLY') || cls.includes('BUT_NOT_PREFERRED')) return 'bg-warning/10 text-warning';
  return 'bg-surface-overlay text-secondary';
}

function comparisonTone(cmp: string | null | undefined) {
  if (cmp === 'TARGET_STRONGER') return 'text-presence';
  if (cmp === 'OBSERVED_STRONGER') return 'text-absence';
  return 'text-secondary';
}

function DiagnosisRow({ d }: { d: QuestionDiagnosis }) {
  return (
    <div className="flex flex-col gap-2 border-b border-rule px-5 py-4 last:border-0">
      <p className="text-[14px] font-medium leading-6 text-ink">“{d.exactQuestion}”</p>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${classificationTone(d.primaryClassification)}`}>{d.primaryClassification.replace(/_/g, ' ').toLowerCase()}</span>
        <span className="font-mono text-[10px] font-semibold text-secondary">{d.commercialImplication.toLowerCase()} implication</span>
        <span className={`font-mono text-[11px] font-semibold ${comparisonTone(d.evidenceComparison)}`}>{d.evidenceComparison.replace(/_/g, ' ').toLowerCase()}</span>
        <span className="font-mono text-[10px] text-muted">{d.confidence.toLowerCase()} confidence</span>
      </div>
      {(d.gaps ?? []).length > 0 && (
        <div className="mt-1 flex flex-col gap-1">
          {d.gaps.slice(0, 2).map((g) => (
            <p key={g.id} className="text-[12px] leading-5 text-secondary">
              <span className="font-semibold text-tertiary">{g.gapType.replace(/_/g, ' ').toLowerCase()}:</span> {g.description.slice(0, 200)}{g.description.length > 200 ? '…' : ''}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function Detail({ projectId, runId, onBack }: { projectId: string; runId: string; onBack: () => void }) {
  const isOps = useIsOps();
  const [run, setRun] = useState<EvidenceDiagnosisRun | null>(null);
  const [questions, setQuestions] = useState<QuestionDiagnosis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getDiagnosisRun(projectId, runId), getDiagnosisQuestions(projectId, runId)])
      .then(([r, q]) => {
        if (!cancelled) {
          setRun(r);
          setQuestions(q?.questions ?? []);
        }
      })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId, runId]);

  if (loading) return <LoadingRow />;
  if (error) return <ErrorNote message={error} />;
  if (!run) return <EmptyState title="Run not found" description="This diagnosis run may have been deleted." />;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onBack} className="inline-flex h-9 items-center rounded-full bg-bone px-4 text-[12px] font-semibold text-secondary no-underline hover:text-ink">← Back to list</button>
        <RunStatusBadge status={run.status} />
        <span className="font-mono text-[11px] text-muted">{isOps ? `${run.model ?? 'deterministic'} · ` : ''}{formatDateTime(run.createdAt)}</span>
        {isOps && <span className="font-mono text-[11px] text-muted">{formatCost(run.costUsd)} · {run.llmCallCount} LLM calls</span>}
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <MetricTile label="Questions diagnosed" value={`${run.completedQuestionCount}/${run.requestedQuestionCount}`} sub={`${run.failedQuestionCount} failed`} />
        <MetricTile label="Evidence assessed" value={run.evidenceCount} sub="From answers + your site" />
        <MetricTile label="Gaps found" value={run.gapCount} sub="Root causes behind missed answers" />
        <MetricTile label="Inconclusive" value={run.inconclusiveQuestionCount} sub="Need more data to diagnose" />
      </div>

      {questions.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-rule bg-paper">
          <div className="divide-y divide-rule">
            {questions.map((d) => <DiagnosisRow key={d.id} d={d} />)}
          </div>
        </div>
      ) : (
        <EmptyState title="No per-question diagnoses returned" description="This run may still be processing or may have failed to record question-level details." />
      )}
    </div>
  );
}

export default function DiagnosisPage() {
  const { id } = useParams<{ id: string }>();
  const isOps = useIsOps();
  const [runsPage, setRunsPage] = useState<RunPage<EvidenceDiagnosisRun> | null>(null);
  const [latestObsId, setLatestObsId] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [runs, obsPage] = await Promise.all([listDiagnosisRuns(id, 12), listObservationRuns(id, 1)]);
      setRunsPage(runs);
      const latestObs = obsPage.runs.find((r) => r.status === 'COMPLETED' || r.status === 'PARTIAL_SUCCESS');
      setLatestObsId(latestObs?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
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
    if (!latestObsId) return;
    setBusy(true);
    setError('');
    try {
      await startDiagnosis(id, latestObsId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start diagnosis');
    } finally {
      setBusy(false);
    }
  }

  if (selectedRunId) return <Detail projectId={id} runId={selectedRunId} onBack={() => setSelectedRunId(null)} />;
  if (loading) return <div className="flex flex-col gap-3"><LoadingRow /><LoadingRow /></div>;
  if (error) return <ErrorNote message={error} />;

  const runs = runsPage?.runs ?? [];
  return (
    <div className="flex flex-col gap-8">
      <section>
        <SectionHeading
          index="Diagnosis"
          title="Why the answers look the way they do"
          description="For every answer that left you out, we compared what AI found against your website and pinned down what was missing."
        />
        {!isOps ? null : !latestObsId ? (
          <EmptyState
            title="No completed observation to diagnose"
            description="Run an observation first — diagnosis uses the recorded answers and their entities/citations."
            action={<a href={`/dashboard/projects/${id}/observations`} className="text-[13px] font-semibold text-presence no-underline">Go to AI Observations →</a>}
          />
        ) : (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-rule bg-paper px-5 py-4">
            <p className="flex-1 text-[13px] text-secondary">Ready to diagnose the latest observation run.</p>
            <button onClick={handleRun} disabled={busy} className="inline-flex h-10 items-center rounded-full bg-presence px-5 text-[13px] font-semibold text-white no-underline disabled:opacity-60">
              {busy ? 'Starting…' : 'Diagnose latest observation'}
            </button>
          </div>
        )}
      </section>

      {runs.length === 0 ? (
        <EmptyState title="No diagnosis yet" description={isOps ? 'Each diagnosis run is tied to a specific observation run. Select an observation to diagnose.' : 'The diagnosis appears here once your audit has run. We’ll email you when it’s ready.'} />
      ) : (
        <section>
          <SectionHeading title={isOps ? 'Diagnosis runs' : 'Diagnoses'} description={isOps ? `${runs.length} most recent runs.` : 'Open one to see, question by question, what kept you out of the answer.'} />
          <div className="overflow-hidden rounded-2xl border border-rule bg-paper">
            <div className="divide-y divide-rule">
              {runs.map((run) => (
                <button key={run.id} type="button" onClick={() => setSelectedRunId(run.id)} className="flex w-full flex-col gap-2 px-5 py-4 text-left transition-colors hover:bg-bone/60 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <RunStatusBadge status={run.status} />
                      <span className="font-mono text-[11px] text-tertiary">{run.completedQuestionCount}/{run.requestedQuestionCount} diagnosed</span>
                      <span className="font-mono text-[11px] text-muted">{run.gapCount} gaps</span>
                    </div>
                    <p className="mt-1 text-[12px] text-secondary">{isOps ? `${run.model ?? 'deterministic'} · ${formatCost(run.costUsd)} · ` : ''}{formatDateTime(run.createdAt)}</p>
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-presence">View diagnoses →</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}