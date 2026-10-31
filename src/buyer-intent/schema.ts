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

export function validateCandidateBatchWithOmissions(
  raw: unknown,
  understanding: CanonicalBusinessUnderstanding,
): BuyerQuestionCandidate[] {
  const rawCandidates = candidateEnvelopeSchema.parse(raw).candidates;
  const accepted: BuyerQuestionCandidate[] = [];
  let firstError: unknown;

  for (const rawCandidate of rawCandidates) {
    try {
      accepted.push(validateCandidateBatch({ candidates: [rawCandidate] }, understanding)[0]!);
    } catch (error) {
      firstError ??= error;
    }
  }

  if (!accepted.length) throw firstError ?? new Error('No valid buyer-question candidates were returned');
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
