// What the answer engine knows about a business, and whether the pages it
// reads to answer buyers mention the business at all. Three checks:
//
//   1. Brand probe: ask Gemini "what is <name>?" and judge the answer against
//      the business's own website (1 grounded call + 1 parser call).
//   2. Cited pages: open every page the audit's answers cited and look for the
//      business and its competitors on it (free: plain HTTP, no LLM).
//   3. Directory listings: for directories the AI cited, is the business
//      listed? Read from the cited page when possible, else one grounded
//      search that only counts a "yes" backed by a link on that directory.

import * as cheerio from 'cheerio';
import { config } from '../config';
import { cacheGet, cacheSet } from '../cache';
import { recordCall } from '../cost';
import { getAdapter } from '../engines/index';
import { geminiCall } from '../gemini-client';
import { domainMatches, extractDomain, nameAppearsIn, normalizeName } from '../matching';
import { extractJson } from '../parse';
import type { Citation } from '../types';
import { fetchPublicResource } from '../business-understanding/crawler';

export interface BrandProbe {
  question: string;
  /** accurate: right business, right facts · partial: knows of it, vague or missing key facts · wrong: contradicts the site or describes someone else · unknown: can't say who it is. */
  verdict: 'accurate' | 'partial' | 'wrong' | 'unknown';
  /** One plain sentence for the owner. */
  summary: string;
  /** Verbatim from the AI answer, so the reader can check it. */
  quote: string;
  issues: string[];
  sources: string[];
}

export interface CitedPage {
  url: string;
  domain: string;
  /** How many buyer answers cited this page. */
  citedIn: number;
  status: 'read' | 'blocked';
  brandNamed: boolean;
  competitorsNamed: string[];
}

export interface DirectoryListing {
  domain: string;
  citedIn: number;
  /** true: found a listing · false: none found · null: couldn't tell. */
  listed: boolean | null;
  url?: string;
  how: 'cited page' | 'search';
}

export interface AiFootprint {
  checkedAt: string;
  probe: BrandProbe | null;
  citedPages: CitedPage[];
  directories: DirectoryListing[];
  errors: string[];
}

/** Review sites and directories buyers (and answer engines) use to shortlist vendors. */
export const DIRECTORY_DOMAINS = new Set([
  'designrush.com', 'themanifest.com', 'clutch.co', 'goodfirms.co', 'sortlist.com', 'upcity.com', 'techbehemoths.com',
  'topdevelopers.co', 'agencyspotter.com', 'expertise.com', 'threebestrated.com', 'threebestrated.in', 'g2.com',
  'capterra.com', 'getapp.com', 'trustradius.com', 'softwareadvice.com', 'trustpilot.com', 'producthunt.com',
  'crunchbase.com', 'justdial.com', 'sulekha.com', 'indiamart.com', 'tradeindia.com', 'practo.com', 'lybrate.com',
  'yelp.com', 'yellowpages.com', 'ambitionbox.com', 'glassdoor.com', 'glassdoor.co.in', 'tripadvisor.com', 'zomato.com',
]);

export interface FootprintInput {
  name: string;
  website: string;
  city: string;
  aliases?: string[];
  competitors: string[];
  /** Each buyer answer's citations, as the engine returned them. */
  answers: { citations: Citation[] }[];
}

const REDIRECT_HOST = /(^|\.)vertexaisearch\.cloud\.google\.com$/;

/** Grounding citations are Google redirect links; one hop gives the real page. */
async function resolveCitation(url: string): Promise<string | null> {
  try {
    if (!REDIRECT_HOST.test(new URL(url).hostname)) return url;
    const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(10_000) });
    return res.headers.get('location');
  } catch {
    return null;
  }
}

async function readPage(url: string): Promise<{ text: string; hrefs: string[] } | null> {
  try {
    const res = await fetchPublicResource(url, { accept: 'text/html,application/xhtml+xml', maxBytes: 2_000_000 });
    if (res.status >= 400 || !/html/.test(res.contentType)) return null;
    const $ = cheerio.load(res.text);
    const hrefs = $('a[href]').map((_, el) => $(el).attr('href') ?? '').get();
    $('script,style,noscript,svg,template').remove();
    return { text: $('body').text().replace(/\s+/g, ' '), hrefs };
  } catch {
    return null;
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i]!); }
  }));
  return out;
}

export async function checkCitedPages(input: FootprintInput, limit = 20): Promise<CitedPage[]> {
  // Count each source once per answer, keyed by the redirect URL (resolved below).
  const byUrl = new Map<string, number>();
  for (const answer of input.answers) {
    for (const url of new Set(answer.citations.filter((c) => !domainMatches(c.domain, input.website)).map((c) => c.url))) {
      byUrl.set(url, (byUrl.get(url) ?? 0) + 1);
    }
  }
  const resolved = await mapLimit([...byUrl.entries()], 6, async ([url, count]) => ({ dest: await resolveCitation(url), count }));
  const pages = new Map<string, number>();
  for (const { dest, count } of resolved) {
    if (!dest) continue;
    const key = dest.split('#')[0]!;
    pages.set(key, (pages.get(key) ?? 0) + count);
  }
  const top = [...pages.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
  const siteDomain = extractDomain(input.website);
  return mapLimit(top, 4, async ([url, citedIn]): Promise<CitedPage> => {
    const page = await readPage(url);
    const domain = extractDomain(url);
    if (!page) return { url, domain, citedIn, status: 'blocked', brandNamed: false, competitorsNamed: [] };
    const linksToSite = page.hrefs.some((h) => { try { return extractDomain(new URL(h, url).hostname) === siteDomain; } catch { return false; } });
    return {
      url, domain, citedIn, status: 'read',
      brandNamed: linksToSite || nameAppearsIn(page.text, input.name, input.aliases),
      competitorsNamed: input.competitors.filter((c) => nameAppearsIn(page.text, c)),
    };
  });
}

/** Lines like "designrush.com | yes | https://…" from the listing search. */
export function parseListingLines(text: string, domains: string[]): Map<string, { yes: boolean | null; url?: string }> {
  const out = new Map<string, { yes: boolean | null; url?: string }>();
  for (const line of text.split(/\r?\n/)) {
    const parts = line.replace(/^[\s*\-•\d.]+/, '').split('|').map((p) => p.trim());
    if (parts.length < 2) continue;
    const domain = domains.find((d) => parts[0]!.toLowerCase().includes(d));
    if (!domain || out.has(domain)) continue;
    const answer = parts[1]!.toLowerCase();
    const url = /https?:\/\/\S+/.exec(parts[2] ?? '')?.[0]?.replace(/[)\].,]+$/, '');
    out.set(domain, { yes: /^yes\b/.test(answer) ? true : /^no\b/.test(answer) ? false : null, url: url && domainMatches(url, domain) ? url : undefined });
  }
  return out;
}

export async function checkDirectories(input: FootprintInput, citedPages: CitedPage[], citationCounts: { domain: string; count: number }[], limit = 5): Promise<DirectoryListing[]> {
  const dirs = citationCounts.filter((c) => DIRECTORY_DOMAINS.has(c.domain)).slice(0, limit);
  if (dirs.length === 0) return [];
  const listings: DirectoryListing[] = dirs.map((d) => {
    const found = citedPages.find((p) => p.domain === d.domain && p.status === 'read' && p.brandNamed);
    return found ? { domain: d.domain, citedIn: d.count, listed: true, url: found.url, how: 'cited page' } : { domain: d.domain, citedIn: d.count, listed: null, how: 'search' };
  });
  const unknown = listings.filter((l) => l.listed === null);
  if (unknown.length === 0) return listings;

  const domain = extractDomain(input.website);
  const question = `Does ${input.name} (${domain}) have its own profile or listing page on each of these websites: ${unknown.map((l) => l.domain).join(', ')}? Search each site. Reply with exactly one line per site in the form: site | yes or no | the profile URL, or none.`;
  const result = await getAdapter('gemini').runPrompt(question, { city: input.city });
  if (result.error) throw new Error(`directory search failed: ${result.error}`);
  const parsed = parseListingLines(result.answerText, unknown.map((l) => l.domain));
  const citedDomains = new Set(result.citations.map((c) => c.domain));
  for (const l of unknown) {
    const p = parsed.get(l.domain);
    if (!p || p.yes === null) continue;
    // A "yes" only counts with a link on that directory, or the search actually citing it.
    if (p.yes && (p.url || citedDomains.has(l.domain))) { l.listed = true; l.url = p.url; }
    else if (!p.yes) l.listed = false;
  }
  return listings;
}

const PROBE_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['accurate', 'partial', 'wrong', 'unknown'] },
    summary: { type: 'string' },
    quote: { type: 'string' },
    issues: { type: 'array', items: { type: 'string' } },
  },
  required: ['verdict', 'summary', 'quote', 'issues'],
};

/** The first real sentence of the answer: the fallback when the judge's quote isn't verbatim. */
function firstSentence(text: string): string {
  const s = text.replace(/[*#_`]/g, '').split(/(?<=[.!?])\s+|\n+/).map((x) => x.trim()).find((x) => x.length > 20) ?? '';
  return s.length > 220 ? `${s.slice(0, 220).trimEnd()}…` : s;
}

export async function probeBrand(input: FootprintInput, siteText: string): Promise<BrandProbe> {
  const domain = extractDomain(input.website);
  const question = `What is ${input.name} (${domain})? What do they do, where are they based, and who are their customers?`;
  const answer = await getAdapter('gemini').runPrompt(question, { city: input.city });
  if (answer.error || !answer.answerText) throw new Error(`brand probe failed: ${answer.error ?? 'empty answer'}`);

  const cacheId = `${config.parserModel}|${input.name}|${answer.answerText}`;
  let judged = cacheGet<Omit<BrandProbe, 'question' | 'sources'>>('probe-judge', cacheId);
  if (judged) {
    recordCall({ kind: 'parser', model: config.parserModel, inputTokens: 0, outputTokens: 0, cached: true });
  } else {
    const interaction = await geminiCall({
      kind: 'parser',
      model: config.parserModel,
      input: `You are checking whether an AI assistant knows a business correctly.

BUSINESS: ${input.name} (${domain}), ${input.city}
WHAT THE BUSINESS'S OWN WEBSITE SAYS (ground truth):
"""
${siteText.slice(0, 4000)}
"""

THE AI ASSISTANT'S ANSWER to "${question}":
"""
${answer.answerText.slice(0, 6000)}
"""

Return JSON:
- verdict: "accurate" if it correctly says what this business does and where; "partial" if it knows the business exists but is vague, generic or misses what it mainly does; "wrong" if it states facts the website contradicts or describes a different business; "unknown" if it says it can't find or doesn't know this business.
- summary: one plain sentence (max 25 words) telling the owner what the AI gets right or wrong about them. No jargon.
- quote: copy ONE sentence word for word from the AI's answer that best shows this (max 35 words).
- issues: up to 3 short, specific things the AI gets wrong or leaves out, compared with the website. Empty if none.

Respond with ONLY a single raw JSON object. Start with { and end with }.`,
      responseFormat: { type: 'text', mime_type: 'application/json', schema: PROBE_SCHEMA },
      generationConfig: { thinking_level: 'minimal', temperature: 0, max_output_tokens: 1024 },
    });
    judged = extractJson(interaction.output_text ?? '') as Omit<BrandProbe, 'question' | 'sources'>;
    cacheSet('probe-judge', cacheId, judged);
  }

  const verdict = (['accurate', 'partial', 'wrong', 'unknown'] as const).includes(judged.verdict) ? judged.verdict : 'partial';
  // The quote is evidence: keep it only if it really is in the answer.
  const quote = typeof judged.quote === 'string' && normalizeName(answer.answerText).includes(normalizeName(judged.quote)) && judged.quote.trim()
    ? judged.quote.trim()
    : firstSentence(answer.answerText);
  return {
    question,
    verdict,
    summary: String(judged.summary ?? '').trim(),
    quote,
    issues: Array.isArray(judged.issues) ? judged.issues.filter((i): i is string => typeof i === 'string' && i.trim() !== '').slice(0, 3) : [],
    sources: [...new Set(answer.citations.map((c) => c.domain))].slice(0, 6),
  };
}

/** Homepage text as a reader sees it: the ground truth the probe is judged against. */
async function siteTextFor(website: string): Promise<string> {
  const page = await readPage(/^https?:\/\//i.test(website) ? website : `https://${website}`);
  return page?.text.trim() ?? '';
}

export async function runAiFootprint(input: FootprintInput, citationCounts: { domain: string; count: number }[]): Promise<AiFootprint> {
  const errors: string[] = [];
  const [probe, citedPages] = await Promise.all([
    siteTextFor(input.website).then((text) => probeBrand(input, text)).catch((e) => { errors.push(e instanceof Error ? e.message : String(e)); return null; }),
    checkCitedPages(input).catch((e) => { errors.push(e instanceof Error ? e.message : String(e)); return [] as CitedPage[]; }),
  ]);
  const directories = await checkDirectories(input, citedPages, citationCounts)
    .catch((e) => { errors.push(e instanceof Error ? e.message : String(e)); return [] as DirectoryListing[]; });
  return { checkedAt: new Date().toISOString(), probe, citedPages, directories, errors };
}
