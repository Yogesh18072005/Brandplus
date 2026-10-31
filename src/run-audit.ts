// Audit CLI — end-to-end slice (CLAUDE.md §9).
// Business (still hardcoded in M1) → Gemini (Search-grounded) → parse →
// presence rate printed + full results dumped to ./data/ for inspection.
//
//   npm run audit                                  # default: 5 hardcoded prompts
//   npm run audit -- --prompts data/prompts-…json  # use generated prompts (M1)

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import type { AuditInput, BuyerPrompt, PromptResult } from './types';
import { assertApiKey, config } from './config';
import { getAdapter } from './engines/index';
import { parseAnswer } from './parse';
import { costSummary, currentRunUsd, estimateCallUsd } from './cost';
import { sleep } from './gemini-client';
import { buildReport, matchTrackedCompetitor } from './scoring';
import { preflightEstimate } from './preflight';
import {
  cumulativeInr,
  remainingInr,
  isOverGlobalCap,
  appendRunHistory,
} from './spend-ledger';

// Default business (CLAUDE.md §10 example). Override with --business <file.json>
// for a real audit. Reassigned in main() when --business is passed.
let input: AuditInput = {
  businessName: 'Nova Dental Studio',
  website: 'novadental.in',
  category: 'cosmetic dentistry',
  city: 'Delhi',
  competitors: [
    { name: 'Smile Design Clinic' },
    { name: 'Clove Dental' },
    { name: "Dr. Batra's" },
  ],
};

/** Load an AuditInput from a JSON file (--business), validating the essentials. */
function loadBusinessFile(file: string): AuditInput {
  const raw = JSON.parse(readFileSync(path.resolve(file), 'utf8')) as Partial<AuditInput>;
  if (!raw.businessName || !raw.website || !raw.category || !raw.city) {
    throw new Error(`${file} must include businessName, website, category, city`);
  }
  return {
    businessName: raw.businessName,
    website: raw.website,
    category: raw.category,
    city: raw.city,
    aliases: raw.aliases,
    competitors: Array.isArray(raw.competitors) ? raw.competitors : [],
  };
}

const DEFAULT_PROMPTS: BuyerPrompt[] = [
  { text: 'best cosmetic dentist in Delhi', intent: 'direct_best' },
  { text: 'where to get veneers in Delhi', intent: 'need_specific' },
  { text: 'affordable teeth whitening in Delhi', intent: 'budget' },
  { text: 'top rated dental clinic in South Delhi', intent: 'location_refined' },
  { text: 'Invisalign clinic in Delhi and cost', intent: 'need_specific' },
];

// Set in main(): either DEFAULT_PROMPTS or a generated file via --prompts.
let prompts: BuyerPrompt[] = DEFAULT_PROMPTS;

/** Load prompts from a gen-prompts output file ({prompts: [...]}) or a bare array. */
function loadPromptFile(file: string): BuyerPrompt[] {
  const raw = JSON.parse(readFileSync(path.resolve(file), 'utf8')) as
    | BuyerPrompt[]
    | { prompts?: BuyerPrompt[] };
  const list = Array.isArray(raw) ? raw : (raw.prompts ?? []);
  const valid = list.filter(
    (p): p is BuyerPrompt => typeof p?.text === 'string' && p.text.trim() !== ''
  );
  if (valid.length === 0) throw new Error(`No prompts found in ${file}`);
  return valid.map((p) => ({ text: p.text, intent: p.intent ?? 'unknown' }));
}

/** Run fn over items with at most `limit` in flight. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!, i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// Circuit breaker: once this many consecutive prompts fail on quota errors,
// the daily/per-minute quota is clearly exhausted — stop burning retries.
// Everything that succeeded is cached, so a later re-run resumes for free.
const QUOTA_FAIL_LIMIT = 3;
let quotaFailStreak = 0;
let quotaTripped = false;

const isQuotaMsg = (msg: string | undefined) => !!msg && /429|quota|RESOURCE_EXHAUSTED/i.test(msg);
const isSpendCapMsg = (msg: string | undefined) => !!msg && /GLOBAL SPEND CAP/i.test(msg);

function noteOutcome(result: PromptResult): PromptResult {
  // Global spend cap → stop immediately (not after N strikes). Cached answers
  // are preserved on disk, so a later resume won't re-bill them.
  if (isSpendCapMsg(result.error)) {
    if (!quotaTripped) {
      quotaTripped = true;
      console.error(
        `\n⛔ ${result.error}\n   Stopping now — completed answers are cached and won't be re-billed on resume.\n`
      );
    }
    return result;
  }
  if (result.error && isQuotaMsg(result.error)) {
    quotaFailStreak++;
    if (quotaFailStreak >= QUOTA_FAIL_LIMIT && !quotaTripped) {
      quotaTripped = true;
      console.warn(
        `\n⚠ ${QUOTA_FAIL_LIMIT} consecutive quota failures — stopping API calls. ` +
          'Completed answers are cached; re-run the same command after quota resets to resume.\n'
      );
    }
  } else if (!result.error) {
    quotaFailStreak = 0;
  }
  return result;
}

async function runPrompt(prompt: BuyerPrompt, i: number): Promise<PromptResult> {
  if (quotaTripped) {
    return { prompt, engine: 'gemini', answerText: '', citations: [], parsed: null, error: 'skipped: quota exhausted (circuit breaker)' };
  }
  // Spend cap (paid-tier safety net): stop before exceeding RUN_COST_CAP_CENTS.
  if (currentRunUsd() * 100 >= config.runCostCapCents) {
    if (!quotaTripped) {
      quotaTripped = true;
      console.warn(`\n⚠ Run cost cap reached (${config.runCostCapCents}¢) — stopping. Raise RUN_COST_CAP_CENTS to continue.\n`);
    }
    return { prompt, engine: 'gemini', answerText: '', citations: [], parsed: null, error: 'skipped: run cost cap reached' };
  }
  const adapter = getAdapter('gemini');
  if (i > 0) await sleep(config.promptDelayMs); // pace requests — free-tier RPM is tight
  console.log(`[${i + 1}/${prompts.length}] asking: "${prompt.text}"`);

  const engineResult = await adapter.runPrompt(prompt.text, { city: input.city, category: input.category });
  if (engineResult.error || !engineResult.answerText) {
    console.warn(`  engine failed: ${engineResult.error ?? 'empty answer'}`);
    return noteOutcome({ prompt, engine: 'gemini', answerText: '', citations: [], parsed: null, error: engineResult.error ?? 'empty answer' });
  }

  try {
    const parsed = await parseAnswer(input, engineResult);
    return noteOutcome({ prompt, engine: 'gemini', answerText: engineResult.answerText, citations: engineResult.citations, grounded: engineResult.grounded, parsed });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`  parser failed: ${msg}`);
    return noteOutcome({ prompt, engine: 'gemini', answerText: engineResult.answerText, citations: engineResult.citations, grounded: engineResult.grounded, parsed: null, error: `parser: ${msg}` });
  }
}

function printResults(results: PromptResult[]): void {
  const ok = results.filter((r) => r.parsed);
  // Present iff mention_type isn't "absent" (categorical source of truth).
  const mentioned = ok.filter((r) => r.parsed!.mention_type !== 'absent');

  console.log('\n════════════════════════════════════════════════════════');
  console.log(`AI VISIBILITY — ${input.businessName} (${input.category}, ${input.city})`);
  console.log('════════════════════════════════════════════════════════\n');

  for (const r of results) {
    console.log(`Q: ${r.prompt.text}`);
    if (!r.parsed) {
      console.log(`   ✗ error: ${r.error}\n`);
      continue;
    }
    const p = r.parsed;
    // Present iff mention_type isn't "absent" (the categorical source of truth).
    const flag = p.mention_type !== 'absent' ? '✓ MENTIONED' : '✗ ABSENT';
    console.log(`   ${flag}  (${p.mention_type}${p.brand_rank ? `, rank ${p.brand_rank}` : ''}${p.brand_cited ? ', site cited' : ''})`);
    const tracked = p.competitors_mentioned.filter((c) => c.is_tracked_competitor).map((c) => c.name);
    if (tracked.length) console.log(`   competitors in answer: ${tracked.join(', ')}`);
    if (p.evidence_quote) console.log(`   evidence: "${p.evidence_quote}"`);
    if (r.citations.length) {
      const domains = [...new Set(r.citations.map((c) => c.domain))].slice(0, 8);
      console.log(`   sources: ${domains.join(', ')}`);
    } else if (r.grounded === false) {
      console.log('   sources: unavailable (ungrounded mode)');
    }
    console.log('');
  }

  console.log('────────────────────────────────────────────────────────');
  if (ok.length === 0) {
    console.log('No prompts succeeded — cannot compute presence rate.');
  } else {
    const rate = mentioned.length / ok.length;
    console.log(
      `PRESENCE RATE: ${input.businessName} appears in ${mentioned.length} of ${ok.length} AI answers (${Math.round(rate * 100)}%)`
    );
    for (const comp of input.competitors) {
      // Use the same safe fuzzy matcher as scoring (handles missing/junk names).
      const compCount = ok.filter((r) =>
        r.parsed!.competitors_mentioned.some(
          (c) => matchTrackedCompetitor(c.name, input.competitors)?.name === comp.name
        )
      ).length;
      console.log(`  vs ${comp.name}: ${compCount} of ${ok.length}`);
    }
    if (results.length !== ok.length) {
      console.log(`  note: ${results.length - ok.length} prompt(s) failed — partial data`);
      const skipped = results.filter((r) => r.error?.startsWith('skipped:')).length;
      if (skipped > 0) {
        console.log(`  note: ${skipped} prompt(s) skipped after quota exhausted — re-run the same command later to resume (completed answers are cached)`);
      }
    }
    if (results.some((r) => r.grounded === false)) {
      console.log('  note: answers were UNGROUNDED (no Google Search) — citations unavailable');
    }
  }
  console.log('────────────────────────────────────────────────────────');
  console.log(costSummary());
}

/** Task 8 — plain-language money-flow explanation (~10 lines) shown before the estimate. */
function printMoneyFlowExplanation(): void {
  const engineInr = (estimateCallUsd('engine:gemini', config.engineModel) * config.usdInr).toFixed(2);
  const parserInr = (estimateCallUsd('parser', config.parserModel) * config.usdInr).toFixed(3);
  console.log('─────────────────────────────────────────────────────────────');
  console.log('HOW THIS AUDIT SPENDS MONEY (plain version)');
  console.log('─────────────────────────────────────────────────────────────');
  console.log(`1. An audit asks 40 buyer questions. Each question = up to 2 paid AI calls.`);
  console.log(`2. Call A — the "grounded answer": ${config.engineModel} reads the question,`);
  console.log(`   searches Google, and writes an answer. This is the expensive one (~₹${engineInr}).`);
  console.log(`3. The Google search itself is free on the paid tier (1,500/day free), so ₹0 there.`);
  console.log(`4. Call B — the "parse": a cheap model (${config.parserModel}) reads that answer`);
  console.log(`   and extracts which brands were named. Tiny (~₹${parserInr}).`);
  console.log(`5. Cached calls cost ₹0: if we already asked a question, we reuse the saved answer.`);
  console.log(`   That's why the FIRST run costs the most and re-runs are almost free.`);
  console.log(`6. So a fresh 40-question audit ≈ 40 × (₹${engineInr} + ₹${parserInr}) ≈ a rupee or two.`);
  console.log(`7. Nothing is charged until you pass --confirm. Global cap: ₹${config.maxTotalSpendInr}.`);
  console.log('');
}

/** Task 7 — per-prompt commentary in --verbose mode. deltaUsd = this prompt's live spend. */
function printVerbose(result: PromptResult, deltaUsd: number): void {
  const grounding =
    result.grounded === true ? 'search fired'
    : result.grounded === false ? 'ungrounded fallback (no search)'
    : 'from cache';
  const answer = (result.answerText || '').replace(/\s+/g, ' ').trim();
  const summary = answer ? `${answer.slice(0, 100)}${answer.length > 100 ? '…' : ''}` : '(no answer)';
  const costTag = deltaUsd <= 0 ? 'cache hit → ₹0' : `live → ₹${(deltaUsd * config.usdInr).toFixed(3)}`;

  console.log(`   ├ grounding: ${grounding}`);
  console.log(`   ├ answer:    ${summary}`);
  if (result.parsed) {
    const brands = result.parsed.competitors_mentioned
      .filter((c) => c.is_tracked_competitor)
      .map((c) => c.name);
    const brandLine = result.parsed.brand_mentioned
      ? `mentioned (${result.parsed.mention_type})`
      : 'ABSENT';
    console.log(`   ├ brand:     ${brandLine}${brands.length ? ` · competitors: ${brands.join(', ')}` : ''}`);
  } else if (result.error) {
    console.log(`   ├ error:     ${result.error}`);
  }
  console.log(`   └ cost:      ${costTag}`);
}

/** Task 5 — this run's cost, cumulative total, remaining budget. */
function printBudgetSummary(): void {
  const runInr = currentRunUsd() * config.usdInr;
  console.log('─────────────────────────────────────────────────────────────');
  console.log(`This run:        ₹${runInr.toFixed(3)}`);
  console.log(`Cumulative:      ₹${cumulativeInr().toFixed(2)} of ₹${config.maxTotalSpendInr} global cap`);
  console.log(`Remaining budget: ₹${remainingInr().toFixed(2)}`);
  console.log('─────────────────────────────────────────────────────────────');
}

async function main() {
  // --prompts <file> (or bare positional path — PowerShell eats `--`);
  // --confirm to actually spend; --verbose for a per-prompt play-by-play.
  const { values, positionals } = parseArgs({
    options: {
      prompts: { type: 'string' },
      business: { type: 'string' },
      confirm: { type: 'boolean' },
      verbose: { type: 'boolean' },
    },
    allowPositionals: true,
  });
  assertApiKey();
  const verbose = !!values.verbose;

  if (values.business) {
    input = loadBusinessFile(values.business);
    console.log(`Business: ${input.businessName} (${input.website})`);
  }

  const promptFile = values.prompts ?? positionals[0];
  if (promptFile) {
    prompts = loadPromptFile(promptFile);
    console.log(`Loaded ${prompts.length} prompts from ${promptFile}`);
  }
  console.log(`Engine model: ${config.engineModel} | Parser model: ${config.parserModel}\n`);

  // ── Task 8 + Task 3: explanation, then the preflight estimate ──
  printMoneyFlowExplanation();
  const est = preflightEstimate(input, prompts);
  console.log('─────────────────────────────────────────────────────────────');
  console.log('PREFLIGHT ESTIMATE (no API calls made yet)');
  console.log('─────────────────────────────────────────────────────────────');
  console.log(
    `estimated cost: ₹${est.estInr.toFixed(2)}  (${est.liveCalls} live calls, ${est.cachedCalls} cached)`
  );
  console.log(
    `  · ${est.totalPrompts} prompts → engine: ${est.liveEngineCalls} live / ${est.cachedEngineCalls} cached · ` +
      `parse: ${est.liveParseCalls} live / ${est.cachedParseCalls} cached`
  );
  console.log(`  · already spent (all runs): ₹${cumulativeInr().toFixed(2)} · remaining budget: ₹${remainingInr().toFixed(2)}`);
  console.log('');

  // ── Global kill-switch: refuse before spending if already at the cap ──
  if (isOverGlobalCap()) {
    console.error(
      `⛔ Global spend cap ₹${config.maxTotalSpendInr} already reached (spent ₹${cumulativeInr().toFixed(2)}).\n` +
        `   Raise MAX_TOTAL_SPEND_INR or reset .spend/ledger.json to continue.`
    );
    process.exit(1);
  }
  if (est.estInr > remainingInr()) {
    console.warn(
      `⚠ This run's estimate (₹${est.estInr.toFixed(2)}) exceeds remaining budget (₹${remainingInr().toFixed(2)}).\n` +
        `  The run will hard-stop mid-way when the cap is hit; completed answers are cached.\n`
    );
  }

  // ── Task 3: require --confirm. No flag, no spend. ──
  if (!values.confirm) {
    console.log('This was a DRY RUN — no API calls, no spend.');
    console.log('To execute: re-run the same command with --confirm  (add --verbose for a play-by-play).');
    return;
  }

  const outDir = path.resolve('data');
  mkdirSync(outDir, { recursive: true });
  const partialFile = path.join(outDir, 'audit-in-progress.json');

  // Save incrementally after every prompt — a crash or quota wall must never
  // lose completed work again.
  const collected: PromptResult[] = [];
  const results = await mapLimit(prompts, config.concurrency, async (p, i) => {
    const before = currentRunUsd();
    const r = await runPrompt(p, i);
    if (verbose) printVerbose(r, currentRunUsd() - before);
    collected.push(r);
    writeFileSync(partialFile, JSON.stringify({ input, results: collected }, null, 2), 'utf8');
    return r;
  });

  // Record this run in the ledger history (informational; cumulative already
  // reflects per-call spend added inside gemini-client).
  appendRunHistory(currentRunUsd(), `${prompts.length}-prompt ${input.businessName}`);

  printResults(results);
  printBudgetSummary();

  // Dump everything for inspection (answers, citations, parsed JSON).
  const file = path.join(outDir, `audit-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  writeFileSync(file, JSON.stringify({ input, results }, null, 2), 'utf8');
  console.log(`\nFull results saved to ${file}`);

  // Also emit the §5.6 report contract — what the report page consumes.
  const report = buildReport(input, results);
  const reportFile = path.join(outDir, `report-${input.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`);
  writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf8');
  console.log(`Report contract saved to ${reportFile}`);
}

main().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
