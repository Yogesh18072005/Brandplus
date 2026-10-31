// Gemini engine adapter — the only live engine in v0 (CLAUDE.md §5.3).
// Asks the buyer question with Google Search grounding enabled and pulls
// source links out of the url_citation annotations on the model output.
//
// Grounding caveat: Search grounding is billed per search and may have NO
// free quota on an unbilled key. If a grounded call fails with a quota
// error, we fall back to an ungrounded call and mark the result
// grounded:false — the CLI/report must present citations as "unavailable
// (ungrounded mode)", never silently pretend. Toggle via ENGINE_GROUNDING.

import type { Citation, EngineAdapter, EngineResult } from '../types';
import { config } from '../config';
import { geminiCall, isQuotaError, type Interaction } from '../gemini-client';
import { cacheGet, cacheSet } from '../cache';
import { recordCall } from '../cost';
import { extractDomain } from '../matching';

// Grounding citations often come back as Google redirect URLs
// (e.g. vertexaisearch.cloud.google.com/grounding-api-redirect/…).
// In that case the annotation's `title` usually carries the real source
// domain, so prefer it when it looks like one.
const REDIRECT_HOSTS = /(^|\.)vertexaisearch\.cloud\.google\.com$|(^|\.)grounding-api/;

function toCitation(url: string, title?: string): Citation {
  let domain = extractDomain(url);
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    /* keep empty */
  }
  if (REDIRECT_HOSTS.test(host) && title && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(title.trim())) {
    domain = extractDomain(title);
  }
  return { url, title, domain };
}

function extractCitations(interaction: Interaction): Citation[] {
  const out: Citation[] = [];
  const seen = new Set<string>();
  for (const step of interaction?.steps ?? []) {
    if (step?.type !== 'model_output') continue;
    for (const block of step?.content ?? []) {
      if (block?.type !== 'text') continue;
      for (const ann of block?.annotations ?? []) {
        if (ann?.type !== 'url_citation' || !ann.url) continue;
        const c = toCitation(ann.url, ann.title);
        if (!seen.has(c.url)) {
          seen.add(c.url);
          out.push(c);
        }
      }
    }
  }
  return out;
}

function extractText(interaction: Interaction): string {
  if (typeof interaction?.output_text === 'string' && interaction.output_text.length > 0) {
    return interaction.output_text;
  }
  // Fallback: concatenate text blocks from model_output steps.
  const parts: string[] = [];
  for (const step of interaction?.steps ?? []) {
    if (step?.type !== 'model_output') continue;
    for (const block of step?.content ?? []) {
      if (block?.type === 'text' && block.text) parts.push(block.text);
    }
  }
  return parts.join('\n');
}

async function ask(prompt: string, grounded: boolean): Promise<EngineResult> {
  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  const interaction = await geminiCall({
    kind: `engine:gemini${grounded ? '' : ':ungrounded'}`,
    model: config.engineModel,
    input: prompt,
    ...(grounded ? { tools: [{ type: 'google_search' }] } : {}),
    // Cost: minimal thinking (billed as output tokens) + output cap. Search-
    // style answers don't benefit from deliberation.
    generationConfig: { thinking_level: 'minimal', max_output_tokens: 3072 },
  });
  return {
    engine: 'gemini',
    query: prompt,
    answerText: extractText(interaction),
    citations: extractCitations(interaction),
    observedAt: new Date().toISOString(),
    grounded,
    execution: {
      provider: 'google',
      model: config.engineModel,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
    },
    raw: interaction,
  };
}

// Warn about the grounding fallback once per run, loudly, not per prompt.
let warnedUngroundedFallback = false;

export const geminiAdapter: EngineAdapter = {
  name: 'gemini',
  label: 'Gemini',
  availability: () => ({
    available: Boolean(config.googleApiKey),
    ...(!config.googleApiKey ? { reason: 'GOOGLE_API_KEY is not configured' } : {}),
  }),

  async runPrompt(prompt, _opts): Promise<EngineResult> {
    const wantGrounding = config.engineGrounding;
    // Cache key includes the mode so an ungrounded answer is never reused
    // as if it were grounded (and vice versa) once config/quota changes.
    const cacheKey = wantGrounding ? 'gemini' : 'gemini:ungrounded';

    const cached = cacheGet<EngineResult>(cacheKey, prompt);
    if (cached && !cached.error) {
      recordCall({ kind: 'engine:gemini', model: config.engineModel, inputTokens: 0, outputTokens: 0, cached: true });
      return { ...cached, query: prompt, observedAt: new Date().toISOString(), execution: { ...cached.execution, cached: true } };
    }

    try {
      let result: EngineResult;
      try {
        result = await ask(prompt, wantGrounding);
      } catch (err) {
        // Grounded call ran out of quota → likely "grounding is paid-only on
        // this key". Retry the same prompt ungrounded rather than failing the
        // audit, and say so clearly.
        if (!wantGrounding || !isQuotaError(err)) throw err;
        if (!warnedUngroundedFallback) {
          warnedUngroundedFallback = true;
          console.warn(
            '\n⚠ Grounded (Google Search) calls are hitting quota errors on this key — ' +
              'falling back to UNGROUNDED answers. Citations will be unavailable. ' +
              'Answers still reflect what Gemini says, but without live web sources.\n'
          );
        }
        result = await ask(prompt, false);
      }

      cacheSet(result.grounded ? 'gemini' : 'gemini:ungrounded', prompt, { ...result, raw: undefined }); // raw is big; keep cache lean
      return result;
    } catch (err) {
      // Fail gracefully — one engine erroring must not kill the audit.
      return {
        engine: 'gemini',
        query: prompt,
        answerText: '',
        citations: [],
        observedAt: new Date().toISOString(),
        execution: {
          provider: 'google',
          model: config.engineModel,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: 0,
        },
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
