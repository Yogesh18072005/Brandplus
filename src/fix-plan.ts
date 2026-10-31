// D3 — THE FIX PLAN. A deterministic "prescription" generated from audit data
// (no LLM: every line is derived from the real report, nothing invented).
//
// Design principle (learned from real reports): the DIAGNOSIS is already
// specific — so the fix plan must be too. We LEAD with the custom, query-tied
// fixes ("here's the page to build and the exact searches it wins, and who beat
// you on them"), tie the fast lever to the sources AI ALREADY cites, and demote
// the generic foundations to a "basics" footer. Order matters: value first.

import type { Competitor } from './types';
import { extractDomain, normalizeName } from './matching';

export type Effort = 'easy' | 'medium' | 'hard';
export type Impact = 'high' | 'medium' | 'low';
export type ItemStatus = 'todo' | 'done';

export interface FixItem {
  id: string;
  title: string; // the action line
  detail: string; // why / how, in owner language
  effort: Effort;
  impact: Impact;
  status: ItemStatus; // default 'todo'; user-checkable on paid plans
  actionable: boolean; // false = informational (e.g. competitor-owned site)
  /** The exact buyer searches this fix targets — enables the 30-day re-check. */
  targetsQueries?: string[];
}

export type FixSectionKey = 'answer_questions' | 'get_listed' | 'structured_data' | 'foundations';

export interface FixSection {
  key: FixSectionKey;
  title: string;
  intro: string;
  items: FixItem[];
}

export interface ExecutionItem extends FixItem {
  /** Explicit order for the customer-facing execution queue. */
  rank: number;
  sourceSection: FixSectionKey;
  /** Short evidence-led explanation, separate from the implementation brief. */
  whyItMatters: string;
  /** The concrete asset or change the customer should produce and publish themselves. */
  deliverable: string;
  /** Always present so the UI can state when no missed query was available. */
  targetsQueries: string[];
}

export interface FixPlan {
  generatedAt: string;
  sections: FixSection[];
  /** Ranked customer-facing queue. Full sections remain available as audit evidence. */
  executionQueue: ExecutionItem[];
  jsonLd: { localBusiness: Record<string, unknown>; faqPage: Record<string, unknown> };
  summary: { totalActions: number; quickWins: number; leadInsight: string };
}

interface MissedPrompt {
  prompt: string;
  competitorsPresent: string[];
  evidence: string;
  commercial?: boolean;
  intent?: string;
}

interface FixPlanInput {
  business: { name: string; category: string; city: string; website: string };
  citationGap: { domain: string; count: number }[];
  missedPrompts: MissedPrompt[];
  competitors: Competitor[];
  totalPrompts: number;
}

// ─────────────────────── domain classification (for the fast lever) ───────────────────────

const KNOWN_DIRECTORIES = new Set([
  'justdial.com', 'sulekha.com', 'indiamart.com', 'tradeindia.com', 'exportersindia.com',
  'connect2india.com', 'indiayellowpages.com', 'yellowpages.in', 'yelp.com', 'clutch.co',
  'ambitionbox.com', 'mouthshut.com', 'grotal.com', 'thomasnet.com', 'kompass.com',
  'go4worldbusiness.com', 'trustpilot.com', 'glassdoor.com', 'facebook.com', 'linkedin.com',
]);
const COMMUNITY_HOSTS = /(^|\.)(quora|reddit|medium|wikipedia|youtube|blogspot|wordpress)\.|\.gov(\.|$)|(^|\.)news/;

type DomainClass = 'directory' | 'competitor' | 'provider' | 'community';

function classifyDomain(domain: string, competitors: Competitor[]): DomainClass {
  const label = normalizeName(domain.replace(/\.[a-z.]+$/, ''));
  for (const c of competitors) {
    const cn = normalizeName(c.name);
    if (cn && label && (label.includes(cn) || cn.includes(label))) return 'competitor';
  }
  if (KNOWN_DIRECTORIES.has(domain)) return 'directory';
  if (COMMUNITY_HOSTS.test(domain)) return 'community';
  return 'provider';
}

// ─────────────────────── shared helpers ───────────────────────

/** Who beat this business most across the missed searches — the "top rival". */
function topRival(missed: MissedPrompt[]): { name: string; count: number } | null {
  const tally = new Map<string, number>();
  for (const m of missed) for (const c of m.competitorsPresent) tally.set(c, (tally.get(c) ?? 0) + 1);
  const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
  return top ? { name: top[0], count: top[1] } : null;
}

function uniq(xs: string[]): string[] {
  return [...new Set(xs)];
}

// ─────────────────────── Section 1 (LEADS): answer the questions you're losing ───────────────────────

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'to', 'of', 'in', 'on', 'at', 'is', 'are', 'do', 'does',
  'can', 'i', 'my', 'me', 'you', 'your', 'who', 'what', 'where', 'how', 'which', 'need', 'looking',
  'find', 'best', 'top', 'near', 'good', 'reliable', 'cheap', 'affordable', 'budget', 'company',
  'companies', 'services', 'service', 'agent', 'agents', 'get', 'help', 'want', 'should', 'with',
  'from', 'any', 'there', 'that', 'this', 'about', 'right', 'now', 'some', 'most', 'out', 'based',
]);

function significantWords(text: string, extraStop: Set<string>): string[] {
  return normalizeName(text)
    .split(' ')
    .filter((w) => w.length > 3 && !/\d/.test(w) && !STOPWORDS.has(w) && !extraStop.has(w));
}

function answerQuestionsSection(input: FixPlanInput): FixSection {
  const extraStop = new Set<string>([
    ...normalizeName(input.business.city).split(' '),
    ...normalizeName(input.business.category).split(' '),
  ]);

  const freq = new Map<string, number>();
  const perPrompt = input.missedPrompts.map((m) => {
    const words = significantWords(m.prompt, extraStop);
    for (const w of new Set(words)) freq.set(w, (freq.get(w) ?? 0) + 1);
    return { m, words };
  });

  interface Cluster { anchor: string; prompts: MissedPrompt[]; weight: number; commercial: boolean }
  const clusters = new Map<string, Cluster>();
  for (const { m, words } of perPrompt) {
    const anchor = words.sort((a, b) => (freq.get(b) ?? 0) - (freq.get(a) ?? 0) || a.localeCompare(b))[0] ?? 'general';
    const c = clusters.get(anchor) ?? { anchor, prompts: [], weight: 0, commercial: false };
    c.prompts.push(m);
    c.weight += Math.max(1, m.competitorsPresent.length);
    c.commercial = c.commercial || !!m.commercial;
    clusters.set(anchor, c);
  }

  // Commercial (ready-to-buy) clusters first, then by competitor pressure.
  const sorted = [...clusters.values()].sort(
    (a, b) => Number(b.commercial) - Number(a.commercial) || b.weight - a.weight
  );
  const head = sorted.slice(0, 6);
  const tail = sorted.slice(6);
  if (tail.length) {
    head.push({
      anchor: 'other',
      prompts: tail.flatMap((c) => c.prompts),
      weight: tail.reduce((s, c) => s + c.weight, 0),
      commercial: tail.some((c) => c.commercial),
    });
  }

  const items: FixItem[] = head.map((c) => {
    const questions = c.prompts.map((p) => p.prompt);
    // Representative = the search where the most competitors beat you.
    const rep = [...c.prompts].sort((a, b) => b.competitorsPresent.length - a.competitorsPresent.length)[0];
    const rivals = uniq(c.prompts.flatMap((p) => p.competitorsPresent));
    const n = questions.length;
    const commercialLine = c.commercial
      ? ' These are high-intent, ready-to-buy searches — the most valuable to win back.'
      : '';
    const detail =
      `AI named ${rivals.join(', ') || 'competitors'} — not you — on ${n} search${n === 1 ? '' : 'es'} this page would target:\n` +
      questions.map((q) => `   • ${q}`).join('\n') +
      commercialLine;
    return {
      id: `content-${c.anchor}`,
      title: `Publish a page that answers: “${rep?.prompt ?? questions[0]}”`,
      detail,
      effort: 'medium',
      impact: c.commercial || c.weight >= 3 ? 'high' : 'medium',
      status: 'todo',
      actionable: true,
      targetsQueries: questions,
    };
  });

  const rival = topRival(input.missedPrompts);
  return {
    key: 'answer_questions',
    title: 'Win back the searches you’re losing',
    intro: rival
      ? `On these real buyer searches, AI named ${rival.name} and not you. Each block below is one page worth writing — it maps directly to the searches it recovers. Start at the top.`
      : 'These are the real buyer searches where AI named a competitor instead of you. Each block is one page worth writing.',
    items,
  };
}

// ─────────────────────── Section 2: the fast lever (sources AI already cites) ───────────────────────

function getListedSection(input: FixPlanInput): FixSection {
  const total = input.totalPrompts;
  const ranked = input.citationGap.map((c) => ({ ...c, cls: classifyDomain(c.domain, input.competitors) }));

  const items: FixItem[] = [];

  // Directories AI ALREADY cites = the fastest way to appear (ride a page it trusts).
  const directories = ranked.filter((r) => r.cls === 'directory').sort((a, b) => b.count - a.count).slice(0, 4);
  for (const d of directories) {
    items.push({
      id: `listing-${d.domain}`,
      title: `Get fully listed on ${d.domain} — AI already cites it ${d.count}×`,
      detail: `AI pulled from ${d.domain} in ${d.count} of ${total} answers in your category. A complete, accurate listing puts your business on a source the audit already observed; it does not guarantee an AI mention.`,
      effort: 'easy',
      impact: 'high',
      status: 'todo',
      actionable: true,
    });
  }

  // Collapse the rival/other-provider sites into ONE "why you're losing" insight,
  // instead of many generic "claim X" lines.
  const rivalsSites = ranked
    .filter((r) => r.cls === 'competitor' || r.cls === 'provider')
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
  if (rivalsSites.length) {
    const list = rivalsSites.map((r) => `${r.domain} (${r.count}×)`).join(', ');
    items.push({
      id: 'why-losing',
      title: 'Why they win: AI trusts their own pages',
      detail: `AI leans on ${list} — competitor and provider sites with deep, readable content AI can quote. You can’t edit their pages; you displace them with the pages above and the listings here, giving AI a reason to name you instead.`,
      effort: 'medium',
      impact: 'medium',
      status: 'todo',
      actionable: false,
    });
  }

  return {
    key: 'get_listed',
    title: 'Get onto the sources AI already trusts',
    intro: 'AI reuses a handful of sources across your category. Getting onto the ones it already cites is the fastest lever — you borrow a page AI trusts instead of waiting to build your own authority.',
    items,
  };
}

// ─────────────────────── Section 3: ready-to-paste JSON-LD ───────────────────────

function buildJsonLd(input: FixPlanInput): FixPlan['jsonLd'] {
  const url = input.business.website.startsWith('http') ? input.business.website : `https://${input.business.website}`;
  const localBusiness = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: input.business.name,
    url,
    _status: 'draft_requires_business_verification',
  };

  const topQuestions = input.missedPrompts.slice(0, 5).map((m) => m.prompt);
  const faqPage = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    _status: 'verified_answer_required_before_publication',
    mainEntity: topQuestions.map((q) => ({
      '@type': 'Question',
      name: q,
      _status: 'verified_answer_required_before_publication',
    })),
  };

  return { localBusiness, faqPage };
}

function structuredDataSection(): FixSection {
  return {
    key: 'structured_data',
    title: 'Validate structured data',
    intro: 'Technical validation only. Publish markup after a person verifies every business fact and writes the visible page content it describes.',
    items: [
      {
        id: 'jsonld-organization',
        title: 'Verify an Organization markup draft',
        detail: 'Confirm the legal name and canonical website before implementation. The audit did not verify an address, phone number, service area, or other LocalBusiness facts.',
        effort: 'easy',
        impact: 'low',
        status: 'todo',
        actionable: false,
      },
      {
        id: 'jsonld-faqpage',
        title: 'Write and verify answers before considering FAQ markup',
        detail: 'Only mark up answers that are truthful, visible on the published page, and approved by the business. The audit supplies questions, not business claims.',
        effort: 'medium',
        impact: 'low',
        status: 'todo',
        actionable: false,
      },
    ],
  };
}

// ─────────────────────── Section 4 (footer): the basics ───────────────────────

function foundationsSection(): FixSection {
  const items: FixItem[] = [
    {
      id: 'foundation-gbp',
      title: 'Check whether a Google Business Profile is relevant and current',
      detail: 'Confirm the business is eligible, then inspect its current fields and verification state. This audit did not inspect the profile, so no change is prescribed yet.',
      effort: 'easy',
      impact: 'low',
      status: 'todo',
      actionable: false,
    },
    {
      id: 'foundation-nap',
      title: 'Verify business identity details across owned profiles',
      detail: 'Compare the approved legal or trading name, contact details, and service area. This audit did not observe inconsistencies.',
      effort: 'easy',
      impact: 'low',
      status: 'todo',
      actionable: false,
    },
    {
      id: 'foundation-reviews',
      title: 'Review the current customer-proof strategy',
      detail: 'Inspect the quantity, recency, authenticity, and policy compliance of existing reviews before setting a target. This audit did not measure them.',
      effort: 'medium',
      impact: 'low',
      status: 'todo',
      actionable: false,
    },
    {
      id: 'foundation-text',
      title: 'Check whether key services are visible in readable page text',
      detail: 'Inspect the live site before changing it. The answer audit did not crawl or validate the website content.',
      effort: 'easy',
      impact: 'low',
      status: 'todo',
      actionable: false,
    },
  ];
  return {
    key: 'foundations',
    title: 'Validation checklist',
    intro: 'These checks require direct inspection. They remain informational until evidence confirms a specific problem.',
    items,
  };
}

function deliverableFor(item: FixItem, sourceSection: FixSectionKey): string {
  if (sourceSection === 'answer_questions') {
    const queryCount = item.targetsQueries?.length ?? 0;
    return `One service or FAQ page draft that directly answers ${queryCount || 'the'} target buyer question${queryCount === 1 ? '' : 's'}. Include your offer, service area, verifiable proof (such as a case study, certification, or customer result), and one clear enquiry action. Review it, then publish it on your website.`;
  }

  if (sourceSection === 'get_listed') {
    const domain = item.id.startsWith('listing-') ? item.id.slice('listing-'.length) : 'the cited directory';
    return `A complete ${domain} business profile using the same name, phone, address or service area, category, description, services, proof photos, and website URL as your site. Submit it manually and save the live profile URL for the re-check.`;
  }

  if (item.id === 'foundation-gbp') {
    return 'A fully completed and verified Google Business Profile: primary and secondary categories, services, hours, service area, business description, website, phone, and recent proof photos. Save the live profile URL after reviewing every field.';
  }

  if (item.id === 'jsonld-localbusiness') {
    return 'Validated LocalBusiness JSON-LD using the supplied block. Have whoever manages the website add it to the homepage, test it with Google’s Rich Results Test, and record the published URL.';
  }

  if (item.id === 'jsonld-faqpage') {
    return 'A reviewed FAQ section with specific, truthful answers plus validated FAQPage JSON-LD. Publish both on the same relevant page and record its URL.';
  }

  return `${item.title}. Complete the change manually, verify it on the live site or profile, and save the published URL for the next audit.`;
}

/**
 * Convert the full evidence-backed plan into a deliberately small execution queue.
 * One item per lever comes first so three similar content tasks cannot crowd out
 * a faster listing or foundation fix. Remaining actionable items are only used
 * when one of those levers has no evidence-backed candidate.
 */
export function buildExecutionQueue(sections: FixSection[]): ExecutionItem[] {
  const allActionable = sections.flatMap((section) =>
    section.items
      .filter((item) =>
        item.actionable &&
        (section.key === 'get_listed' || (item.targetsQueries?.length ?? 0) > 0)
      )
      .map((item) => ({ item, section }))
  );

  const preferredSections: FixSectionKey[] = ['answer_questions', 'get_listed'];
  const selected: typeof allActionable = [];

  for (const key of preferredSections) {
    const candidate = allActionable.find(({ section }) => section.key === key);
    if (candidate) selected.push(candidate);
    if (selected.length === 3) break;
  }

  for (const candidate of allActionable) {
    if (selected.length === 3) break;
    if (!selected.some(({ item }) => item.id === candidate.item.id)) selected.push(candidate);
  }

  return selected.map(({ item, section }, index) => ({
    ...item,
    rank: index + 1,
    sourceSection: section.key,
    whyItMatters: item.detail.split('\n')[0]?.trim() || section.intro,
    deliverable: deliverableFor(item, section.key),
    targetsQueries: uniq(item.targetsQueries ?? []).slice(0, 5),
  }));
}

export function buildFixPlan(input: FixPlanInput): FixPlan {
  // Value-first order: the custom, query-tied work leads; basics come last.
  const sections = [
    answerQuestionsSection(input),
    getListedSection(input),
    structuredDataSection(),
    foundationsSection(),
  ];
  const executionQueue = buildExecutionQueue(sections);
  const allItems = sections.flatMap((s) => s.items).filter((i) => i.actionable);
  const quickWins = allItems.filter((i) => i.effort === 'easy' && i.impact === 'high').length;

  const rival = topRival(input.missedPrompts);
  const commercialLosses = input.missedPrompts.filter((m) => m.commercial).length;
  const leadInsight = rival
    ? commercialLosses > 0
      ? `You’re losing ${commercialLosses} ready-to-buy search${commercialLosses === 1 ? '' : 'es'} to ${rival.name}. Start with the first item below.`
      : `AI named ${rival.name} instead of you on ${rival.count} buyer searches. Start with the first item below.`
    : executionQueue.length > 0
      ? 'Start with the first evidence-backed item below.'
      : 'No customer-facing action is sufficiently evidence-backed. Capture question-level evidence before prescribing a change.';

  return {
    generatedAt: new Date().toISOString(),
    sections,
    executionQueue,
    jsonLd: buildJsonLd(input),
    summary: { totalActions: allItems.length, quickWins, leadInsight },
  };
}
