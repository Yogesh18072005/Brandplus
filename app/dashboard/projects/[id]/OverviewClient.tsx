'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  getBusinessUnderstanding,
  getBuyerIntent,
  listObservationRuns,
  getObservationRun,
  listDiagnosisRuns,
  getDiagnosisRun,
  listInterventionRuns,
  getInterventionItems,
  listExecutionRuns,
} from '@/components/dashboard/api';
import { ErrorNote, LoadingRow, formatDate } from '@/components/dashboard/project/kit';
import type { CanonicalBusinessUnderstanding } from '@/src/business-understanding/types';
import type { BuyerQuestionSet } from '@/src/buyer-intent/types';
import type { ObservationRun, QuestionObservation } from '@/src/ai-observation/types';
import type { EvidenceDiagnosisRun } from '@/src/evidence-diagnosis/types';
import type { InterventionRun, GeneratedIntervention } from '@/src/intervention-generation/types';
import type { ExecutionRun } from '@/src/execution/types';

function mentionCounts(observations: QuestionObservation[] | undefined) {
  const all = observations ?? [];
  const mentioned = all.filter((item) => item.targetStatus === 'MENTIONED').length;
  const missed = all.filter((item) => item.targetStatus === 'NOT_MENTIONED').length;
  return { total: all.length, mentioned, missed, unclear: Math.max(0, all.length - mentioned - missed) };
}

function topMentionedEntities(observations: QuestionObservation[] | undefined, limit = 4) {
  const tally = new Map<string, number>();
  for (const observation of observations ?? []) {
    for (const entity of observation.entities ?? []) {
      if (entity.targetMatch) continue;
      const name = entity.normalizedName || entity.surfaceForm;
      tally.set(name, (tally.get(name) ?? 0) + 1);
    }
  }
  return [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function Arrow() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12M11 5l5 5-5 5" /></svg>;
}

export default function ProjectOverviewPage() {
  const { id } = useParams<{ id: string }>();
  const [understanding, setUnderstanding] = useState<CanonicalBusinessUnderstanding | null>(null);
  const [questionSet, setQuestionSet] = useState<BuyerQuestionSet | null>(null);
  const [observationRuns, setObservationRuns] = useState<ObservationRun[]>([]);
  const [observationRun, setObservationRun] = useState<ObservationRun | null>(null);
  const [diagnosisRun, setDiagnosisRun] = useState<EvidenceDiagnosisRun | null>(null);
  const [interventionRuns, setInterventionRuns] = useState<InterventionRun[]>([]);
  const [interventions, setInterventions] = useState<GeneratedIntervention[]>([]);
  const [executionRuns, setExecutionRuns] = useState<ExecutionRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [business, questions, observations, diagnoses, fixes, executions] = await Promise.all([
          getBusinessUnderstanding(id), getBuyerIntent(id), listObservationRuns(id, 6),
          listDiagnosisRuns(id, 6), listInterventionRuns(id, 6), listExecutionRuns(id, 6),
        ]);
        if (cancelled) return;
        setUnderstanding(business);
        setQuestionSet(questions);
        setObservationRuns(observations.runs);
        setInterventionRuns(fixes.runs);
        setExecutionRuns(executions.runs);

        const latestObservation = observations.runs.find((run) => ['COMPLETED', 'PARTIAL_SUCCESS'].includes(run.status));
        const latestDiagnosis = diagnoses.runs.find((run) => ['COMPLETED', 'PARTIAL_SUCCESS', 'INCONCLUSIVE'].includes(run.status));
        const latestFixes = fixes.runs.find((run) => ['COMPLETED', 'PARTIAL_SUCCESS'].includes(run.status));
        const [observationDetail, diagnosisDetail, interventionDetail] = await Promise.all([
          latestObservation ? getObservationRun(id, latestObservation.id) : null,
          latestDiagnosis ? getDiagnosisRun(id, latestDiagnosis.id) : null,
          latestFixes ? getInterventionItems(id, latestFixes.id) : null,
        ]);
        if (cancelled) return;
        setObservationRun(observationDetail);
        setDiagnosisRun(diagnosisDetail);
        setInterventions(interventionDetail?.interventions ?? []);
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Failed to load this business');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <div className="grid gap-3"><LoadingRow /><LoadingRow /></div>;
  if (error) return <ErrorNote message={error} />;

  const counts = mentionCounts(observationRun?.observations);
  const competitors = topMentionedEntities(observationRun?.observations);
  const latestFix = [...interventions].sort((a, b) => b.priorityScore - a.priorityScore)[0];
  const latestReportRun = interventionRuns.find((run) => ['COMPLETED', 'PARTIAL_SUCCESS', 'INCONCLUSIVE'].includes(run.status));

  const nextAction = !understanding
    ? { title: 'Start by understanding this business.', body: 'We will turn the website into verified facts before generating buyer questions.', href: `/dashboard/projects/${id}/questions`, cta: 'Scan the website' }
    : !questionSet
      ? { title: 'Create the buyer questions that matter.', body: 'These questions become the stable baseline for every future visibility check.', href: `/dashboard/projects/${id}/questions`, cta: 'Create buyer questions' }
      : !observationRun
        ? { title: 'Record the first AI answers.', body: 'Ask the frozen question set and capture exactly which businesses are named.', href: `/dashboard/projects/${id}/observations`, cta: 'Run the first check' }
        : !diagnosisRun
          ? { title: 'Explain why the answers missed you.', body: 'Connect each observed answer to the evidence and gaps on your website.', href: `/dashboard/projects/${id}/diagnosis`, cta: 'Explain the gaps' }
          : !latestFix
            ? { title: 'Turn the diagnosed gaps into a fix plan.', body: 'Generate a short, evidence-linked list ordered by likely commercial impact.', href: `/dashboard/projects/${id}/interventions`, cta: 'Build the fix plan' }
            : executionRuns.length === 0
              ? { title: latestFix.title, body: latestFix.whyThisAddressesGap, href: `/dashboard/projects/${id}/interventions`, cta: 'Open the top fix' }
              : { title: 'Recheck the same buyer questions.', body: 'Once your changes are live, run the frozen set again and compare like for like.', href: `/dashboard/projects/${id}/observations`, cta: 'Plan the recheck' };

  const journey = [
    { label: 'Business understood', done: Boolean(understanding) },
    { label: 'Questions fixed', done: Boolean(questionSet?.frozen) },
    { label: 'Answers recorded', done: Boolean(observationRun) },
    { label: 'Gaps explained', done: Boolean(diagnosisRun) },
    { label: 'Fix selected', done: Boolean(latestFix) },
    { label: 'Rechecked', done: observationRuns.length > 1 },
  ];
  const currentStep = Math.min(journey.findIndex((step) => !step.done), journey.length - 1);

  return (
    <div className="business-overview">
      {latestReportRun && (
        <section className="business-report-link">
          <div><strong>Your latest report is ready.</strong><span>Open the complete evidence and prioritized fix list.</span></div>
          <Link href={`/r/${latestReportRun.id}`}>Open report <Arrow /></Link>
        </section>
      )}

      <div className="business-overview-grid">
        <section className="business-baseline">
          <div className="business-section-heading">
            <h2>Current baseline</h2>
            <span>{observationRun ? `Measured ${formatDate(observationRun.createdAt)}` : 'Not measured yet'}</span>
          </div>
          {observationRun ? (
            <>
              <p className="business-baseline-statement"><strong>{counts.mentioned}</strong> of <strong>{counts.total}</strong> recorded answers named your business.</p>
              <div className="business-facts" aria-label="Measurement summary">
                <div><span>Missed</span><strong>{counts.missed}</strong></div>
                <div><span>Unclear</span><strong>{counts.unclear}</strong></div>
                <div><span>Gaps explained</span><strong>{diagnosisRun?.gapCount ?? 0}</strong></div>
                <div><span>Fixes ready</span><strong>{interventions.length}</strong></div>
              </div>
              <div className="business-competitors">
                <h3>Named instead</h3>
                {competitors.length ? (
                  <ul>{competitors.map(([name, questions]) => <li key={name}><span>{name}</span><strong>{questions} {questions === 1 ? 'answer' : 'answers'}</strong></li>)}</ul>
                ) : <p>No other tracked business was consistently named.</p>}
              </div>
            </>
          ) : (
            <div className="business-no-baseline">
              <h3>No answer baseline yet.</h3>
              <p>Your first completed check will show where the business appears, where it is absent, and who is named instead.</p>
            </div>
          )}
        </section>

        <aside className="business-next-action">
          <span>Do this next</span>
          <h2>{nextAction.title}</h2>
          <p>{nextAction.body}</p>
          <Link href={nextAction.href}>{nextAction.cta} <Arrow /></Link>
        </aside>
      </div>

      <section className="business-journey-section">
        <div className="business-section-heading">
          <div><h2>Your visibility loop</h2><p>One path from business context to a comparable recheck.</p></div>
          <Link href={`/dashboard/projects/${id}/runs`}>View activity</Link>
        </div>
        <ol className="business-journey">
          {journey.map((step, index) => (
            <li key={step.label} className={step.done ? 'is-done' : index === currentStep ? 'is-current' : ''}>
              <span>{step.done ? <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 10 3 3 7-7" /></svg> : index + 1}</span>
              <strong>{step.label}</strong>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
