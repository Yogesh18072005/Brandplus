import type { CanonicalBusinessUnderstanding } from '@/src/business-understanding/types';
import type { BuyerQuestionCandidate } from './types';
import { buyerIntentBusinessEntities } from './schema';

export const BUYER_INTENT_PROMPT_VERSION = '1.0.4' as const;

export const BUYER_INTENT_SYSTEM_PROMPT = `You are the Buyer Intent Discovery Engine of BRANDPULSE.

Your task is to identify realistic, commercially meaningful questions that potential buyers could ask an AI assistant while researching, comparing, evaluating, selecting, or purchasing products or services offered by a specific business.

You are NOT an SEO keyword generator, a marketing copywriter, or an advocate for the target company. Model a real buyer neutrally. Prefer questions that could influence a shortlist, specification, supplier choice, or purchase.

GROUNDING IS STRICT. Treat the supplied Business Understanding and evidence as the only source of facts about this business. Never invent products, services, materials, performance figures, prices, delivery times, certifications, locations, customer types, technical capabilities, or market coverage. Do not assume something is true because it is common in the industry. Do not mention the target business by name or write questions that presume it has a capability not established by evidence.

BUYER VALUE. Prioritize decision-oriented questions:
- comparing suppliers or product options against a stated buyer need;
- identifying what procurement teams should evaluate before shortlisting;
- finding suppliers for an evidenced product, service, application, or geography;
- checking whether an evidenced product or service fits an evidenced use case;
- understanding documented specifications, service coverage, or compliance requirements;
- selecting, purchasing, or finding an alternative when the evidence supports that intent.

Avoid low-value trivia and generic educational questions (for example, asking what a product is made of, how it works in general, or whether it can be used in a country). A technical question is valuable only when the supplied evidence establishes the relevant technical requirement. Do not add a material, standard, capacity, price, or performance constraint that is absent from the evidence.

DIVERSITY. Generate distinct buyer intents across the supported buyer journey, not superficial rewrites. Avoid repeating the same comparison or supplier-discovery question with only best/top/leading/vendor/supplier substituted. Do not force every intent category if the evidence does not support it. Prefer fewer defensible questions over padded generic questions.

Every question must sound natural when asked to an AI assistant, be self-contained, and end with a question mark. Do not predict an AI answer, analyze competitors, or generate SEO, content, intervention, or visibility recommendations. Quality and evidence fidelity are more important than reaching the requested count.`;

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
    task: `Generate up to ${candidateCount} distinct, commercially useful buyer-question candidates.`,
    required_range: { preferred: candidateCount, maximum: 40 },
    buyer_decision_coverage: [
      'supplier discovery and shortlisting for an evidenced product or service',
      'comparison criteria that a buyer or procurement team would actually use',
      'fit for an evidenced application or use case',
      'documented technical, service, geographic, or compliance requirements',
      'vendor selection, purchasing, or alternatives only when supported by evidence',
    ],
    rules: [
      'Prioritize questions that help a buyer make or narrow a real purchasing or supplier-selection decision.',
      'Do not fill the requested count with generic definitions, product trivia, or broad how-it-works questions.',
      'A question about a material, specification, price, delivery, certification, or performance must be directly supported by supplied evidence.',
      'Every question must sound natural when asked to an AI assistant, be self-contained, and end with a question mark.',
      'Every candidate must reference at least one supplied entity id and one of that entity\'s evidence ids.',
      'Never leave either supporting ID array empty. Select IDs by matching the question to the supplied entity value/description and its allowed evidence; do not guess or invent identifiers.',
      'Before returning, verify that every entity ID exists in the supplied entities list and every evidence ID exists in that entity\\'s allowed_evidence_ids.',
      'Copy supporting_business_entity_ids only from entity_id fields.',
      'Copy supporting_business_evidence_ids only from evidence_id fields. Never put an entity_id in supporting_business_evidence_ids.',
      'Each supporting_business_evidence_id must also appear in allowed_evidence_ids for at least one referenced entity.',
      'Use only the controlled intent, buyer stage, and dimension values defined by the response schema.',
      'Do not mention the target business name.',
      'Do not use unsupported geographic, technical, compliance, product, service, buyer, or use-case constraints.',
      'Do not output keyword phrases or superficial synonym variants.',
      'Do not treat commercial claims, promotional language, or superlatives as evidence.',
      'If evidence supports only a broad question, keep it broad; do not invent details to make it sound more specific.',
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
    task: 'Evaluate every supplied validated candidate independently. Do not add, remove, rename, or rewrite candidates.',
    scoring: {
      commercial_relevance: '1 weak, 2 low, 3 moderate, 4 high, 5 very high. Score proximity to a real purchase, supplier-selection, shortlisting, or procurement decision.',
      business_relevance: '1 to 5 based on direct relevance to the specific products, services, buyers, applications, and geographies established by evidence.',
      specificity: '1 to 5 based on useful decision detail that is actually supported. Unsupported specificity must lower the score, not raise it.',
      confidence: 'HIGH only when the question is directly grounded in clear evidence; MEDIUM when it is relevant but broader; LOW when its grounding or buyer value is weak.',
    },
    rules: [
      'Return exactly one evaluation for every supplied candidate_id, preserving each ID character-for-character.',
      'Before returning, compare the evaluation candidate_id list against the supplied candidates and ensure no ID is missing or duplicated.',
      'A direct supplier comparison, shortlist, vendor-selection, or purchase question should normally score 4 or 5 for commercial relevance when evidence supports it.',
      'A generic educational or trivia question should normally score 1 or 2 for commercial relevance.',
      'Do not reward a question for mentioning a product if it does not help a buyer make a decision.',
      'Do not reward unsupported assumptions, invented specifications, or unverified claims.',
      'The rationale must explain the question\'s buyer value and evidence grounding, not why the target company should rank.',
      'Use evidence only to assess grounding. Do not predict answers or analyze competitors.',
    ],
    ...(validationError ? {
      correction: {
        previous_response_rejected: true,
        validation_error: validationError,
        instruction: 'Return a completely corrected evaluation batch for every supplied candidate id. Include all IDs exactly once.',
      },
    } : {}),
    business_understanding: buyerIntentGrounding(understanding),
    candidates,
  });
}
