import type { ObservationProvider, ObservationProviderResult, ObservedProviderError } from './types';

export class ObservationProviderError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'ObservationProviderError';
  }
}

export function normalizeProviderError(error: unknown): ObservedProviderError {
  const message = error instanceof Error ? error.message : String(error);
  const declared = error instanceof ObservationProviderError ? error : null;
  const rateLimited = /\b429\b|RESOURCE_EXHAUSTED|rate.?limit|quota/i.test(message);
  const timedOut = /timed? ?out|timeout|deadline/i.test(message);
  const transient = /\b(500|502|503|504)\b|UNAVAILABLE|fetch failed|ECONN|network/i.test(message);
  const retryable = declared?.retryable ?? (rateLimited || timedOut || transient);
  return {
    code: declared?.code ?? (rateLimited ? 'RATE_LIMITED' : timedOut ? 'TIMEOUT' : transient ? 'TRANSIENT_PROVIDER_ERROR' : 'PROVIDER_ERROR'),
    message: message.slice(0, 2_000),
    retryable,
    completeness: timedOut ? 'INCONCLUSIVE' : 'FAILED',
  };
}

export async function observeWithRetries(
  provider: ObservationProvider,
  input: Parameters<ObservationProvider['observeQuestion']>[0],
  options: { maxRetries: number; baseDelayMs: number; sleep?: (milliseconds: number) => Promise<void> },
): Promise<ObservationProviderResult> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= options.maxRetries; attempt += 1) {
    try {
      return await provider.observeQuestion(input);
    } catch (error) {
      lastError = error;
      const normalized = normalizeProviderError(error);
      if (!normalized.retryable || attempt === options.maxRetries) throw error;
      const delay = Math.min(30_000, options.baseDelayMs * 2 ** attempt);
      await (options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms))))(delay);
    }
  }
  throw lastError;
}
