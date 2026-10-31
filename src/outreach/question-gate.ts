// The question gate: no audit runs on a question nobody has checked.
//
//   1. Understand the business from its own website (business-understanding).
//   2. Generate evidence-grounded buyer questions (buyer-intent).
//   3. A strict reviewer keeps or rejects each one, with a reason code.
//   4. If too few survive, regenerate what's missing and review again (max 2 rounds).
//   5. Save a question file. The founder edits it and approves it; only an
//      approved file whose questions haven't changed since can be audited.

import { createHash } from 'node:crypto';
import { config } from '../config';
import { cacheGet, cacheSet } from '../cache';
import { geminiCall } from '../gemini-client';
import { extractJson } from '../parse';
import { normalizeName } from '../matching';
import { getIntentWeight } from '../intents';
import { BusinessUnderstandingService } from '../business-understanding/service';
import { BuyerIntentService } from '../buyer-intent/service';
import type { BusinessEntity, CanonicalBusinessUnderstanding } from '../business-understanding/types';
import type { BuyerQuestion } from '../buyer-intent/types';
import type { BuyerPrompt } from '../types';

export const REJECT_REASONS = {
  OFF_SERVICE: 'Asks about something the business doesn’t offer',
  NO_VENDOR_ANSWER: 'Advice question: the answer wouldn’t name any business',
  WRONG_MARKET: 'Outside the business’s city, region or customer type',
  DUPLICATE: 'Same buyer need as another question',
  BRANDED: 'Names the business itself',
  UNNATURAL: 'Not how a real buyer would ask',
  LOW_VALUE: 'Too far from a buying decision',
} as const;
export type RejectReason = keyof typeof REJECT_REASONS;

export const GATE_INTENTS = ['discovery', 'comparison', 'commercial', 'transactional', 'location', 'product', 'vendor_selection', 'problem'] as const;

export interface GateQuestion {
  text: string;
  intent: string;
  /** Why this question is in the audit, in plain words: shown to the client. */
  reason: string;
  source: 'site' | 'regenerated' | 'founder';
  /** buyer-intent's 1–5 scores, when the question came from it. */
  scores?: { commercial: number; business: number; specificity: number };
}

export interface RejectedQuestion {
  text: string;
  reason: RejectReason;
  note: string;
  round: number;
}

export interface BusinessProfile {
  services: string[];
  buyers: string[];
  locations: string[];
  industries: string[];
}

export interface QuestionFile {
  version: 1;
  business: { name: string; website: string; category: string; region: string; type: 'software' | 'local'; audience: string };
  profile: BusinessProfile;
  generatedAt: string;
  status: 'draft' | 'approved';
  approvedAt?: string;
  /** Hash of the approved question texts: editing after approval needs a fresh approval. */
  approvedHash?: string;
  questions: GateQuestion[];
  rejected: RejectedQuestion[];
  warnings: string[];
}

export interface GateInput {
  name: string;
  website: string;
  category: string;
  region: string;
  audience: string;
  type: 'software' | 'local';
  count: number;
}

// buyer-intent's controlled vocabulary → the audit's intents (weights live in ../intents).
const INTENT_MAP: Record<string, string> = {
  DISCOVERY: 'discovery', COMPARISON: 'comparison', ALTERNATIVE: 'comparison', SHORTLIST: 'vendor_selection',
  VENDOR_SELECTION: 'vendor_selection', PURCHASE: 'transactional', SPECIFICATION: 'product', COMPLIANCE: 'commercial',
  GEOGRAPHIC: 'location',
};

export function questionsHash(questions: { text: string }[]): string {
  return createHash('sha256').update(questions.map((q) => q.text.trim()).join('\n')).digest('hex').slice(0, 16);
}

const words = (text: string) => new Set(normalizeName(text).split(' ').filter((w) => w.length > 2));

/** Word-overlap similarity; ≥ 0.75 means the same question reworded. */
export function similarity(a: string, b: string): number {
  const x = words(a), y = words(b);
  if (!x.size || !y.size) return 0;
  let shared = 0;
  for (const w of x) if (y.has(w)) shared++;
  return shared / Math.min(x.size, y.size);
}

/** Checks a model shouldn't be trusted with: brand mentions and near-duplicates. */
export function deterministicReview(candidates: string[], brand: string, kept: string[], round: number): { pass: string[]; rejected: RejectedQuestion[] } {
  const pass: string[] = [];
  const rejected: RejectedQuestion[] = [];
  const brandKey = normalizeName(brand);
  for (const text of candidates) {
    if (brandKey && normalizeName(text).includes(brandKey)) {
      rejected.push({ text, reason: 'BRANDED', note: `Mentions ${brand}.`, round });
      continue;
    }
    const twin = [...kept, ...pass].find((other) => similarity(text, other) >= 0.75);
    if (twin) {
      rejected.push({ text, reason: 'DUPLICATE', note: `Same need as “${twin}”.`, round });
      continue;
    }
    pass.push(text);
  }
  return { pass, rejected };
}

const values = (entities: BusinessEntity[], limit = 12) => [...new Set(entities.map((e) => e.value.trim()).filter(Boolean))].slice(0, limit);

export function profileFrom(u: CanonicalBusinessUnderstanding): BusinessProfile {
  return {
    services: values([...u.services, ...u.products, ...u.capabilities]),
    buyers: values(u.buyer_types),
    locations: values(u.geographies),
    industries: values([...u.industries, ...u.use_cases], 8),
  };
}

/** "Ground Floor, …, Kandivali West Mumbai 400067" → "Mumbai": questions name cities, never street addresses. */
export function cityNames(locations: string[]): string[] {
  return [...new Set(locations.map((loc) => {
    const last = loc.replace(/\d+/g, ' ').split(',').map((part) => part.trim()).filter(Boolean).pop() ?? '';
    const parts = last.split(/\s+/).filter(Boolean);
    return parts.length > 2 ? parts[parts.length - 1]! : last;
  }).filter((city) => city.length > 1))];
}

function businessBrief(input: GateInput, profile: BusinessProfile): string {
  const cities = cityNames([input.region, ...profile.locations]);
  return [
    `Business type: ${input.type === 'software' ? 'software product' : 'service business'}; category: ${input.category}`,
    `Market: ${input.region}${input.audience ? `; target customers (founder's note): ${input.audience}` : ''}`,
    `Services/products on its website: ${profile.services.join('; ') || 'not established'}`,
    `Customer types on its website: ${profile.buyers.join('; ') || 'not established'}`,
    `Cities it serves: ${cities.join(', ') || 'not established'}`,
    profile.industries.length ? `Industries/use cases: ${profile.industries.join('; ')}` : '',
  ].filter(Boolean).join('\n');
}

const LANGUAGE_RULES = `- Use the words buyers use: agency, company, studio, freelancer, developer, designer. Never "vendor" or "provider of services".
- Name cities only (e.g. Bangalore, Mumbai). Never street addresses, sectors, buildings or PIN codes.`;

const marketRule = (input: GateInput) => input.type === 'local'
  ? '- This is a local service business: a question must name one of its cities, a neighbourhood in them, or say "near me". A question with no place in it is WRONG_MARKET.'
  : '- This is a software product: questions are not tied to a city unless the business sells only in one market.';

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    reviews: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer' },
          verdict: { type: 'string', enum: ['keep', 'reject'] },
          reason: { type: 'string', enum: ['NONE', ...Object.keys(REJECT_REASONS)] },
          note: { type: 'string' },
          why_included: { type: 'string' },
          intent: { type: 'string', enum: [...GATE_INTENTS] },
        },
        required: ['index', 'verdict', 'reason', 'note', 'why_included', 'intent'],
      },
    },
  },
  required: ['reviews'],
};

interface Review { index: number; verdict: 'keep' | 'reject'; reason: string; note: string; why_included: string; intent: string }

/** The strict reviewer: one call over a batch, a verdict and reason for every question. */
export async function reviewQuestions(input: GateInput, profile: BusinessProfile, questions: string[]): Promise<Review[]> {
  if (questions.length === 0) return [];
  const interaction = await geminiCall({
    kind: 'question-review',
    model: config.parserModel,
    input: `You review buyer questions for an AI visibility audit. Each kept question is asked to an AI assistant to see which businesses it recommends. A bad question wastes money and makes the client distrust the report, so be strict.

THE BUSINESS (from its own website):
${businessBrief(input, profile)}

Reject a question when it:
- OFF_SERVICE: asks for something this business doesn't offer, or a niche its website doesn't support (e.g. fintech compliance for a general web agency).
- NO_VENDOR_ANSWER: is advice or how-to ("how do I choose…", "pros and cons of…", "how to fix…") where a good answer would explain, not name specific businesses.
- WRONG_MARKET: is about a city, country or customer type this business doesn't serve.
${marketRule(input)}
- DUPLICATE: asks for the same thing as an earlier question in this list, just reworded.
- BRANDED: names this business.
- UNNATURAL: is stiff, stuffed with constraints or jargon (e.g. "vendors"), or not how a real buyer types or speaks.
- LOW_VALUE: is too far from choosing or buying.

Keep a question only if a real customer of THIS business could ask it while choosing who to hire, and a good answer would name specific businesses. A price question that also asks who offers it ("how much does X cost in Pune and which agencies do it?") is a keep: the answer names businesses. For kept questions write why_included: one plain sentence (max 20 words) a business owner understands, tying it to a service, customer or location above (e.g. "You offer SEO, and Bangalore small businesses ask this when picking an agency."). For rejected ones, note says what's wrong in under 15 words. Give every question its intent.

QUESTIONS:
${questions.map((q, i) => `${i}. ${q}`).join('\n')}

Respond with ONLY a single raw JSON object. Start with { and end with }.`,
    responseFormat: { type: 'text', mime_type: 'application/json', schema: REVIEW_SCHEMA },
    generationConfig: { thinking_level: 'low', temperature: 0, max_output_tokens: 4096 },
  });
  const parsed = extractJson(interaction.output_text ?? '') as { reviews?: Review[] };
  return (parsed.reviews ?? []).filter((r) => Number.isInteger(r.index) && r.index >= 0 && r.index < questions.length);
}

const REGEN_SCHEMA = {
  type: 'object',
  properties: { questions: { type: 'array', items: { type: 'object', properties: { text: { type: 'string' }, intent: { type: 'string', enum: [...GATE_INTENTS] } }, required: ['text', 'intent'] } } },
  required: ['questions'],
};

/** Intents a balanced set should cover; the regenerator is pointed at the gaps. */
export function missingIntents(kept: GateQuestion[], type: GateInput['type']): string[] {
  const want = type === 'software'
    ? ['discovery', 'comparison', 'vendor_selection', 'product', 'transactional']
    : ['discovery', 'location', 'commercial', 'comparison', 'vendor_selection', 'transactional'];
  const have = new Set(kept.map((q) => q.intent));
  return want.filter((i) => !have.has(i));
}

async function regenerate(input: GateInput, profile: BusinessProfile, kept: GateQuestion[], rejected: RejectedQuestion[], need: number): Promise<{ text: string; intent: string }[]> {
  const gaps = missingIntents(kept, input.type);
  const interaction = await geminiCall({
    kind: 'question-regen',
    model: config.promptgenModel,
    input: `Write ${need} new buyer questions that a real customer of this business might ask an AI assistant while choosing a provider.

THE BUSINESS (from its own website):
${businessBrief(input, profile)}

Rules:
- Only about services, customers and cities listed above. Never name this business.
${marketRule(input)}
${LANGUAGE_RULES}
- Each question must invite an answer that names specific businesses (best / which / who / where / recommend / compare / cost and who offers it).
- Sound like a real person typing: natural, varied length, some casual. No keyword strings.
- Cover a mix: cover each service at least once before repeating one; include budget or price, a location-specific one, and a comparison where natural.
${gaps.length ? `- The current set lacks these intents; prefer them: ${gaps.join(', ')}.` : ''}

Already kept (don't repeat these needs):
${kept.map((q) => `- ${q.text}`).join('\n') || '- none'}

Rejected earlier (don't make these mistakes again):
${rejected.slice(-15).map((r) => `- ${r.text} → ${r.reason}: ${r.note}`).join('\n') || '- none'}

Respond with ONLY a single raw JSON object. Start with { and end with }.`,
    responseFormat: { type: 'text', mime_type: 'application/json', schema: REGEN_SCHEMA },
    generationConfig: { thinking_level: 'low', temperature: 0.7, max_output_tokens: 3000 },
  });
  const parsed = extractJson(interaction.output_text ?? '') as { questions?: { text: string; intent: string }[] };
  return (parsed.questions ?? []).filter((q) => typeof q?.text === 'string' && q.text.trim().length > 10).map((q) => ({ text: q.text.trim(), intent: q.intent }));
}

/** Run one round: deterministic checks, then the model reviewer. */
async function reviewRound(
  input: GateInput, profile: BusinessProfile, round: number,
  candidates: { text: string; intent: string; source: GateQuestion['source']; scores?: GateQuestion['scores'] }[],
  kept: GateQuestion[], rejected: RejectedQuestion[],
): Promise<void> {
  const det = deterministicReview(candidates.map((c) => c.text), input.name, kept.map((q) => q.text), round);
  rejected.push(...det.rejected);
  const reviews = await reviewQuestions(input, profile, det.pass);
  const byIndex = new Map(reviews.map((r) => [r.index, r]));
  det.pass.forEach((text, i) => {
    const review = byIndex.get(i);
    const candidate = candidates.find((c) => c.text === text)!;
    if (!review) {
      rejected.push({ text, reason: 'LOW_VALUE', note: 'The reviewer returned no verdict, so it was left out.', round });
    } else if (review.verdict === 'keep' && review.reason === 'NONE') {
      kept.push({ text, intent: GATE_INTENTS.includes(review.intent as never) ? review.intent : candidate.intent, reason: review.why_included.trim(), source: candidate.source, scores: candidate.scores });
    } else {
      const reason = (review.reason in REJECT_REASONS ? review.reason : 'LOW_VALUE') as RejectReason;
      rejected.push({ text, reason, note: review.note.trim(), round });
    }
  });
}

/**
 * Round-robin across intents (most decision-relevant first) so one intent
 * can't crowd out budget, location or comparison questions.
 */
export function balancedPick(kept: GateQuestion[], count: number): GateQuestion[] {
  const groups = new Map<string, GateQuestion[]>();
  for (const q of kept) groups.set(q.intent, [...(groups.get(q.intent) ?? []), q]);
  const order = [...groups.keys()].sort((a, b) => getIntentWeight(b) - getIntentWeight(a));
  const picked: GateQuestion[] = [];
  while (picked.length < count && picked.length < kept.length) {
    for (const intent of order) {
      const next = groups.get(intent)!.shift();
      if (next && picked.length < count) picked.push(next);
    }
  }
  return picked;
}

const UNDERSTANDING_PAGES = 6;

export async function draftQuestions(
  input: GateInput,
  log: (line: string) => void = () => {},
  opts: { profile?: BusinessProfile } = {},
): Promise<QuestionFile> {
  const projectId = `outreach-${createHash('sha256').update(input.website.toLowerCase()).digest('hex').slice(0, 12)}`;
  const warnings: string[] = [];
  const kept: GateQuestion[] = [];
  const rejected: RejectedQuestion[] = [];
  let firstBatch: { text: string; intent: string; source: GateQuestion['source']; scores?: GateQuestion['scores'] }[] = [];
  let profile: BusinessProfile;

  if (opts.profile) {
    // Re-draft: the business was already read; don't pay to read it again.
    profile = opts.profile;
    log('  reusing the business profile from the last draft');
  } else {
    log(`  reading the website (up to ${UNDERSTANDING_PAGES} pages)…`);
    let understanding = cacheGet<CanonicalBusinessUnderstanding>('business-understanding', input.website.toLowerCase());
    if (!understanding) {
      understanding = await new BusinessUnderstandingService({ maxPages: UNDERSTANDING_PAGES }).understand({
        projectId, businessName: input.name, website: input.website,
        userProvidedContext: [`Founder's note: ${input.name} serves ${input.audience || 'its customers'} in ${input.region}. Category: ${input.category}.`],
      });
      if (['SUCCESS', 'PARTIAL_SUCCESS'].includes(understanding.status)) cacheSet('business-understanding', input.website.toLowerCase(), understanding);
    }
    profile = profileFrom(understanding);
    try {
      const set = await new BuyerIntentService().generate({ projectId, businessUnderstandingRunId: projectId, understanding, questionCount: Math.min(30, input.count + 6) });
      firstBatch = set.questions.map((q: BuyerQuestion) => ({
        text: q.question, intent: INTENT_MAP[q.intent] ?? 'discovery', source: 'site',
        scores: { commercial: q.commercial_relevance, business: q.business_relevance, specificity: q.specificity },
      }));
      warnings.push(...set.warnings);
    } catch (error) {
      warnings.push(`Evidence-grounded generation failed (${error instanceof Error ? error.message : String(error)}); questions were generated from the profile instead.`);
    }
  }
  log(`  profile: ${profile.services.length} services, ${profile.buyers.length} customer types, cities ${cityNames([input.region, ...profile.locations]).join(', ')}`);

  if (firstBatch.length) {
    log(`  round 1: reviewing ${firstBatch.length} site-grounded questions`);
    await reviewRound(input, profile, 1, firstBatch, kept, rejected);
  }
  for (let round = 2; round <= 3 && kept.length < input.count; round++) {
    const need = Math.min(20, (input.count - kept.length) * 2);
    log(`  round ${round}: ${kept.length} kept, generating ${need} replacements`);
    const fresh = await regenerate(input, profile, kept, rejected, need);
    await reviewRound(input, profile, round, fresh.map((q) => ({ ...q, source: 'regenerated' as const })), kept, rejected);
  }
  if (kept.length < input.count) warnings.push(`Only ${kept.length} questions passed review (wanted ${input.count}). Add your own or run fewer.`);

  const ordered = balancedPick(kept, input.count);
  for (const extra of kept.filter((q) => !ordered.includes(q))) rejected.push({ text: extra.text, reason: 'LOW_VALUE', note: 'Passed review but the set was already full.', round: 0 });

  return {
    version: 1,
    business: { name: input.name, website: input.website, category: input.category, region: input.region, type: input.type, audience: input.audience },
    profile,
    generatedAt: new Date().toISOString(),
    status: 'draft',
    questions: ordered,
    rejected,
    warnings,
  };
}

/** Throws unless the file is approved and its questions are exactly what was approved. */
export function assertApproved(file: QuestionFile): void {
  if (file.status !== 'approved' || !file.approvedHash) throw new Error('questions are not approved yet');
  if (questionsHash(file.questions) !== file.approvedHash) throw new Error('questions changed after approval; approve them again');
}

/** Validate a founder-edited file and mark it approved. */
export function approve(file: QuestionFile, now = new Date()): QuestionFile {
  const questions = file.questions.map((q) => ({ ...q, text: q.text.trim(), reason: (q.reason ?? '').trim(), source: q.source ?? 'founder' }));
  const problems: string[] = [];
  if (questions.length < 5) problems.push(`only ${questions.length} questions (minimum 5)`);
  questions.forEach((q, i) => {
    if (!q.text) problems.push(`question ${i + 1} is empty`);
    if (!q.reason) problems.push(`question ${i + 1} has no reason ("${q.text.slice(0, 40)}…")`);
    if (!q.intent) problems.push(`question ${i + 1} has no intent`);
  });
  const det = deterministicReview(questions.map((q) => q.text), file.business.name, [], 0);
  for (const r of det.rejected) problems.push(`${r.reason}: "${r.text}" (${r.note})`);
  if (problems.length) throw new Error(`Can't approve:\n  - ${problems.join('\n  - ')}`);
  return { ...file, questions, status: 'approved', approvedAt: now.toISOString(), approvedHash: questionsHash(questions) };
}

export function toBuyerPrompts(file: QuestionFile): BuyerPrompt[] {
  return file.questions.map((q) => ({ text: q.text, intent: q.intent, intentWeight: getIntentWeight(q.intent), reason: q.reason }));
}
