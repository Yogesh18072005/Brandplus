// Stage 5.4: parse each engine answer into structured facts with a cheap
// LLM call (strict JSON schema), then apply deterministic post-steps that
// we never trust the LLM with: brand_cited and fuzzy name verification.

import type { AuditInput, EngineResult, ParsedAnswer } from './types';
import { config } from './config';
import { geminiCall } from './gemini-client';
import { cacheGet, cacheSet } from './cache';
import { recordCall } from './cost';
import { domainMatches, nameAppearsIn, extractEvidenceSentence } from './matching';

const PARSE_SCHEMA = {
  type: 'object',
  properties: {
    brand_mentioned: { type: 'boolean' },
    mention_type: {
      type: 'string',
      enum: ['top_recommendation', 'listed_among_others', 'passing_mention', 'absent'],
    },
    brand_rank: { type: ['integer', 'null'] },
    sentiment: {
      type: 'string',
      enum: ['positive', 'neutral', 'negative', 'not_mentioned'],
    },
    competitors_mentioned: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          is_tracked_competitor: { type: 'boolean' },
        },
        required: ['name', 'is_tracked_competitor'],
      },
    },
    cited_domains: { type: 'array', items: { type: 'string' } },
    evidence_quote: { type: 'string' },
  },
  required: [
    'brand_mentioned',
    'mention_type',
    'brand_rank',
    'sentiment',
    'competitors_mentioned',
    'cited_domains',
    'evidence_quote',
  ],
} as const;

function buildParserInput(input: AuditInput, answerText: string): string {
  const aliases = input.aliases?.length ? ` (also known as: ${input.aliases.join(', ')})` : '';
  const competitors = input.competitors
    .map((c) => `- ${c.name}${c.aliases?.length ? ` (aka ${c.aliases.join(', ')})` : ''}`)
    .join('\n');

  return `You are analyzing an AI assistant's answer to a buyer question, to measure brand visibility.

TARGET BRAND: ${input.businessName}${aliases}
BRAND WEBSITE: ${input.website}

TRACKED COMPETITORS:
${competitors}

Analyze the ANSWER below and report:
- brand_mentioned: is the target brand mentioned at all?
- mention_type: "top_recommendation" if it is the single clear top pick; "listed_among_others" if named in a list of options; "passing_mention" if referenced but not recommended; "absent" if not mentioned.
- brand_rank: if options are presented in an ordered/implied ranking, the target brand's position (1 = first). null if unranked or absent.
- sentiment: tone toward the target brand ("not_mentioned" if absent).
- competitors_mentioned: EVERY business/clinic/brand named in the answer (other than the target brand). Set is_tracked_competitor=true only if it matches one of the tracked competitors above (allow name variations).
- cited_domains: every website domain that appears in the answer text itself (bare registrable domains, lowercased, e.g. "practo.com").
- evidence_quote: a VERBATIM snippet from the answer, under 20 words, that best proves who the answer recommends. Must be copied exactly from the answer — it will be shown to a client as evidence.

ANSWER:
"""
${answerText}
"""

Respond with ONLY a single raw JSON object matching the fields above — no markdown, no code fences, no "Here's the analysis" preamble, no bullet points. Start your response with { and end with }.`;
}

// Some models honor response_format strictly; others (e.g. gemini-2.5-flash)
// still wrap the JSON in ```json fences or add prose. Tolerate both.
export function extractJson(text: string): unknown {
  const t = text.trim();
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = (fenced ? fenced[1]! : t).trim();
  try {
    return JSON.parse(body);
  } catch {
    const start = body.indexOf('{');
    const end = body.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(body.slice(start, end + 1));
    throw new Error(`parser returned no JSON object: ${body.slice(0, 80)}…`);
  }
}

export async function parseAnswer(
  input: AuditInput,
  engineResult: EngineResult
): Promise<ParsedAnswer> {
  // Parses are deterministic enough to cache: same answer + same brand set →
  // same extraction. Without this, a quota-interrupted audit re-bills every
  // successful parse on resume.
  const cacheId = `${config.parserModel}|${input.businessName}|${input.website}|${engineResult.answerText}`;
  const cached = cacheGet<ParsedAnswer>('parser', cacheId);
  if (cached) {
    recordCall({ kind: 'parser', model: config.parserModel, inputTokens: 0, outputTokens: 0, cached: true });
    return cached;
  }

  const interaction = await geminiCall({
    kind: 'parser',
    model: config.parserModel,
    input: buildParserInput(input, engineResult.answerText),
    responseFormat: { type: 'text', mime_type: 'application/json', schema: PARSE_SCHEMA },
    // Cost + determinism: extraction wants temperature 0, no thinking. Output cap
    // raised to 2048 — long competitor lists were truncating mid-JSON at 1024.
    generationConfig: { thinking_level: 'minimal', temperature: 0, max_output_tokens: 2048 },
  });

  const parsed = extractJson(interaction.output_text ?? '') as Omit<ParsedAnswer, 'brand_cited'>;

  // ---- Deterministic post-steps (never the LLM's job) ----

  // brand_cited: does any citation resolve to the brand's own domain?
  const brand_cited = engineResult.citations.some((c) => domainMatches(c.domain, input.website));

  // Fuzzy safety net: if the parser says "absent" but the brand name (or an
  // alias) verifiably appears in the answer text, upgrade to passing_mention.
  const fuzzyHit = nameAppearsIn(engineResult.answerText, input.businessName, input.aliases);
  let { brand_mentioned, mention_type, sentiment } = parsed;
  if (!brand_mentioned && fuzzyHit) {
    brand_mentioned = true;
    mention_type = 'passing_mention';
    if (sentiment === 'not_mentioned') sentiment = 'neutral';
  }

  // Consistency guard: mention_type is authoritative. A model that returns
  // brand_mentioned=true WITH mention_type=absent is contradicting itself —
  // reconcile so downstream scoring is never fed an incoherent pair.
  brand_mentioned = mention_type !== 'absent';

  // Drop junk competitor entries (missing names) some cheap models emit.
  const competitors_mentioned = (parsed.competitors_mentioned ?? []).filter(
    (c) => typeof c?.name === 'string' && c.name.trim() !== ''
  );

  // Evidence quote: trust the parser's, but if it's empty and a competitor was
  // named, deterministically pull the real sentence that names one.
  let evidence_quote = typeof parsed.evidence_quote === 'string' ? parsed.evidence_quote.trim() : '';
  if (!evidence_quote && competitors_mentioned.length > 0) {
    const names = [
      ...competitors_mentioned.map((c) => c.name),
      ...input.competitors.map((c) => c.name),
    ];
    evidence_quote = extractEvidenceSentence(engineResult.answerText, names);
  }

  const result: ParsedAnswer = {
    ...parsed,
    competitors_mentioned,
    brand_mentioned,
    mention_type,
    sentiment,
    brand_cited,
    evidence_quote,
  };
  cacheSet('parser', cacheId, result);
  return result;
}
