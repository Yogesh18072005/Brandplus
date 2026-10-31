// COGS tracking (CLAUDE.md §2.4, §7; brief §2.5). Estimates use real paid-tier
// rates so the founder always knows what an audit WOULD cost — on the free
// tier the actual charge is ₹0, and the summary says so.
//
// Rates are USD per 1M tokens, verified 2026-07-02 from ai.google.dev pricing.
// flash-lite rate not published on the page we could verify — conservative
// placeholder, override via RATES_JSON env if needed.

import { config } from './config';

interface Rate {
  inputPer1M: number; // USD
  outputPer1M: number; // USD
}

const DEFAULT_RATES: Record<string, Rate> = {
  'gemini-2.5-flash': { inputPer1M: 0.3, outputPer1M: 2.5 },
  'gemini-3.5-flash': { inputPer1M: 1.5, outputPer1M: 9.0 },
  'gemini-2.5-flash-lite': { inputPer1M: 0.1, outputPer1M: 0.4 }, // placeholder — verify before paid use
};

function loadRates(): Record<string, Rate> {
  const raw = process.env.RATES_JSON;
  if (!raw) return DEFAULT_RATES;
  try {
    return { ...DEFAULT_RATES, ...(JSON.parse(raw) as Record<string, Rate>) };
  } catch {
    console.warn('RATES_JSON is not valid JSON — using default rates');
    return DEFAULT_RATES;
  }
}

const RATES = loadRates();
const FALLBACK_RATE: Rate = { inputPer1M: 1.5, outputPer1M: 9.0 }; // assume worst-case Flash

export interface CallRecord {
  kind: string; // 'engine:gemini' | 'parser' | 'promptgen' | 'preflight'
  model: string;
  inputTokens: number;
  outputTokens: number;
  cached: boolean;
  usageUnavailable?: boolean;
  failed?: boolean;
}

const calls: CallRecord[] = [];

export function recordCall(rec: CallRecord): void {
  calls.push(rec);
}

/** USD cost of a given token count on a given model. */
export function usdForTokens(model: string, inputTokens: number, outputTokens: number): number {
  const r = RATES[model] ?? FALLBACK_RATE;
  return (inputTokens / 1e6) * r.inputPer1M + (outputTokens / 1e6) * r.outputPer1M;
}

function usdFor(rec: CallRecord): number {
  return usdForTokens(rec.model, rec.inputTokens, rec.outputTokens);
}

// Typical token footprints per call kind — used ONLY for the pre-run estimate
// (no API involved). Derived from observed M0 runs; deliberately a little high
// so the preflight over-estimates rather than under-estimates.
const ESTIMATE_TOKENS: Record<string, { in: number; out: number }> = {
  'engine:gemini': { in: 350, out: 900 }, // grounded answer — the expensive call
  parser: { in: 1200, out: 220 }, // reads the answer, extracts brands — cheap
  promptgen: { in: 320, out: 1800 }, // one call makes ~40 questions
};

/** Estimated USD for one not-yet-made call of a given kind (for the preflight). */
export function estimateCallUsd(kind: 'engine:gemini' | 'parser' | 'promptgen', model: string): number {
  const t = ESTIMATE_TOKENS[kind] ?? { in: 500, out: 800 };
  return usdForTokens(model, t.in, t.out);
}

/** Estimated spend (USD) of live calls made in this process so far. */
export function currentRunUsd(): number {
  return calls.filter((c) => !c.cached).reduce((s, c) => s + usdFor(c), 0);
}

/** Index used to isolate one audit when a persistent worker processes many jobs. */
export function costCheckpoint(): number {
  return calls.length;
}

export function currentUsdSince(checkpoint: number): number {
  return calls.slice(checkpoint).filter((c) => !c.cached).reduce((sum, call) => sum + usdFor(call), 0);
}

export function costSummary(checkpoint = 0): string {
  const scopedCalls = calls.slice(checkpoint);
  const live = scopedCalls.filter((c) => !c.cached);
  const cachedCount = scopedCalls.length - live.length;
  const inputTokens = live.reduce((s, c) => s + c.inputTokens, 0);
  const outputTokens = live.reduce((s, c) => s + c.outputTokens, 0);
  const usd = live.reduce((sum, call) => sum + usdFor(call), 0);
  const cents = Math.round(usd * 10000) / 100;
  const inr = Math.round(usd * config.usdInr * 100) / 100;
  const tierNote = config.freeTier ? ' — free tier, actual charge ₹0' : '';
  return (
    `Cost: ${live.length} live API calls (${cachedCount} from cache), ` +
    `${inputTokens.toLocaleString()} in / ${outputTokens.toLocaleString()} out tokens, ` +
    `est. ${cents}¢ ≈ ₹${inr}${tierNote}`
  );
}
