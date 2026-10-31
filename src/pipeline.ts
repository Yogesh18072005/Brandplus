// Reusable audit pipeline — callable from both CLI (run-audit.ts) and web API.
// Extracted from run-audit.ts so the same battle-tested logic powers both paths.

import type { AuditInput, BuyerPrompt, PromptResult } from './types';
import { assertApiKey, config } from './config';
import { getAdapter } from './engines/index';
import { parseAnswer } from './parse';
import { costCheckpoint, costSummary, currentUsdSince } from './cost';
import { sleep } from './gemini-client';
import { buildReport, type ReportData } from './scoring';

export interface PipelineCallbacks {
  onProgress?: (completed: number, total: number, result: PromptResult) => void | Promise<void>;
  onQuotaExhausted?: () => void;
}

const QUOTA_FAIL_LIMIT = 3;
const isQuotaMsg = (msg: string | undefined) => !!msg && /429|quota|RESOURCE_EXHAUSTED/i.test(msg);

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

export interface PipelineResult {
  input: AuditInput;
  results: PromptResult[];
  report: ReportData;
  costSummary: string;
  quotaExhausted: boolean;
}

export async function runAuditPipeline(
  input: AuditInput,
  prompts: BuyerPrompt[],
  callbacks?: PipelineCallbacks
): Promise<PipelineResult> {
  assertApiKey();
  const runCostCheckpoint = costCheckpoint();

  let quotaFailStreak = 0;
  let quotaTripped = false;

  function noteOutcome(result: PromptResult): PromptResult {
    if (result.error && isQuotaMsg(result.error)) {
      quotaFailStreak++;
      if (quotaFailStreak >= QUOTA_FAIL_LIMIT && !quotaTripped) {
        quotaTripped = true;
        callbacks?.onQuotaExhausted?.();
      }
    } else if (!result.error) {
      quotaFailStreak = 0;
    }
    return result;
  }

  async function runPrompt(prompt: BuyerPrompt, i: number): Promise<PromptResult> {
    const engineName = input.engines?.[0] ?? 'gemini';
    if (quotaTripped) {
      return { prompt, engine: engineName, answerText: '', citations: [], parsed: null, error: 'skipped: quota exhausted (circuit breaker)' };
    }
    if (currentUsdSince(runCostCheckpoint) * 100 >= config.runCostCapCents) {
      if (!quotaTripped) {
        quotaTripped = true;
        callbacks?.onQuotaExhausted?.();
      }
      return { prompt, engine: engineName, answerText: '', citations: [], parsed: null, error: 'skipped: run cost cap reached' };
    }

    const adapter = getAdapter(engineName);
    const availability = adapter.availability();
    if (!availability.available) {
      return { prompt, engine: engineName, answerText: '', citations: [], parsed: null, error: availability.reason ?? 'engine unavailable' };
    }
    if (i > 0) await sleep(config.promptDelayMs);

    const engineResult = await adapter.runPrompt(prompt.text, { city: input.city, category: input.category });
    if (engineResult.error || !engineResult.answerText) {
      return noteOutcome({ prompt, engine: engineName, answerText: '', citations: [], parsed: null, observedAt: engineResult.observedAt, execution: engineResult.execution, error: engineResult.error ?? 'empty answer' });
    }

    try {
      const parsed = await parseAnswer(input, engineResult);
      return noteOutcome({ prompt, engine: engineName, answerText: engineResult.answerText, citations: engineResult.citations, grounded: engineResult.grounded, observedAt: engineResult.observedAt, execution: engineResult.execution, parsed });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return noteOutcome({ prompt, engine: engineName, answerText: engineResult.answerText, citations: engineResult.citations, grounded: engineResult.grounded, observedAt: engineResult.observedAt, execution: engineResult.execution, parsed: null, error: `parser: ${msg}` });
    }
  }

  let completed = 0;
  const results = await mapLimit(prompts, config.concurrency, async (p, i) => {
    const r = await runPrompt(p, i);
    completed++;
    await callbacks?.onProgress?.(completed, prompts.length, r);
    return r;
  });

  const report = buildReport(input, results);

  return {
    input,
    results,
    report,
    costSummary: costSummary(runCostCheckpoint),
    quotaExhausted: quotaTripped,
  };
}
