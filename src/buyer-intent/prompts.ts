import type { CanonicalBusinessUnderstanding } from '@/src/business-understanding/types';
import type { BuyerQuestionCandidate } from './types';
import { buyerIntentBusinessEntities } from './schema';

export const BUYER_INTENT_PROMPT_VERSION = '1.0.2' as const;

export const BUYER_INTENT_SYSTEM_PROMPT = `You are the Buyer Intent Discovery Engine of BRANDPULSE.

Your task is to identify realistic, commercially meaningful questions that potential buyers could ask an AI assistant while researching, comparing, evaluating, selecting, or purchasing products or services offered by a specific business.

You are NOT an SEO keyword generator. You are NOT a marketing copywriter. You are NOT an advocate for the target company. You must model buyer intent neutrally.

Use the supplied Business Understanding as authoritative. Do not invent products, services, industries, capabilities, certifications, geographies, customer types, use cases, or business claims. Do not assume a capability merely because it is common within the company's industry. Do not mention the target company. Do not turn its marketing claims into premises.

Prefer commercially meaningful questions involving real decisions: discovering options, comparing vendors, shortlisting suppliers, evaluating requirements, selecting a provider, meeting demonstrated specifications or compliance requirements, purchasing, or finding alternatives.

Every question must represent a distinct buyer intent. Variants differing only by words such as best, top, leading, supplier, company, or vendor are duplicates. Use geography, industry, buyer type, use case, technical requirements, and compliance constraints only when explicitly supported by the supplied entities and evidence.

Do not treat search volume as commercial value. Do not predict an AI answer. Do not analyze competitors. Do not generate SEO, content, intervention, or visibility recommendations. When evidence is insufficient, make the question broader or omit it. Quality is more important than quantity.`;

export function buyerIntentGrounding(understanding: CanonicalBusinessUnderstanding) {
  const entities = buyerIntentBusinessEntities(understanding);
  const evidenceIds = new Set(entities.flatMap((entity) => entity.evidence_ids));
  return {
    business: {
      name: understanding.business.name,
      description: understanding.business.description,
      business_model: understanding.business.business_model,
    },
    entities: entities.map((entity) => ({
      entity_id: entity.id,
      type: entity.type,
      value: entity.value,
      description: entity.description,
      category: entity.category,
      statement_kind: entity.statement_kind,
      confidence: entity.confidence,
      allowed_evidence_ids: entity.evidence_ids,
    })),
    evidence: understanding.evidence.filter((item) => evidenceIds.has(item.id)).map((item) => ({
      evidence_id: item.id,
      evidence_text: item.evidence_text,
      confidence: item.confidence,
      source_url: item.source_url,
      source_type: item.source_type,
    })),
    unknowns: understanding.unknowns,
    conflicts: understanding.conflicts,
  };
}

export function candidateGenerationPrompt(
  understanding: CanonicalBusinessUnderstanding,
  candidateCount: number,
  validationError?: string,
): string {
  return JSON.stringify({
    task: `Generate up to ${candidateCount} distinct neutral buyer-question candidates.`,
    required_range: { preferred: candidateCount, maximum: 40 },
    rules: [
      'Every question must sound natural when asked to an AI assistant and must end with a question mark.',
      'Every candidate must reference at least one supplied entity id and one of that entity\'s evidence ids.',
      'Copy supporting_business_entity_ids only from entity_id fields.',
      'Copy supporting_business_evidence_ids only from evidence_id fields. Never put an entity_id in supporting_business_evidence_ids.',
      'Each supporting_business_evidence_id must also appear in allowed_evidence_ids for at least one referenced entity.',
      'Use only the controlled intent, buyer stage, and dimension values defined by the response schema.',
      'Do not mention the target business name.',
      'Do not use unsupported geographic, technical, compliance, product, service, buyer, or use-case constraints.',
      'Do not output keyword phrases or superficial synonym variants.',
      'Commercial claims and promotional superlatives are not grounding facts.',
    ],
    ...(validationError ? {
      correction: {
        previous_response_rejected: true,
        validation_error: validationError,
        instruction: 'Return a completely corrected candidate batch. Use only the exact supplied entity_id and evidence_id values.',
      },
    } : {}),
    business_understanding: buyerIntentGrounding(understanding),
  });
}

export function candidateEvaluationPrompt(
  understanding: CanonicalBusinessUnderstanding,
  candidates: BuyerQuestionCandidate[],
  validationError?: string,
): string {
  return JSON.stringify({
    task: 'Evaluate the supplied validated candidates. Do not add, remove, or rewrite candidates.',
    scoring: {
      commercial_relevance: '1 weak, 2 low, 3 moderate, 4 high, 5 very high based on proximity to a business decision',
      business_relevance: '1 to 5 based on direct relevance to the specific evidenced business scope',
      specificity: '1 to 5 based on whether the question distinguishes meaningful answers without unsupported assumptions',
      confidence: 'HIGH only when the question is directly grounded; MEDIUM when framing is broader; LOW when grounding is weak',
    },
    rules: [
      'Return exactly one evaluation for each candidate id.',
      'A purchase or vendor-selection question should normally have commercial relevance 4 or 5.',
      'A purely educational question such as what-is or how-does should not exceed commercial relevance 2.',
      'The rationale must explain why the question belongs in the benchmark, not why the target company should rank.',
      'Use the evidence only to assess grounding. Do not predict answers or analyze competitors.',
    ],
    ...(validationError ? {
      correction: {
        previous_response_rejected: true,
        validation_error: validationError,
        instruction: 'Return a completely corrected evaluation batch for every supplied candidate id.',
      },
    } : {}),
    business_understanding: buyerIntentGrounding(understanding),
    candidates,
  });
}
