// Unit tests for the question gate's deterministic parts. Run: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { approve, assertApproved, deterministicReview, missingIntents, questionsHash, similarity, toBuyerPrompts, type QuestionFile } from './question-gate';

const q = (text: string, intent = 'discovery', reason = 'You offer web design for Bangalore SMBs.') => ({ text, intent, reason, source: 'site' as const });

function file(questions: QuestionFile['questions']): QuestionFile {
  return {
    version: 1,
    business: { name: 'KP Webbate Technologies', website: 'kpwebbateplus.com', category: 'web design agency', region: 'Bangalore', type: 'local', audience: 'SMBs' },
    profile: { services: ['web design'], buyers: ['SMBs'], locations: ['Bangalore'], industries: [] },
    generatedAt: '2026-10-23T00:00:00.000Z', status: 'draft', questions, rejected: [], warnings: [],
  };
}

const five = [
  q('Which web design agencies in Bangalore are good for small businesses?'),
  q('Who builds affordable WordPress sites in Bangalore?', 'commercial'),
  q('Best app development companies in Koramangala?', 'location'),
  q('Digital marketing agency vs freelancer for a Bangalore startup: who should I hire?', 'comparison'),
  q('Who can redesign my company website in Bangalore within 5 lakh?', 'transactional'),
];

test('deterministic review: brand mentions and reworded duplicates are rejected with reasons', () => {
  const out = deterministicReview([
    'Is KP Webbate Technologies good for SEO?',
    'Best web design agency in Bangalore for small businesses?',
    'Which are the best web design agencies in Bangalore for small businesses?',
    'Who offers Shopify development in Bangalore?',
  ], 'KP Webbate Technologies', [], 1);
  assert.deepEqual(out.pass, ['Best web design agency in Bangalore for small businesses?', 'Who offers Shopify development in Bangalore?']);
  assert.deepEqual(out.rejected.map((r) => r.reason), ['BRANDED', 'DUPLICATE']);
  assert.ok(similarity('best seo agency in Pune', 'Which SEO agency is best in Pune?') >= 0.75);
  assert.ok(similarity('best seo agency in Pune', 'cheap app developers in Mumbai') < 0.3);
});

test('approval: needs 5+ questions, each with a reason; edits after approval are caught', () => {
  assert.throws(() => approve(file(five.slice(0, 4))), /only 4 questions/);
  assert.throws(() => approve(file([...five.slice(0, 4), q('Who designs logos in Bangalore?', 'discovery', '')])), /has no reason/);
  assert.throws(() => approve(file([...five, q('Is KP Webbate Technologies any good?')])), /BRANDED/);

  const approved = approve(file(five), new Date('2026-10-23T10:00:00Z'));
  assert.equal(approved.status, 'approved');
  assert.equal(approved.approvedHash, questionsHash(five));
  assert.doesNotThrow(() => assertApproved(approved));

  const edited = { ...approved, questions: [...approved.questions.slice(0, 4), q('Who builds e-commerce sites in Bangalore?', 'commercial')] };
  assert.throws(() => assertApproved(edited), /changed after approval/);
  assert.throws(() => assertApproved(file(five)), /not approved/);
});

test('approved questions become audit prompts that carry their reason and weight', () => {
  const prompts = toBuyerPrompts(approve(file(five)));
  assert.equal(prompts.length, 5);
  assert.deepEqual(prompts[4], { text: five[4]!.text, intent: 'transactional', intentWeight: 5, reason: five[4]!.reason });
});

test('regeneration targets the intents a balanced set is missing', () => {
  assert.deepEqual(missingIntents([q('a', 'discovery'), q('b', 'location')], 'local'), ['commercial', 'comparison', 'vendor_selection', 'transactional']);
  assert.deepEqual(missingIntents([q('a', 'discovery')], 'software'), ['comparison', 'vendor_selection', 'product', 'transactional']);
});

test('cities, not street addresses; balanced intents', async () => {
  const { cityNames, balancedPick } = await import('./question-gate');
  assert.deepEqual(cityNames(['Bangalore', 'Ground Floor, Shri Anand Sagar CHS, Sector 1, Charkop Kandivali West Mumbai 400067', 'Bangalore']), ['Bangalore', 'Mumbai']);
  const kept = [...Array(6)].map((_, i) => q(`vendor question ${i}`, 'vendor_selection')).concat([q('loc', 'location'), q('cmp', 'comparison'), q('cost', 'commercial')]);
  assert.deepEqual(balancedPick(kept, 5).map((x) => x.intent), ['vendor_selection', 'comparison', 'commercial', 'location', 'vendor_selection']);
});
