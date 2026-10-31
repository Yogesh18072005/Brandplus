// Shared Gemini client + call helper with timeout and retry/backoff.
//
// Uses the Interactions API (client.interactions.create) — the current
// recommended surface of @google/genai; generateContent is legacy.
//
// Retry policy: the SDK's OWN retries are disabled (strategy 'none') because
// its internal retry re-sends an already-consumed request body, which blows
// up as "TypeError: unusable". We own retries here instead, rebuilding the
// request params fresh on every attempt. Timeouts use the SDK's timeout_ms
// (an aborted fetch), not Promise.race — a lost race leaves a dangling timer
// that later throws as an unhandled rejection and kills the process.
//
// NOTE: on the AI Studio FREE tier, prompts/responses may be used by Google
// to improve products (training). Fine for this tool — audit queries are
// generic buyer questions with no client-confidential content — but flagging
// it as CLAUDE.md requires. Revisit if that ever changes.

import { GoogleGenAI } from '@google/genai';
import { config } from './config';
import { recordCall, usdForTokens } from './cost';
import { assertUnderGlobalCap, addCallSpendUsd, GlobalSpendCapError } from './spend-ledger';

let client: GoogleGenAI | null = null;

export function gemini(): GoogleGenAI {
  if (!client) client = new GoogleGenAI({ apiKey: config.googleApiKey });
  return client;
}

// The SDK's Interaction type; kept loose because we read optional fields defensively.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Interaction = any;

interface CreateOpts {
  kind: string; // for cost logging, e.g. 'engine:gemini' | 'parser'
  model: string;
  input: string;
  systemInstruction?: string;
  tools?: unknown[];
  responseFormat?: unknown;
  // Cost levers: thinking tokens bill as OUTPUT tokens (the expensive
  // direction), so callers default to minimal thinking; output caps stop
  // runaway generations. Set via generationConfig.
  generationConfig?: { thinking_level?: string; temperature?: number; max_output_tokens?: number };
  retries?: number; // override config.maxRetries (0 = single attempt)
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|RESOURCE_EXHAUSTED|quota/i.test(msg);
}

function isRetryable(err: unknown): boolean {
  // Global spend cap is terminal — never retry (retrying would try to spend more).
  if (err instanceof GlobalSpendCapError) return false;
  if (isQuotaError(err)) return true; // 429 — worth waiting out
  const msg = err instanceof Error ? err.message : String(err);
  // Non-retryable client errors (4xx other than 429): retrying re-bills for the
  // same guaranteed failure. Never re-call on these.
  if (/\b(400|401|403|404|422)\b|INVALID_ARGUMENT|PERMISSION_DENIED|UNAUTHENTICATED|NOT_FOUND/i.test(msg)) {
    return false;
  }
  // Transient server/network errors — safe to retry.
  return /\b(500|502|503|504)\b|UNAVAILABLE|timed? ?out|fetch failed|ECONN|unusable/i.test(msg);
}

/**
 * thinking_level is a Gemini 3+ setting; 2.x models reject the whole
 * generation_config when it's present, costing a failed round-trip per call.
 */
export function generationConfigFor<T extends Record<string, unknown>>(model: string, generationConfig: T): Partial<T> {
  if (!/^gemini-[12]\./.test(model) || !('thinking_level' in generationConfig)) return generationConfig;
  const { thinking_level: _omit, ...rest } = generationConfig;
  return rest as Partial<T>;
}

/** One Interactions API call with per-call timeout and retry+backoff. */
export async function geminiCall(opts: CreateOpts): Promise<Interaction> {
  const maxRetries = opts.retries ?? config.maxRetries;
  // GLOBAL kill-switch: refuse to spend if the cumulative ₹ cap is already hit.
  // Throws a non-retryable GlobalSpendCapError that halts the run.
  assertUnderGlobalCap();
  // If generation_config is rejected by a model (older models may not accept
  // thinking_level), retry once without it rather than failing the call.
  let stripGenerationConfig = false;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Build params fresh EVERY attempt — never reuse a request object that
      // the SDK may already have serialized/consumed.
      const params: Record<string, unknown> = {
        model: opts.model,
        input: opts.input,
        // Don't ask Google to store interactions server-side; we keep our own raw copies.
        store: false,
      };
      if (opts.systemInstruction) params.system_instruction = opts.systemInstruction;
      if (opts.tools) params.tools = opts.tools;
      if (opts.responseFormat) params.response_format = opts.responseFormat;
      if (opts.generationConfig && !stripGenerationConfig) params.generation_config = generationConfigFor(opts.model, opts.generationConfig);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const interaction = (await (gemini() as any).interactions.create(params, {
        timeout_ms: config.callTimeoutMs,
        maxRetries: 0,
        retries: { strategy: 'none' }, // we handle retries ourselves (see header)
      })) as Interaction;

      const inputTokens = interaction?.usage?.total_input_tokens ?? 0;
      const outputTokens = interaction?.usage?.total_output_tokens ?? 0;
      recordCall({ kind: opts.kind, model: opts.model, inputTokens, outputTokens, cached: false });
      // Add this live call's estimated cost to the persistent global ledger.
      addCallSpendUsd(usdForTokens(opts.model, inputTokens, outputTokens));
      return interaction;
    } catch (err) {
      lastErr = err;
      const errObj = err as { usage?: { total_input_tokens?: number; total_output_tokens?: number }; interaction?: { usage?: { total_input_tokens?: number; total_output_tokens?: number } } };
      const partialUsage = errObj?.usage ?? errObj?.interaction?.usage;
      const inputTokens = partialUsage?.total_input_tokens ?? 0;
      const outputTokens = partialUsage?.total_output_tokens ?? 0;
      const usageUnavailable = !partialUsage;
      recordCall({
        kind: opts.kind,
        model: opts.model,
        inputTokens,
        outputTokens,
        cached: false,
        usageUnavailable,
        failed: true,
      });
      if (inputTokens > 0 || outputTokens > 0) {
        addCallSpendUsd(usdForTokens(opts.model, inputTokens, outputTokens));
      }

      const msg = err instanceof Error ? err.message : String(err);
      if (
        !stripGenerationConfig &&
        opts.generationConfig &&
        /INVALID_ARGUMENT|invalid|unsupported|unknown field|thinking/i.test(msg) &&
        !isQuotaError(err)
      ) {
        console.warn(`  generation_config rejected by ${opts.model} — retrying without it`);
        stripGenerationConfig = true;
        attempt--; // free retry, different request shape
        continue;
      }
      if (attempt < maxRetries && isRetryable(err)) {
        // Quota/429s need long waits (per-minute windows), not quick retries
        // that just burn more quota. Other transient errors back off fast.
        const backoff = isQuotaError(err) ? 15000 * (attempt + 1) : 2000 * Math.pow(3, attempt);
        console.warn(
          `  retryable error (attempt ${attempt + 1}/${maxRetries + 1}): ${String(err)} — waiting ${backoff}ms`
        );
        await sleep(backoff);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}
