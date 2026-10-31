import { config } from '../config';
import { geminiCall } from '../gemini-client';
import type { BusinessUnderstandingExtractor, CrawledPage, PageExtraction, SynthesisResult } from './types';
import { BUSINESS_UNDERSTANDING_SYSTEM_PROMPT, pageExtractionPrompt, synthesisPrompt } from './prompts';
import { validatePageExtraction, validateSynthesis } from './schema';

type GeminiCall = typeof geminiCall;

interface StructuredJsonResponseFormat {
  type: 'text';
  mime_type: 'application/json';
  schema: Record<string, unknown>;
}

const PAGE_RESPONSE_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    evidence: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { id: { type: 'string' }, evidence_text: { type: 'string' }, confidence: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] } }, required: ['id', 'evidence_text', 'confidence'] } },
    entities: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { id: { type: 'string' }, type: { type: 'string', enum: ['COMPANY_IDENTITY','PRODUCT','SERVICE','CAPABILITY','BUYER_TYPE','INDUSTRY','USE_CASE','GEOGRAPHY','COMMERCIAL_CLAIM','DIFFERENTIATOR','PROOF_ASSET','CERTIFICATION','BUSINESS_MODEL_SIGNAL','CONVERSION_SIGNAL'] }, value: { type: 'string' }, description: { type: ['string','null'] }, category: { type: ['string','null'] }, statement_kind: { type: 'string', enum: ['FACT','INTERPRETATION','COMMERCIAL_CLAIM'] }, confidence: { type: 'string', enum: ['HIGH','MEDIUM','LOW'] }, evidence_ids: { type: 'array', items: { type: 'string' } } }, required: ['id','type','value','description','category','statement_kind','confidence','evidence_ids'] } },
    unknowns: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { id: { type: 'string' }, area: { type: 'string' }, reason: { type: 'string', enum: ['NOT_EVIDENCED','CRAWL_FAILURE','AMBIGUOUS','CONFLICT'] }, detail: { type: 'string' }, evidence_ids: { type: 'array', items: { type: 'string' } } }, required: ['id','area','reason','detail','evidence_ids'] } },
  }, required: ['evidence','entities','unknowns'],
} as const;

const SYNTHESIS_RESPONSE_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    description: { anyOf: [{ type: 'null' }, { type: 'object', additionalProperties: false, properties: { value: { type: 'string' }, evidence_ids: { type: 'array', items: { type: 'string' } } }, required: ['value','evidence_ids'] }] },
    business_model: { anyOf: [{ type: 'null' }, { type: 'object', additionalProperties: false, properties: { value: { type: 'string' }, evidence_ids: { type: 'array', items: { type: 'string' } } }, required: ['value','evidence_ids'] }] },
    entities: PAGE_RESPONSE_SCHEMA.properties.entities,
    conflicts: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { id: { type: 'string' }, topic: { type: 'string' }, conflicting_values: { type: 'array', items: { type: 'string' } }, evidence_ids: { type: 'array', items: { type: 'string' } }, resolution: { type: 'string', enum: ['UNRESOLVED'] } }, required: ['id','topic','conflicting_values','evidence_ids','resolution'] } },
    unknowns: PAGE_RESPONSE_SCHEMA.properties.unknowns,
  }, required: ['description','business_model','entities','conflicts','unknowns'],
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

function assertSupportedStructuredFormat(format: unknown): asserts format is StructuredJsonResponseFormat {
  if (!format || typeof format !== 'object' || Array.isArray(format)) {
    throw new Error('Unsupported Gemini structured response format');
  }
  const candidate = format as Partial<StructuredJsonResponseFormat>;
  if (candidate.type !== 'text' || candidate.mime_type !== 'application/json'
    || !candidate.schema || typeof candidate.schema !== 'object' || Array.isArray(candidate.schema)) {
    throw new Error('Unsupported Gemini structured response format');
  }
}

function structuredJsonResponseFormat(schema: Record<string, unknown>): StructuredJsonResponseFormat {
  const format: StructuredJsonResponseFormat = { type: 'text', mime_type: 'application/json', schema };
  assertSupportedStructuredFormat(format);
  return format;
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
  // A JSON parse error on a long answer means it was cut off at the output
  // limit; ask for a shorter answer rather than the same one again.
  if (/Unterminated string|Unexpected end of JSON|Expected ',' or [}\]]/.test(message)) {
    return `${message.slice(0, 200)}. The previous answer was cut off because it was too long. Return a more compact answer: merge near-duplicate entities, keep descriptions short, and cite at most 3 evidence ids per item.`;
  }
  return message.slice(0, 500);
}


function validateSynthesisWithOptionalSummaryRecovery(
  raw: unknown,
  evidence: Parameters<typeof validateSynthesis>[1],
): SynthesisResult {
  let candidate = raw;
  for (let recovery = 0; recovery < 2; recovery++) {
    try {
      return validateSynthesis(candidate, evidence);
    } catch (error) {
      const message = validationMessage(error);
      if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) throw error;
      const record = candidate as Record<string, unknown>;
      if (/^Business description (?:requires|introduces)/.test(message) && record.description != null) {
        candidate = { ...record, description: null };
        continue;
      }
      if (/^Business model (?:requires|introduces)/.test(message) && record.business_model != null) {
        candidate = { ...record, business_model: null };
        continue;
      }
      throw error;
    }
  }
  return validateSynthesis(candidate, evidence);
}
export class GeminiBusinessUnderstandingExtractor implements BusinessUnderstandingExtractor {
  readonly model = config.parserModel;

  constructor(private readonly call: GeminiCall = geminiCall) {}

  extractPage(page: CrawledPage): Promise<PageExtraction> {
    let previousValidationError: string | undefined;
    return withSchemaRetry(async (attempt) => {
      const interaction = await this.call({
        kind: `business-understanding:page:${attempt}`,
        model: this.model,
        systemInstruction: BUSINESS_UNDERSTANDING_SYSTEM_PROMPT,
        input: pageExtractionPrompt(page, previousValidationError),
        responseFormat: structuredJsonResponseFormat(PAGE_RESPONSE_SCHEMA),
        generationConfig: { thinking_level: 'minimal', temperature: 0, max_output_tokens: 6_000 },
        retries: 1,
      });
      try {
        return validatePageExtraction(parseJson(interaction.output_text ?? ''), page);
      } catch (error) {
        previousValidationError = validationMessage(error);
        throw error;
      }
    });
  }

  synthesize(input: Parameters<BusinessUnderstandingExtractor['synthesize']>[0]): Promise<SynthesisResult> {
    let previousValidationError: string | undefined;
    return withSchemaRetry(async (attempt) => {
      const interaction = await this.call({
        kind: `business-understanding:synthesis:${attempt}`,
        model: this.model,
        systemInstruction: BUSINESS_UNDERSTANDING_SYSTEM_PROMPT,
        input: synthesisPrompt(input, previousValidationError),
        responseFormat: structuredJsonResponseFormat(SYNTHESIS_RESPONSE_SCHEMA),
        // Large catalogues (dozens of products) produce long syntheses; 10k
        // tokens cut them off mid-JSON.
        generationConfig: { thinking_level: 'minimal', temperature: 0, max_output_tokens: 32_000 },
        retries: 1,
      });
      try {
        return validateSynthesisWithOptionalSummaryRecovery(parseJson(interaction.output_text ?? ''), input.evidence);
      } catch (error) {
        previousValidationError = validationMessage(error);
        throw error;
      }
    });
  }
}

export const businessUnderstandingTestables = {
  PAGE_RESPONSE_SCHEMA,
  SYNTHESIS_RESPONSE_SCHEMA,
  assertSupportedStructuredFormat,
  parseJson,
  structuredJsonResponseFormat,
  validationMessage,
  validateSynthesisWithOptionalSummaryRecovery,
  withSchemaRetry,
};
