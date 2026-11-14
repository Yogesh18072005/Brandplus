import dotenv from 'dotenv';
import type { EngineName } from './types';

// .env.local wins over .env; neither is committed.
dotenv.config({ path: '.env.local' });
dotenv.config();

function env(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.trim() !== '' ? v.trim() : fallback;
}

const DEFAULT_MODEL = 'gemini-3.5-flash';

export const config = {
  googleApiKey: process.env.GOOGLE_API_KEY?.trim() ?? '',
  openaiApiKey: process.env.OPENAI_API_KEY?.trim() ?? '',
  openaiObservationEnabled: env('OPENAI_OBSERVATION_ENABLED', 'false') === 'true',
  openaiObservationModel: env('OPENAI_OBSERVATION_MODEL', 'gpt-6-astra'),
  buyerIntentProvider: env('BUYER_INTENT_PROVIDER', 'ollama').toLowerCase(),
  ollamaBaseUrl: env('OLLAMA_BASE_URL', 'http://127.0.0.1:11434').replace(/\/$/, ''),
  ollamaModel: env('OLLAMA_MODEL', 'qwen2.5:3b'),
  ollamaTimeoutMs: Number(env('OLLAMA_TIMEOUT_MS', '120000')),

  // All swappable via env — this space changes weekly.
  engineModel: env('ENGINE_MODEL', DEFAULT_MODEL),
  parserModel: env('PARSER_MODEL', DEFAULT_MODEL),
  promptgenModel: env('PROMPTGEN_MODEL', DEFAULT_MODEL),
  interventionModel: env('INTERVENTION_MODEL', DEFAULT_MODEL),

  engines: ['gemini'] as EngineName[], // only Gemini is live in v0
  promptCount: Number(env('PROMPT_COUNT', '40')),

  // Google Search grounding can require a paid quota. Keep it off by default
  // so free-tier keys can run audits without repeated 429 grounding errors.
  // Set ENGINE_GROUNDING=true only when grounding quota is available.
  engineGrounding: env('ENGINE_GROUNDING', 'false') === 'true',

  // Resilience knobs (M4 hardens these further).
  // Free-tier RPM limits are tight → single-file requests + a pause between prompts.
  concurrency: Number(env('CONCURRENCY', '1')),
  promptDelayMs: Number(env('PROMPT_DELAY_MS', '2000')),
  callTimeoutMs: Number(env('CALL_TIMEOUT_MS', '90000')),
  maxRetries: Number(env('MAX_RETRIES', '2')),

  // Cost controls. freeTier=true → actual spend is ₹0 (estimates still shown).
  freeTier: env('FREE_TIER', 'true') !== 'false',
  usdInr: Number(env('USD_INR', '90')),

  // PER-RUN cap: aborts a single audit that would exceed this (mid-run safety net).
  runCostCapCents: Number(env('RUN_COST_CAP_CENTS', '30')), // ~₹27 per run, generous vs ~₹10 expected

  // GLOBAL kill-switch: cumulative estimated spend across ALL runs (persisted in
  // .spend/ledger.json). Every API call hard-stops once this ₹ cap is hit.
  // Founder balance is ₹1,000 prepaid; default cap ₹1000 matches prepaid balance.
  maxTotalSpendInr: Number(env('MAX_TOTAL_SPEND_INR', '1000')),
};

export function assertApiKey(): void {
  if (!config.googleApiKey) {
    console.error(
      'Missing GOOGLE_API_KEY. Get a free key at https://aistudio.google.com/apikey and paste it into .env.local'
    );
    process.exit(1);
  }
}
