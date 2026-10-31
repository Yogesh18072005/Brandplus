// Stage 5.2: expand (category, city) into realistic, diverse buyer questions.
// ONE call generates the whole batch (free-tier quota is the constraint, not
// latency), with headroom so de-duplication still leaves the requested count.
// Output is day-cached like engine responses.

import type { BuyerPrompt } from './types';
import { config } from './config';
import { geminiCall } from './gemini-client';
import { cacheGet, cacheSet } from './cache';
import { recordCall } from './cost';
import { extractJson } from './parse';
import { BUYER_INTENTS, getIntentWeight } from './intents';
import type { AuditInput } from './types';

export const INTENTS = BUYER_INTENTS;

const PROMPTS_SCHEMA = {
  type: 'object',
  properties: {
    prompts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          intent: { type: 'string', enum: [...INTENTS] },
        },
        required: ['text', 'intent'],
      },
    },
  },
  required: ['prompts'],
} as const;

function buildInput(category: string, city: string, count: number, profile?: Partial<AuditInput>): string {
  const context = [
    profile?.products?.length ? `Products: ${profile.products.join(', ')}` : '',
    profile?.services?.length ? `Services: ${profile.services.join(', ')}` : '',
    profile?.targetCustomers?.length ? `Target customers: ${profile.targetCustomers.join(', ')}` : '',
    profile?.markets?.length ? `Markets: ${profile.markets.join(', ')}` : '',
    profile?.locations?.length ? `Locations: ${profile.locations.join(', ')}` : '',
  ].filter(Boolean).join('\n');
  return `Generate ${count} realistic questions that commercial buyers would ask an AI answer engine when evaluating "${category}" businesses connected to ${city}, India.

${context}

Cover this intent mix, roughly evenly:
- discovery: best/leading companies in the category
- comparison: supplier or company comparisons and trade-offs
- commercial: commercial research for a concrete requirement
- transactional: where to buy, source, order, or request a quote
- problem: solving a real operational or procurement problem
- category_authority: leading or trusted companies in the field
- location: manufacturers or suppliers in ${city}, its state, or India
- export: Indian suppliers/exporters for markets such as UAE, Europe, or Southeast Asia
- product: the best product/specification for a concrete use case
- vendor_selection: which supplier, manufacturer, consultant, or service provider to choose

Rules:
- Write like real people: natural, varied length, some casual, some specific. NOT keyword-stuffed SEO strings.
- Prioritize high-value B2B buying situations: manufacturing, wholesale, export, OEM, private label, industrial procurement, and supplier discovery where relevant.
- Vary the phrasing: questions, imperatives, sentence fragments — the way people actually type.
- Every prompt must be meaningfully different from the others (no near-duplicates or trivial rewordings).
- Mix city, state, India-wide, and export-market questions. Do not force location into every prompt.
- Do not mention any specific business name.
- Do not number the prompts.`;
}

/**
 * Software/SaaS buyers ask "best tool for X", "alternatives to Y", "X vs Y" —
 * no city, no suppliers. Intents reuse the shared enum so scoring and weights
 * stay comparable; location/export are deliberately not requested.
 */
export function buildSoftwareInput(category: string, count: number, profile?: Partial<AuditInput>): string {
  const region = profile?.region?.trim() || 'global (English-speaking)';
  const audience = profile?.targetCustomers?.length ? profile.targetCustomers.join(', ') : '';
  const context = [
    audience ? `Typical buyers: ${audience}` : '',
    profile?.products?.length ? `Product capabilities: ${profile.products.join(', ')}` : '',
    profile?.markets?.length ? `Markets: ${profile.markets.join(', ')}` : '',
  ].filter(Boolean).join('\n');
  const forbidden = [profile?.businessName, ...(profile?.aliases ?? [])].filter((n): n is string => !!n?.trim());
  return `Generate ${count} realistic questions that people evaluating "${category}" software would ask an AI assistant like ChatGPT or Gemini before choosing a tool. Buyers are in ${region}.

${context}

Cover this intent mix, roughly evenly:
- discovery: best or top tools in the category ("best ${category} for small teams")
- comparison: alternatives to a well-known incumbent, or how to choose between the options in the category
- commercial: pricing, free plans, cost for a team size, value for money
- transactional: ready-to-buy picks ("which one should I sign up for if…")
- problem: a concrete pain the software solves, asked as "what tool can help me…"
- category_authority: the most trusted, established, or widely used options
- product: best tool for a specific use case, workflow, or integration
- vendor_selection: choosing under constraints (budget, team size, compliance, self-hosted, open source)

Rules:
- Write like real people typing into ChatGPT: natural, varied length, some casual, some specific. NOT keyword-stuffed SEO strings.
- Every prompt must be meaningfully different from the others (no near-duplicates or trivial rewordings).
- Do not mention cities. Only mention a country when it changes the answer (data residency, currency, compliance).
- You may name ONE widely known incumbent in a question (e.g. "alternatives to X")${forbidden.length ? `, but NEVER mention ${forbidden.map((n) => `"${n}"`).join(' or ')}` : ''}.
- Never write a head-to-head question about exactly two named products ("X vs Y"): no other tool can appear in that answer, so it measures nothing.
- Do not number the prompts.`;
}

// ---- near-duplicate removal (deterministic, no LLM) ----

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 1 : inter / union;
}

/** Drop prompts that are identical or near-identical (word-set Jaccard ≥ 0.85) to an earlier one. */
export function dedupePrompts(prompts: BuyerPrompt[]): BuyerPrompt[] {
  const kept: BuyerPrompt[] = [];
  const keptSets: Set<string>[] = [];
  for (const p of prompts) {
    const words = new Set(normalize(p.text).split(' ').filter(Boolean));
    if (words.size === 0) continue;
    const isDup = keptSets.some((k) => jaccard(k, words) >= 0.85);
    if (!isDup) {
      kept.push(p);
      keptSets.push(words);
    }
  }
  return kept;
}

/**
 * A question that names the audited brand measures nothing (the answer will
 * echo it back), so drop any prompt containing the brand or an alias as a word.
 */
export function dropBrandMentions(prompts: BuyerPrompt[], brandNames: string[]): BuyerPrompt[] {
  const needles = brandNames.map(normalize).filter((n) => n.length >= 3);
  if (needles.length === 0) return prompts;
  return prompts.filter((p) => {
    const text = ` ${normalize(p.text)} `;
    return !needles.some((n) => text.includes(` ${n} `));
  });
}

/**
 * Trim to `count` while keeping every intent represented. A plain slice would
 * chop off whole trailing intent groups, since models emit prompts grouped by
 * intent in order.
 */
export function stratifiedTrim(prompts: BuyerPrompt[], count: number): BuyerPrompt[] {
  if (prompts.length <= count) return prompts;
  const groups = new Map<string, BuyerPrompt[]>();
  for (const p of prompts) {
    const g = groups.get(p.intent);
    if (g) g.push(p);
    else groups.set(p.intent, [p]);
  }
  const out: BuyerPrompt[] = [];
  while (out.length < count) {
    let added = false;
    for (const g of groups.values()) {
      const next = g.shift();
      if (next) {
        out.push(next);
        added = true;
        if (out.length === count) break;
      }
    }
    if (!added) break; // all groups exhausted
  }
  return out;
}

export async function generatePrompts(
  category: string,
  city: string,
  count: number = config.promptCount,
  profile?: Partial<AuditInput>,
): Promise<BuyerPrompt[]> {
  const software = profile?.businessType === 'software';
  const profileKey = JSON.stringify({
    products: profile?.products ?? [], services: profile?.services ?? [],
    locations: profile?.locations ?? [], targetCustomers: profile?.targetCustomers ?? [], markets: profile?.markets ?? [],
    ...(software ? { type: 'software', region: profile?.region ?? '', brand: profile?.businessName ?? '', aliases: profile?.aliases ?? [] } : {}),
  });
  const cacheId = `${category}|${city}|${count}|${profileKey}|${software ? 'sw2' : 'v3'}`;
  const cached = cacheGet<BuyerPrompt[]>('promptgen', cacheId);
  if (cached && cached.length > 0) {
    recordCall({ kind: 'promptgen', model: config.promptgenModel, inputTokens: 0, outputTokens: 0, cached: true });
    return cached;
  }

  // Ask for headroom so dedup + filtering still leaves `count`.
  const askCount = count + 8;
  const interaction = await geminiCall({
    kind: 'promptgen',
    model: config.promptgenModel,
    input: software ? buildSoftwareInput(category, askCount, profile) : buildInput(category, city, askCount, profile),
    responseFormat: { type: 'text', mime_type: 'application/json', schema: PROMPTS_SCHEMA },
    // Some temperature for variety; no thinking needed; cap output.
    generationConfig: { thinking_level: 'minimal', temperature: 0.8, max_output_tokens: 4096 },
  });

  const raw = extractJson(interaction.output_text ?? '') as { prompts?: BuyerPrompt[] };
  const list = (raw.prompts ?? []).filter(
    (p): p is BuyerPrompt => typeof p?.text === 'string' && p.text.trim() !== '' && typeof p?.intent === 'string'
  ).map((prompt) => ({ ...prompt, intentWeight: getIntentWeight(prompt.intent) }));
  if (list.length === 0) throw new Error('promptgen returned no prompts');

  const brandNames = [profile?.businessName, ...(profile?.aliases ?? [])].filter((n): n is string => !!n?.trim());
  const deduped = stratifiedTrim(dedupePrompts(dropBrandMentions(list, brandNames)), count);
  cacheSet('promptgen', cacheId, deduped);
  return deduped;
}
