// Unit tests for private quote scoping. Run: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { AuditInput, ParsedAnswer, PromptResult } from '../types';
import { buildReport } from '../scoring';
import { buildSnapshot, type OutreachReportFile } from './model';
import { buildQuote, formatMoney, marketFor, validateRateCard } from './quote';

const card = validateRateCard(JSON.parse(readFileSync(path.resolve('outreach/rate-card.example.json'), 'utf8')));

function result(text: string, mention: ParsedAnswer['mention_type'], rivals: string[]): PromptResult {
  return {
    prompt: { text, intent: 'discovery' }, engine: 'gemini', answerText: '', citations: [],
    parsed: {
      brand_mentioned: mention !== 'absent', mention_type: mention, brand_rank: null, sentiment: 'neutral',
      competitors_mentioned: rivals.map((name) => ({ name, is_tracked_competitor: true })), cited_domains: [], evidence_quote: '', brand_cited: false,
    },
  };
}

function file(results: PromptResult[], region = 'US', type: 'software' | 'local' = 'software'): OutreachReportFile {
  const input: AuditInput = { businessName: 'Acme', website: 'acme.com', category: 'pm software', city: region, competitors: [{ name: 'Linear' }] };
  return {
    version: 1, slug: 'acme-x', createdAt: 'x', businessType: type, region, audience: '',
    engine: { provider: 'g', model: 'm', groundedShare: 1 }, competitorsDiscovered: true,
    prompts: results.map((r) => r.prompt), report: buildReport(input, results), current: buildSnapshot(results, ['Linear'], 'x'),
  };
}

const lostTo = (n: number, rival = 'Linear') => Array.from({ length: n }, (_, i) => result(`lost ${i}`, 'absent', [rival]));
const won = (n: number) => Array.from({ length: n }, (_, i) => result(`won ${i}`, 'top_recommendation', []));

test('the example rate card is valid and ordered by volume', () => {
  assert.deepEqual(card.tiers.map((t) => t.id), ['starter', 'growth', 'category']);
  assert.throws(() => validateRateCard({ tiers: [] }), /invalid/);
});

test('a strong business with few losses gets Starter, with Growth as the stretch', () => {
  const quote = buildQuote(file([...won(7), ...lostTo(1)]), card);
  assert.equal(quote.recommended.id, 'starter');
  assert.equal(quote.stretch?.id, 'growth');
  assert.equal(quote.monthly, 750);
  assert.equal(quote.currency, 'USD');
});

test('many losses to an entrenched leader escalate the tier, with reasons', () => {
  const quote = buildQuote(file(lostTo(8)), card);
  assert.equal(quote.recommended.id, 'category');
  assert.equal(quote.stretch, null);
  assert.equal(quote.reasons.length, 2);
  assert.match(quote.reasons[1]!, /Linear is named in 8 of 8 answers/);
});

test('Indian businesses quote in INR with the founding discount and margin', () => {
  const quote = buildQuote(file([...won(2), ...lostTo(5)], 'Delhi', 'local'), card);
  assert.equal(marketFor(file([], 'Delhi', 'local')), 'india');
  assert.equal(quote.recommended.id, 'growth');
  assert.equal(formatMoney(quote.monthly, quote.currency), '₹45,000');
  assert.equal(quote.foundingMonthly, 29250);
  assert.equal(quote.writerCostMonthly, 20000);
  assert.equal(quote.marginShare, 0.56);
});
