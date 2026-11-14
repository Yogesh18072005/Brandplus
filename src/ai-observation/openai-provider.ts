import { config } from '@/src/config';
import { normalizeHostname } from './normalize';
import { ObservationProviderError } from './provider';
import {
  OPENAI_OBSERVATION_ADAPTER_VERSION,
  type ObservationProvider,
  type ObservationProviderResult,
  type ProviderCitation,
} from './types';

type OpenAIAnnotation = {
  type?: string;
  url?: string;
  title?: string;
  start_index?: number;
  end_index?: number;
};

type OpenAIResponse = {
  id?: string;
  model?: string;
  status?: string;
  incomplete_details?: { reason?: string } | null;
  output?: Array<{
    type?: string;
    id?: string;
    content?: Array<{
      type?: string;
      text?: string;
      annotations?: OpenAIAnnotation[];
    }>;
  }>;
  usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
  error?: { message?: string; type?: string; code?: string };
};

function safeCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function parseResponse(payload: OpenAIResponse): { text: string; citations: ProviderCitation[] } {
  const textBlocks: string[] = [];
  const citations: ProviderCitation[] = [];

  for (const item of payload.output ?? []) {
    if (item.type !== 'message') continue;
    for (const part of item.content ?? []) {
      if (part.type !== 'output_text' || typeof part.text !== 'string') continue;
      textBlocks.push(part.text);
      for (const annotation of part.annotations ?? []) {
        if (annotation.type !== 'url_citation' || typeof annotation.url !== 'string') continue;
        const url = annotation.url;
        const start = safeCount(annotation.start_index);
        citations.push({
          displayedText: annotation.title ?? url,
          url,
          domain: normalizeHostname(url),
          title: annotation.title ?? null,
          providerCitationId: null,
          context: part.text.slice(0, 1_000),
          characterPosition: start,
          claimAssociation: start !== null ? 'STRUCTURAL' : 'INCONCLUSIVE',
          metadata: { endIndex: safeCount(annotation.end_index) },
        });
      }
    }
  }

  return { text: textBlocks.join('\n'), citations };
}

export interface OpenAIObservationProviderOptions {
  model?: string;
  apiKey?: string;
  enabled?: boolean;
  fetcher?: typeof fetch;
}

export class OpenAIObservationProvider implements ObservationProvider {
  readonly name = 'openai';
  readonly adapterVersion = OPENAI_OBSERVATION_ADAPTER_VERSION;
  readonly model: string;
  private readonly apiKey: string;
  private readonly enabled: boolean;
  private readonly fetcher: typeof fetch;

  constructor(options: OpenAIObservationProviderOptions = {}) {
    this.model = options.model ?? config.openaiObservationModel;
    this.apiKey = options.apiKey ?? config.openaiApiKey;
    this.enabled = options.enabled ?? config.openaiObservationEnabled;
    this.fetcher = options.fetcher ?? fetch;
  }

  availability() {
    if (!this.enabled) return { available: false, reason: 'OpenAI observations are disabled; set OPENAI_OBSERVATION_ENABLED=true only after approving an API budget' };
    if (!this.apiKey) return { available: false, reason: 'OPENAI_API_KEY is not configured' };
    return { available: true };
  }

  async observeQuestion(input: Parameters<ObservationProvider['observeQuestion']>[0]): Promise<ObservationProviderResult> {
    if (!input.question.trim()) throw new ObservationProviderError('Question must not be empty', 'INVALID_QUESTION', false);
    const availability = this.availability();
    if (!availability.available) throw new ObservationProviderError(availability.reason ?? 'OpenAI provider unavailable', 'PROVIDER_DISABLED', false);

    const started = Date.now();
    let response: Response;
    try {
      response = await this.fetcher('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          instructions: input.systemInstruction,
          input: input.question,
          tools: [{ type: 'web_search' }],
          tool_choice: 'required',
          max_output_tokens: Number(input.generationParameters.maxOutputTokens ?? 3072),
        }),
        signal: AbortSignal.timeout(90_000),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const timedOut = /timeout|timed out|abort/i.test(message);
      throw new ObservationProviderError(message, timedOut ? 'TIMEOUT' : 'NETWORK_ERROR', !timedOut);
    }

    const payload = await response.json().catch(() => ({})) as OpenAIResponse;
    if (!response.ok) {
      const message = payload.error?.message ?? `OpenAI request failed with HTTP ${response.status}`;
      const retryable = response.status === 429 || response.status >= 500;
      throw new ObservationProviderError(message, response.status === 429 ? 'RATE_LIMITED' : 'OPENAI_API_ERROR', retryable);
    }

    const parsed = parseResponse(payload);
    if (!parsed.text.trim()) {
      throw new ObservationProviderError('OpenAI returned no answer text', 'EMPTY_RESPONSE', false);
    }

    const inputTokens = safeCount(payload.usage?.input_tokens);
    const outputTokens = safeCount(payload.usage?.output_tokens);
    const totalTokens = safeCount(payload.usage?.total_tokens)
      ?? (inputTokens !== null && outputTokens !== null ? inputTokens + outputTokens : null);
    const finishReason = payload.incomplete_details?.reason ?? (payload.status === 'completed' ? 'completed' : payload.status ?? null);

    return {
      provider: this.name,
      model: this.model,
      modelVersion: typeof payload.model === 'string' ? payload.model : null,
      providerResponseId: typeof payload.id === 'string' ? payload.id : null,
      rawResponse: parsed.text,
      observedAt: new Date().toISOString(),
      latencyMs: Date.now() - started,
      completeness: payload.status === 'incomplete' ? 'PARTIAL' : 'COMPLETE',
      finishReason,
      usage: { inputTokens, outputTokens, totalTokens },
      // Do not invent prices. Cost remains unavailable until a verified model rate is configured.
      estimatedCostUsd: null,
      citations: parsed.citations,
      metadata: {
        responseStatus: payload.status ?? null,
        webSearchRequired: true,
        citationCount: parsed.citations.length,
      },
    };
  }
}
