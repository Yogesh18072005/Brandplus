import { z } from 'zod';
import { config } from '@/src/config';
import { usdForTokens } from '@/src/cost';
import { geminiCall, type Interaction } from '@/src/gemini-client';
import { buildInterventionPrompt, INTERVENTION_GENERATION_PARAMETERS, INTERVENTION_SYSTEM_INSTRUCTION } from './prompt';
import type { InterventionGenerator, InterventionGeneratorResult, InterventionGeneratorUsage } from './types';

type GeminiCall = typeof geminiCall;

const interventionTypes = [
  'ENTITY_CLARIFICATION', 'PRODUCT_EVIDENCE', 'SERVICE_EVIDENCE', 'INDUSTRY_EVIDENCE', 'USE_CASE_EVIDENCE',
  'BUYER_EVIDENCE', 'TECHNICAL_EVIDENCE', 'COMPLIANCE_EVIDENCE', 'CERTIFICATION_EVIDENCE', 'GEOGRAPHIC_EVIDENCE',
  'PROOF_EVIDENCE', 'CASE_STUDY', 'CUSTOMER_PROOF', 'SOURCE_COVERAGE', 'THIRD_PARTY_EVIDENCE', 'CONTENT_BRIEF',
  'INFORMATION_ARCHITECTURE', 'STRUCTURED_DATA', 'PROFILE_COMPLETENESS', 'DOCUMENTATION', 'OTHER',
] as const;
const categories = ['CLARIFY', 'CONSOLIDATE', 'ADD_PROOF', 'ADD_INFORMATION', 'IMPROVE_SOURCE', 'STRUCTURE', 'REMOVE_AMBIGUITY'] as const;
const surfaces = [
  'WEBSITE_PAGE', 'WEBSITE_SECTION', 'PRODUCT_PAGE', 'SERVICE_PAGE', 'INDUSTRY_PAGE', 'USE_CASE_PAGE', 'CASE_STUDY',
  'TECHNICAL_DOCUMENT', 'CERTIFICATION_PAGE', 'ABOUT_PAGE', 'CONTACT_PAGE', 'THIRD_PARTY_PROFILE', 'DIRECTORY_PROFILE',
  'BUSINESS_PROFILE', 'STRUCTURED_DATA', 'CONTENT_LIBRARY', 'OTHER',
] as const;
const inputTypes = [
  'BUSINESS_FACT', 'CERTIFICATION_DETAIL', 'CUSTOMER_PROOF', 'GEOGRAPHY_DETAIL', 'CAPABILITY_DETAIL',
  'TECHNICAL_SPECIFICATION', 'COMPLIANCE_DETAIL', 'CASE_STUDY_DETAIL', 'OTHER',
] as const;

const proposalSchema = z.object({
  candidateKey: z.string().min(3).max(128),
  diagnosisIds: z.array(z.string().min(1)).min(1).max(30),
  gapIds: z.array(z.string().min(1)).min(1).max(30),
  interventionType: z.enum(interventionTypes),
  category: z.enum(categories),
  implementationSurface: z.enum(surfaces),
  evidenceToReuseIds: z.array(z.string().min(1)).max(50).default([]),
  requiredInputTypes: z.array(z.enum(inputTypes)).max(10).default([]),
  dependsOnCandidateKeys: z.array(z.string().min(3).max(128)).max(20).default([]),
  schemaType: z.enum(['Organization', 'Product', 'Service', 'LocalBusiness']).optional(),
}).strict();

const responseSchema = z.object({ candidates: z.array(proposalSchema).max(150) }).strict();

function responseText(interaction: Interaction): string {
  if (typeof interaction?.output_text === 'string') return interaction.output_text;
  const blocks: string[] = [];
  for (const step of Array.isArray(interaction?.steps) ? interaction.steps : []) {
    if (step?.type !== 'model_output') continue;
    for (const content of Array.isArray(step?.content) ? step.content : []) {
      if (content?.type === 'text' && typeof content.text === 'string') blocks.push(content.text);
    }
  }
  return blocks.join('\n');
}

function usage(interaction: Interaction, model: string): InterventionGeneratorUsage {
  const inputTokens = Number.isFinite(interaction?.usage?.total_input_tokens) ? Number(interaction.usage.total_input_tokens) : 0;
  const outputTokens = Number.isFinite(interaction?.usage?.total_output_tokens) ? Number(interaction.usage.total_output_tokens) : 0;
  return {
    inputTokens,
    outputTokens,
    costUsd: usdForTokens(model, inputTokens, outputTokens),
    modelVersion: typeof interaction?.model_version === 'string' ? interaction.model_version : null,
  };
}

export class InterventionGenerationError extends Error {
  readonly usage: InterventionGeneratorUsage;
  readonly retryable: boolean;

  constructor(message: string, options?: { usage?: InterventionGeneratorUsage; retryable?: boolean }) {
    super(message);
    this.name = 'InterventionGenerationError';
    this.usage = options?.usage ?? { inputTokens: 0, outputTokens: 0, costUsd: 0, modelVersion: null };
    this.retryable = options?.retryable ?? true;
  }
}

export function parseInterventionResponse(raw: string, callUsage: InterventionGeneratorUsage) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new InterventionGenerationError('Gemini returned malformed intervention JSON', { usage: callUsage });
  }
  const validated = responseSchema.safeParse(parsed);
  if (!validated.success) {
    throw new InterventionGenerationError(`Gemini intervention schema validation failed: ${validated.error.issues[0]?.message ?? 'invalid response'}`, { usage: callUsage });
  }
  return validated.data.candidates;
}

export class GeminiInterventionGenerator implements InterventionGenerator {
  constructor(readonly model = config.interventionModel, private readonly call: GeminiCall = geminiCall) {}

  async generate(context: Parameters<InterventionGenerator['generate']>[0]): Promise<InterventionGeneratorResult> {
    if (this.call === geminiCall && !config.googleApiKey) {
      throw new InterventionGenerationError('GOOGLE_API_KEY is not configured', { retryable: false });
    }
    const interaction = await this.call({
      kind: 'intervention:gemini',
      model: this.model,
      input: buildInterventionPrompt(context),
      systemInstruction: INTERVENTION_SYSTEM_INSTRUCTION,
      responseFormat: {
        type: 'text',
        mime_type: 'application/json',
        schema: {
          type: 'object', additionalProperties: false, required: ['candidates'],
          properties: {
            candidates: {
              type: 'array',
              items: {
                type: 'object', additionalProperties: false,
                required: ['candidateKey', 'diagnosisIds', 'gapIds', 'interventionType', 'category', 'implementationSurface', 'evidenceToReuseIds', 'requiredInputTypes', 'dependsOnCandidateKeys'],
                properties: {
                  candidateKey: { type: 'string' },
                  diagnosisIds: { type: 'array', items: { type: 'string' } },
                  gapIds: { type: 'array', items: { type: 'string' } },
                  interventionType: { type: 'string', enum: interventionTypes },
                  category: { type: 'string', enum: categories },
                  implementationSurface: { type: 'string', enum: surfaces },
                  evidenceToReuseIds: { type: 'array', items: { type: 'string' } },
                  requiredInputTypes: { type: 'array', items: { type: 'string', enum: inputTypes } },
                  dependsOnCandidateKeys: { type: 'array', items: { type: 'string' } },
                  schemaType: { type: 'string', enum: ['Organization', 'Product', 'Service', 'LocalBusiness'] },
                },
              },
            },
          },
        },
      },
      generationConfig: {
        thinking_level: 'minimal',
        temperature: INTERVENTION_GENERATION_PARAMETERS.temperature,
        max_output_tokens: INTERVENTION_GENERATION_PARAMETERS.maxOutputTokens,
      },
      retries: 0,
    });
    const callUsage = usage(interaction, this.model);
    const raw = responseText(interaction).trim();
    return { proposals: parseInterventionResponse(raw, callUsage), usage: callUsage };
  }
}
