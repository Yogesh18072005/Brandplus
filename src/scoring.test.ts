// Unit tests for scoring.ts (§5.5 formulas + §5.6 contract). Run: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AuditInput, ParsedAnswer, PromptResult } from './types';
import { buildReport, getIntentWeight, matchTrackedCompetitor, MENTION_SCORES, scorePromptObservation } from './scoring';

const input: AuditInput = {
  businessName: 'Nova Dental Studio',
  website: 'novadental.in',
  category: 'cosmetic dentistry',
  city: 'Delhi',
  competitors: [{ name: 'Smile Design Clinic' }, { name: 'Clove Dental' }, { name: "Dr. Batra's" }],
};

function parsed(over: Partial<ParsedAnswer>): ParsedAnswer {
  return {
    brand_mentioned: false,
    mention_type: 'absent',
    brand_rank: null,
    sentiment: 'not_mentioned',
    competitors_mentioned: [],
    cited_domains: [],
    evidence_quote: 'quote',
    brand_cited: false,
    ...over,
  };
}

function result(over: Partial<PromptResult> & { text?: string }): PromptResult {
  const { text, ...rest } = over;
  return {
    prompt: { text: text ?? 'q', intent: 'direct_best' },
    engine: 'gemini',
    answerText: 'answer',
    citations: [],
    parsed: null,
    ...rest,
  };
}

// Fixture: 5 parsed prompts + 1 failed.
// scores: 1.0, 0.6, 0.3, 0.0, 0.0 → mean 0.38 → visibility 38
// mentioned: 3 of 5 → presence 0.6
const fixture: PromptResult[] = [
  result({
    text: 'best cosmetic dentist in Delhi',
    parsed: parsed({
      brand_mentioned: true,
      mention_type: 'top_recommendation',
      brand_rank: 1,
      sentiment: 'positive',
      competitors_mentioned: [{ name: 'Clove Dental Delhi - South Ex', is_tracked_competitor: true }],
      cited_domains: ['practo.com'],
    }),
    citations: [{ url: 'https://www.practo.com/x', domain: 'practo.com' }],
  }),
  result({
    text: 'veneers in Delhi',
    parsed: parsed({
      brand_mentioned: true,
      mention_type: 'listed_among_others',
      competitors_mentioned: [
        { name: 'Smile Design Clinic Pvt Ltd', is_tracked_competitor: true },
        { name: 'Clove Dental', is_tracked_competitor: true },
        { name: 'Random Clinic', is_tracked_competitor: false },
      ],
      cited_domains: ['justdial.com', 'practo.com'],
    }),
  }),
  result({
    text: 'teeth whitening Delhi',
    parsed: parsed({
      brand_mentioned: true,
      mention_type: 'passing_mention',
      // brand's own domain must be excluded from citation gap
      cited_domains: ['novadental.in', 'practo.com'],
    }),
  }),
  result({
    text: 'top clinic South Delhi',
    parsed: parsed({
      mention_type: 'absent',
      competitors_mentioned: [
        { name: 'Clove Dental', is_tracked_competitor: true },
        { name: "Dr Batras", is_tracked_competitor: true },
      ],
      evidence_quote: 'Clove Dental is highly rated',
      cited_domains: ['justdial.com'],
    }),
  }),
  result({
    text: 'Invisalign Delhi cost',
    parsed: parsed({
      mention_type: 'absent',
      competitors_mentioned: [{ name: 'Clove Dental', is_tracked_competitor: true }],
      evidence_quote: 'consider Clove Dental',
    }),
  }),
  result({ text: 'failed prompt', error: '429', parsed: null }),
];

const report = buildReport(input, fixture, new Date('2026-07-02T12:00:00Z'));

test('mention scores are exactly per spec', () => {
  assert.deepEqual(MENTION_SCORES, {
    top_recommendation: 1.0,
    listed_among_others: 0.6,
    passing_mention: 0.3,
    absent: 0.0,
  });
});

test('visibility score = round(mean(perPromptScores) * 100)', () => {
  // (1.0 + 0.6 + 0.3 + 0 + 0) / 5 = 0.38 → 38
  assert.equal(report.scores.visibilityScore, 38);
});

test('BrandPulse score is deterministic, bounded, and exposes explainable components', () => {
  assert.equal(Number.isInteger(report.scores.brandpulseScore), true);
  assert.equal(report.scores.brandpulseScore >= 0 && report.scores.brandpulseScore <= 100, true);
  assert.deepEqual(Object.keys(report.scores.components).sort(), [
    'citation', 'competitive', 'mention', 'position', 'recommendation', 'sourceQuality',
  ]);
  assert.equal(report.scores.promptCoverage, 0.83);
});

test('high-value buyer intent carries more weight than informational discovery', () => {
  assert.equal(getIntentWeight('discovery'), 1);
  assert.equal(getIntentWeight('vendor_selection'), 5);
  const observation = scorePromptObservation(result({
    prompt: { text: 'Which supplier should we choose?', intent: 'vendor_selection' },
    grounded: true,
    citations: [{ url: 'https://example.com/a', domain: 'example.com' }],
    parsed: parsed({ brand_mentioned: true, mention_type: 'top_recommendation', brand_rank: 1, brand_cited: true }),
  }));
  assert.equal(observation.weight, 5);
  assert.equal(observation.score > 0.8, true);
});

test('presence rate = mentioned / parsed prompts', () => {
  assert.equal(report.scores.presenceRate, 0.6); // 3/5
});

test('share of voice = brand / (brand + tracked competitor mentions)', () => {
  // brand 3; competitors: Clove 4, Smile Design 1, Dr Batra's 1 → 6
  // 3 / (3 + 6) = 0.333… → 0.33
  assert.equal(report.scores.shareOfVoice, 0.33);
});

test('per-competitor presence rates use fuzzy matching', () => {
  const byName = Object.fromEntries(report.competitors.map((c) => [c.name, c.presenceRate]));
  assert.equal(byName['Clove Dental'], 0.8); // 4/5 (matched despite suffixed name)
  assert.equal(byName['Smile Design Clinic'], 0.2); // 1/5 (matched despite "Pvt Ltd")
  assert.equal(byName["Dr. Batra's"], 0.2); // 1/5 (matched despite missing punctuation)
});

test('per-engine presence rate', () => {
  assert.deepEqual(report.byEngine, [{ engine: 'gemini', presenceRate: 0.6 }]);
});

test('missed prompts: absent + ≥1 tracked competitor, sorted by competitor count desc', () => {
  assert.equal(report.missedPrompts.length, 2);
  assert.equal(report.missedPrompts[0]!.prompt, 'top clinic South Delhi'); // 2 competitors
  assert.deepEqual(report.missedPrompts[0]!.competitorsPresent.sort(), ['Clove Dental', "Dr. Batra's"]);
  assert.equal(report.missedPrompts[0]!.evidence, 'Clove Dental is highly rated');
  assert.equal(report.missedPrompts[1]!.prompt, 'Invisalign Delhi cost'); // 1 competitor
});

test('citation gap: counts per prompt, excludes brand domain, sorted desc', () => {
  const practo = report.citationGap.find((c) => c.domain === 'practo.com');
  const justdial = report.citationGap.find((c) => c.domain === 'justdial.com');
  const own = report.citationGap.find((c) => c.domain === 'novadental.in');
  assert.equal(practo?.count, 3); // prompts 1 (citation+parsed, deduped), 2, 3
  assert.equal(justdial?.count, 2); // prompts 2, 4
  assert.equal(own, undefined); // brand's own domain excluded
  assert.equal(report.citationGap[0]!.domain, 'practo.com'); // sorted desc
});

test('totals: prompt count includes failures, failedPrompts counts them', () => {
  assert.equal(report.totals.promptCount, 6);
  assert.equal(report.totals.failedPrompts, 1);
  assert.deepEqual(report.totals.enginesUsed, ['gemini']);
});

test('empty results produce a zeroed report, not NaN', () => {
  const empty = buildReport(input, []);
  assert.equal(empty.scores.visibilityScore, 0);
  assert.equal(empty.scores.presenceRate, 0);
  assert.equal(empty.scores.shareOfVoice, 0);
  assert.equal(empty.competitors[0]!.presenceRate, 0);
});

test('matchTrackedCompetitor handles variations and rejects non-matches', () => {
  assert.equal(matchTrackedCompetitor('CLOVE DENTAL (Saket)', input.competitors)?.name, 'Clove Dental');
  assert.equal(matchTrackedCompetitor('Dr Batras Clinic', input.competitors)?.name, "Dr. Batra's");
  assert.equal(matchTrackedCompetitor('Meraki Dental Studio', input.competitors), null);
});
