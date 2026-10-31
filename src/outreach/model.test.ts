// Unit tests for outreach audits + software prompt mode. Run: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AuditInput, ParsedAnswer, PromptResult } from '../types';
import { buildReport } from '../scoring';
import { buildSoftwareInput, dropBrandMentions } from '../promptgen';
import {
  buildSnapshot,
  cleanQuote,
  compareSnapshots,
  possessive,
  proofSentence,
  sourceOwner,
  discoverCompetitors,
  draftMessage,
  firstMoves,
  headline,
  isOutreachSlug,
  makeOutreachSlug,
  snapshotTotals,
  type OutreachReportFile,
} from './model';

function parsed(over: Partial<ParsedAnswer>): ParsedAnswer {
  return {
    brand_mentioned: false,
    mention_type: 'absent',
    brand_rank: null,
    sentiment: 'not_mentioned',
    competitors_mentioned: [],
    cited_domains: [],
    evidence_quote: '',
    brand_cited: false,
    ...over,
  };
}

function result(text: string, p: Partial<ParsedAnswer> | null, answerText = ''): PromptResult {
  return {
    prompt: { text, intent: 'discovery' },
    engine: 'gemini',
    answerText,
    citations: [{ url: 'https://www.g2.com/x', domain: 'g2.com' }],
    parsed: p ? parsed(p) : null,
    ...(p ? {} : { error: 'engine failed' }),
  };
}

const vendors = (...names: string[]) => names.map((name) => ({ name, is_tracked_competitor: false }));

test('discoverCompetitors ranks vendors by questions named, excluding brand and sources', () => {
  const results = [
    result('q1', { competitors_mentioned: vendors('Linear', 'Jira', 'Reddit', 'Acme PM') }),
    result('q2', { competitors_mentioned: vendors('Linear', 'Asana', 'G2') }),
    result('q3', { competitors_mentioned: vendors('linear', 'Jira', 'Linear') }),
    result('q4', null),
  ];
  assert.deepEqual(discoverCompetitors(results, { name: 'Acme PM' }), ['Linear', 'Jira', 'Asana']);
});

test('buildSnapshot maps outcomes and backfills a real quote from the answer', () => {
  const results = [
    result('best tool', { mention_type: 'absent', competitors_mentioned: vendors('Linear Inc') }, 'For startups, Linear is the fastest option. It is popular.'),
    result('cheap tool', { mention_type: 'listed_among_others', brand_mentioned: true }),
    result('broken', null),
  ];
  const snap = buildSnapshot(results, ['Linear'], '2026-10-10T00:00:00.000Z');
  assert.equal(snap.questions[0]!.outcome, 'absent');
  assert.deepEqual(snap.questions[0]!.competitors, ['Linear']);
  assert.equal(snap.questions[0]!.quote, 'For startups, Linear is the fastest option.');
  assert.equal(snap.questions[1]!.outcome, 'recommended');
  assert.equal(snap.questions[2]!.outcome, 'failed');
  assert.deepEqual(snap.questions[0]!.sources, ['g2.com']);

  const totals = snapshotTotals(snap, ['Linear']);
  assert.deepEqual(totals, { usable: 2, appeared: 1, recommended: 1, competitors: [{ name: 'Linear', count: 1 }] });
});

test('compareSnapshots counts only like-for-like, successfully observed questions', () => {
  const at = '2026-10-10T00:00:00.000Z';
  const baseline = { observedAt: at, questions: [
    { text: 'a', intent: 'x', outcome: 'absent' as const, competitors: [], quote: '', sources: [] },
    { text: 'b', intent: 'x', outcome: 'recommended' as const, competitors: [], quote: '', sources: [] },
    { text: 'c', intent: 'x', outcome: 'failed' as const, competitors: [], quote: '', sources: [] },
    { text: 'd', intent: 'x', outcome: 'mentioned' as const, competitors: [], quote: '', sources: [] },
  ] };
  const current = { observedAt: at, questions: [
    { text: 'a', intent: 'x', outcome: 'recommended' as const, competitors: [], quote: '', sources: [] },
    { text: 'b', intent: 'x', outcome: 'mentioned' as const, competitors: [], quote: '', sources: [] },
    { text: 'c', intent: 'x', outcome: 'recommended' as const, competitors: [], quote: '', sources: [] },
    { text: 'd', intent: 'x', outcome: 'mentioned' as const, competitors: [], quote: '', sources: [] },
    { text: 'new', intent: 'x', outcome: 'absent' as const, competitors: [], quote: '', sources: [] },
  ] };
  const diff = compareSnapshots(baseline, current);
  assert.deepEqual([diff.comparable, diff.improved, diff.declined, diff.unchanged], [3, 1, 1, 1]);
  assert.equal(diff.rows.filter((r) => r.change === 'not_comparable').length, 2);
});

test('outreach slugs are URL-safe and never UUID-shaped', () => {
  const slug = makeOutreachSlug('Acme PM, Inc.', 'K7Q2ZX9A');
  assert.equal(slug, 'acme-pm-inc-k7q2zx9a');
  assert.ok(isOutreachSlug(slug));
  assert.ok(!isOutreachSlug('../etc/passwd'));
  assert.ok(!isOutreachSlug('Acme'));
});

test('dropBrandMentions removes questions that name the audited brand as a word', () => {
  const prompts = [
    { text: 'Is Acme PM good for agencies?', intent: 'comparison' },
    { text: 'best project tool for agencies', intent: 'discovery' },
    { text: 'acmepmx vs Linear', intent: 'comparison' },
  ];
  assert.deepEqual(dropBrandMentions(prompts, ['Acme PM']).map((p) => p.text), ['best project tool for agencies', 'acmepmx vs Linear']);
});

test('software prompt input has no city and forbids the brand name', () => {
  const text = buildSoftwareInput('project management software', 20, { businessName: 'Acme PM', region: 'US', targetCustomers: ['small agencies'] });
  assert.match(text, /Buyers are in US/);
  assert.match(text, /NEVER mention "Acme PM"/);
  assert.match(text, /Typical buyers: small agencies/);
  assert.doesNotMatch(text, /India/);
});

test('quotes must be real sentences naming a rival, without markdown', () => {
  assert.equal(cleanQuote('Here are some tools: * **Plausible** is light'), 'Here are some tools: Plausible is light');
  const answer = '### Fathom Analytics\nFathom Analytics is a privacy-focused tool with a clean dashboard.';
  assert.equal(proofSentence(answer, ['Fathom Analytics']), 'Fathom Analytics is a privacy-focused tool with a clean dashboard.');
  const results = [result('q', { competitors_mentioned: vendors('Fathom Analytics'), evidence_quote: 'Fathom Analytics' }, answer)];
  assert.equal(buildSnapshot(results, ['Fathom Analytics'], 'x').questions[0]!.quote, 'Fathom Analytics is a privacy-focused tool with a clean dashboard.');
});

test('quotes do not stop at abbreviations like "Pvt."', () => {
  const answer = 'Aalpha Information Systems India Pvt. Ltd. builds custom Android and iOS apps for startups. Others exist too.';
  assert.equal(proofSentence(answer, ['Aalpha Information Systems India Pvt. Ltd.']), 'Aalpha Information Systems India Pvt. Ltd. builds custom Android and iOS apps for startups.');
});

test('possessive and competitor-owned sources', () => {
  assert.equal(possessive('Pirsch Analytics'), "Pirsch Analytics'");
  assert.equal(possessive('Acme'), "Acme's");
  const rivals = ['Plausible Analytics', 'Fathom Analytics', 'Matomo'];
  assert.equal(sourceOwner('plausible.io', rivals), 'Plausible Analytics');
  assert.equal(sourceOwner('usefathom.com', rivals), 'Fathom Analytics');
  assert.equal(sourceOwner('analytics-alternatives.com', rivals), null);
});

test('software prompts forbid two-product head-to-heads', () => {
  assert.match(buildSoftwareInput('web analytics', 10), /Never write a head-to-head question about exactly two named products/);
});

test('headline and draft message use the measured numbers and include an opt-out', () => {
  const input: AuditInput = { businessName: 'Acme PM', website: 'acmepm.com', category: 'project management software', city: 'US', competitors: [{ name: 'Linear' }] };
  const results = [
    result('best pm tool for startups', { competitors_mentioned: vendors('Linear') }, 'Linear is the go-to for startups.'),
    result('pm tool with free plan', { competitors_mentioned: vendors('Linear') }),
    result('pm tool for agencies', { mention_type: 'listed_among_others', brand_mentioned: true }),
  ];
  const at = '2026-10-10T00:00:00.000Z';
  const file: OutreachReportFile = {
    version: 1, slug: 'acme-pm-abc123', createdAt: at, businessType: 'software', region: 'US', audience: '',
    engine: { provider: 'Google Gemini', model: 'm', groundedShare: 1 }, competitorsDiscovered: true,
    prompts: results.map((r) => r.prompt), report: buildReport(input, results), current: buildSnapshot(results, ['Linear'], at),
  };
  assert.equal(headline(file), 'Across 3 buyer questions, Gemini named Acme PM in 1. It named Linear in 2.');
  const message = draftMessage(file, 'https://example.com/r/acme-pm-abc123', 'Sam');
  assert.match(message, /^Hi Sam,/);
  assert.match(message, /"best pm tool for startups"\. It recommended Linear, not Acme PM\./);
  assert.match(message, /came up in 1\./);
  assert.match(message, /reply "no"/);

  const moves = firstMoves(file);
  assert.equal(moves[0]!.title, 'Publish an honest "Acme PM vs Linear" page and a "Linear alternatives" page');
  assert.deepEqual(moves[0]!.questions, ['best pm tool for startups', 'pm tool with free plan']);
  assert.match(moves[0]!.why, /In 2 of 3 questions/);
  assert.match(moves[1]!.title, /reviews on g2\.com/);
  assert.match(moves[2]!.why, /cited in 0% of the answers/);
});
