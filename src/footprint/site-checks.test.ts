// Unit tests for deterministic website checks. Run: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeHomepage, analyzeRobots } from './site-checks';

test('robots.txt: explicit AI rules, root blocks, and wildcard fallbacks', () => {
  const welcoming = analyzeRobots('User-agent: GPTBot\nAllow: /\n\nUser-agent: ClaudeBot\nUser-agent: PerplexityBot\nAllow: /\n\nUser-agent: *\nDisallow: /admin');
  assert.deepEqual(welcoming.explicitlyNamed, ['GPTBot', 'ClaudeBot', 'PerplexityBot']);
  assert.deepEqual(welcoming.blocked, []);
  assert.equal(welcoming.crawlers['Bingbot'], 'unspecified');

  const blocking = analyzeRobots('User-agent: GPTBot\nDisallow: /\n# comment\nUser-agent: *\nDisallow:');
  assert.deepEqual(blocking.blocked, ['GPTBot']);

  const wildcard = analyzeRobots('User-agent: *\nDisallow: /');
  assert.equal(wildcard.blocked.length, 8);

  assert.equal(analyzeRobots(null).found, false);
});

test('homepage: words without JavaScript, schema, profiles and sections', () => {
  const html = `<!doctype html><html><head><title>Acme PM</title>
    <meta name="description" content="Project management for small agencies, with client portals and time tracking built in.">
    <script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization"},{"@type":["SoftwareApplication"]},{"@type":"FAQPage"}]}</script>
    <script type="application/ld+json">{ not json</script></head>
    <body><main><h1>Plan work your clients can see</h1><h2>How much does it cost?</h2><p>${'word '.repeat(200)}</p></main>
    <a href="/pricing">Pricing</a><a href="/#faq">FAQ</a><a href="/vs/linear">vs Linear</a><a href="/blog/post">Blog</a>
    <a href="https://www.linkedin.com/company/acme">LinkedIn</a><a href="https://www.g2.com/products/acme/reviews">G2</a>
    <a href="https://youtube.com/@acme">YouTube</a><script>${'var x=1;'.repeat(50)}</script></body></html>`;
  const page = analyzeHomepage(html, 'https://acme.com/');
  assert.equal(page.title, 'Acme PM');
  assert.ok(page.visibleWords > 200 && page.visibleWords < 230, `words: ${page.visibleWords}`);
  assert.equal(page.appShell, false);
  assert.deepEqual(page.jsonLdTypes, ['FAQPage', 'Organization', 'SoftwareApplication']);
  assert.equal(page.hasFaqSchema, true);
  assert.deepEqual(page.profiles.sort(), ['g2', 'linkedin', 'youtube']);
  assert.deepEqual(page.sections, { pricing: true, faq: true, comparison: true, content: true, docs: false, caseStudies: false });
});

test('homepage: an empty JavaScript shell is flagged', () => {
  const page = analyzeHomepage('<html><body><div id="root"></div><script src="/app.js"></script></body></html>', 'https://app.example.com/');
  assert.equal(page.appShell, true);
  assert.equal(page.visibleWords, 0);
});
