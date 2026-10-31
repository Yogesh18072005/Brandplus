// Pre-run cost estimate — inspects the cache and estimates spend WITHOUT making
// a single API call. Powers the "--confirm" gate: the founder sees the number
// before any money can move.
//
// For each prompt an audit makes up to two paid calls: the grounded engine
// answer (expensive) and the parse (cheap). Either can already be cached (₹0).

import { cacheGet } from './cache';
import { config } from './config';
import { estimateCallUsd } from './cost';
import type { AuditInput, BuyerPrompt, EngineResult } from './types';

export interface PreflightEstimate {
  totalPrompts: number;
  liveEngineCalls: number;
  cachedEngineCalls: number;
  liveParseCalls: number;
  cachedParseCalls: number;
  liveCalls: number;
  cachedCalls: number;
  estUsd: number;
  estInr: number;
}

export function preflightEstimate(input: AuditInput, prompts: BuyerPrompt[]): PreflightEstimate {
  // Mirrors the cache keys used by engines/gemini.ts and parse.ts.
  const engineKey = config.engineGrounding ? 'gemini' : 'gemini:ungrounded';

  let liveEngineCalls = 0;
  let cachedEngineCalls = 0;
  let liveParseCalls = 0;
  let cachedParseCalls = 0;
  let estUsd = 0;

  for (const p of prompts) {
    const cachedEngine = cacheGet<EngineResult>(engineKey, p.text);
    if (cachedEngine && !cachedEngine.error) {
      cachedEngineCalls++;
      // Parse cache is keyed on the (cached) answer text — we can check it exactly.
      const parseId = `${config.parserModel}|${input.businessName}|${input.website}|${cachedEngine.answerText}`;
      if (cacheGet('parser', parseId)) {
        cachedParseCalls++;
      } else {
        liveParseCalls++;
        estUsd += estimateCallUsd('parser', config.parserModel);
      }
    } else {
      // Fresh prompt → both calls will be live.
      liveEngineCalls++;
      estUsd += estimateCallUsd('engine:gemini', config.engineModel);
      liveParseCalls++;
      estUsd += estimateCallUsd('parser', config.parserModel);
    }
  }

  return {
    totalPrompts: prompts.length,
    liveEngineCalls,
    cachedEngineCalls,
    liveParseCalls,
    cachedParseCalls,
    liveCalls: liveEngineCalls + liveParseCalls,
    cachedCalls: cachedEngineCalls + cachedParseCalls,
    estUsd,
    estInr: estUsd * config.usdInr,
  };
}
