// Dev cache: LLM responses keyed by (engine, prompt) with a freshness window
// (CACHE_TTL_DAYS, default 7) so re-runs and quota-interrupted resumes don't
// re-bill — including resumes on a later day. Plain files under .cache/.
//
// (Originally keyed per-day per CLAUDE.md §7; widened after a real audit hit
// daily quota mid-run — a next-day resume must reuse the answers already paid
// for. Set CACHE_TTL_DAYS=0 to force fresh calls.)

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const CACHE_DIR = path.resolve('.cache');
const TTL_DAYS = Number(process.env.CACHE_TTL_DAYS ?? '7');

interface Envelope<T> {
  savedAt: string; // ISO-8601
  value: T;
}

function keyFor(engine: string, prompt: string): string {
  return createHash('sha1').update(`${engine}|${prompt}`).digest('hex');
}

// Pre-TTL entries were keyed with the day baked in; check those too so
// answers cached before this change aren't lost.
function legacyKeyFor(engine: string, prompt: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return createHash('sha1').update(`${engine}|${prompt}|${day}`).digest('hex');
}

function readJson<T>(file: string): T | null {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T;
  } catch {
    return null; // corrupt cache entry — treat as miss
  }
}

export function cacheGet<T>(engine: string, prompt: string): T | null {
  const envelope = readJson<Envelope<T>>(path.join(CACHE_DIR, `${keyFor(engine, prompt)}.json`));
  if (envelope && envelope.savedAt !== undefined) {
    const ageDays = (Date.now() - new Date(envelope.savedAt).getTime()) / 86_400_000;
    return ageDays <= TTL_DAYS ? envelope.value : null;
  }
  // Legacy same-day entry (raw value, day-keyed → inherently fresh today).
  return readJson<T>(path.join(CACHE_DIR, `${legacyKeyFor(engine, prompt)}.json`));
}

export function cacheSet(engine: string, prompt: string, value: unknown): void {
  mkdirSync(CACHE_DIR, { recursive: true });
  const envelope: Envelope<unknown> = { savedAt: new Date().toISOString(), value };
  writeFileSync(
    path.join(CACHE_DIR, `${keyFor(engine, prompt)}.json`),
    JSON.stringify(envelope, null, 2),
    'utf8'
  );
}
