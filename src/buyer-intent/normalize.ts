import type { BusinessEntity, CanonicalBusinessUnderstanding } from '@/src/business-understanding/types';
import { stableId } from '@/src/business-understanding/normalize';
import { allBusinessEntities, buyerIntentBusinessEntities } from './schema';
import type { BuyerIntentCategory, BuyerQuestion, BuyerQuestionCandidate, BuyerQuestionEvaluation, BuyerStage } from './types';

const QUESTION_OPENERS = /^(who|what|which|where|why|how|can|could|should|would|do|does|is|are|will)\b/i;
const BIASED = /^why should i choose\b/i;
const EDUCATIONAL = /^(what (is|are)|how (does|do|is|are)|why (is|are|does|do))\b/i;

const ALLOWED_STAGE: Record<BuyerIntentCategory, ReadonlySet<BuyerStage>> = {
  DISCOVERY: new Set(['AWARENESS', 'RESEARCH']),
  COMPARISON: new Set(['RESEARCH', 'EVALUATION']),
  SHORTLIST: new Set(['EVALUATION', 'SHORTLISTING']),
  VENDOR_SELECTION: new Set(['EVALUATION', 'SHORTLISTING', 'DECISION']),
  PURCHASE: new Set(['DECISION', 'PURCHASE']),
  SPECIFICATION: new Set(['RESEARCH', 'EVALUATION', 'DECISION']),
  COMPLIANCE: new Set(['RESEARCH', 'EVALUATION', 'SHORTLISTING', 'DECISION']),
  ALTERNATIVE: new Set(['RESEARCH', 'EVALUATION']),
  GEOGRAPHIC: new Set(['RESEARCH', 'EVALUATION', 'SHORTLISTING', 'DECISION', 'PURCHASE']),
};

const GENERIC_BUYER_WORDS_SOURCE = `who what which where how can could should would do does is are will the a an and or of to for from with without in on by my our their this that these those
best top leading good better suitable right options option alternatives alternative compare comparison versus vs choose choosing shortlist shortlisting recommend recommended consider find finding
supplier suppliers vendor vendors company companies business businesses manufacturer manufacturers provider providers seller sellers platform platforms software product products service services
offer offers offering provide provides providing handle handles handling support supports meet meets meeting need needs requirement requirements specification specifications solution solutions
buy buying purchase purchasing order orders procurement source sourcing available availability commercial enterprise organization organisations organizations team teams customer customers buyer buyers
use using used work works working help helps most based between near local global worldwide market markets industry industries application applications capability capabilities certified certification
high low small large volume volumes scale scalable quality price prices pricing cost costs quote quotes trial demo implementation integrate integration export exports importing import decision research evaluate evaluation arrange planning manage coordinate coordinated coordinating coordination consolidate consolidated consolidating guarantee hire combine combined require required include including criteria set maintain maintained specialize specialized focus reduce ensure track tracking separate independently multiple single operational advantage full process shipping shipment shipments
directly direct unique commit committed obtain exist existing place placed there here supply supplies supplied manufacture manufactured
make made construct constructed calculate individual individually physical sample samples approve approval approved rate rates overseas
manage managed region regional feature features dimension dimensional custom customise customize customised customized option design designs
range variety quickly fast reliable reliably durable bulk wholesale retail minimum maximum delivery deliver delivered lead time timeline
request requested sourcing contact verify verified inspect inspection standard standards detail details information experience experienced
agency agencies studio studios firm firms freelancer freelancers consultant consultants expert experts hire hiring partner partners
select selecting selection alongside both around typical typically usually such when before after initial package packages engagement retainer`.trim();

function stem(value: string): string {
  const token = value.toLocaleLowerCase();
  if (/^coordinat(?:e|ed|es|ing|ion|ions|or|ors)?$/.test(token)) return 'coordinate';
  if (/^integrat(?:e|ed|es|ing|ion|ions)?$/.test(token)) return 'integrate';
  if (/^consolidat(?:e|ed|es|ing|ion|ions)?$/.test(token)) return 'consolidate';
  if (/^speciali[sz](?:e|ed|es|ing|ation|ations)?$/.test(token)) return 'specialize';
  if (/^procur(?:e|ed|es|ing|ement|ements)?$/.test(token)) return 'procure';
  if (/^requir(?:e|ed|es|ing|ement|ements)?$/.test(token)) return 'require';
  if (/^ship(?:s|ped|ping|ment|ments)?$/.test(token)) return 'ship';
  if (/^(suppliers?|vendors?|company|companies|business|businesses|manufacturers?|providers?|sellers?)$/.test(token)) return 'vendor';
  if (/^(buy|buying|purchase|purchasing)$/.test(token)) return 'purchase';
  if (/^(best|top|leading|good|toprated)$/.test(token)) return '';
  return token.replace(/(ations|ation|ments|ment|ingly|edly|ing|ers|ies|ed|es|s)$/i, '');
}

const GENERIC_BUYER_WORDS = new Set(
  GENERIC_BUYER_WORDS_SOURCE.split(/\s+/).map(stem).filter(Boolean),
);
export function normalizeQuestion(value: string): string {
  let question = value.replace(/\s+/g, ' ').trim().replace(/[?.!]+$/, '');
  if (!question) return '';
  question = question[0]!.toLocaleUpperCase() + question.slice(1);
  return `${question}?`;
}

export function semanticQuestionKey(value: string): string {
  return normalizeQuestion(value).toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(/\s+/)
    .map(stem)
    .filter((token) => token && !GENERIC_BUYER_WORDS.has(token))
    .sort()
    .join(' ');
}

function meaningfulTokens(value: string): Set<string> {
  return new Set(value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').split(/\s+/).map(stem).filter((token) => token.length >= 3));
}

function similarity(a: string, b: string): number {
  const left = meaningfulTokens(a);
  const right = meaningfulTokens(b);
  if (!left.size || !right.size) return a === b ? 1 : 0;
  const intersection = [...left].filter((token) => right.has(token)).length;
  return intersection / new Set([...left, ...right]).size;
}

function companyBiased(question: string, understanding: CanonicalBusinessUnderstanding): boolean {
  const normalized = question.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ');
  const companyNames = [understanding.business.name, ...understanding.company_identity.map((item) => item.value)]
    .map((value) => value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim())
    .filter(Boolean);
  const businessVocabulary = meaningfulTokens(buyerIntentBusinessEntities(understanding).map((item) => item.value).join(' '));
  const brandTokens = companyNames.flatMap((name) => name.split(' '))
    .filter((token) => token.length >= 4 && !businessVocabulary.has(stem(token)) && !/^(private|limited|incorporated|company|group)$/.test(token));
  return companyNames.some((name) => normalized.includes(name))
    || brandTokens.some((token) => new RegExp(`\\b${token}\\b`, 'i').test(normalized))
    || BIASED.test(question);
}

function unsupportedTerms(candidate: BuyerQuestionCandidate, understanding: CanonicalBusinessUnderstanding): string[] {
  const entities = buyerIntentBusinessEntities(understanding);
  const grounding = [
    ...entities.map((entity) => `${entity.value} ${entity.description ?? ''} ${entity.category ?? ''}`),
    ...understanding.evidence.map((item) => item.evidence_text),
  ].join(' ');
  const supported = meaningfulTokens(grounding);
  return [...meaningfulTokens(candidate.question)].filter((token) => !supported.has(token) && !GENERIC_BUYER_WORDS.has(token));
}

export interface CandidateFilterResult {
  accepted: BuyerQuestionCandidate[];
  rejected: Array<{ id: string; reason: string }>;
  /**
   * Rejected only for one unfamiliar plain word (no digits). Used to backfill
   * when too few questions survive; never re-admits invented numbers.
   */
  nearMisses: BuyerQuestionCandidate[];
}

export function filterCandidates(
  candidates: BuyerQuestionCandidate[],
  understanding: CanonicalBusinessUnderstanding,
): CandidateFilterResult {
  const accepted: BuyerQuestionCandidate[] = [];
  const rejected: CandidateFilterResult['rejected'] = [];
  const nearMisses: BuyerQuestionCandidate[] = [];
  const hasGeography = understanding.geographies.length > 0;
  const hasCertification = understanding.certifications.length > 0;

  for (const raw of candidates) {
    const candidate = { ...raw, question: normalizeQuestion(raw.question), dimensions: [...new Set(raw.dimensions)] };
    let reason: string | null = null;
    const words = candidate.question.replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/);
    if (!QUESTION_OPENERS.test(candidate.question) || words.length < 5) reason = 'not a natural buyer question';
    else if (!ALLOWED_STAGE[candidate.intent].has(candidate.buyer_stage)) reason = 'intent and buyer stage are inconsistent';
    else if (companyBiased(candidate.question, understanding)) reason = 'target-company bias';
    else if (!hasGeography && (candidate.intent === 'GEOGRAPHIC' || candidate.dimensions.includes('GEOGRAPHY'))) reason = 'unsupported geography';
    else if (!hasCertification && (candidate.intent === 'COMPLIANCE' || candidate.dimensions.includes('COMPLIANCE'))) reason = 'unsupported compliance requirement';
    else {
      const unsupported = unsupportedTerms(candidate, understanding);
      if (unsupported.length) {
        reason = `unsupported constraint: ${unsupported.slice(0, 3).join(', ')}`;
        if (unsupported.length === 1 && !/\d/.test(unsupported[0]!)) nearMisses.push(candidate);
      }
    }
    if (reason) rejected.push({ id: candidate.id, reason });
    else accepted.push(candidate);
  }
  return { accepted, rejected, nearMisses };
}

export function deduplicateCandidates(candidates: BuyerQuestionCandidate[]): BuyerQuestionCandidate[] {
  const kept: BuyerQuestionCandidate[] = [];
  for (const candidate of candidates) {
    const key = semanticQuestionKey(candidate.question);
    const entityKey = [...candidate.supporting_business_entity_ids].sort().join('|');
    const duplicate = kept.some((existing) => {
      const sameEntities = [...existing.supporting_business_entity_ids].sort().join('|') === entityKey;
      return sameEntities && (semanticQuestionKey(existing.question) === key || similarity(existing.question, candidate.question) >= 0.72);
    });
    if (!duplicate) kept.push(candidate);
  }
  return kept;
}

const STAGE_VALUE: Record<BuyerStage, number> = { AWARENESS: 1, RESEARCH: 2, EVALUATION: 3, SHORTLISTING: 4, DECISION: 5, PURCHASE: 5 };
const CONFIDENCE_VALUE = { HIGH: 5, MEDIUM: 3, LOW: 1 } as const;

function evidenceSupport(candidate: BuyerQuestionCandidate, understanding: CanonicalBusinessUnderstanding): number {
  const byId = new Map(understanding.evidence.map((item) => [item.id, item]));
  const supporting = candidate.supporting_business_evidence_ids.map((id) => byId.get(id)).filter(Boolean);
  const high = supporting.filter((item) => item?.confidence === 'HIGH').length;
  const medium = supporting.filter((item) => item?.confidence === 'MEDIUM').length;
  if (high && supporting.length >= 2) return 5;
  if (high) return 4;
  if (medium >= 2) return 3;
  if (medium) return 2;
  return 1;
}

/**
 * Stable 0–100 priority: commercial 30%, business 25%, specificity 15%,
 * evidence support 15%, buyer stage 10%, evaluator confidence 5%.
 */
export function priorityScore(
  candidate: BuyerQuestionCandidate,
  evaluation: BuyerQuestionEvaluation,
  understanding: CanonicalBusinessUnderstanding,
): number {
  return evaluation.commercial_relevance * 6
    + evaluation.business_relevance * 5
    + evaluation.specificity * 3
    + evidenceSupport(candidate, understanding) * 3
    + STAGE_VALUE[candidate.buyer_stage] * 2
    + CONFIDENCE_VALUE[evaluation.confidence];
}

export function finalizeQuestions(
  candidates: BuyerQuestionCandidate[],
  evaluations: BuyerQuestionEvaluation[],
  understanding: CanonicalBusinessUnderstanding,
  setKey: string,
  limit: number,
): BuyerQuestion[] {
  const evaluationsById = new Map(evaluations.map((item) => [item.candidate_id, item]));
  const scored = candidates.flatMap((candidate) => {
    const evaluation = evaluationsById.get(candidate.id);
    if (!evaluation || evaluation.commercial_relevance < 2 || evaluation.business_relevance < 3 || evaluation.specificity < 2) return [];
    const { candidate_id: _candidateId, ...scores } = evaluation;
    const normalized = normalizeQuestion(candidate.question);
    return [{
      ...candidate,
      ...scores,
      id: stableId('buyer_question', `${setKey}\n${semanticQuestionKey(normalized)}`),
      question: normalized,
      normalized_question: normalized.toLocaleLowerCase(),
      priority_score: priorityScore(candidate, evaluation, understanding),
      rank: 0,
    } satisfies BuyerQuestion];
  }).sort((a, b) => b.priority_score - a.priority_score || a.normalized_question.localeCompare(b.normalized_question));

  const selected: BuyerQuestion[] = [];
  const selectedIds = new Set<string>();
  const add = (question: BuyerQuestion | undefined) => {
    if (question && selected.length < limit && !selectedIds.has(question.id)) {
      selected.push(question);
      selectedIds.add(question.id);
    }
  };
  for (const intent of [...new Set(scored.map((item) => item.intent))]) add(scored.find((item) => item.intent === intent));
  for (const dimension of [...new Set(scored.flatMap((item) => item.dimensions))]) add(scored.find((item) => item.dimensions.includes(dimension)));
  for (const question of scored) add(question);
  return selected
    .sort((a, b) => b.priority_score - a.priority_score || a.normalized_question.localeCompare(b.normalized_question))
    .map((question, index) => ({ ...question, rank: index + 1 }));
}

export function businessEntityById(understanding: CanonicalBusinessUnderstanding, id: string): BusinessEntity | undefined {
  return allBusinessEntities(understanding).find((item) => item.id === id);
}

export const buyerIntentTestables = { similarity, unsupportedTerms, companyBiased, EDUCATIONAL };
