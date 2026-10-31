// The plain-language report a business owner reads: one result, who AI pointed
// buyers to instead, and what it actually said. Built from the same canonical
// chain as the technical report; nothing here is invented. Quotes are sentences
// lifted verbatim from the recorded answers (markdown stripped).

import type { CanonicalIntelligenceReport } from '@/lib/reports/intelligence-contract';
import { observationOutcome } from '@/lib/reports/intelligence-contract';

export type SimpleVerdict = 'recommended' | 'mentioned' | 'missed' | 'unclear';

export interface SimpleQuestion {
  id: string;
  question: string;
  verdict: SimpleVerdict;
  /** One verbatim sentence from the answer, or null when none was retained. */
  quote: string | null;
  /** Tracked competitors named in this answer. */
  competitorsNamed: string[];
}

export interface SimpleReport {
  reportId: string;
  projectId: string;
  businessName: string;
  website: string;
  observedOn: string | null;
  engineLabel: string;
  total: number;
  recommended: number;
  mentioned: number;
  missed: number;
  unclear: number;
  headline: string;
  questions: SimpleQuestion[];
  competitors: Array<{ name: string; answers: number }>;
  sources: Array<{ domain: string; answers: number; isYou: boolean }>;
  /** Questions where AI clearly did not name the business: each is a fixable gap. */
  gaps: number;
  fixCount: number;
}

function stripMarkdown(line: string): string {
  return line
    .replace(/^\s*#{1,6}\s*/, '')
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/, '')
    .replace(/\*\*|__|`/g, '')
    .replace(/(\w)\*(?=[\s,.;:]|$)/g, '$1')
    .replace(/(^|\s)[*_](\S)/g, '$1$2')
    .replace(/(\S)[*_](\s|$)/g, '$1$2')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Answer lines (bullets and headings end without punctuation) split into sentences. */
function sentences(text: string): string[] {
  return text
    .replace(/```[\s\S]*?```/g, '\n')
    .split(/\n+/)
    .map(stripMarkdown)
    .filter((line) => line && !/^-{3,}$/.test(line))
    .flatMap((line) => line.split(/(?<=[.!?])\s+(?=[A-Z0-9“"(])/))
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 25);
}

function normalize(text: string): string {
  return ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;
}

function nameVariants(name: string): string[] {
  const base = normalize(name.replace(/\b(pvt|private|ltd|limited|llp|inc|india|composite panels?|panels?|acp)\b\.?/gi, '')).trim();
  return [...new Set([base, base.replace(/\s+/g, '')].filter((variant) => variant.length >= 3))];
}

/** Whole-word match, so "Alstone" never matches inside "natural stone". */
function mentions(text: string, name: string): boolean {
  const haystack = normalize(text);
  return nameVariants(name).some((variant) => haystack.includes(` ${variant} `));
}

function clip(sentence: string, limit = 240): string {
  if (sentence.length <= limit) return sentence;
  const cut = sentence.slice(0, limit);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

/** The most telling sentence: one naming the business, else a competitor, else a brand list, else the opening. */
function pickQuote(raw: string | null, businessName: string, competitors: string[]): string | null {
  if (!raw) return null;
  const all = sentences(raw);
  if (!all.length) return null;
  // Lead-ins ("It depends on the component:") and bare section headings
  // ("Major Tandoor Manufacturers") say nothing on their own.
  const complete = all.filter((sentence) => !sentence.endsWith(':') && (/[.!?)]$/.test(sentence) || sentence.split(/\s+/).length >= 12));
  const naming = complete.find((sentence) => mentions(sentence, businessName)) ?? all.find((sentence) => mentions(sentence, businessName));
  const competitor = all.find((sentence) => competitors.some((name) => mentions(sentence, name)));
  const brands = all.find((sentence) => /\b(brands?|manufacturers?|suppliers?|companies|providers?|options include)\b/i.test(sentence) && /[A-Z][a-z]+.*,.*[A-Z]/.test(sentence));
  const advice = complete.find((sentence) => /\b(recommended|best|ideal|most popular|top choice)\b/i.test(sentence));
  return clip(naming ?? competitor ?? brands ?? advice ?? complete[0] ?? all[0]!);
}

function registrable(domain: string): string {
  return domain.toLowerCase().replace(/^www\./, '');
}

export function buildSimpleReport(report: CanonicalIntelligenceReport, trackedCompetitors: string[] = []): SimpleReport {
  const businessName = report.business.business.name || 'Your business';
  const website = report.business.business.website ?? '';
  const ownDomain = website ? registrable(website.replace(/^https?:\/\//, '').split('/')[0]!) : '';
  const competitors = [...new Set(trackedCompetitors.map((name) => name.trim()).filter(Boolean))];

  const questions: SimpleQuestion[] = report.observationRun.observations.map((observation) => {
    const outcome = observationOutcome(observation);
    const verdict: SimpleVerdict = outcome === 'RECOMMENDED' ? 'recommended'
      : outcome === 'MENTIONED' ? 'mentioned'
        : outcome === 'NOT_MENTIONED' ? 'missed' : 'unclear';
    const text = observation.rawResponse ?? '';
    return {
      id: observation.id,
      question: observation.exactQuestion,
      verdict,
      quote: pickQuote(text, businessName, competitors),
      competitorsNamed: competitors.filter((name) => mentions(text, name)),
    };
  });

  const order: Record<SimpleVerdict, number> = { missed: 0, unclear: 1, mentioned: 2, recommended: 3 };
  // Answers that name a tracked competitor are the strongest proof, so they lead.
  questions.sort((a, b) => Number(b.competitorsNamed.length > 0) - Number(a.competitorsNamed.length > 0)
    || order[a.verdict] - order[b.verdict]
    || b.competitorsNamed.length - a.competitorsNamed.length);

  const count = (verdict: SimpleVerdict) => questions.filter((question) => question.verdict === verdict).length;
  const recommended = count('recommended');
  const mentioned = count('mentioned');
  const missed = count('missed');
  const unclear = count('unclear');
  const total = questions.length;
  const named = recommended + mentioned;

  const sourceAnswers = new Map<string, Set<string>>();
  for (const observation of report.observationRun.observations) {
    for (const source of observation.sources ?? []) {
      if (!source.domain) continue;
      const domain = registrable(source.domain);
      if (!sourceAnswers.has(domain)) sourceAnswers.set(domain, new Set());
      sourceAnswers.get(domain)!.add(observation.id);
    }
  }
  const sources = [...sourceAnswers]
    .map(([domain, ids]) => ({ domain, answers: ids.size, isYou: Boolean(ownDomain) && (domain === ownDomain || domain.endsWith(`.${ownDomain}`)) }))
    .sort((a, b) => b.answers - a.answers || Number(b.isYou) - Number(a.isYou))
    .slice(0, 6);

  const competitorCounts = competitors
    .map((name) => ({ name, answers: questions.filter((question) => question.competitorsNamed.includes(name)).length }))
    .filter((item) => item.answers > 0)
    .sort((a, b) => b.answers - a.answers);

  const headline = named === 0
    ? `AI didn’t mention ${businessName} in any of the ${total} questions your buyers ask.`
    : `AI mentioned ${businessName} in ${named} of the ${total} questions your buyers ask.`;

  return {
    reportId: report.id,
    projectId: report.projectId,
    businessName,
    website,
    observedOn: report.summary.observationDate,
    engineLabel: 'Google Gemini with live Google Search',
    total,
    recommended,
    mentioned,
    missed,
    unclear,
    headline,
    questions,
    competitors: competitorCounts,
    sources,
    gaps: missed,
    fixCount: report.interventionRun.interventions.length,
  };
}
