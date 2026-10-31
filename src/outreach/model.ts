// Outreach audits: a free, audit-first report sent to a prospect before any
// conversation. Pure data + deterministic helpers only — no engine or SDK
// imports, because the public report page renders from this module.

import type { BuyerPrompt, PromptResult } from '../types';
import type { ReportData } from '../scoring';
import type { SiteAudit } from '../footprint/site-checks';
import type { AiFootprint } from '../footprint/ai-footprint';
import { SENTENCE_BREAK, extractEvidenceSentence, normalizeName } from '../matching';

export type QuestionOutcome = 'recommended' | 'mentioned' | 'absent' | 'failed';

export interface OutreachQuestion {
  text: string;
  intent: string;
  outcome: QuestionOutcome;
  /** Discovered/tracked competitors this answer named. */
  competitors: string[];
  /** Real excerpt from the AI answer (empty when nothing quotable was named). */
  quote: string;
  sources: string[];
  /** Why the question was included (question gate). */
  reason?: string;
}

export interface OutreachSnapshot {
  observedAt: string;
  questions: OutreachQuestion[];
}

export interface OutreachReportFile {
  version: 1;
  slug: string;
  createdAt: string;
  businessType: 'software' | 'local';
  region: string;
  audience: string;
  engine: { provider: string; model: string; groundedShare: number };
  /** True when competitors were inferred from the answers rather than supplied. */
  competitorsDiscovered: boolean;
  prompts: BuyerPrompt[];
  report: ReportData;
  current: OutreachSnapshot;
  /** Set by a re-check: the earlier observation of the same frozen questions. */
  baseline?: OutreachSnapshot;
  /** Deterministic website checks (absent on reports created before they existed). */
  site?: SiteAudit;
  /** Brand probe, pages the AI read, directory listings (absent on older reports). */
  footprint?: AiFootprint;
}

/** Names the parser may emit that are sources or AI products, not rival vendors. */
const NOT_COMPETITORS = new Set([
  'google', 'google search', 'gemini', 'chatgpt', 'openai', 'perplexity', 'claude', 'reddit', 'youtube',
  'linkedin', 'wikipedia', 'g2', 'capterra', 'getapp', 'trustradius', 'software advice', 'product hunt',
  'alternativeto', 'gartner', 'forrester', 'forbes', 'techcrunch', 'quora', 'medium', 'github', 'x', 'twitter',
]);

/**
 * When the founder doesn't name competitors, the answers do: rank every
 * vendor the parser saw by how many questions named it, excluding the brand
 * itself and source/AI names. Display form = the most frequent spelling.
 */
export function discoverCompetitors(
  results: PromptResult[],
  brand: { name: string; aliases?: string[] },
  limit = 3,
): string[] {
  const brandKeys = [brand.name, ...(brand.aliases ?? [])].map(normalizeName).filter(Boolean);
  const tally = new Map<string, { questions: number; spellings: Map<string, number> }>();
  for (const result of results) {
    if (!result.parsed) continue;
    const seen = new Set<string>();
    for (const mention of result.parsed.competitors_mentioned ?? []) {
      const key = normalizeName(mention?.name ?? '');
      if (!key || key.length < 2 || NOT_COMPETITORS.has(key)) continue;
      if (brandKeys.some((b) => key.includes(b) || b.includes(key))) continue;
      const entry = tally.get(key) ?? { questions: 0, spellings: new Map<string, number>() };
      entry.spellings.set(mention.name.trim(), (entry.spellings.get(mention.name.trim()) ?? 0) + 1);
      if (!seen.has(key)) {
        entry.questions += 1;
        seen.add(key);
      }
      tally.set(key, entry);
    }
  }
  return [...tally.entries()]
    .sort((a, b) => b[1].questions - a[1].questions || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([, entry]) => [...entry.spellings.entries()].sort((a, b) => b[1] - a[1])[0]![0]);
}

/** Strip markdown the model wrote (bullets, bold, headings) so quotes read as prose. */
export function cleanQuote(text: string): string {
  return text
    .replace(/\*\*|__|`/g, '')
    .replace(/(^|\s)[*#>]+\s+/g, '$1')
    .replace(/^\s*(?:[-•]|\d+\.)\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const MIN_QUOTE_WORDS = 6;

function isProofQuote(quote: string, names: string[]): boolean {
  const words = quote.split(/\s+/).filter(Boolean).length;
  return words >= MIN_QUOTE_WORDS && names.some((n) => normalizeName(quote).includes(normalizeName(n)));
}

/** First full sentence of the answer that names a rival; falls back to the shared extractor. */
export function proofSentence(answerText: string, names: string[]): string {
  const chunks = answerText.split(new RegExp(`${SENTENCE_BREAK.source}|\\n+`)).map(cleanQuote);
  const hit = chunks.find((chunk) => isProofQuote(chunk, names));
  const sentence = hit ?? cleanQuote(extractEvidenceSentence(answerText, names));
  return sentence.length > 220 ? `${sentence.slice(0, 220).trimEnd()}…` : sentence;
}

/** "Pirsch Analytics" → "Pirsch Analytics'", "Acme" → "Acme's". */
export function possessive(name: string): string {
  return /s$/i.test(name) ? `${name}'` : `${name}'s`;
}

/** Which tracked competitor, if any, owns this cited domain (plausible.io → Plausible Analytics). */
export function sourceOwner(domain: string, competitors: string[]): string | null {
  const host = domain.toLowerCase().replace(/^www\./, '');
  for (const name of competitors) {
    const tokens = normalizeName(name).split(' ').filter((t) => t.length >= 4 && !['analytics', 'software', 'app', 'apps', 'labs', 'cloud', 'tools', 'online'].includes(t));
    if (tokens.some((t) => host.includes(t))) return name;
  }
  return null;
}

function outcomeOf(result: PromptResult): QuestionOutcome {
  if (!result.parsed) return 'failed';
  switch (result.parsed.mention_type) {
    case 'top_recommendation':
    case 'listed_among_others':
      return 'recommended';
    case 'passing_mention':
      return 'mentioned';
    default:
      return 'absent';
  }
}

/** One row per frozen question, using the same competitor matching as scoring. */
export function buildSnapshot(
  results: PromptResult[],
  competitors: string[],
  observedAt: string,
): OutreachSnapshot {
  const keys = competitors.map((name) => ({ name, key: normalizeName(name) }));
  const questions = results.map((result): OutreachQuestion => {
    const named = new Set<string>();
    for (const mention of result.parsed?.competitors_mentioned ?? []) {
      const key = normalizeName(mention?.name ?? '');
      const hit = keys.find((c) => c.key && key && (key.includes(c.key) || c.key.includes(key)));
      if (hit) named.add(hit.name);
    }
    const list = [...named];
    // The quote is the proof: when competitors were named, it must be a real
    // sentence that shows one by name — not a bare heading like "Fathom Analytics".
    let quote = cleanQuote(result.parsed?.evidence_quote ?? '');
    if (list.length && !isProofQuote(quote, list)) {
      const sentence = proofSentence(result.answerText ?? '', list);
      if (sentence) quote = sentence;
    }
    return {
      text: result.prompt.text,
      intent: result.prompt.intent,
      outcome: outcomeOf(result),
      competitors: list,
      quote,
      sources: [...new Set(result.citations.map((c) => c.domain).filter(Boolean))].slice(0, 6),
      ...(result.prompt.reason ? { reason: result.prompt.reason } : {}),
    };
  });
  return { observedAt, questions };
}

export interface SnapshotTotals {
  usable: number;
  appeared: number;
  recommended: number;
  /** competitor name → questions it appeared in */
  competitors: { name: string; count: number }[];
}

export function snapshotTotals(snapshot: OutreachSnapshot, competitors: string[]): SnapshotTotals {
  const usable = snapshot.questions.filter((q) => q.outcome !== 'failed');
  return {
    usable: usable.length,
    appeared: usable.filter((q) => q.outcome === 'recommended' || q.outcome === 'mentioned').length,
    recommended: usable.filter((q) => q.outcome === 'recommended').length,
    competitors: competitors
      .map((name) => ({ name, count: usable.filter((q) => q.competitors.includes(name)).length }))
      .sort((a, b) => b.count - a.count),
  };
}

const RANK: Record<Exclude<QuestionOutcome, 'failed'>, number> = { absent: 0, mentioned: 1, recommended: 2 };

export interface RecheckDiff {
  comparable: number;
  improved: number;
  declined: number;
  unchanged: number;
  rows: { text: string; before: QuestionOutcome; after: QuestionOutcome; change: 'improved' | 'declined' | 'unchanged' | 'not_comparable' }[];
}

/** Like-for-like: only identical question text observed successfully both times counts. */
export function compareSnapshots(baseline: OutreachSnapshot, current: OutreachSnapshot): RecheckDiff {
  const before = new Map(baseline.questions.map((q) => [q.text, q.outcome]));
  const rows: RecheckDiff['rows'] = current.questions.map((q) => {
    const prev = before.get(q.text);
    if (!prev || prev === 'failed' || q.outcome === 'failed') {
      return { text: q.text, before: prev ?? 'failed', after: q.outcome, change: 'not_comparable' };
    }
    const delta = RANK[q.outcome] - RANK[prev];
    return { text: q.text, before: prev, after: q.outcome, change: delta > 0 ? 'improved' : delta < 0 ? 'declined' : 'unchanged' };
  });
  const comparable = rows.filter((r) => r.change !== 'not_comparable');
  return {
    comparable: comparable.length,
    improved: comparable.filter((r) => r.change === 'improved').length,
    declined: comparable.filter((r) => r.change === 'declined').length,
    unchanged: comparable.filter((r) => r.change === 'unchanged').length,
    rows,
  };
}

/** URL-safe, unguessable, and never UUID-shaped (UUIDs route to customer reports). */
export function makeOutreachSlug(name: string, random: string): string {
  const base = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'audit';
  const suffix = random.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
  return `${base}-${suffix || '0'}`;
}

export function isOutreachSlug(id: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) && id.length <= 60;
}

export interface FirstMove {
  title: string;
  why: string;
  /** The audited questions this move targets, verbatim. */
  questions: string[];
}

const REVIEW_SITES = /(^|\.)(g2|capterra|getapp|softwareadvice|trustradius|alternativeto|producthunt|saasworthy)\./;
const COMMUNITY_SITES = /(^|\.)(reddit|news\.ycombinator|stackoverflow|quora)\./;
/** Independent "best X" / "X alternatives" / "X vs Y" sites. */
const COMPARISON_SITES = /alternative|versus|-vs-|compar|best-|top-?\d|review/;

/**
 * Software-specific, evidence-tied first moves. Each one cites what this
 * audit actually observed; nothing generic is promoted without evidence.
 */
export function firstMoves(file: OutreachReportFile, limit = 3): FirstMove[] {
  const name = file.report.business.name;
  const competitors = file.report.competitors.map((c) => c.name);
  const totals = snapshotTotals(file.current, competitors);
  const rival = totals.competitors[0]?.count ? totals.competitors[0].name : null;
  const missed = file.current.questions.filter((q) => q.outcome === 'absent' && q.competitors.length > 0);
  const comparisonMisses = missed.filter((q) => ['comparison', 'vendor_selection', 'transactional', 'commercial'].includes(q.intent));
  const domains = file.report.citationGap;
  const reviewSources = domains.filter((d) => REVIEW_SITES.test(d.domain));
  const communitySources = domains.filter((d) => COMMUNITY_SITES.test(d.domain));
  const moves: FirstMove[] = [];

  if (missed.length) {
    const targets = (comparisonMisses.length ? comparisonMisses : missed).slice(0, 4);
    moves.push({
      title: rival
        ? `Publish an honest "${name} vs ${rival}" page and a "${rival} alternatives" page`
        : `Publish pages that directly answer the questions you were missing from`,
      why: `In ${missed.length} of ${totals.usable} questions the answer named a competitor and not ${name}. AI assistants quote pages that answer the exact comparison buyers ask, so the page has to exist on your own site first.`,
      questions: targets.map((q) => q.text),
    });
  }

  if (reviewSources.length) {
    const list = reviewSources.slice(0, 3);
    moves.push({
      title: `Complete your profiles and collect reviews on ${list.map((d) => d.domain).join(', ')}`,
      why: `These review sites were cited as sources ${list.reduce((s, d) => s + d.count, 0)} times across the answers. They are where the AI looked when deciding who to name.`,
      questions: [],
    });
  }

  const comparisonSources = domains.filter((d) => !REVIEW_SITES.test(d.domain) && COMPARISON_SITES.test(d.domain) && !sourceOwner(d.domain, competitors));
  if (comparisonSources.length) {
    const list = comparisonSources.slice(0, 3);
    moves.push({
      title: `Get included on the comparison sites the answers cited: ${list.map((d) => d.domain).join(', ')}`,
      why: `Independent "best tools" and "alternatives" pages were cited ${list.reduce((s, d) => s + d.count, 0)} times. If ${name} isn't on them, the AI has nothing to copy ${name} from.`,
      questions: [],
    });
  }

  if (communitySources.length) {
    moves.push({
      title: `Answer real buyer threads on ${communitySources[0]!.domain}, openly as the founder`,
      why: `${communitySources[0]!.domain} was cited ${communitySources[0]!.count} time(s). Genuine, disclosed answers in threads buyers already read are a source AI keeps returning to. No fake accounts.`,
      questions: [],
    });
  }

  if (moves.length < limit) {
    const citedShare = file.report.scores.citationRate;
    moves.push({
      title: `Make your own site quotable: a clear "who it's for" page, FAQ, and structured data`,
      why: `${citedShare < 0.2
        ? `${possessive(name)} own website was cited in ${Math.round(citedShare * 100)}% of the answers.`
        : `${possessive(name)} website is already cited in ${Math.round(citedShare * 100)}% of the answers; make those pages answer more of the questions above.`} A page that states plainly what the product does, who it is for, and what it costs gives the AI something specific to quote.`,
      questions: [],
    });
  }
  return moves.slice(0, limit);
}

/** The single sentence the whole report (and the DM) is built around. */
export function headline(file: OutreachReportFile): string {
  const competitors = file.report.competitors.map((c) => c.name);
  const totals = snapshotTotals(file.current, competitors);
  const name = file.report.business.name;
  const top = totals.competitors[0];
  const lead = `Across ${totals.usable} buyer questions, Gemini named ${name} in ${totals.appeared}.`;
  return top && top.count > totals.appeared ? `${lead} It named ${top.name} in ${top.count}.` : lead;
}

/** Hand-sent first message. Short, specific, honest, with an opt-out line. */
export function draftMessage(file: OutreachReportFile, link: string, firstName?: string): string {
  const name = file.report.business.name;
  const competitors = file.report.competitors.map((c) => c.name);
  const miss = file.current.questions.find((q) => q.outcome === 'absent' && q.competitors.length > 0);
  const totals = snapshotTotals(file.current, competitors);
  const opener = miss
    ? `I asked Google's Gemini "${miss.text}"${/[.?!]$/.test(miss.text) ? '' : '.'} It recommended ${miss.competitors.slice(0, 2).join(' and ')}, not ${name}.`
    : `I ran ${totals.usable} real buyer questions about ${file.report.business.category} through Google's Gemini.`;
  return [
    `Hi ${firstName?.trim() || 'there'},`,
    '',
    `${opener} Across ${totals.usable} buyer questions, ${name} came up in ${totals.appeared}.`,
    '',
    `The full report, with the actual answers, is here: ${link}`,
    '',
    `Happy to walk you through what I'd fix first in 10 minutes. No pitch if it isn't useful.`,
    '',
    `(If this isn't relevant, just reply "no" and I won't follow up.)`,
  ].join('\n');
}
