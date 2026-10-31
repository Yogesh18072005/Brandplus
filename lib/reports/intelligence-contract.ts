import type { BuyerQuestion, BuyerQuestionSet } from '@/src/buyer-intent/types';
import type { ObservationRun, QuestionObservation } from '@/src/ai-observation/types';
import type { EvidenceDiagnosisRun, QuestionDiagnosis } from '@/src/evidence-diagnosis/types';
import type { GeneratedIntervention, InterventionRun } from '@/src/intervention-generation/types';
import type { ExecutionRun, ExecutionStatus } from '@/src/execution/types';
import type { CanonicalBusinessUnderstanding } from '@/src/business-understanding/types';

export type ReportKind = 'LEGACY' | 'NEW_INTELLIGENCE';
export type ObservationOutcome = 'MENTIONED' | 'RECOMMENDED' | 'NOT_MENTIONED' | 'INCONCLUSIVE';
export type ReportExecutionStatus =
  | 'COMPLETED'
  | 'MANUAL_REQUIRED'
  | 'WAITING_FOR_INPUT'
  | 'APPROVAL_REQUIRED'
  | 'FAILED'
  | 'CANCELLED'
  | 'IN_PROGRESS'
  | 'NOT_STARTED';

export interface IntelligenceChainIds {
  businessUnderstandingRunId: string;
  buyerIntentRunId: string;
  buyerQuestionSetId: string;
  observationRunId: string;
  diagnosisRunId: string;
  interventionRunId: string;
  executionRunIds: string[];
}

export interface IntelligenceSummary {
  totalQuestions: number;
  meaningfulAppearances: number;
  mentioned: number;
  recommended: number;
  notMentioned: number;
  inconclusive: number;
  observationDate: string | null;
  statement: string;
}

export interface CanonicalIntelligenceReport {
  kind: 'NEW_INTELLIGENCE';
  id: string;
  projectId: string;
  status: 'COMPLETE';
  missingStages: string[];
  chain: IntelligenceChainIds;
  business: CanonicalBusinessUnderstanding;
  questionSet: BuyerQuestionSet;
  observationRun: ObservationRun & { observations: QuestionObservation[] };
  diagnosisRun: EvidenceDiagnosisRun & { diagnoses: QuestionDiagnosis[] };
  interventionRun: InterventionRun & { interventions: GeneratedIntervention[] };
  executions: ExecutionRun[];
  executionStates: Array<{ interventionId: string; run: ExecutionRun }>;
  summary: IntelligenceSummary;
  generatedAt: string;
}

export interface IncompleteIntelligenceReport {
  kind: 'NEW_INTELLIGENCE';
  id: string;
  projectId: string;
  status: 'INCOMPLETE';
  missingStages: string[];
  chain: Partial<IntelligenceChainIds>;
  businessName: string;
  generatedAt: string;
}

export type IntelligenceReport = CanonicalIntelligenceReport | IncompleteIntelligenceReport;

export interface DashboardIntelligenceSnapshot {
  reportId: string;
  projectId: string;
  generatedAt: string;
  status: 'COMPLETE' | 'INCOMPLETE';
  summary: IntelligenceSummary | null;
  questionPreview: string[];
  observationPreview: Array<{ question: string; outcome: ObservationOutcome; answer: string | null }>;
  interventionPreview: Array<{ title: string; why: string; status: string }>;
  totalInterventions: number;
  missingStages: string[];
}

export function observationOutcome(observation: QuestionObservation): ObservationOutcome {
  if (observation.status !== 'COMPLETED' || observation.targetStatus === 'INCONCLUSIVE') return 'INCONCLUSIVE';
  if (observation.targetStatus === 'NOT_MENTIONED') return 'NOT_MENTIONED';
  const target = observation.entities.find((entity) => entity.targetMatch);
  return target && ['RECOMMENDED', 'STRONGLY_RECOMMENDED'].includes(target.recommendationStrength)
    ? 'RECOMMENDED'
    : 'MENTIONED';
}

export function summarizeObservations(
  businessName: string,
  questions: BuyerQuestion[],
  observations: QuestionObservation[],
  observationDate: string | null,
): IntelligenceSummary {
  const outcomes = questions.map((question) => {
    const observation = observations.find((item) => item.buyerQuestionId === question.id);
    return observation ? observationOutcome(observation) : 'INCONCLUSIVE';
  });
  const mentioned = outcomes.filter((outcome) => outcome === 'MENTIONED').length;
  const recommended = outcomes.filter((outcome) => outcome === 'RECOMMENDED').length;
  const notMentioned = outcomes.filter((outcome) => outcome === 'NOT_MENTIONED').length;
  const inconclusive = outcomes.filter((outcome) => outcome === 'INCONCLUSIVE').length;
  const meaningfulAppearances = mentioned + recommended;
  const totalQuestions = questions.length;
  const statement = meaningfulAppearances === 0
    ? `AI did not meaningfully mention ${businessName} in ${totalQuestions} buyer question${totalQuestions === 1 ? '' : 's'}.`
    : `AI meaningfully mentioned ${businessName} in ${meaningfulAppearances} of ${totalQuestions} buyer question${totalQuestions === 1 ? '' : 's'}.`;
  return { totalQuestions, meaningfulAppearances, mentioned, recommended, notMentioned, inconclusive, observationDate, statement };
}

export function validateIntelligenceChain(input: {
  chain: IntelligenceChainIds;
  questionSet: BuyerQuestionSet;
  observationRun: ObservationRun;
  diagnosisRun: EvidenceDiagnosisRun;
  interventionRun: InterventionRun;
  executions: ExecutionRun[];
}): string[] {
  const { chain, questionSet, observationRun, diagnosisRun, interventionRun, executions } = input;
  const errors: string[] = [];
  if (!questionSet.frozen) errors.push('Engine 02 buyer question set is not frozen');
  if (questionSet.business_understanding_run_id !== chain.businessUnderstandingRunId) errors.push('Engine 02 does not match Engine 01');
  if (observationRun.buyerQuestionSetId !== chain.buyerQuestionSetId || observationRun.businessUnderstandingRunId !== chain.businessUnderstandingRunId) errors.push('Engine 03 does not match Engines 01–02');
  if (diagnosisRun.observationRunId !== chain.observationRunId || diagnosisRun.buyerQuestionSetId !== chain.buyerQuestionSetId || diagnosisRun.businessUnderstandingRunId !== chain.businessUnderstandingRunId) errors.push('Engine 04 does not match Engines 01–03');
  if (interventionRun.diagnosisRunId !== chain.diagnosisRunId || interventionRun.observationRunId !== chain.observationRunId || interventionRun.buyerQuestionSetId !== chain.buyerQuestionSetId || interventionRun.businessUnderstandingRunId !== chain.businessUnderstandingRunId) errors.push('Engine 05 does not match Engines 01–04');
  if (executions.some((run) => run.interventionRunId !== chain.interventionRunId || run.diagnosisRunId !== chain.diagnosisRunId || run.observationRunId !== chain.observationRunId || run.buyerQuestionSetId !== chain.buyerQuestionSetId || run.businessUnderstandingRunId !== chain.businessUnderstandingRunId)) errors.push('Engine 06 does not match Engines 01–05');
  return errors;
}

export function reportExecutionStatus(status: ExecutionStatus | null | undefined): ReportExecutionStatus {
  if (!status) return 'NOT_STARTED';
  if (status === 'SUCCEEDED' || status === 'PARTIALLY_SUCCEEDED') return 'COMPLETED';
  if (status === 'MANUAL_REQUIRED') return 'MANUAL_REQUIRED';
  if (status === 'WAITING_FOR_INPUT') return 'WAITING_FOR_INPUT';
  if (status === 'WAITING_FOR_APPROVAL') return 'APPROVAL_REQUIRED';
  if (status === 'FAILED' || status === 'BLOCKED') return 'FAILED';
  if (status === 'CANCELLED') return 'CANCELLED';
  return 'IN_PROGRESS';
}

export function toDashboardSnapshot(report: IntelligenceReport, full: boolean): DashboardIntelligenceSnapshot {
  if (report.status === 'INCOMPLETE') {
    return { reportId: report.id, projectId: report.projectId, generatedAt: report.generatedAt, status: 'INCOMPLETE', summary: null, questionPreview: [], observationPreview: [], interventionPreview: [], totalInterventions: 0, missingStages: report.missingStages };
  }
  const questionLimit = full ? 5 : 1;
  const detailLimit = full ? 3 : 1;
  return {
    reportId: report.id,
    projectId: report.projectId,
    generatedAt: report.generatedAt,
    status: 'COMPLETE',
    summary: report.summary,
    questionPreview: report.questionSet.questions.slice(0, questionLimit).map((question) => question.question),
    observationPreview: report.observationRun.observations.slice(0, detailLimit).map((observation) => ({ question: observation.exactQuestion, outcome: observationOutcome(observation), answer: observation.rawResponse })),
    interventionPreview: report.interventionRun.interventions.slice(0, detailLimit).map((item) => ({ title: item.title, why: item.whyThisAddressesGap, status: item.status })),
    totalInterventions: report.interventionRun.interventions.length,
    missingStages: [],
  };
}

export function chooseReportKind(hasIntelligenceRun: boolean, hasLegacyAudit: boolean): ReportKind | null {
  if (hasIntelligenceRun) return 'NEW_INTELLIGENCE';
  if (hasLegacyAudit) return 'LEGACY';
  return null;
}
