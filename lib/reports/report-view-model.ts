import type { ReportData } from '@/src/scoring';
import type { CanonicalIntelligenceReport, ObservationOutcome } from '@/lib/reports/intelligence-contract';
import { observationOutcome, reportExecutionStatus } from '@/lib/reports/intelligence-contract';
import type { BuyerQuestion } from '@/src/buyer-intent/types';
import type { QuestionDiagnosis } from '@/src/evidence-diagnosis/types';
import type { GeneratedIntervention, ImplementationSurface, InterventionEffort } from '@/src/intervention-generation/types';

export type CustomerOutcome = ObservationOutcome;
export type ReportConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export interface ReportCitationView {
  id: string;
  title: string;
  url: string | null;
  domain: string;
  context: string | null;
  role: 'Brand-owned' | 'Directory or marketplace' | 'Independent source' | 'Other source';
}

export interface ReportEvidenceView {
  id: string;
  questionId: string;
  question: string;
  intent: string;
  buyerStage: string;
  commercialRelevance: number | null;
  outcome: CustomerOutcome;
  provider: string;
  model: string;
  observedAt: string | null;
  completeness: string;
  excerpt: string | null;
  observedEntities: string[];
  citations: ReportCitationView[];
  diagnosis: string | null;
  diagnosedGap: string | null;
  confidence: ReportConfidence;
  commercialImplication: string;
  actionIds: string[];
}

export interface ReportActionView {
  id: string;
  title: string;
  rationale: string;
  diagnosedGap: string;
  questions: Array<{ id: string; text: string }>;
  evidenceReferences: string[];
  deliverable: string;
  owner: string;
  effort: string;
  estimatedTime: string;
  impact: string;
  confidence: ReportConfidence;
  requiredInputs: string[];
  dependencies: string[];
  acceptanceCriteria: string[];
  measurement: string[];
  status: string;
  executionStatus: string;
  needsValidation: boolean;
}

export interface ReportSourceView {
  id: string;
  title: string;
  url: string | null;
  domain: string;
  role: ReportCitationView['role'];
  questionIds: string[];
  observedCount: number;
}

export interface ReportComparisonView {
  kind: 'BASELINE' | 'COMPARISON';
  previousDate: string | null;
  comparableQuestions: number;
  improved: number;
  declined: number;
  unchanged: number;
  statement: string;
}

export interface CustomerReportViewModel {
  kind: 'CANONICAL' | 'LEGACY';
  reportId: string;
  projectId: string | null;
  business: {
    name: string;
    website: string;
    description: string | null;
    products: string[];
    buyers: string[];
    markets: string[];
  };
  generatedAt: string;
  observationDate: string | null;
  scope: {
    provider: string;
    model: string;
    locale: string;
    language: string;
    requestedQuestions: number;
    completedQuestions: number;
    failedQuestions: number;
    dataQuality: 'COMPLETE' | 'PARTIAL' | 'HISTORICAL_SUMMARY';
  };
  outcomes: {
    meaningfulAppearances: number;
    recommended: number;
    mentioned: number;
    notMentioned: number;
    inconclusive: number;
  };
  verdict: string;
  topOpportunity: string;
  evidence: ReportEvidenceView[];
  sources: ReportSourceView[];
  actions: ReportActionView[];
  comparison: ReportComparisonView;
  limitations: string[];
  technicalReference: string;
}


/** Older runs joined one gap description per affected question, repeating the same sentence. */
function uniqueSentences(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [text];
  return [...new Set(sentences.map((sentence) => sentence.trim()).filter(Boolean))].join(' ');
}

function humanize(value: string | null | undefined): string {
  if (!value) return 'Unknown';
  return value.toLowerCase().replaceAll('_', ' ').replace(/(^|\s)\S/g, (character) => character.toUpperCase());
}

function normalizeQuestion(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function domainFromUrl(value: string | null | undefined): string {
  if (!value) return 'Source unavailable';
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return value.replace(/^https?:\/\//, '').split('/')[0] || 'Source unavailable';
  }
}

function sourceRole(domain: string, targetDomain: string, targetMatch = false): ReportCitationView['role'] {
  if (targetMatch || domain === targetDomain) return 'Brand-owned';
  if (/indiamart|justdial|tradeindia|exportersindia|alibaba|amazon|flipkart|clutch|g2|capterra|kompass|thomasnet/i.test(domain)) {
    return 'Directory or marketplace';
  }
  if (domain === 'Source unavailable') return 'Other source';
  return 'Independent source';
}

function excerpt(value: string | null, limit = 560): string | null {
  if (!value) return null;
  const compact = value.replace(/\s+/g, ' ').trim();
  if (compact.length <= limit) return compact;
  const candidate = compact.slice(0, limit);
  const sentenceEnd = Math.max(candidate.lastIndexOf('. '), candidate.lastIndexOf('? '), candidate.lastIndexOf('! '));
  return `${candidate.slice(0, sentenceEnd > 220 ? sentenceEnd + 1 : limit).trim()}...`;
}

function actionOwner(surface: ImplementationSurface): string {
  if (surface === 'STRUCTURED_DATA') return 'Developer';
  if (['DIRECTORY_PROFILE', 'BUSINESS_PROFILE', 'THIRD_PARTY_PROFILE'].includes(surface)) return 'Marketing owner';
  if (['TECHNICAL_DOCUMENT', 'CERTIFICATION_PAGE'].includes(surface)) return 'Subject expert and website editor';
  if (surface.startsWith('WEBSITE_') || surface.endsWith('_PAGE') || surface === 'CONTENT_LIBRARY') return 'Website editor';
  return 'Marketing owner';
}

function effortEstimate(effort: InterventionEffort | string): string {
  if (effort === 'LOW' || effort === 'easy') return 'Estimated 1-2 hours';
  if (effort === 'MEDIUM' || effort === 'medium') return 'Estimated 1-2 days';
  if (effort === 'HIGH' || effort === 'hard') return 'Estimated 3-5 days';
  return 'Estimate required';
}

function outcomeRank(outcome: CustomerOutcome): number | null {
  if (outcome === 'RECOMMENDED') return 3;
  if (outcome === 'MENTIONED') return 2;
  if (outcome === 'NOT_MENTIONED') return 1;
  return null;
}

function comparisonFor(current: ReportEvidenceView[], previous: CustomerReportViewModel | null): ReportComparisonView {
  if (!previous) {
    return {
      kind: 'BASELINE', previousDate: null, comparableQuestions: 0, improved: 0, declined: 0, unchanged: 0,
      statement: 'This is the baseline. No earlier like-for-like observation is available.',
    };
  }
  const previousByQuestion = new Map(previous.evidence.map((item) => [normalizeQuestion(item.question), item]));
  let comparableQuestions = 0;
  let improved = 0;
  let declined = 0;
  let unchanged = 0;
  for (const item of current) {
    const prior = previousByQuestion.get(normalizeQuestion(item.question));
    if (!prior) continue;
    const currentRank = outcomeRank(item.outcome);
    const previousRank = outcomeRank(prior.outcome);
    if (currentRank === null || previousRank === null) continue;
    comparableQuestions += 1;
    if (currentRank > previousRank) improved += 1;
    else if (currentRank < previousRank) declined += 1;
    else unchanged += 1;
  }
  if (!comparableQuestions) {
    return {
      kind: 'BASELINE', previousDate: previous.observationDate, comparableQuestions: 0, improved: 0, declined: 0, unchanged: 0,
      statement: 'An earlier report exists, but it does not contain the same usable buyer questions. No like-for-like change is claimed.',
    };
  }
  return {
    kind: 'COMPARISON', previousDate: previous.observationDate, comparableQuestions, improved, declined, unchanged,
    statement: `${comparableQuestions} buyer question${comparableQuestions === 1 ? '' : 's'} were comparable: ${improved} improved, ${declined} declined, and ${unchanged} were unchanged. This is an observed association, not proof that an intervention caused the change.`,
  };
}

function canonicalAction(
  item: GeneratedIntervention,
  report: CanonicalIntelligenceReport,
): ReportActionView {
  const execution = report.executionStates
    .filter((state) => state.interventionId === item.id)
    .sort((a, b) => b.run.createdAt.localeCompare(a.run.createdAt))[0]?.run;
  const evidenceReferences = [...item.evidenceToPreserve, ...item.evidenceToAdd]
    .map((evidence) => evidence.description)
    .filter(Boolean);
  return {
    id: item.id,
    title: item.title,
    rationale: item.whyThisAddressesGap,
    diagnosedGap: uniqueSentences(item.diagnosedGap),
    questions: item.affectedQuestions.map((question) => ({ id: question.id, text: question.exactQuestion })),
    evidenceReferences,
    deliverable: item.expectedDeliverable,
    owner: actionOwner(item.implementationSurface),
    effort: humanize(item.effort),
    estimatedTime: effortEstimate(item.effort),
    impact: humanize(item.impact),
    confidence: item.confidence,
    requiredInputs: item.requiredBusinessInputs.map((input) => `${input.description} (${humanize(input.status)})`),
    dependencies: item.dependencyIds,
    acceptanceCriteria: item.acceptanceCriteria.map((criterion) => criterion.criterion),
    measurement: item.measurementLinkage.map((measurement) => measurement.description),
    status: humanize(item.status),
    executionStatus: humanize(reportExecutionStatus(execution?.status)),
    needsValidation: item.requiredBusinessInputs.some((input) => input.status !== 'AVAILABLE'),
  };
}

function questionFor(report: CanonicalIntelligenceReport, questionId: string): BuyerQuestion | undefined {
  return report.questionSet.questions.find((question) => question.id === questionId);
}

function diagnosisFor(report: CanonicalIntelligenceReport, questionId: string): QuestionDiagnosis | undefined {
  return report.diagnosisRun.diagnoses.find((diagnosis) => diagnosis.buyerQuestionId === questionId);
}

function buildCanonicalEvidence(report: CanonicalIntelligenceReport): ReportEvidenceView[] {
  const targetDomain = domainFromUrl(report.business.business.website);
  return report.questionSet.questions.map((question) => {
    const observation = report.observationRun.observations.find((item) => item.buyerQuestionId === question.id);
    const diagnosis = diagnosisFor(report, question.id);
    const actionIds = report.interventionRun.interventions
      .filter((item) => item.questionId === question.id || item.affectedQuestions.some((affected) => affected.id === question.id))
      .map((item) => item.id);
    if (!observation) {
      return {
        id: `missing-${question.id}`, questionId: question.id, question: question.question, intent: humanize(question.intent),
        buyerStage: humanize(question.buyer_stage), commercialRelevance: question.commercial_relevance,
        outcome: 'INCONCLUSIVE', provider: report.observationRun.provider, model: report.observationRun.model,
        observedAt: null, completeness: 'Missing observation', excerpt: null, observedEntities: [], citations: [],
        diagnosis: null, diagnosedGap: null, confidence: 'UNKNOWN', commercialImplication: 'Unknown', actionIds,
      };
    }
    const citations: ReportCitationView[] = observation.citations.map((citation, index) => {
      const url = citation.url;
      const domain = citation.domain || domainFromUrl(url);
      return {
        id: citation.id || `${observation.id}-citation-${index}`,
        title: citation.title || citation.displayedText || domain,
        url,
        domain,
        context: citation.context,
        role: sourceRole(domain, targetDomain),
      };
    });
    for (const source of observation.sources) {
      if (citations.some((citation) => citation.url && citation.url === source.fullUrl)) continue;
      const domain = source.domain || domainFromUrl(source.fullUrl);
      citations.push({
        id: source.id,
        title: source.title || domain,
        url: source.fullUrl,
        domain,
        context: null,
        role: sourceRole(domain, targetDomain, source.targetDomainMatch),
      });
    }
    return {
      id: observation.id,
      questionId: question.id,
      question: question.question,
      intent: humanize(question.intent),
      buyerStage: humanize(question.buyer_stage),
      commercialRelevance: question.commercial_relevance,
      outcome: observationOutcome(observation),
      provider: observation.provider,
      model: observation.model,
      observedAt: observation.responseTimestamp,
      completeness: humanize(observation.completeness),
      excerpt: excerpt(observation.rawResponse),
      observedEntities: [...new Set(observation.entities.filter((entity) => !entity.targetMatch).map((entity) => entity.surfaceForm).filter(Boolean))],
      citations,
      diagnosis: diagnosis?.claims[0]?.statement ?? diagnosis?.assessments[0]?.statement ?? null,
      diagnosedGap: diagnosis?.gaps[0]?.description ?? null,
      confidence: diagnosis?.confidence ?? 'UNKNOWN',
      commercialImplication: humanize(diagnosis?.commercialImplication),
      actionIds,
    };
  });
}

function sourcesFromEvidence(evidence: ReportEvidenceView[]): ReportSourceView[] {
  const sourceMap = new Map<string, ReportSourceView>();
  for (const item of evidence) {
    for (const citation of item.citations) {
      const key = citation.url || `${citation.domain}:${citation.title}`;
      const current = sourceMap.get(key);
      if (current) {
        current.observedCount += 1;
        if (!current.questionIds.includes(item.questionId)) current.questionIds.push(item.questionId);
      } else {
        sourceMap.set(key, {
          id: citation.id, title: citation.title, url: citation.url, domain: citation.domain, role: citation.role,
          questionIds: [item.questionId], observedCount: 1,
        });
      }
    }
  }
  return [...sourceMap.values()].sort((a, b) => b.observedCount - a.observedCount || a.domain.localeCompare(b.domain));
}

export function buildCanonicalReportViewModel(
  report: CanonicalIntelligenceReport,
  previousReport: CanonicalIntelligenceReport | null = null,
): CustomerReportViewModel {
  const evidence = buildCanonicalEvidence(report);
  const actions = [...report.interventionRun.interventions]
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .map((item) => canonicalAction(item, report));
  const previous = previousReport ? buildCanonicalReportViewModel(previousReport, null) : null;
  const completedQuestions = evidence.filter((item) => item.outcome !== 'INCONCLUSIVE').length;
  const description = report.business.business.description?.value ?? null;
  const verdict = report.summary.meaningfulAppearances === 0
    ? `${report.business.business.name} was not meaningfully mentioned in any of the ${report.summary.totalQuestions} buyer questions tested.`
    : `${report.business.business.name} meaningfully appeared in ${report.summary.meaningfulAppearances} of ${report.summary.totalQuestions} buyer questions tested.`;
  return {
    kind: 'CANONICAL',
    reportId: report.id,
    projectId: report.projectId,
    business: {
      name: report.business.business.name,
      website: report.business.business.website,
      description,
      products: [...report.business.products, ...report.business.services].slice(0, 4).map((item) => item.value),
      buyers: report.business.buyer_types.slice(0, 3).map((item) => item.value),
      markets: report.business.geographies.slice(0, 3).map((item) => item.value),
    },
    generatedAt: report.generatedAt,
    observationDate: report.summary.observationDate,
    scope: {
      provider: report.observationRun.provider || 'Provider unavailable',
      model: report.observationRun.modelVersion || report.observationRun.model || 'Model unavailable',
      locale: String(report.observationRun.generationParameters.locale ?? report.observationRun.generationParameters.market ?? 'Not recorded'),
      language: String(report.observationRun.generationParameters.language ?? 'Not recorded'),
      requestedQuestions: report.observationRun.requestedQuestionCount || report.summary.totalQuestions,
      completedQuestions,
      failedQuestions: report.summary.inconclusive,
      dataQuality: report.summary.inconclusive === 0 ? 'COMPLETE' : 'PARTIAL',
    },
    outcomes: {
      meaningfulAppearances: report.summary.meaningfulAppearances,
      recommended: report.summary.recommended,
      mentioned: report.summary.mentioned,
      notMentioned: report.summary.notMentioned,
      inconclusive: report.summary.inconclusive,
    },
    verdict,
    topOpportunity: actions[0]?.title ?? 'No defensible intervention was finalized from this observation.',
    evidence,
    sources: sourcesFromEvidence(evidence),
    actions,
    comparison: comparisonFor(evidence, previous),
    limitations: [
      'This report records provider responses for a frozen buyer-question set. It is not a universal ranking, traffic forecast, or consumer-app guarantee.',
      'Observed change after implementation is an association and does not by itself prove causality.',
      ...(report.summary.inconclusive ? [`${report.summary.inconclusive} question${report.summary.inconclusive === 1 ? '' : 's'} were inconclusive and are not counted as absence.`] : []),
    ],
    technicalReference: report.chain.interventionRunId,
  };
}

export function buildLegacyReportViewModel(reportId: string, report: ReportData): CustomerReportViewModel {
  const answered = Math.max(0, report.totals.promptCount - report.totals.failedPrompts);
  const presenceRate = Number.isFinite(report.scores.presenceRate) ? report.scores.presenceRate : 0;
  const recommendationRate = Number.isFinite(report.scores.recommendationRate) ? report.scores.recommendationRate : 0;
  const mentioned = Math.min(answered, Math.max(0, Math.round(presenceRate * answered)));
  const recommended = Math.min(mentioned, Math.max(0, Math.round(recommendationRate * answered)));
  const mentionedOnly = Math.max(0, mentioned - recommended);
  const notMentioned = Math.max(0, answered - mentioned);
  const targetDomain = domainFromUrl(report.business.website);
  const evidence: ReportEvidenceView[] = report.missedPrompts.map((miss, index) => ({
    id: `legacy-evidence-${index + 1}`,
    questionId: `legacy-question-${index + 1}`,
    question: miss.prompt,
    intent: humanize(miss.intent),
    buyerStage: 'Not recorded',
    commercialRelevance: miss.commercial ? 5 : null,
    outcome: 'NOT_MENTIONED',
    provider: report.totals.enginesUsed.join(', ') || 'Provider unavailable',
    model: 'Model version unavailable',
    observedAt: report.generatedAt,
    completeness: 'Historical summary',
    excerpt: excerpt(miss.evidence),
    observedEntities: miss.competitorsPresent,
    citations: [],
    diagnosis: miss.competitorsPresent.length ? `Tracked alternatives appeared: ${miss.competitorsPresent.join(', ')}.` : null,
    diagnosedGap: 'The historical record does not contain enough question-level provenance to verify a specific evidence gap.',
    confidence: 'LOW',
    commercialImplication: miss.commercial ? 'High' : 'Unknown',
    actionIds: [],
  }));
  const legacySources = Array.isArray(report.sources) && report.sources.length
    ? report.sources
    : report.citationGap.map((source) => ({
        domain: source.domain,
        url: `https://${source.domain}`,
        title: source.domain,
        sourceType: 'other' as const,
        observedCount: source.count,
      }));
  const sources: ReportSourceView[] = legacySources.map((source, index) => ({
    id: `legacy-source-${index + 1}`,
    title: source.title || source.domain,
    url: source.url,
    domain: source.domain,
    role: sourceRole(source.domain, targetDomain, source.sourceType === 'brand'),
    questionIds: [],
    observedCount: source.observedCount,
  }));
  const observedDomains = new Set(report.citationGap.filter((item) => item.count > 0).map((item) => item.domain));
  const safeActions = (report.fixPlan?.executionQueue ?? []).filter((item) => {
    if (item.targetsQueries.length) return true;
    if (item.sourceSection !== 'get_listed') return false;
    return [...observedDomains].some((domain) => item.title.toLowerCase().includes(domain.toLowerCase()));
  });
  const actions: ReportActionView[] = safeActions.slice(0, 3).map((item) => ({
    id: item.id,
    title: item.title,
    rationale: item.whyItMatters,
    diagnosedGap: 'Historical hypothesis. Validate the current page or profile before implementation.',
    questions: item.targetsQueries.map((text, index) => ({ id: `legacy-action-${item.id}-${index}`, text })),
    evidenceReferences: report.citationGap.filter((source) => item.title.toLowerCase().includes(source.domain.toLowerCase())).map((source) => `${source.domain} appeared in ${source.count} answer${source.count === 1 ? '' : 's'}.`),
    deliverable: item.deliverable,
    owner: item.sourceSection === 'structured_data' ? 'Developer' : 'Marketing owner',
    effort: humanize(item.effort),
    estimatedTime: effortEstimate(item.effort),
    impact: humanize(item.impact),
    confidence: 'LOW',
    requiredInputs: ['Confirm the recommended change is still missing or incomplete.'],
    dependencies: [],
    acceptanceCriteria: ['The business verifies the facts.', 'The live URL is recorded before re-observation.'],
    measurement: item.targetsQueries.length ? ['Repeat the linked buyer questions under the same recorded conditions.'] : ['Create a new canonical observation before measuring change.'],
    status: 'Validate first',
    executionStatus: 'Not started',
    needsValidation: true,
  }));
  const verdict = mentioned === 0
    ? `This historical export records no appearance for ${report.business.name} across ${answered} usable answer${answered === 1 ? '' : 's'}.`
    : `This historical export records ${mentioned} appearance${mentioned === 1 ? '' : 's'} for ${report.business.name} across ${answered} usable answers.`;
  return {
    kind: 'LEGACY', reportId, projectId: null,
    business: { name: report.business.name, website: report.business.website, description: null, products: [report.business.category].filter(Boolean), buyers: [], markets: [report.business.city].filter(Boolean) },
    generatedAt: report.generatedAt,
    observationDate: report.generatedAt,
    scope: {
      provider: report.totals.enginesUsed.join(', ') || 'Provider unavailable', model: 'Model version unavailable', locale: report.business.city || 'Not recorded', language: 'Not recorded',
      requestedQuestions: report.totals.promptCount, completedQuestions: answered, failedQuestions: report.totals.failedPrompts, dataQuality: 'HISTORICAL_SUMMARY',
    },
    outcomes: { meaningfulAppearances: mentioned, recommended, mentioned: mentionedOnly, notMentioned, inconclusive: report.totals.failedPrompts },
    verdict,
    topOpportunity: actions[0]?.title ?? 'Run a new evidence-complete observation before choosing an intervention.',
    evidence,
    sources,
    actions,
    comparison: { kind: 'BASELINE', previousDate: null, comparableQuestions: 0, improved: 0, declined: 0, unchanged: 0, statement: 'This historical summary cannot support a like-for-like comparison. Run a canonical observation to establish a defensible baseline.' },
    limitations: [
      'This is a historical compatibility report. It does not retain complete question-level answers, model metadata, or diagnosis provenance.',
      'A source count is not proof that a directory listing, schema change, or website edit is currently required.',
      'Inconclusive or failed questions are not counted as brand absence.',
    ],
    technicalReference: reportId,
  };
}

export function reportPreview(model: CustomerReportViewModel): CustomerReportViewModel {
  const evidence = model.evidence.slice(0, 1);
  const linkedActionIds = new Set(evidence.flatMap((item) => item.actionIds));
  const linkedActions = model.actions.filter((action) => linkedActionIds.has(action.id));
  return {
    ...model,
    evidence,
    sources: model.sources.filter((source) => source.questionIds.some((id) => evidence.some((item) => item.questionId === id))).slice(0, 3),
    actions: (linkedActions.length ? linkedActions : model.actions).slice(0, 1),
  };
}

