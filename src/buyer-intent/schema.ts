import { z } from 'zod';
import type { BusinessEntity, CanonicalBusinessUnderstanding } from '@/src/business-understanding/types';
import type { BuyerQuestionCandidate, BuyerQuestionEvaluation } from './types';

export const buyerIntentCategorySchema = z.enum([
  'DISCOVERY', 'COMPARISON', 'SHORTLIST', 'VENDOR_SELECTION', 'PURCHASE',
  'SPECIFICATION', 'COMPLIANCE', 'ALTERNATIVE', 'GEOGRAPHIC',
]);
export const buyerStageSchema = z.enum(['AWARENESS', 'RESEARCH', 'EVALUATION', 'SHORTLISTING', 'DECISION', 'PURCHASE']);
export const buyerIntentDimensionSchema = z.enum([
  'PRODUCT', 'SERVICE', 'INDUSTRY', 'USE_CASE', 'GEOGRAPHY', 'BUYER_TYPE',
  'TECHNICAL_REQUIREMENT', 'COMPLIANCE', 'APPLICATION', 'ORDER_PROCUREMENT',
]);

export const buyerQuestionCandidateSchema = z.object({
  id: z.string().trim().min(1).max(120),
  question: z.string().trim().min(5).max(500),
  intent: buyerIntentCategorySchema,
  buyer_stage: buyerStageSchema,
  dimensions: z.array(buyerIntentDimensionSchema).min(1).max(6),
  supporting_business_evidence_ids: z.array(z.string().trim().min(1).max(120)).min(1).max(12),
  supporting_business_entity_ids: z.array(z.string().trim().min(1).max(120)).min(1).max(12),
}).strict();

export const buyerQuestionEvaluationSchema = z.object({
  candidate_id: z.string().trim().min(1).max(120),
  commercial_relevance: z.number().int().min(1).max(5),
  business_relevance: z.number().int().min(1).max(5),
  specificity: z.number().int().min(1).max(5),
  rationale: z.string().trim().min(10).max(600),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
}).strict();

export const candidateBatchSchema = z.object({
  candidates: z.array(buyerQuestionCandidateSchema).min(1).max(40),
}).strict();

export const evaluationBatchSchema = z.object({
  evaluations: z.array(buyerQuestionEvaluationSchema).min(1).max(40),
}).strict();

const entityGroups = [
  'products', 'services', 'capabilities', 'buyer_types', 'industries', 'use_cases',
  'geographies', 'proof_assets', 'certifications', 'commercial_claims', 'differentiators',
  'conversion_signals', 'business_model_signals', 'company_identity',
] as const;
const groundingEntityGroups = [
  'products', 'services', 'capabilities', 'buyer_types', 'industries', 'use_cases',
  'geographies', 'certifications', 'business_model_signals',
] as const;

export function allBusinessEntities(understanding: CanonicalBusinessUnderstanding): BusinessEntity[] {
  return entityGroups.flatMap((group) => understanding[group]);
}

export function buyerIntentBusinessEntities(understanding: CanonicalBusinessUnderstanding): BusinessEntity[] {
  return groundingEntityGroups.flatMap((group) => understanding[group]);
}

export function validateCandidateBatch(raw: unknown, understanding: CanonicalBusinessUnderstanding): BuyerQuestionCandidate[] {
  const candidates = candidateBatchSchema.parse(raw).candidates;
  const evidenceIds = new Set(understanding.evidence.map((item) => item.id));
  const entities = new Map(buyerIntentBusinessEntities(understanding).map((item) => [item.id, item]));
  const candidateIds = new Set<string>();
  const exactQuestions = new Set<string>();

  for (const candidate of candidates) {
    if (candidateIds.has(candidate.id)) throw new Error(`Duplicate candidate id: ${candidate.id}`);
    candidateIds.add(candidate.id);
    const exact = candidate.question.toLocaleLowerCase().replace(/\s+/g, ' ').trim();
    if (exactQuestions.has(exact)) throw new Error(`Duplicate candidate question: ${candidate.question}`);
    exactQuestions.add(exact);

    for (const id of candidate.supporting_business_evidence_ids) {
      if (!evidenceIds.has(id)) throw new Error(`Candidate ${candidate.id} references missing evidence ${id}`);
    }
    const supportedByEntities = new Set<string>();
    for (const id of candidate.supporting_business_entity_ids) {
      const entity = entities.get(id);
      if (!entity) throw new Error(`Candidate ${candidate.id} references missing entity ${id}`);
      if (entity.type === 'COMMERCIAL_CLAIM' || entity.statement_kind === 'COMMERCIAL_CLAIM') {
        throw new Error(`Candidate ${candidate.id} cannot use a commercial claim as grounding`);
      }
      for (const evidenceId of entity.evidence_ids) supportedByEntities.add(evidenceId);
    }
    if (!candidate.supporting_business_evidence_ids.some((id) => supportedByEntities.has(id))) {
      throw new Error(`Candidate ${candidate.id} evidence is not connected to its referenced business entities`);
    }
  }
  return candidates;
}

const candidateEnvelopeSchema = z.object({
  candidates: z.array(z.unknown()).min(1).max(40),
}).strict();

function groundingTokens(value: string): Set<string> {
  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'from', 'that', 'this', 'which', 'what', 'who',
    'where', 'when', 'how', 'can', 'could', 'should', 'would', 'are', 'is',
    'does', 'do', 'their', 'your', 'our', 'they', 'them', 'into', 'under',
    'over', 'best', 'top', 'leading', 'supplier', 'suppliers', 'vendor', 'vendors',
    'manufacturer', 'manufacturers', 'company', 'companies', 'business', 'businesses',
    'team', 'teams', 'buyer', 'buyers', 'procurement', 'purchase', 'purchasing',
    'shortlist', 'shortlisting', 'compare', 'comparison', 'select', 'selection',
  ]);
  return new Set(value.toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(/\s+/)
    .map((token) => token.length > 4 && token.endsWith('s') ? token.slice(0, -1) : token)
    .filter((token) => token.length >= 4 && !stopWords.has(token)));
}

function sharedTokenCount(left: Set<string>, right: Set<string>): number {
  return [...left].filter((token) => right.has(token)).length;
}

/**
 * Small local models sometimes omit the grounding ID arrays. Recover them only
 * when the question independently matches an existing entity and evidence
 * already linked to that entity. No IDs or evidence are ever fabricated.
 */
export function inferMissingCandidateGrounding(
  rawCandidate: unknown,
  understanding: CanonicalBusinessUnderstanding,
): unknown {
  if (!rawCandidate || typeof rawCandidate !== 'object' || Array.isArray(rawCandidate)) return rawCandidate;
  const candidate = rawCandidate as Record<string, unknown>;
  if (typeof candidate.question !== 'string') return rawCandidate;

  const entityIds = Array.isArray(candidate.supporting_business_entity_ids)
    ? candidate.supporting_business_entity_ids.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : [];
  const evidenceIds = Array.isArray(candidate.supporting_business_evidence_ids)
    ? candidate.supporting_business_evidence_ids.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : [];
  if (entityIds.length && evidenceIds.length) return rawCandidate;

  const questionTokens = groundingTokens(candidate.question);
  if (questionTokens.size < 2) return rawCandidate;

  const evidenceById = new Map(understanding.evidence.map((item) => [item.id, item]));
  const eligibleEntities = buyerIntentBusinessEntities(understanding)
    .filter((entity) => !entityIds.length || entityIds.includes(entity.id))
    .filter((entity) => {
      const entityTokens = groundingTokens([entity.value, entity.description ?? '', entity.category ?? ''].join(' '));
      return sharedTokenCount(questionTokens, entityTokens) >= 2;
    });

  const matched = eligibleEntities.flatMap((entity) => {
    const entityTokens = groundingTokens([entity.value, entity.description ?? '', entity.category ?? ''].join(' '));
    const supportingEvidence = entity.evidence_ids
      .map((id) => evidenceById.get(id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .filter((item) => {
        const evidenceTokens = groundingTokens(item.evidence_text);
        return sharedTokenCount(questionTokens, evidenceTokens) >= 2
          && sharedTokenCount(entityTokens, evidenceTokens) >= 1;
      });
    return supportingEvidence.length ? [{ entity, supportingEvidence }] : [];
  });

  if (!matched.length) return rawCandidate;
  return {
    ...candidate,
    supporting_business_entity_ids: entityIds.length ? entityIds : matched.map(({ entity }) => entity.id),
    supporting_business_evidence_ids: evidenceIds.length
      ? evidenceIds
      : [...new Set(matched.flatMap(({ supportingEvidence }) => supportingEvidence.map((item) => item.id)))],
  };
}

export function validateCandidateBatchWithOmissions(
  raw: unknown,
  understanding: CanonicalBusinessUnderstanding,
): BuyerQuestionCandidate[] {
  const rawCandidates = candidateEnvelopeSchema.parse(raw).candidates;
  const accepted: BuyerQuestionCandidate[] = [];
  const diagnostics: string[] = [];
  let firstError: unknown;

  for (const [index, rawCandidate] of rawCandidates.entries()) {
    try {
      const groundedCandidate = inferMissingCandidateGrounding(rawCandidate, understanding);
      accepted.push(validateCandidateBatch({ candidates: [groundedCandidate] }, understanding)[0]!);
    } catch (error) {
      firstError ??= error;
      const candidate = rawCandidate && typeof rawCandidate === 'object' && !Array.isArray(rawCandidate)
        ? rawCandidate as Record<string, unknown>
        : {};
      const question = typeof candidate.question === 'string'
        ? candidate.question.replace(/\\s+/g, ' ').slice(0, 220)
        : '[missing question]';
      const entityIds = Array.isArray(candidate.supporting_business_entity_ids)
        ? candidate.supporting_business_entity_ids.filter((id): id is string => typeof id === 'string')
        : [];
      const evidenceIds = Array.isArray(candidate.supporting_business_evidence_ids)
        ? candidate.supporting_business_evidence_ids.filter((id): id is string => typeof id === 'string')
        : [];
      const questionTokens = groundingTokens(question);
      const eligibleEntities = buyerIntentBusinessEntities(understanding).filter((entity) => {
        const entityTokens = groundingTokens([entity.value, entity.description ?? '', entity.category ?? ''].join(' '));
        return sharedTokenCount(questionTokens, entityTokens) >= 2;
      });
      const evidenceMatches = eligibleEntities.reduce((count, entity) => {
        const entityTokens = groundingTokens([entity.value, entity.description ?? '', entity.category ?? ''].join(' '));
        return count + entity.evidence_ids.filter((id) => {
          const item = understanding.evidence.find((entry) => entry.id === id);
          if (!item) return false;
          const evidenceTokens = groundingTokens(item.evidence_text);
          return sharedTokenCount(questionTokens, evidenceTokens) >= 2
            && sharedTokenCount(entityTokens, evidenceTokens) >= 1;
        }).length;
      }, 0);
      const reason = error instanceof Error ? error.message.slice(0, 260) : 'Unknown validation error';
      diagnostics.push(
        `candidate[${index}]: question="${question}"; supplied_entity_ids=${entityIds.length}; supplied_evidence_ids=${evidenceIds.length}; eligible_entities=${eligibleEntities.length}; linked_evidence_matches=${evidenceMatches}; validation=${reason}`,
      );
    }
  }

  if (!accepted.length) {
    const summary = diagnostics.slice(0, 8).join(' | ');
    throw new Error(
      `No buyer-intent candidates passed grounding validation. Diagnostics: ${summary || 'No candidate diagnostics available'}`,
      { cause: firstError },
    );
  }
  return validateCandidateBatch({ candidates: accepted }, understanding);
}

const EDUCATIONAL = /^(what (is|are)|how (does|do|is|are)|why (is|are|does|do))\b/i;

export function validateEvaluationBatch(
  raw: unknown,
  candidates: BuyerQuestionCandidate[],
): BuyerQuestionEvaluation[] {
  const evaluations = evaluationBatchSchema.parse(raw).evaluations;
  const candidatesById = new Map(candidates.map((item) => [item.id, item]));
  const seen = new Set<string>();
  for (const evaluation of evaluations) {
    if (seen.has(evaluation.candidate_id)) throw new Error(`Duplicate evaluation for ${evaluation.candidate_id}`);
    seen.add(evaluation.candidate_id);
    const candidate = candidatesById.get(evaluation.candidate_id);
    if (!candidate) throw new Error(`Evaluation references missing candidate ${evaluation.candidate_id}`);
    if (candidate.intent === 'PURCHASE' && evaluation.commercial_relevance < 4) {
      throw new Error(`Purchase candidate ${candidate.id} must have high commercial relevance`);
    }
    if (candidate.intent === 'DISCOVERY' && EDUCATIONAL.test(candidate.question) && evaluation.commercial_relevance > 2) {
      throw new Error(`Educational candidate ${candidate.id} cannot have high commercial relevance`);
    }
  }
  if (seen.size !== candidates.length) throw new Error('Evaluation response omitted one or more candidates');
  return evaluations;
}
