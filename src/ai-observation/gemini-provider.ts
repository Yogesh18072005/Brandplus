import { config } from '@/src/config';
import { usdForTokens } from '@/src/cost';
import { geminiCall, type Interaction } from '@/src/gemini-client';
import { normalizeHostname } from './normalize';
import { ObservationProviderError } from './provider';
import {
  GEMINI_OBSERVATION_ADAPTER_VERSION,
  type ObservationProvider,
  type ObservationProviderResult,
  type ProviderCitation,
} from './types';

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

function providerCitations(interaction: Interaction): ProviderCitation[] {
  const citations: ProviderCitation[] = [];
  for (const step of Array.isArray(interaction?.steps) ? interaction.steps : []) {
    if (step?.type !== 'model_output') continue;
    for (const content of Array.isArray(step?.content) ? step.content : []) {
      if (content?.type !== 'text') continue;
      for (const annotation of Array.isArray(content?.annotations) ? content.annotations : []) {
        if (annotation?.type !== 'url_citation') continue;
        const url = typeof annotation.url === 'string' ? annotation.url : null;
        citations.push({
          displayedText: typeof annotation.title === 'string' ? annotation.title : url,
          url,
          domain: url ? normalizeHostname(url) : null,
          title: typeof annotation.title === 'string' ? annotation.title : null,
          providerCitationId: typeof annotation.id === 'string' ? annotation.id : null,
          context: typeof content.text === 'string' ? content.text.slice(0, 1_000) : null,
          characterPosition: Number.isInteger(annotation.start_index) ? annotation.start_index : null,
          claimAssociation: Number.isInteger(annotation.start_index) ? 'STRUCTURAL' : 'INCONCLUSIVE',
          metadata: {
            endIndex: Number.isInteger(annotation.end_index) ? annotation.end_index : null,
          },
        });
      }
    }
  }
  return citations;
}

function finishReason(interaction: Interaction): string | null {
  if (typeof interaction?.finish_reason === 'string') return interaction.finish_reason;
  const modelSteps = (Array.isArray(interaction?.steps) ? interaction.steps : []).filter((step: { type?: string }) => step?.type === 'model_output');
  const last = modelSteps.at(-1);
  return typeof last?.finish_reason === 'string' ? last.finish_reason : null;
}

function completeness(rawResponse: string, reason: string | null): ObservationProviderResult['completeness'] {
  if (!rawResponse) return 'EMPTY';
  if (reason && /max[_\s-]?tokens|length|truncat/i.test(reason)) return 'PARTIAL';
  if (reason && /error|failed|cancel/i.test(reason)) return 'INCONCLUSIVE';
  return 'COMPLETE';
}

export class GeminiObservationProvider implements ObservationProvider {
  readonly name = 'gemini';
  readonly adapterVersion = GEMINI_OBSERVATION_ADAPTER_VERSION;

  constructor(readonly model = config.engineModel) {}

  availability() {
    return config.googleApiKey
      ? { available: true }
      : { available: false, reason: 'GOOGLE_API_KEY is not configured' };
  }

  async observeQuestion(input: Parameters<ObservationProvider['observeQuestion']>[0]): Promise<ObservationProviderResult> {
    if (!input.question) throw new ObservationProviderError('Question must not be empty', 'INVALID_QUESTION', false);
    const started = Date.now();
    const interaction = await geminiCall({
      kind: 'observation:gemini',
      model: this.model,
      input: input.question,
      systemInstruction: input.systemInstruction,
      ...(input.generationParameters.grounding ? { tools: [{ type: 'google_search' }] } : {}),
      generationConfig: {
        thinking_level: 'minimal',
        temperature: Number(input.generationParameters.temperature ?? 0.2),
        max_output_tokens: Number(input.generationParameters.maxOutputTokens ?? 3072),
      },
      retries: 0,
    });
    const rawResponse = responseText(interaction);
    const reason = finishReason(interaction);
    const inputTokens = Number.isFinite(interaction?.usage?.total_input_tokens) ? Number(interaction.usage.total_input_tokens) : null;
    const outputTokens = Number.isFinite(interaction?.usage?.total_output_tokens) ? Number(interaction.usage.total_output_tokens) : null;
    const totalTokens = Number.isFinite(interaction?.usage?.total_tokens)
      ? Number(interaction.usage.total_tokens)
      : inputTokens !== null && outputTokens !== null ? inputTokens + outputTokens : null;
    return {
      provider: this.name,
      model: this.model,
      modelVersion: typeof interaction?.model_version === 'string' ? interaction.model_version : null,
      providerResponseId: typeof interaction?.id === 'string' ? interaction.id : null,
      rawResponse,
      observedAt: new Date().toISOString(),
      latencyMs: Date.now() - started,
      completeness: completeness(rawResponse, reason),
      finishReason: reason,
      usage: { inputTokens, outputTokens, totalTokens },
      estimatedCostUsd: inputTokens !== null && outputTokens !== null ? usdForTokens(this.model, inputTokens, outputTokens) : null,
      citations: providerCitations(interaction),
      metadata: {
        interactionStatus: typeof interaction?.status === 'string' ? interaction.status : null,
        grounded: Boolean(input.generationParameters.grounding),
      },
    };
  }
}
