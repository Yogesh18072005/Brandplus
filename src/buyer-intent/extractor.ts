import { config } from '@/src/config';
import { geminiCall } from '@/src/gemini-client';
import type { CanonicalBusinessUnderstanding } from '@/src/business-understanding/types';
import { BUYER_INTENT_SYSTEM_PROMPT, candidateEvaluationPrompt, candidateGenerationPrompt } from './prompts';
import { validateCandidateBatchWithOmissions, validateEvaluationBatch } from './schema';
import type { BuyerIntentExtractor, BuyerQuestionCandidate, BuyerQuestionEvaluation } from './types';

type GeminiCall = typeof geminiCall;

interface StructuredJsonResponseFormat {
  type: 'text';
  mime_type: 'application/json';
  schema: Record<string, unknown>;
}

const INTENTS = ['DISCOVERY','COMPARISON','SHORTLIST','VENDOR_SELECTION','PURCHASE','SPECIFICATION','COMPLIANCE','ALTERNATIVE','GEOGRAPHIC'];
const STAGES = ['AWARENESS','RESEARCH','EVALUATION','SHORTLISTING','DECISION','PURCHASE'];
const DIMENSIONS = ['PRODUCT','SERVICE','INDUSTRY','USE_CASE','GEOGRAPHY','BUYER_TYPE','TECHNICAL_REQUIREMENT','COMPLIANCE','APPLICATION','ORDER_PROCUREMENT'];

const CANDIDATE_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    candidates: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          id: { type: 'string' }, question: { type: 'string' },
          intent: { type: 'string', enum: INTENTS },
          buyer_stage: { type: 'string', enum: STAGES },
          dimensions: { type: 'array', items: { type: 'string', enum: DIMENSIONS } },
          supporting_business_evidence_ids: { type: 'array', items: { type: 'string' } },
          supporting_business_entity_ids: { type: 'array', items: { type: 'string' } },
        },
        required: ['id','question','intent','buyer_stage','dimensions','supporting_business_evidence_ids','supporting_business_entity_ids'],
      },
    },
  },
  required: ['candidates'],
} as const;

const EVALUATION_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    evaluations: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          candidate_id: { type: 'string' },
          commercial_relevance: { type: 'integer' },
          business_relevance: { type: 'integer' },
          specificity: { type: 'integer' },
          rationale: { type: 'string' },
          confidence: { type: 'string', enum: ['HIGH','MEDIUM','LOW'] },
        },
        required: ['candidate_id','commercial_relevance','business_relevance','specificity','rationale','confidence'],
      },
    },
  },
  required: ['evaluations'],
} as const;

function parseJson(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Model returned an empty structured response');
  const parsed: unknown = JSON.parse(trimmed);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Model returned a non-object structured response');
  }
  return parsed;
}

function structuredJsonResponseFormat(schema: Record<string, unknown>): StructuredJsonResponseFormat {
  return { type: 'text', mime_type: 'application/json', schema };
}

async function withSchemaRetry<T>(operation: (attempt: number) => Promise<T>, attempts = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try { return await operation(attempt); } catch (error) { lastError = error; }
  }
  throw lastError;
}

function validationMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Structured response failed validation';
  return message.slice(0, 500);
}

export class GeminiBuyerIntentExtractor implements BuyerIntentExtractor {
  readonly model = config.parserModel;

  constructor(private readonly call: GeminiCall = geminiCall) {}

  generateCandidates(understanding: CanonicalBusinessUnderstanding, candidateCount: number): Promise<BuyerQuestionCandidate[]> {
    let previousValidationError: string | undefined;
    return withSchemaRetry(async (attempt) => {
      const interaction = await this.call({
        kind: `buyer-intent:candidates:${attempt}`,
        model: this.model,
        systemInstruction: BUYER_INTENT_SYSTEM_PROMPT,
        input: candidateGenerationPrompt(understanding, candidateCount, previousValidationError),
        responseFormat: structuredJsonResponseFormat(CANDIDATE_SCHEMA),
        generationConfig: { thinking_level: 'minimal', temperature: 0.2, max_output_tokens: 10_000 },
        retries: 1,
      });
      try {
        return validateCandidateBatchWithOmissions(parseJson(interaction.output_text ?? ''), understanding);
      } catch (error) {
        previousValidationError = validationMessage(error);
        throw error;
      }
    });
  }

  evaluateCandidates(
    understanding: CanonicalBusinessUnderstanding,
    candidates: BuyerQuestionCandidate[],
  ): Promise<BuyerQuestionEvaluation[]> {
    let previousValidationError: string | undefined;
    return withSchemaRetry(async (attempt) => {
      const interaction = await this.call({
        kind: `buyer-intent:evaluation:${attempt}`,
        model: this.model,
        systemInstruction: BUYER_INTENT_SYSTEM_PROMPT,
        input: candidateEvaluationPrompt(understanding, candidates, previousValidationError),
        responseFormat: structuredJsonResponseFormat(EVALUATION_SCHEMA),
        generationConfig: { thinking_level: 'minimal', temperature: 0, max_output_tokens: 8_000 },
        retries: 1,
      });
      try {
        return validateEvaluationBatch(parseJson(interaction.output_text ?? ''), candidates);
      } catch (error) {
        previousValidationError = validationMessage(error);
        throw error;
      }
    });
  }
}

export const buyerIntentExtractorTestables = {
  CANDIDATE_SCHEMA,
  EVALUATION_SCHEMA,
  parseJson,
  structuredJsonResponseFormat,
  validationMessage,
  withSchemaRetry,
};
