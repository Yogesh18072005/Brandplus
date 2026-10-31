// Stage 5.5 scoring + §5.6 report contract — pure functions, no I/O, no LLM.
// Everything here is deterministic and unit-tested (scoring.test.ts).

import type { AuditInput, Competitor, EngineName, MentionType, PromptResult } from './types';
import { extractDomain, normalizeName, extractEvidenceSentence } from './matching';
import { buildFixPlan, type FixPlan } from './fix-plan';
import { getIntentWeight, intentIsCommercial, INTENT_WEIGHTS } from './intents';

export { INTENT_WEIGHTS, getIntentWeight } from './intents';

// Per-prompt brand score (CLAUDE.md §5.5 — implement exactly).
export const MENTION_SCORES: Record<MentionType, number> = {
  top_recommendation: 1.0,
  listed_among_others: 0.6,
  passing_mention: 0.3,
  absent: 0.0,
};

// High-commercial-intent = a buyer ready to transact (price/wholesale/"best"/
// "near me"/specific-need). Losing these hurts most — they're the money queries.
const COMMERCIAL_INTENTS = new Set(['budget', 'direct_best', 'need_specific', 'near_me']);
const COMMERCIAL_WORDS =
  /\b(price|prices|cost|rate|rates|cheap|cheapest|wholesale|bulk|budget|affordable|quote|supplier|buy|hire|book|order)\b|near me/i;

export function isCommercialIntent(intent: string | undefined, promptText = ''): boolean {
  return intentIsCommercial(intent) || (!!intent && COMMERCIAL_INTENTS.has(intent)) || COMMERCIAL_WORDS.test(promptText);
}

// §5.6 report data contract — the report page consumes exactly this.
export interface ReportData {
  business: { name: string; category: string; city: string; website: string };
  generatedAt: string; // ISO-8601
  totals: {
    promptCount: number;
    enginesUsed: EngineName[];
    /** extension: prompts that errored/skipped — lets the report say "partial data" */
    failedPrompts: number;
  };
  scores: {
    /** Legacy mention-only score retained for historical comparability. */
    visibilityScore: number;
    /** Explainable intent-weighted BrandPulse score for current product surfaces. */
    brandpulseScore: number;
    presenceRate: number;
    recommendationRate: number;
    citationRate: number;
    shareOfVoice: number;
    commercialVisibility: number;
    promptCoverage: number;
    sourceQualityRate: number;
    components: {
      mention: number;
      recommendation: number;
      position: number;
      citation: number;
      competitive: number;
      sourceQuality: number;
    };
  };
  competitors: { name: string; presenceRate: number }[];
  byEngine: { engine: EngineName; presenceRate: number }[];
  missedPrompts: { prompt: string; intent: string; commercial: boolean; competitorsPresent: string[]; evidence: string }[];
  citationGap: { domain: string; count: number }[];
  sources: {
    url: string;
    domain: string;
    title?: string;
    sourceType: 'brand' | 'directory' | 'marketplace' | 'editorial' | 'other';
    observedCount: number;
  }[];
  fixPlan: FixPlan; // D3 — auto-generated prescription
}

function classifySource(domain: string, brandDomain: string): ReportData['sources'][number]['sourceType'] {
  if (domain === brandDomain) return 'brand';
  if (/indiamart|justdial|tradeindia|clutch|g2|capterra|getapp|softwareadvice|trustradius|alternativeto|producthunt|saasworthy|sourceforge|softwaresuggest/.test(domain)) return 'directory';
  if (/amazon|flipkart|alibaba|moglix/.test(domain)) return 'marketplace';
  if (/news|times|post|journal|magazine|medium/.test(domain)) return 'editorial';
  return 'other';
}

/** Match a name the parser saw (e.g. "Clove Dental Delhi - South Ex 1") to a tracked competitor. */
export function matchTrackedCompetitor(seenName: string, competitors: Competitor[]): Competitor | null {
  const seen = normalizeName(seenName);
  if (seen === '') return null;
  for (const comp of competitors) {
    const candidates = [comp.name, ...(comp.aliases ?? [])].map(normalizeName);
    if (candidates.some((c) => c !== '' && (seen.includes(c) || c.includes(seen)))) return comp;
  }
  return null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function scorePromptObservation(result: PromptResult): {
  score: number;
  weight: number;
  components: ReportData['scores']['components'];
} {
  const parsed = result.parsed;
  const weight = result.prompt.intentWeight ?? getIntentWeight(result.prompt.intent);
  if (!parsed) {
    return { score: 0, weight, components: { mention: 0, recommendation: 0, position: 0, citation: 0, competitive: 0, sourceQuality: 0 } };
  }
  const mention = MENTION_SCORES[parsed.mention_type] ?? 0;
  const recommendation = parsed.mention_type === 'top_recommendation'
    ? 1
    : parsed.mention_type === 'listed_among_others'
      ? 0.7
      : parsed.mention_type === 'passing_mention' ? 0.2 : 0;
  const position = parsed.brand_rank == null
    ? (parsed.mention_type === 'top_recommendation' ? 1 : parsed.mention_type === 'listed_among_others' ? 0.5 : 0)
    : parsed.brand_rank <= 1 ? 1 : parsed.brand_rank <= 3 ? 0.75 : parsed.brand_rank <= 5 ? 0.5 : 0.25;
  const citation = parsed.brand_cited ? 1 : 0;
  const competitors = parsed.competitors_mentioned.filter((item) => item.is_tracked_competitor).length;
  const competitive = parsed.mention_type === 'absent' ? 0 : 1 / (1 + competitors * 0.5);
  const sourceQuality = result.grounded === false
    ? 0
    : result.citations.length >= 3 ? 1 : result.citations.length > 0 ? 0.65 : 0;
  const components = { mention, recommendation, position, citation, competitive, sourceQuality };
  const score = mention * 0.35 + recommendation * 0.2 + position * 0.1 + citation * 0.15 + competitive * 0.1 + sourceQuality * 0.1;
  return { score, weight, components };
}

export function buildReport(
  input: AuditInput,
  results: PromptResult[],
  generatedAt: Date = new Date()
): ReportData {
  const ok = results.filter((r) => r.parsed !== null);
  const failed = results.length - ok.length;

  // --- Visibility Score & Presence Rate ---
  const perPromptScores = ok.map((r) => MENTION_SCORES[r.parsed!.mention_type] ?? 0);
  const mean = perPromptScores.length
    ? perPromptScores.reduce((s, v) => s + v, 0) / perPromptScores.length
    : 0;
  const visibilityScore = Math.round(mean * 100);

  const observations = ok.map(scorePromptObservation);
  const totalIntentWeight = observations.reduce((sum, item) => sum + item.weight, 0);
  const brandpulseScore = Math.round(
    (totalIntentWeight ? observations.reduce((sum, item) => sum + item.score * item.weight, 0) / totalIntentWeight : 0) * 100,
  );
  const componentKeys = ['mention', 'recommendation', 'position', 'citation', 'competitive', 'sourceQuality'] as const;
  const components = Object.fromEntries(componentKeys.map((key) => [
    key,
    Math.round((totalIntentWeight ? observations.reduce((sum, item) => sum + item.components[key] * item.weight, 0) / totalIntentWeight : 0) * 100),
  ])) as ReportData['scores']['components'];

  // mention_type is the categorical source of truth (CLAUDE.md §5.5: "absent"
  // means not mentioned). Some parsers emit an incoherent brand_mentioned=true
  // WITH mention_type=absent; derive presence from mention_type so presence and
  // the visibility score can never disagree.
  const isPresent = (p: PromptResult['parsed']): boolean => !!p && p.mention_type !== 'absent';
  const mentionedCount = ok.filter((r) => isPresent(r.parsed)).length;
  const presenceRate = ok.length ? round2(mentionedCount / ok.length) : 0;
  const recommendationRate = ok.length
    ? round2(ok.filter((r) => ['top_recommendation', 'listed_among_others'].includes(r.parsed!.mention_type)).length / ok.length)
    : 0;
  const citationRate = ok.length ? round2(ok.filter((r) => r.parsed!.brand_cited).length / ok.length) : 0;
  const commercial = ok.filter((r) => isCommercialIntent(r.prompt.intent, r.prompt.text));
  const commercialWeight = commercial.reduce((sum, result) => sum + (result.prompt.intentWeight ?? getIntentWeight(result.prompt.intent)), 0);
  const commercialVisibility = commercialWeight
    ? round2(commercial.reduce((sum, result) => sum + (MENTION_SCORES[result.parsed!.mention_type] ?? 0) * (result.prompt.intentWeight ?? getIntentWeight(result.prompt.intent)), 0) / commercialWeight)
    : 0;
  const promptCoverage = results.length ? round2(ok.length / results.length) : 0;
  const sourceQualityRate = components.sourceQuality / 100;

  // --- Per-competitor presence + Share of Voice ---
  // A competitor "is present" in a prompt if any parsed mention matches it.
  const compPresence = new Map<string, number>(input.competitors.map((c) => [c.name, 0]));
  for (const r of ok) {
    const seenTracked = new Set<string>();
    for (const m of (r.parsed!.competitors_mentioned ?? [])) {
      if (!m?.name) continue;
      const match = matchTrackedCompetitor(m.name, input.competitors);
      if (match) seenTracked.add(match.name);
    }
    for (const name of seenTracked) compPresence.set(name, (compPresence.get(name) ?? 0) + 1);
  }

  const totalCompetitorMentions = [...compPresence.values()].reduce((s, v) => s + v, 0);
  const sovDenominator = mentionedCount + totalCompetitorMentions;
  const shareOfVoice = sovDenominator ? round2(mentionedCount / sovDenominator) : 0;

  const competitors = input.competitors.map((c) => ({
    name: c.name,
    presenceRate: ok.length ? round2((compPresence.get(c.name) ?? 0) / ok.length) : 0,
  }));

  // --- Per-engine presence rate ---
  const engines = [...new Set(results.map((r) => r.engine))];
  const byEngine = engines.map((engine) => {
    const engineOk = ok.filter((r) => r.engine === engine);
    const engineMentioned = engineOk.filter((r) => isPresent(r.parsed)).length;
    return { engine, presenceRate: engineOk.length ? round2(engineMentioned / engineOk.length) : 0 };
  });

  // --- Missed high-value prompts ---
  // Brand absent AND ≥1 tracked competitor present; sort by competitor count desc; top 10.
  const missedPrompts = ok
    .map((r) => {
      const tracked = new Set<string>();
      for (const m of (r.parsed!.competitors_mentioned ?? [])) {
      if (!m?.name) continue;
        const match = matchTrackedCompetitor(m.name, input.competitors);
        if (match) tracked.add(match.name);
      }
      return { r, tracked: [...tracked] };
    })
    .filter(({ r, tracked }) => r.parsed!.mention_type === 'absent' && tracked.length >= 1)
    // Lead with commercial-intent losses (ready-to-buy searches), then by how
    // many competitors won them.
    .sort((a, b) => {
      const ca = isCommercialIntent(a.r.prompt.intent, a.r.prompt.text) ? 1 : 0;
      const cb = isCommercialIntent(b.r.prompt.intent, b.r.prompt.text) ? 1 : 0;
      return cb - ca || b.tracked.length - a.tracked.length;
    })
    .slice(0, 10)
    .map(({ r, tracked }) => {
      // Backfill the evidence quote deterministically for cached data with none.
      let evidence = (r.parsed!.evidence_quote ?? '').trim();
      if (!evidence) {
        const names = [...tracked, ...r.parsed!.competitors_mentioned.map((c) => c.name)];
        evidence = extractEvidenceSentence(r.answerText ?? '', names);
      }
      return {
        prompt: r.prompt.text,
        intent: r.prompt.intent,
        commercial: isCommercialIntent(r.prompt.intent, r.prompt.text),
        competitorsPresent: tracked,
        evidence,
      };
    });

  // --- Citation gap ---
  // Union of grounded citation domains + parser-extracted domains, counted once
  // per prompt, excluding the brand's own domain.
  const brandDomain = extractDomain(input.website);
  const domainCounts = new Map<string, number>();
  for (const r of ok) {
    const domains = new Set<string>([
      ...r.citations.map((c) => c.domain),
      ...(r.parsed!.cited_domains ?? []).filter(Boolean).map((d) => extractDomain(d)),
    ]);
    for (const d of domains) {
      if (!d || d === brandDomain) continue;
      domainCounts.set(d, (domainCounts.get(d) ?? 0) + 1);
    }
  }
  const citationGap = [...domainCounts.entries()]
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain))
    .slice(0, 10);

  const sourceMap = new Map<string, ReportData['sources'][number]>();
  for (const result of ok) {
    for (const citation of result.citations) {
      const domain = extractDomain(citation.domain || citation.url);
      if (!domain || !citation.url) continue;
      const key = citation.url;
      const existing = sourceMap.get(key);
      if (existing) existing.observedCount += 1;
      else sourceMap.set(key, {
        url: citation.url,
        domain,
        ...(citation.title ? { title: citation.title } : {}),
        sourceType: classifySource(domain, brandDomain),
        observedCount: 1,
      });
    }
  }
  const sources = [...sourceMap.values()]
    .sort((a, b) => b.observedCount - a.observedCount || a.domain.localeCompare(b.domain))
    .slice(0, 20);

  const business = { name: input.businessName, category: input.category, city: input.city, website: input.website };

  // D3 — the Fix Plan is derived deterministically from the metrics above.
  const fixPlan = buildFixPlan({
    business,
    citationGap,
    missedPrompts,
    competitors: input.competitors,
    totalPrompts: results.length,
  });

  return {
    business,
    generatedAt: generatedAt.toISOString(),
    totals: { promptCount: results.length, enginesUsed: engines, failedPrompts: failed },
    scores: {
      visibilityScore,
      brandpulseScore,
      presenceRate,
      recommendationRate,
      citationRate,
      shareOfVoice,
      commercialVisibility,
      promptCoverage,
      sourceQualityRate,
      components,
    },
    competitors,
    byEngine,
    missedPrompts,
    citationGap,
    sources,
    fixPlan,
  };
}
