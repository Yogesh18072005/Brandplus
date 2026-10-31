'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  getProject,
  getBusinessUnderstanding,
  getBuyerIntent,
  listObservationRuns,
  listDiagnosisRuns,
  listInterventionRuns,
  listExecutionRuns,
} from '@/components/dashboard/api';
import {
  RunStatusBadge,
  SectionHeading,
  EmptyState,
  LoadingRow,
  ErrorNote,
  formatCost,
  formatDate,
  formatDateTime,
  type StageKey,
} from '@/components/dashboard/project/kit';
import { useIsOps } from '@/components/dashboard/ViewerContext';
import { isCanonicalAudit } from '@/lib/reports/canonical-audit-envelope';

type Stream = StageKey | 'audit';

const STREAM_META: Record<Stream, { label: string; dot: string }> = {
  businessUnderstanding: { label: 'Business Understanding', dot: 'bg-signal' },
  buyerQuestions: { label: 'Buyer Questions', dot: 'bg-warning' },
  observations: { label: 'AI Observations', dot: 'bg-presence' },
  diagnosis: { label: 'Evidence & Diagnosis', dot: 'bg-absence' },
  interventions: { label: 'Interventions', dot: 'bg-tertiary' },
  execution: { label: 'Execution', dot: 'bg-signal' },
  audit: { label: 'Legacy audit', dot: 'bg-rule' },
};

interface TimelineEntry {
  id: string;
  stream: Stream;
  status: string;
  createdAt: string;
  detail: string;
  href: string;
}

const STAGE_HREFS: Record<Exclude<Stream, 'audit'>, (id: string) => string> = {
  businessUnderstanding: (id) => `/dashboard/projects/${id}`,
  buyerQuestions: (id) => `/dashboard/projects/${id}/questions`,
  observations: (id) => `/dashboard/projects/${id}/observations`,
  diagnosis: (id) => `/dashboard/projects/${id}/diagnosis`,
  interventions: (id) => `/dashboard/projects/${id}/interventions`,
  execution: (id) => `/dashboard/projects/${id}/executions`,
};

export default function RunsPage() {
  const { id } = useParams<{ id: string }>();
  const isOps = useIsOps();
  const [entries, setEntries] = useState<TimelineEntry[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    // Engine, model and spend are founder detail; clients see what happened, not what it cost.
    const internal = (base: string, detail: string) => (isOps ? `${base} · ${detail}` : base);
    (async () => {
      try {
        const [project, understanding, questions, observations, diagnoses, interventions, executions] = await Promise.all([
          getProject(id),
          getBusinessUnderstanding(id),
          getBuyerIntent(id),
          listObservationRuns(id, 25),
          listDiagnosisRuns(id, 25),
          listInterventionRuns(id, 25),
          listExecutionRuns(id, 25),
        ]);
        if (cancelled) return;

        const out: TimelineEntry[] = [];

        if (understanding) {
          out.push({
            id: understanding.content_hash,
            stream: 'businessUnderstanding',
            status: understanding.status,
            createdAt: understanding.generated_at,
            detail: internal(`${understanding.products.length + understanding.services.length} products/services understood`, understanding.extraction.reused ? `reused build · ${understanding.extraction.model}` : understanding.extraction.model),
            href: STAGE_HREFS.businessUnderstanding(id),
          });
        }

        if (questions) {
          out.push({
            id: questions.id,
            stream: 'buyerQuestions',
            status: questions.status,
            createdAt: questions.generated_at,
            detail: internal(`${questions.questions.length} buyer questions`, `${questions.frozen ? 'frozen' : 'not yet frozen'} · ${questions.generation.reused ? 'reused' : questions.generation.model}`),
            href: STAGE_HREFS.buyerQuestions(id),
          });
        }

        for (const run of observations.runs) {
          out.push({
            id: run.id,
            stream: 'observations',
            status: run.status,
            createdAt: run.createdAt,
            detail: internal(`${run.completedQuestionCount}/${run.requestedQuestionCount} questions asked`, `${run.provider} ${run.model} · ${formatCost(run.costUsd)}`),
            href: STAGE_HREFS.observations(id),
          });
        }

        for (const run of diagnoses.runs) {
          out.push({
            id: run.id,
            stream: 'diagnosis',
            status: run.status,
            createdAt: run.createdAt,
            detail: internal(`${run.completedQuestionCount}/${run.requestedQuestionCount} answers analysed · ${run.gapCount} gaps found`, `${run.llmCallCount} LLM calls · ${formatCost(run.costUsd)}`),
            href: STAGE_HREFS.diagnosis(id),
          });
        }

        for (const run of interventions.runs) {
          out.push({
            id: run.id,
            stream: 'interventions',
            status: run.status,
            createdAt: run.createdAt,
            detail: internal(`${run.interventionCount} fixes planned`, `${run.eligibleGapCount} eligible gaps · ${run.model} · ${formatCost(run.costUsd)}`),
            href: STAGE_HREFS.interventions(id),
          });
        }

        for (const run of executions.runs) {
          out.push({
            id: run.id,
            stream: 'execution',
            status: run.status,
            createdAt: run.createdAt,
            detail: internal(`attempt ${run.attemptNumber} · ${run.activePlan?.adapterId?.replace(/_/g, ' ').toLowerCase() ?? 'plan'}`, formatCost(run.estimatedCostUsd)),
            href: STAGE_HREFS.execution(id),
          });
        }

        for (const audit of project.audits) {
          if (isCanonicalAudit(audit.report_data)) continue;
          out.push({
            id: audit.id,
            stream: 'audit',
            status: audit.status,
            createdAt: audit.created_at,
            detail: `${audit.prompt_count ?? '—'} prompts · legacy pipeline`,
            href: audit.status === 'completed' ? `/r/${audit.id}` : `/dashboard/projects/${id}`,
          });
        }

        out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setEntries(out);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load history');
      }
    })();
    return () => { cancelled = true; };
  }, [id, isOps]);

  if (error) return <ErrorNote message={error} />;
  if (!entries) return <div className="flex flex-col gap-3"><LoadingRow /><LoadingRow /></div>;

  return (
    <div className="flex flex-col gap-8">
      <SectionHeading
        index="History · All runs"
        title="The full run ledger"
        description="Every engine run across the pipeline, newest first — merged with legacy audits from the older report pipeline."
      />

      {entries.length === 0 ? (
        <EmptyState
          title="Nothing recorded yet"
          description="Start with Business Understanding on the Overview page. Every generation, observation, diagnosis, and execution will land here."
        />
      ) : (
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-rule bg-paper">
          {entries.map((entry) => {
            const meta = STREAM_META[entry.stream];
            return (
              <a
                key={`${entry.stream}-${entry.id}`}
                href={entry.href}
                className="group grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-b border-rule px-5 py-4 last:border-0 hover:bg-bone/60 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-rule bg-bone">
                  <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <RunStatusBadge status={entry.status} />
                    <span className="text-[14px] font-semibold text-ink">{meta.label}</span>
                  </div>
                  <p className="mt-1 truncate text-[12px] text-secondary">{entry.detail}</p>
                </div>
                <span className="col-start-2 font-mono text-[10px] text-muted sm:col-start-auto">{formatDateTime(entry.createdAt)}</span>
                <span className="hidden font-mono text-[11px] font-semibold text-presence sm:inline">Open →</span>
              </a>
            );
          })}
        </div>
      )}

      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">First runs · {entries.length > 0 ? formatDate(entries[entries.length - 1]?.createdAt ?? null) : '—'}</p>
    </div>
  );
}
