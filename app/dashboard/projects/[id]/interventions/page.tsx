'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  listInterventionRuns,
  getInterventionItems,
  listDiagnosisRuns,
  startInterventionRun,
  type InterventionItemRef,
} from '@/components/dashboard/api';
import {
  RunStatusBadge,
  SectionHeading,
  MetricTile,
  LoadingRow,
  ErrorNote,
  formatCost,
  formatDate,
  formatDateTime,
} from '@/components/dashboard/project/kit';
import { TalkToUs } from '@/components/dashboard/TalkToUs';
import { FixCard } from '@/components/dashboard/FixCard';
import { useIsOps } from '@/components/dashboard/ViewerContext';
import type { InterventionRun } from '@/src/intervention-generation/types';

const DONE = new Set(['COMPLETED', 'PARTIAL_SUCCESS']);

/** Founder-only: generation controls, spend and run history. Never shown to clients. */
function InternalRuns({ projectId, runs, latestDiagnosisId, onGenerated }: { projectId: string; runs: InterventionRun[]; latestDiagnosisId: string | null; onGenerated: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const latest = runs[0];

  async function generate() {
    if (!latestDiagnosisId) return;
    setBusy(true);
    setError('');
    try {
      await startInterventionRun(projectId, latestDiagnosisId);
      await onGenerated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate interventions');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="zw-internal" aria-label="Internal: fix plan runs">
      <SectionHeading
        index="Internal · only you see this"
        title="Fix plan runs"
        action={latestDiagnosisId ? (
          <button onClick={generate} disabled={busy} className="zw-btn zw-btn-primary zw-btn-sm">{busy ? 'Generating…' : 'Regenerate from latest diagnosis'}</button>
        ) : undefined}
      />
      {error && <ErrorNote message={error} />}
      {latest && (
        <div className="mb-3 grid gap-3 sm:grid-cols-3">
          <MetricTile label="Latest fixes" value={latest.interventionCount} sub={`Run ${formatDateTime(latest.createdAt)}`} />
          <MetricTile label="Cost" value={formatCost(latest.costUsd)} sub="Generation only" />
          <MetricTile label="Status" value={<RunStatusBadge status={latest.status} />} sub={`${latest.eligibleGapCount} eligible gaps`} />
        </div>
      )}
      <ul className="zw-rows">
        {runs.map((run) => (
          <li key={run.id}>
            <div><strong>{run.interventionCount} fixes · {run.eligibleGapCount} gaps</strong><span>{run.model} · {formatCost(run.costUsd)} · {formatDateTime(run.createdAt)}</span></div>
            <RunStatusBadge status={run.status} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function InterventionsPage() {
  const { id } = useParams<{ id: string }>();
  const isOps = useIsOps();
  const [runs, setRuns] = useState<InterventionRun[]>([]);
  const [plan, setPlan] = useState<{ run: InterventionRun; items: InterventionItemRef } | null>(null);
  const [latestDiagnosisId, setLatestDiagnosisId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [runPage, diagPage] = await Promise.all([listInterventionRuns(id, isOps ? 12 : 5), listDiagnosisRuns(id, 1)]);
      setRuns(runPage.runs);
      setLatestDiagnosisId(diagPage.runs.find((r) => DONE.has(r.status))?.id ?? null);
      // Only the newest finished plan is shown, so fetch just that one.
      const latest = runPage.runs.find((run) => DONE.has(run.status));
      const items = latest ? await getInterventionItems(id, latest.id) : null;
      setPlan(latest && items ? { run: latest, items } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id, isOps]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="flex flex-col gap-3"><LoadingRow /><LoadingRow /><LoadingRow /></div>;
  if (error) return <ErrorNote message={error} />;

  const fixes = [...(plan?.items.interventions ?? [])].sort((a, b) => b.priorityScore - a.priorityScore);
  const doFirst = fixes.filter((fix) => fix.priority === 'CRITICAL' || fix.priority === 'HIGH').length;
  const questionsCovered = new Set(fixes.flatMap((fix) => [fix.exactBuyerQuestion, ...(fix.affectedQuestions ?? []).map((q) => q.exactQuestion)])).size;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <SectionHeading
          index="Fix plan"
          title={fixes.length ? 'What to fix, in order' : 'Your fix plan'}
          description={fixes.length
            ? 'Each fix answers a real buyer question where AI named someone else. Highest impact first.'
            : 'The fix plan is built from your audit: every buyer question where AI named someone else becomes a concrete fix.'}
        />
        {fixes.length > 0 && (
          <div className="zw-hello-meta zw-fix-summary">
            <span>{fixes.length} {fixes.length === 1 ? 'fix' : 'fixes'}</span>
            {doFirst > 0 && <span>{doFirst} high impact</span>}
            <span>{questionsCovered} buyer {questionsCovered === 1 ? 'question' : 'questions'} covered</span>
            {plan && <span>From your audit of {formatDate(plan.run.createdAt)}</span>}
          </div>
        )}
      </section>

      {fixes.length > 0 ? (
        <div className="zw-fix-list">
          {fixes.map((item, index) => (
            <FixCard key={item.id} item={item} rank={index + 1} projectId={id} isOps={isOps} onExecuted={load} />
          ))}
        </div>
      ) : (
        <div className="zw-card zw-fix-empty">
          <h3>Your fix plan is being prepared</h3>
          <p>We build it once your audit finishes and email you the moment it’s ready. Nothing for you to do yet.</p>
        </div>
      )}

      <TalkToUs
        topic="fixes"
        projectId={id}
        eyebrow="Done for you"
        title={fixes.length ? `Want us to do ${fixes.length === 1 ? 'this fix' : fixes.length === 2 ? 'both fixes' : `all ${fixes.length} fixes`} for you?` : 'Want us to handle the fixes?'}
        body={<p>We write the pages, publish them with you, then re-ask AI the same buyer questions to show what changed. You approve everything before it goes live.</p>}
        points={['Written by people who know your category', 'You approve every page before it’s published', 'Re-checked against the same AI questions after']}
        cta="Ask us to do the fixes"
      />

      {isOps && <InternalRuns projectId={id} runs={runs} latestDiagnosisId={latestDiagnosisId} onGenerated={load} />}
    </div>
  );
}
