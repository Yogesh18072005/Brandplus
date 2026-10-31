// Deterministic website checks for the audit scorecard. No LLM calls and no
// spend: robots.txt AI-crawler rules, what a crawler sees without JavaScript,
// structured data, llms.txt, sitemap, and the profiles the site links to.
// Parsing is pure (testable); fetching goes through the SSRF-safe fetcher.

import * as cheerio from 'cheerio';
import { fetchPublicResource } from '../business-understanding/crawler';
import type { ProfileKind } from './profiles';

export { REVIEW_PROFILES, type ProfileKind } from './profiles';

export const AI_CRAWLERS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'Bingbot', 'Applebot-Extended',
] as const;

export type CrawlerAccess = 'allowed' | 'blocked' | 'unspecified';

export interface RobotsAnalysis {
  found: boolean;
  /** Per crawler: explicitly named and allowed, blocked from the site root, or only covered by "*". */
  crawlers: Record<string, CrawlerAccess>;
  explicitlyNamed: string[];
  blocked: string[];
}

/** Minimal robots.txt reading: group user-agents, treat "Disallow: /" as blocking the site. */
export function analyzeRobots(text: string | null): RobotsAnalysis {
  const crawlers: Record<string, CrawlerAccess> = Object.fromEntries(AI_CRAWLERS.map((c) => [c, 'unspecified']));
  if (!text) return { found: false, crawlers, explicitlyNamed: [], blocked: [] };
  const groups: { agents: string[]; disallowRoot: boolean; allowRoot: boolean }[] = [];
  let current: (typeof groups)[number] | null = null;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const match = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line);
    if (!match) continue;
    const key = match[1]!.toLowerCase();
    const value = match[2]!.trim();
    if (key === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], disallowRoot: false, allowRoot: false };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (key === 'disallow' && value === '/') current.disallowRoot = true;
    if (key === 'allow' && (value === '/' || value === '')) current.allowRoot = true;
  }
  const star = groups.find((g) => g.agents.includes('*'));
  const explicitlyNamed: string[] = [];
  const blocked: string[] = [];
  for (const crawler of AI_CRAWLERS) {
    const group = groups.find((g) => g.agents.includes(crawler.toLowerCase()));
    if (group) {
      explicitlyNamed.push(crawler);
      crawlers[crawler] = group.disallowRoot && !group.allowRoot ? 'blocked' : 'allowed';
    } else if (star?.disallowRoot && !star.allowRoot) {
      crawlers[crawler] = 'blocked';
    }
    if (crawlers[crawler] === 'blocked') blocked.push(crawler);
  }
  return { found: true, crawlers, explicitlyNamed, blocked };
}

const PROFILE_PATTERNS: [ProfileKind, RegExp][] = [
  ['linkedin', /linkedin\.com\/(company|in|school)\//],
  ['youtube', /youtube\.com\/(@|c\/|channel\/|user\/)|youtu\.be\//],
  ['x', /(^|\/\/)(www\.)?(twitter|x)\.com\/[a-z0-9_]+/],
  ['instagram', /instagram\.com\/[a-z0-9_.]+/],
  ['facebook', /facebook\.com\/[a-z0-9_.-]+/],
  ['github', /github\.com\/[a-z0-9-]+/],
  ['g2', /g2\.com\/products\//],
  ['capterra', /capterra\.[a-z.]+\//],
  ['producthunt', /producthunt\.com\/(products|posts)\//],
  ['trustpilot', /trustpilot\.com\/review\//],
  ['crunchbase', /crunchbase\.com\/organization\//],
  ['justdial', /justdial\.com\//],
  ['indiamart', /indiamart\.com\//],
  ['googlemaps', /(google\.[a-z.]+\/maps|maps\.app\.goo\.gl|g\.page\/)/],
  ['practo', /practo\.com\//],
  ['clutch', /clutch\.co\/profile\//],
];

export interface HomepageAnalysis {
  title: string;
  metaDescription: string;
  /** Words a crawler sees in the raw HTML, before any JavaScript runs. */
  visibleWords: number;
  /** Looks like an empty JavaScript app shell to a crawler that doesn't run scripts. */
  appShell: boolean;
  jsonLdTypes: string[];
  hasFaqSchema: boolean;
  questionHeadings: number;
  profiles: ProfileKind[];
  /** Section hints from the site's own links. */
  sections: { pricing: boolean; faq: boolean; comparison: boolean; content: boolean; docs: boolean; caseStudies: boolean };
}

function collectTypes(node: unknown, out: Set<string>): void {
  if (Array.isArray(node)) { node.forEach((n) => collectTypes(n, out)); return; }
  if (!node || typeof node !== 'object') return;
  const record = node as Record<string, unknown>;
  const type = record['@type'];
  if (typeof type === 'string') out.add(type);
  if (Array.isArray(type)) type.filter((t): t is string => typeof t === 'string').forEach((t) => out.add(t));
  for (const value of Object.values(record)) if (value && typeof value === 'object') collectTypes(value, out);
}

export function analyzeHomepage(html: string, pageUrl: string): HomepageAnalysis {
  const $ = cheerio.load(html);
  const types = new Set<string>();
  $('script[type="application/ld+json"]').each((_, el) => {
    try { collectTypes(JSON.parse($(el).text()), types); } catch { /* malformed JSON-LD counts as absent */ }
  });
  const hrefs = $('a[href]').map((_, el) => $(el).attr('href') ?? '').get();
  const absolute = hrefs.flatMap((href) => { try { return [new URL(href, pageUrl).toString().toLowerCase()]; } catch { return []; } });
  const origin = new URL(pageUrl).origin.toLowerCase();
  const internal = absolute.filter((h) => h.startsWith(origin)).map((h) => h.slice(origin.length));
  const has = (re: RegExp) => internal.some((path) => re.test(path));
  const profiles = PROFILE_PATTERNS.filter(([, re]) => absolute.some((h) => re.test(h))).map(([kind]) => kind);
  const questionHeadings = $('h1,h2,h3').filter((_, el) => /\?\s*$/.test($(el).text().trim())).length;

  const body = $('body').clone();
  body.find('script,style,noscript,svg,template').remove();
  const visibleWords = body.text().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  const appShell = visibleWords < 60 && $('#__next, #root, #app, [data-reactroot], #___gatsby').length > 0;

  return {
    title: $('title').first().text().trim(),
    metaDescription: ($('meta[name="description"]').attr('content') ?? '').trim(),
    visibleWords,
    appShell,
    jsonLdTypes: [...types].sort(),
    hasFaqSchema: types.has('FAQPage') || types.has('HowTo') || types.has('QAPage'),
    questionHeadings,
    profiles,
    sections: {
      // "/#pricing" style in-page anchors count: many homepages hold pricing and FAQ inline.
      pricing: has(/\/#?(pricing|plans|price)(\/|$|\?)/),
      faq: has(/\/#?(faq|faqs|help|questions)(\/|$|\?)/) || questionHeadings >= 3,
      comparison: has(/(\/vs[-/]|-vs-|\/compare|\/comparison|alternative)/),
      content: has(/\/(blog|guides?|resources|learn|articles|insights|news)(\/|$|\?)/),
      docs: has(/\/(docs|documentation|developers|api)(\/|$|\?)/),
      caseStudies: has(/\/(case-stud|customers|success-stor|testimonials|reviews)/),
    },
  };
}

/** One page as a crawler that doesn't run JavaScript sees it. */
export interface PageAnalysis {
  url: string;
  status: number;
  /** Time to fetch the raw HTML. AI crawlers give up on slow pages sooner than Googlebot. */
  loadMs: number;
  title: string;
  metaDescription: string;
  h1: string[];
  words: number;
  questionHeadings: number;
  /** Question-style headings followed directly by a 20–90 word answer: what AI lifts as a quote. */
  answerBlocks: string[];
  jsonLdTypes: string[];
  /** A named author (meta author, rel=author, or a Person in the schema). */
  hasAuthor: boolean;
}

/** An unverifiable superlative ("best", "leading", "#1") with no proof in the same sentence. */
export interface HypeClaim {
  phrase: string;
  sentence: string;
  url: string;
}

const QUESTION_START = /^(what|how|why|who|which|when|where|can|is|are|does|do|should|will)\b/i;

function isQuestionHeading(text: string): boolean {
  return /\?\s*$/.test(text) || QUESTION_START.test(text);
}

const wordCount = (text: string) => text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

/** The text right after a heading: its next sibling, or its wrapper's next sibling (page builders nest headings). */
function answerAfter($: cheerio.CheerioAPI, el: Parameters<cheerio.CheerioAPI>[0]): string {
  const node = $(el);
  for (const candidate of [node.next(), node.parent().next()]) {
    if (!candidate.length || candidate.is('h1,h2,h3,h4')) continue;
    const text = candidate.text().replace(/\s+/g, ' ').trim();
    if (text) return text;
  }
  return '';
}

/** Body text a reader would see, minus scripts and quoted customer voices (testimonials aren't the site's own claims). */
function ownText($: cheerio.CheerioAPI): string {
  const body = $('body').clone();
  body.find('script,style,noscript,svg,template,blockquote,q,[class*="testimonial" i],[id*="testimonial" i],[class*="review" i]').remove();
  body.find('br').replaceWith(' ');
  body.find('p,div,li,h1,h2,h3,h4,h5,h6,section,td').append('\n');
  return body.text();
}

export function analyzePage(html: string, url: string, status: number, loadMs: number): PageAnalysis {
  const $ = cheerio.load(html);
  const types = new Set<string>();
  $('script[type="application/ld+json"]').each((_, el) => {
    try { collectTypes(JSON.parse($(el).text()), types); } catch { /* malformed JSON-LD counts as absent */ }
  });
  const headings = $('h2,h3').toArray();
  const questions = headings.filter((el) => isQuestionHeading($(el).text().trim()));
  const answerBlocks = questions.filter((el) => {
    const words = wordCount(answerAfter($, el));
    return words >= 20 && words <= 90;
  }).map((el) => $(el).text().replace(/\s+/g, ' ').trim());
  const body = $('body').clone();
  body.find('script,style,noscript,svg,template').remove();
  return {
    url,
    status,
    loadMs,
    title: $('title').first().text().trim(),
    metaDescription: ($('meta[name="description"]').attr('content') ?? '').trim(),
    h1: $('h1').map((_, el) => $(el).text().replace(/\s+/g, ' ').trim()).get().filter(Boolean),
    words: wordCount(body.text()),
    questionHeadings: questions.length,
    answerBlocks,
    jsonLdTypes: [...types].sort(),
    hasAuthor: !!$('meta[name="author"]').attr('content')?.trim() || $('[rel="author"]').length > 0 || types.has('Person'),
  };
}

// Self-praise that answer engines can't verify. "best"/"top" only count when
// they describe a business ("best digital marketing company in …"), so
// "best practices" and "top of the page" don't trip it.
const BUSINESS_NOUN = '(?:company|companies|agency|agencies|firm|provider|services?|team|solutions?|clinic|hospital|platform|software|tool|partner|brand|studio|consultants?|experts?)';
const HYPE_PATTERNS: RegExp[] = [
  new RegExp(`\\b(?:the\\s+)?best\\s+(?:[\\w&-]+\\s+){0,4}?${BUSINESS_NOUN}\\b`, 'i'),
  new RegExp(`\\btop(?:[- ]rated)?\\s+(?:[\\w&-]+\\s+){0,4}?${BUSINESS_NOUN}\\b`, 'i'),
  /\b(?:best[- ]in[- ]class|world[- ]class|industry[- ]leading|market[- ]leading|second to none|unmatched|unrivall?ed|revolutionary|cutting[- ]edge|number one|no\.\s?1|#\s?1)\b/i,
  /\b(?:a|the|our|india['’]?s|[A-Z][a-z]+['’]s)\s+(?:most\s+)?leading\b/,
];
// Ordinary phrasing that happens to fit the patterns above.
const NOT_HYPE = /^(?:the\s+)?best\s+(?:possible\s+|suited\s+)?(?:services?|solutions?)$|^top\s+of/i;
// A sentence that carries its own proof isn't hype.
const PROOF = /\b(award|awarded|ranked by|according to|certified|rated\s+\d|\d(?:\.\d)?\s*(?:stars?|★)|clutch|g2|google reviews?)\b/i;

export function findHypeClaims(html: string, url: string): HypeClaim[] {
  const $ = cheerio.load(html);
  const sentences = ownText($).split(/\n+|(?<=[.!?])\s+/).map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => s.length >= 12 && s.length <= 400);
  const out: HypeClaim[] = [];
  const seen = new Set<string>();
  for (const sentence of sentences) {
    if (PROOF.test(sentence)) continue;
    const match = HYPE_PATTERNS.map((re) => re.exec(sentence)).find((m) => m && !NOT_HYPE.test(m[0].trim()));
    if (!match) continue;
    const key = sentence.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ phrase: match[0].trim(), sentence: sentence.length > 200 ? `${sentence.slice(0, 200).trimEnd()}…` : sentence, url });
  }
  return out;
}

/** <loc> entries from a sitemap or sitemap index. */
export function sitemapLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]!.replace(/&amp;/g, '&'));
}

const KEY_PAGES: [RegExp, number][] = [
  [/\/(about|company|who-we-are)/, 6], [/\/(services?|solutions|what-we-do|products?)/, 6], [/\/(faqs?|questions)/, 6],
  [/\/(pricing|plans|price)/, 5], [/\/(case-stud|portfolio|our-work|projects|clients|testimonials)/, 4],
  [/\/(blog|guides?|resources|insights)\/?$/, 3], [/\/contact/, 2],
];
const SKIP_PATH = /\/(tag|category|author|page|feed|wp-content|wp-json|cart|checkout|my-account|login)\/|\.(pdf|jpe?g|png|gif|webp|svg|xml|zip)$/i;

/** Pick the pages that matter most for "can AI understand this business": key pages first, then the shallowest. */
export function pickKeyPages(urls: string[], origin: string, limit = 8): string[] {
  const home = origin.replace(/\/$/, '');
  const candidates = [...new Set(urls.map((u) => u.split('#')[0]!))].filter((u) => {
    try { return new URL(u).origin === new URL(origin).origin && u.replace(/\/$/, '') !== home && !SKIP_PATH.test(new URL(u).pathname); } catch { return false; }
  });
  const scored = candidates.map((u) => {
    const path = new URL(u).pathname.toLowerCase();
    const weight = KEY_PAGES.find(([re]) => re.test(path))?.[1] ?? 0;
    const depth = path.split('/').filter(Boolean).length;
    return { u, rank: weight * 10 - depth };
  });
  return scored.sort((a, b) => b.rank - a.rank).slice(0, limit).map((s) => s.u);
}

export interface SiteAudit {
  checkedAt: string;
  reachable: boolean;
  finalUrl: string | null;
  https: boolean;
  homepage: HomepageAnalysis | null;
  robots: RobotsAnalysis;
  llmsTxt: boolean;
  sitemap: boolean;
  /** Homepage first, then up to eight key pages (absent on reports made before multi-page checks). */
  pages?: PageAnalysis[];
  hypeClaims?: HypeClaim[];
  errors: string[];
}

async function tryFetch(url: string, accept: string) {
  try {
    const res = await fetchPublicResource(url, { accept, maxBytes: 1_500_000 });
    return res.status >= 200 && res.status < 300 ? res : null;
  } catch {
    return null;
  }
}

export async function runSiteChecks(website: string, now: () => Date = () => new Date()): Promise<SiteAudit> {
  const errors: string[] = [];
  const base = /^https?:\/\//i.test(website) ? website : `https://${website}`;
  let home: Awaited<ReturnType<typeof fetchPublicResource>> | null = null;
  let homeMs = 0;
  try {
    const started = Date.now();
    home = await fetchPublicResource(base, { accept: 'text/html,application/xhtml+xml', maxBytes: 2_000_000 });
    homeMs = Date.now() - started;
    if (home.status >= 400) errors.push(`Homepage returned HTTP ${home.status}`);
  } catch (error) {
    errors.push(`Homepage unreachable: ${error instanceof Error ? error.message : String(error)}`);
  }
  const origin = home ? new URL(home.finalUrl).origin : new URL(base).origin;
  const [robots, llms, sitemap] = await Promise.all([
    tryFetch(`${origin}/robots.txt`, 'text/plain'),
    tryFetch(`${origin}/llms.txt`, 'text/plain,text/markdown'),
    tryFetch(`${origin}/sitemap.xml`, 'application/xml,text/xml'),
  ]);
  const homeOk = !!home && home.status < 400 && /html/.test(home.contentType);
  const hasSitemap = !!sitemap && /<(urlset|sitemapindex)\b/i.test(sitemap.text);

  // Key pages: from the sitemap (following one level of sitemap index), else the homepage's own links.
  const pages: PageAnalysis[] = [];
  const hypeClaims: HypeClaim[] = [];
  if (homeOk) {
    pages.push(analyzePage(home!.text, home!.finalUrl, home!.status, homeMs));
    hypeClaims.push(...findHypeClaims(home!.text, home!.finalUrl));
    let urls: string[] = [];
    if (hasSitemap) {
      const locs = sitemapLocs(sitemap!.text);
      if (/<sitemapindex\b/i.test(sitemap!.text)) {
        const children = [...locs].sort((a, b) => Number(/page/i.test(b)) - Number(/page/i.test(a))).slice(0, 2);
        for (const child of children) {
          const res = await tryFetch(child, 'application/xml,text/xml');
          if (res) urls.push(...sitemapLocs(res.text));
        }
      } else urls = locs;
    }
    if (urls.length === 0) {
      const $ = cheerio.load(home!.text);
      urls = $('a[href]').map((_, el) => { try { return new URL($(el).attr('href')!, home!.finalUrl).toString(); } catch { return ''; } }).get().filter(Boolean);
    }
    const picked = pickKeyPages(urls, origin);
    const fetched = await Promise.all(picked.map(async (url) => {
      const started = Date.now();
      const res = await tryFetch(url, 'text/html,application/xhtml+xml');
      return res && /html/.test(res.contentType) ? { res, ms: Date.now() - started } : null;
    }));
    for (const f of fetched) {
      if (!f) continue;
      pages.push(analyzePage(f.res.text, f.res.finalUrl, f.res.status, f.ms));
      const known = new Set(hypeClaims.map((h) => h.sentence.toLowerCase()));
      hypeClaims.push(...findHypeClaims(f.res.text, f.res.finalUrl).filter((h) => !known.has(h.sentence.toLowerCase())));
    }
  }

  return {
    checkedAt: now().toISOString(),
    reachable: homeOk,
    finalUrl: home?.finalUrl ?? null,
    https: (home?.finalUrl ?? base).startsWith('https://'),
    homepage: homeOk ? analyzeHomepage(home!.text, home!.finalUrl) : null,
    robots: analyzeRobots(robots && !/html/.test(robots.contentType) ? robots.text : null),
    // A soft-404 HTML page at /llms.txt is not an llms.txt.
    llmsTxt: !!llms && !/html/.test(llms.contentType) && llms.text.trim().length > 20,
    sitemap: hasSitemap,
    pages,
    hypeClaims: hypeClaims.slice(0, 12),
    errors,
  };
}
