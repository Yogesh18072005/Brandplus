// Unit tests for the audit scorecard and publish briefs. Run: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AuditInput, ParsedAnswer, PromptResult } from '../types';
import { buildReport } from '../scoring';
import { analyzeHomepage, analyzeRobots, type SiteAudit } from '../footprint/site-checks';
import { buildSnapshot, type OutreachReportFile } from './model';
import { buildScorecard, evidenceQuestions, gradeFor, publishBriefs, rivalCase } from './scorecard';

const AT = '2026-10-10T00:00:00.000Z';

function result(text: string, mention: ParsedAnswer['mention_type'], rivals: string[], answer = ''): PromptResult {
  return {
    prompt: { text, intent: 'discovery' },
    engine: 'gemini',
    answerText: answer,
    citations: [{ url: 'https://linear.app/blog', domain: 'linear.app' }],
    parsed: {
      brand_mentioned: mention !== 'absent', mention_type: mention, brand_rank: null,
      sentiment: mention === 'absent' ? 'not_mentioned' : 'positive',
      competitors_mentioned: rivals.map((name) => ({ name, is_tracked_competitor: true })),
      cited_domains: [], evidence_quote: '', brand_cited: false,
    },
  };
}

function file(results: PromptResult[], site?: SiteAudit): OutreachReportFile {
  const input: AuditInput = { businessName: 'Acme PM', website: 'acmepm.com', category: 'project management software', city: 'US', competitors: [{ name: 'Linear' }] };
  return {
    version: 1, slug: 'acme-pm-abc', createdAt: AT, businessType: 'software', region: 'US', audience: '',
    engine: { provider: 'Google Gemini', model: 'm', groundedShare: 1 }, competitorsDiscovered: true,
    prompts: results.map((r) => r.prompt), report: buildReport(input, results), current: buildSnapshot(results, ['Linear'], AT), site,
  };
}

const site: SiteAudit = {
  checkedAt: AT, reachable: true, finalUrl: 'https://acmepm.com/', https: true,
  homepage: analyzeHomepage(`<html><body><main><p>${'real words '.repeat(200)}</p></main><a href="/blog">Blog</a></body></html>`, 'https://acmepm.com/'),
  robots: analyzeRobots('User-agent: GPTBot\nAllow: /'), llmsTxt: false, sitemap: true, errors: [],
};

test('grades follow fixed thresholds', () => {
  assert.deepEqual([90, 70, 55, 40, 39].map(gradeFor), ['A', 'B', 'C', 'D', 'F']);
});

test('a losing business gets a specific compliment, the gap, and a fix type', () => {
  const card = buildScorecard(file([
    result('best pm tool', 'absent', ['Linear'], 'Linear is the best pick for small teams.'),
    result('pm tool for agencies', 'absent', ['Linear'], 'For agencies, Linear works well overall.'),
    result('cheap pm tool', 'passing_mention', []),
  ], site));
  assert.equal(card.pillars.length, 5);
  assert.equal(card.pillars[0]!.score, 17);
  assert.match(card.verdict, /^Acme PM is already named in 1 of 3 buyer answers and has a robots\.txt that explicitly welcomes AI crawlers\./);
  assert.match(card.verdict, /Yet when buyers ask AI about project management software, it named Acme PM in 1 of 3 answers, and Linear in 2\./);
  assert.match(card.verdict, /quote competitors' own pages 3 times and Acme PM's none\./);
  assert.match(card.verdict, /fix, not a rebuild\.$/);
  assert.ok(card.score < 40 && card.grade === 'F', `score ${card.score}`);
  // A failing presence pillar must never come without a fix.
  assert.match(card.pillars[0]!.fixes[0]!, /Each one answers one of the 2 questions where a competitor was named instead of you\./);
  assert.match(card.pillars[0]!.fixes.join(' '), /compares Acme PM with Linear honestly/);
});

test('a leading business is told its lead is real, not "yet"', () => {
  const card = buildScorecard(file([
    result('best pm tool', 'top_recommendation', ['Linear']),
    result('pm tool for agencies', 'listed_among_others', ['Linear']),
    result('cheap pm tool', 'top_recommendation', []),
  ], site));
  assert.doesNotMatch(card.verdict, /Yet/);
  assert.match(card.verdict, /named Acme PM in 3 of 3 answers, ahead of Linear \(2\)\./);
  assert.match(card.verdict, /The lead is real but not locked in/);
});

test('without website checks, those pillars are marked unchecked and excluded from the score', () => {
  const card = buildScorecard(file([result('best pm tool', 'top_recommendation', [])]));
  assert.deepEqual(card.pillars.map((p) => p.score === null), [false, false, true, true, true]);
  assert.match(card.pillars[2]!.checks[0]!.detail, /not run/);
});

test('publish briefs lead with the rival comparison, then missed questions', () => {
  const briefs = publishBriefs(file([
    result('best pm tool', 'absent', ['Linear']),
    result('pm tool for agencies', 'absent', ['Linear']),
  ], site));
  assert.equal(briefs[0]!.title, 'Acme PM vs Linear: an honest comparison');
  assert.deepEqual(briefs.slice(1).map((b) => [b.format, b.title]), [['Video', 'best pm tool'], ['Page', 'pm tool for agencies']]);
});

test('multi-page checks and the AI footprint add visible checks and fixes', () => {
  const page = (url: string, extra: Partial<NonNullable<SiteAudit['pages']>[number]> = {}) => ({
    url, status: 200, loadMs: 800, title: 'Acme', metaDescription: '', h1: [], words: 400, questionHeadings: 0, answerBlocks: [], jsonLdTypes: [], hasAuthor: false, ...extra,
  });
  const richSite: SiteAudit = {
    ...site,
    pages: [page('https://acmepm.com/'), page('https://acmepm.com/about/'), page('https://acmepm.com/faq/', { answerBlocks: ['What is Acme?'] })],
    hypeClaims: [
      { phrase: 'the best project management software', sentence: 'We are the best project management software.', url: 'https://acmepm.com/' },
      { phrase: 'a leading', sentence: 'A leading tool.', url: 'https://acmepm.com/about/' },
    ],
  };
  const f = file([result('best pm tool', 'absent', ['Linear'], 'Linear is the best pick.')], richSite);
  f.footprint = {
    checkedAt: AT,
    probe: { question: 'What is Acme PM (acmepm.com)?', verdict: 'unknown', summary: 'Gemini could not say what Acme PM does.', quote: 'I could not find information.', issues: [], sources: [] },
    citedPages: [
      { url: 'https://designrush.com/top', domain: 'designrush.com', citedIn: 3, status: 'read', brandNamed: false, competitorsNamed: ['Linear'] },
      { url: 'https://blog.example/list', domain: 'blog.example', citedIn: 1, status: 'read', brandNamed: false, competitorsNamed: [] },
      { url: 'https://themanifest.com/x', domain: 'themanifest.com', citedIn: 2, status: 'blocked', brandNamed: false, competitorsNamed: [] },
    ],
    directories: [
      { domain: 'designrush.com', citedIn: 3, listed: false, how: 'search' },
      { domain: 'themanifest.com', citedIn: 2, listed: null, how: 'search' },
    ],
    errors: [],
  };
  const card = buildScorecard(f);
  const checks = Object.fromEntries(card.pillars.flatMap((p) => p.checks.map((c) => [c.label, c])));
  assert.equal(checks['One clear heading per page']!.detail, 'None of the 3 pages we checked has an H1 heading.');
  assert.equal(checks['Answer blocks AI can quote']!.earned, 8);
  assert.match(checks['Claims backed by proof']!.detail, /^2 unproven claims on 2 pages, like “the best project management software”\.$/);
  assert.match(checks['AI knows who you are']!.detail, /answer was that it doesn’t know you\./);
  assert.equal(checks['Named on the pages AI read']!.detail, 'The answers cited 2 pages we could open. None name Acme PM; 1 names a competitor.');
  // An unknown listing (null) is left out rather than counted against them.
  assert.equal(checks['Listed where the AI looks']!.detail, 'A search found no listing on designrush.com, which the answers cited 3 times. Worth checking by hand.');
  const citations = card.pillars.find((p) => p.id === 'citations')!;
  assert.match(citations.fixes[0]!, /^Check for and complete profiles on designrush\.com\./);
  assert.match(citations.fixes[1]!, /designrush\.com name your competitors and not you/);
});

test('rival case uses only observed proof, missing listings and self-praise', () => {
  const f = file([
    result('best pm tool', 'absent', ['Linear'], 'Linear has a 4.8 rating from 900 reviews on G2.'),
    result('pm tool for agencies', 'absent', ['Linear'], 'For agencies, Linear works well overall.'),
    result('cheap pm tool', 'absent', []),
  ], { ...site, hypeClaims: [{ phrase: 'Best PM Tool', sentence: 'We are the Best PM Tool.', url: 'https://acmepm.com/' }] });
  f.footprint = { checkedAt: AT, probe: null, citedPages: [], directories: [{ domain: 'g2.com', citedIn: 4, listed: false, how: 'search' }], errors: [] } as unknown as OutreachReportFile['footprint'];
  const why = rivalCase(f)!;
  assert.equal(why.rival, 'Linear');
  assert.deepEqual(why.reasons.map((r) => r.label), ['What the AI says', 'Where the AI looks', 'What your site says']);
  assert.match(why.reasons[0]!.them, /900 reviews/);
  assert.match(why.reasons[1]!.you, /no Acme PM listing/);
  assert.match(why.reasons[2]!.you, /Best PM Tool/);
  // Evidence skips questions where nobody beat the business.
  assert.deepEqual(evidenceQuestions(f).map((q) => q.text).sort(), ['best pm tool', 'pm tool for agencies']);
});

test('no rival case when the business is ahead', () => {
  assert.equal(rivalCase(file([result('best pm tool', 'top_recommendation', ['Linear'])])), null);
});
