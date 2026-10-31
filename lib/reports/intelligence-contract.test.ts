import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  chooseReportKind,
  observationOutcome,
  summarizeObservations,
  toDashboardSnapshot,
  validateIntelligenceChain,
  type CanonicalIntelligenceReport,
  type IncompleteIntelligenceReport,
  type IntelligenceChainIds,
} from './intelligence-contract';
import type { BuyerQuestionSet } from '@/src/buyer-intent/types';
import type { ObservationRun, QuestionObservation } from '@/src/ai-observation/types';
import type { EvidenceDiagnosisRun } from '@/src/evidence-diagnosis/types';
import type { InterventionRun } from '@/src/intervention-generation/types';
import type { ExecutionRun } from '@/src/execution/types';

const questions = Array.from({ length: 4 }, (_, index) => ({
  id: `question-${index + 1}`,
  question: `Buyer question ${index + 1}?`,
  buyer_stage: 'EVALUATION',
  intent: 'COMPARISON',
  commercial_relevance: 4,
  business_relevance: 5,
  dimensions: ['SERVICE'],
})) as unknown as BuyerQuestionSet['questions'];

const observations = [
  { id: 'observation-1', buyerQuestionId: 'question-1', exactQuestion: 'Buyer question 1?', status: 'COMPLETED', targetStatus: 'MENTIONED', rawResponse: 'The target is named.', entities: [{ targetMatch: true, recommendationStrength: 'MENTION' }], citations: [] },
  { id: 'observation-2', buyerQuestionId: 'question-2', exactQuestion: 'Buyer question 2?', status: 'COMPLETED', targetStatus: 'MENTIONED', rawResponse: 'The target is recommended.', entities: [{ targetMatch: true, recommendationStrength: 'RECOMMENDED' }], citations: [] },
  { id: 'observation-3', buyerQuestionId: 'question-3', exactQuestion: 'Buyer question 3?', status: 'COMPLETED', targetStatus: 'NOT_MENTIONED', rawResponse: 'Another entity appears.', entities: [{ targetMatch: false, recommendationStrength: 'RECOMMENDED', surfaceForm: 'Observed entity' }], citations: [{ domain: 'directory.example' }] },
  { id: 'observation-4', buyerQuestionId: 'question-4', exactQuestion: 'Buyer question 4?', status: 'FAILED', targetStatus: 'INCONCLUSIVE', rawResponse: null, entities: [], citations: [] },
] as unknown as QuestionObservation[];

const chain: IntelligenceChainIds = {
  businessUnderstandingRunId: 'business-run',
  buyerIntentRunId: 'buyer-run',
  buyerQuestionSetId: 'set-row',
  observationRunId: 'observation-run',
  diagnosisRunId: 'diagnosis-run',
  interventionRunId: 'intervention-run',
  executionRunIds: ['execution-run'],
};

function canonicalReport(): CanonicalIntelligenceReport {
  const summary = summarizeObservations('Example Business', questions, observations, '2026-09-13T00:00:00.000Z');
  return {
    kind: 'NEW_INTELLIGENCE', id: chain.interventionRunId, projectId: 'project-1', status: 'COMPLETE', missingStages: [], chain,
    business: { business: { name: 'Example Business' } } as CanonicalIntelligenceReport['business'],
    questionSet: { frozen: true, business_understanding_run_id: chain.businessUnderstandingRunId, questions } as BuyerQuestionSet,
    observationRun: { id: chain.observationRunId, buyerQuestionSetId: chain.buyerQuestionSetId, businessUnderstandingRunId: chain.businessUnderstandingRunId, observations } as CanonicalIntelligenceReport['observationRun'],
    diagnosisRun: { id: chain.diagnosisRunId, observationRunId: chain.observationRunId, buyerQuestionSetId: chain.buyerQuestionSetId, businessUnderstandingRunId: chain.businessUnderstandingRunId, diagnoses: [] } as unknown as CanonicalIntelligenceReport['diagnosisRun'],
    interventionRun: { id: chain.interventionRunId, diagnosisRunId: chain.diagnosisRunId, observationRunId: chain.observationRunId, buyerQuestionSetId: chain.buyerQuestionSetId, businessUnderstandingRunId: chain.businessUnderstandingRunId, interventions: [
      { id: 'intervention-1', title: 'Clarify verified service evidence', whyThisAddressesGap: 'The diagnosis found missing service evidence.', status: 'PROPOSED' },
      { id: 'intervention-2', title: 'Add a verified proof point', whyThisAddressesGap: 'The diagnosis found a proof gap.', status: 'NEEDS_INPUT' },
    ] } as unknown as CanonicalIntelligenceReport['interventionRun'],
    executions: [], executionStates: [], summary, generatedAt: '2026-09-13T00:00:00.000Z',
  };
}

test('new report metrics come from actual Engine 02 questions and Engine 03 observations', () => {
  const summary = canonicalReport().summary;
  assert.deepEqual(summary, { totalQuestions: 4, meaningfulAppearances: 2, mentioned: 1, recommended: 1, notMentioned: 1, inconclusive: 1, observationDate: '2026-09-13T00:00:00.000Z', statement: 'AI meaningfully mentioned Example Business in 2 of 4 buyer questions.' });
  assert.equal(observationOutcome(observations[2]!), 'NOT_MENTIONED');
});

test('legacy reports remain explicitly classified when no Engine 05 report ID exists', () => {
  assert.equal(chooseReportKind(false, true), 'LEGACY');
  assert.equal(chooseReportKind(true, true), 'NEW_INTELLIGENCE');
});

test('new report and dashboard contracts contain no arbitrary visibility score', () => {
  const serialized = JSON.stringify(toDashboardSnapshot(canonicalReport(), true));
  assert.doesNotMatch(serialized, /visibilityScore|brandpulseScore|\/100/i);
});

test('citation frequency never creates a top-competitor field', () => {
  const snapshot = toDashboardSnapshot(canonicalReport(), true) as unknown as Record<string, unknown>;
  assert.equal('topCompetitor' in snapshot, false);
  assert.equal(observationOutcome(observations[2]!), 'NOT_MENTIONED');
});

test('new interventions contain only the actions finalized by Engine 05', () => {
  const serialized = JSON.stringify(canonicalReport().interventionRun.interventions);
  assert.match(serialized, /Clarify verified service evidence/);
  assert.doesNotMatch(serialized, /Justdial|Google Business Profile|LocalBusiness/i);
});

test('one mismatched engine generation invalidates the canonical chain', () => {
  const report = canonicalReport();
  const errors = validateIntelligenceChain({ chain, questionSet: report.questionSet, observationRun: { ...report.observationRun, buyerQuestionSetId: 'other-set' }, diagnosisRun: report.diagnosisRun, interventionRun: report.interventionRun, executions: [] });
  assert.match(errors.join(' '), /Engine 03/);
});

test('dashboard uses the exact report observation summary', () => {
  const report = canonicalReport();
  assert.deepEqual(toDashboardSnapshot(report, true).summary, report.summary);
});

test('free dashboard projection limits intelligence examples', () => {
  const preview = toDashboardSnapshot(canonicalReport(), false);
  assert.equal(preview.questionPreview.length, 1);
  assert.equal(preview.observationPreview.length, 1);
  assert.equal(preview.interventionPreview.length, 1);
});

test('paid dashboard projection receives broader canonical report detail', () => {
  const full = toDashboardSnapshot(canonicalReport(), true);
  assert.equal(full.questionPreview.length, 4);
  assert.equal(full.observationPreview.length, 3);
  assert.equal(full.interventionPreview.length, 2);
});

test('missing engine state remains an honest incomplete report', () => {
  const incomplete: IncompleteIntelligenceReport = { kind: 'NEW_INTELLIGENCE', id: 'run', projectId: 'project', status: 'INCOMPLETE', missingStages: ['Engine 04 is running'], chain: {}, businessName: 'Example', generatedAt: '2026-09-13T00:00:00.000Z' };
  const snapshot = toDashboardSnapshot(incomplete, true);
  assert.equal(snapshot.status, 'INCOMPLETE');
  assert.equal(snapshot.summary, null);
  assert.deepEqual(snapshot.missingStages, ['Engine 04 is running']);
});

test('historical legacy selection does not reinterpret old report data', () => {
  assert.equal(chooseReportKind(false, true), 'LEGACY');
  assert.equal(chooseReportKind(false, false), null);
});

test('customer report integration has no Hatti or Krishnavi hardcoding', () => {
  const files = ['lib/reports/intelligence-contract.ts', 'lib/reports/load-intelligence-report.ts', 'lib/reports/canonical-audit-orchestration.ts', 'components/report/IntelligenceReport.tsx', 'components/dashboard/VisibilityWorkspace.tsx', 'app/dashboard/page.tsx', 'app/api/projects/[id]/tracking/route.ts'];
  for (const file of files) assert.doesNotMatch(readFileSync(path.join(process.cwd(), file), 'utf8'), /Hatti|Krishnavi/i, file);
});
