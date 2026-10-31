// GLOBAL spend ledger — a persistent cumulative estimate of money spent across
// ALL runs (not just the current one). Lives in .spend/ledger.json (gitignored).
//
// Every live API call routes through gemini-client, which (a) refuses to spend
// once cumulative ≥ the ₹ cap and (b) adds each call's estimated cost here. The
// cap is MAX_TOTAL_SPEND_INR (default ₹300). This is the last line of defense
// protecting the founder's ₹1,000 prepaid balance from a runaway loop.
//
// NOTE: on serverless (Vercel cron) the filesystem is ephemeral, so this file
// resets each cold start. The cron path therefore ALSO enforces the same ₹ cap
// from the database (sum of audits.cost_estimate_cents) — see process-queue.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { config } from './config';

const LEDGER_DIR = path.resolve('.spend');
const LEDGER_FILE = path.join(LEDGER_DIR, 'ledger.json');

/** Thrown when the global cap is hit. Non-retryable — must halt, never re-call. */
export class GlobalSpendCapError extends Error {
  readonly nonRetryable = true;
  constructor(message: string) {
    super(message);
    this.name = 'GlobalSpendCapError';
  }
}

interface Ledger {
  cumulativeUsd: number;
  updatedAt: string;
  history: { at: string; usd: number; label?: string }[];
}

function load(): Ledger {
  try {
    if (existsSync(LEDGER_FILE)) {
      const parsed = JSON.parse(readFileSync(LEDGER_FILE, 'utf8')) as Partial<Ledger>;
      return {
        cumulativeUsd: Number(parsed.cumulativeUsd) || 0,
        updatedAt: parsed.updatedAt ?? new Date().toISOString(),
        history: Array.isArray(parsed.history) ? parsed.history : [],
      };
    }
  } catch {
    /* corrupt/unreadable → start fresh below */
  }
  return { cumulativeUsd: 0, updatedAt: new Date().toISOString(), history: [] };
}

// Loaded once per process; incremented in memory and persisted after each call.
let state: Ledger | null = null;
function ledger(): Ledger {
  if (!state) state = load();
  return state;
}

function persist(): void {
  try {
    mkdirSync(LEDGER_DIR, { recursive: true });
    writeFileSync(LEDGER_FILE, JSON.stringify(ledger(), null, 2), 'utf8');
  } catch (err) {
    // Ephemeral FS (serverless) — the DB cap covers that path. Don't crash a run
    // just because we couldn't write the local ledger.
    console.warn('[spend] could not persist ledger:', err instanceof Error ? err.message : err);
  }
}

export function capUsd(): number {
  return config.maxTotalSpendInr / config.usdInr;
}

export function cumulativeUsd(): number {
  return ledger().cumulativeUsd;
}

export function cumulativeInr(): number {
  return cumulativeUsd() * config.usdInr;
}

export function remainingInr(): number {
  return Math.max(0, config.maxTotalSpendInr - cumulativeInr());
}

/** True once the global cap is reached. */
export function isOverGlobalCap(): boolean {
  return cumulativeUsd() >= capUsd();
}

/** Throw (non-retryable) if the global cap is already reached — call BEFORE spending. */
export function assertUnderGlobalCap(): void {
  if (isOverGlobalCap()) {
    throw new GlobalSpendCapError(
      `GLOBAL SPEND CAP HIT — cumulative est. ₹${cumulativeInr().toFixed(2)} ≥ cap ₹${config.maxTotalSpendInr}. ` +
        `No further API calls will be made. Raise MAX_TOTAL_SPEND_INR or reset .spend/ledger.json to continue.`
    );
  }
}

/** Add one call's estimated USD cost to the cumulative total and persist. */
export function addCallSpendUsd(usd: number): void {
  if (!(usd > 0)) return;
  const l = ledger();
  l.cumulativeUsd += usd;
  l.updatedAt = new Date().toISOString();
  persist();
}

/** Append a per-run summary line (informational; does NOT change cumulative). */
export function appendRunHistory(usd: number, label?: string): void {
  const l = ledger();
  l.history.push({ at: new Date().toISOString(), usd, label });
  if (l.history.length > 200) l.history = l.history.slice(-200);
  persist();
}
