// Unit tests for the multi-page site checks and the AI footprint's pure parts. Run: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzePage, findHypeClaims, pickKeyPages, sitemapLocs } from './site-checks';
import { parseListingLines } from './ai-footprint';

test('answer blocks: a question heading followed by a short direct answer', () => {
  const answer = 'We build websites and run SEO for small businesses in Bangalore, usually in four to six weeks from brief to launch, with a fixed price agreed before any work starts.';
  const html = `<html><head><title>FAQ</title><meta name="author" content="Asha Rao"></head><body>
    <h1>Questions</h1>
    <h2>What does the agency do?</h2><p>${answer}</p>
    <div><h3>How long does a site take?</h3></div><div><p>${answer}</p></div>
    <h2>Why choose us?</h2><p>Because.</p>
    <h2>Our services</h2><p>${answer}</p>
  </body></html>`;
  const page = analyzePage(html, 'https://kp.example/faq', 200, 900);
  assert.deepEqual(page.h1, ['Questions']);
  assert.equal(page.questionHeadings, 3);
  // "Why choose us?" is a question but its answer is too thin to quote.
  assert.deepEqual(page.answerBlocks, ['What does the agency do?', 'How long does a site take?']);
  assert.equal(page.hasAuthor, true);
});

test('hype: unproven superlatives about the business, not ordinary phrasing', () => {
  const html = `<html><body>
    <p>Welcome to KP as a Best Digital Marketing Company in Bangalore.</p>
    <p>We are a leading agency for startups.</p>
    <p>We follow best practices and stay on top of the latest innovations in digital marketing.</p>
    <p>We provide the best possible service.</p>
    <p>Rated the best agency in Bangalore by Clutch, 4.9 stars from 60 reviews.</p>
    <div class="testimonial-card"><p>KP is the best web design company in Bangalore.</p></div>
  </body></html>`;
  const claims = findHypeClaims(html, 'https://kp.example/');
  assert.deepEqual(claims.map((c) => c.phrase), ['Best Digital Marketing Company', 'a leading']);
});

test('key pages: about/services/faq first, archives and files skipped', () => {
  const urls = sitemapLocs(`<urlset>
    <url><loc>https://kp.example/</loc></url>
    <url><loc>https://kp.example/blog/2024/05/some-post/</loc></url>
    <url><loc>https://kp.example/tag/seo/</loc></url>
    <url><loc>https://kp.example/services/</loc></url>
    <url><loc>https://kp.example/about-us/</loc></url>
    <url><loc>https://kp.example/brochure.pdf</loc></url>
    <url><loc>https://other.example/about/</loc></url>
  </urlset>`);
  assert.deepEqual(pickKeyPages(urls, 'https://kp.example', 3), ['https://kp.example/services/', 'https://kp.example/about-us/', 'https://kp.example/blog/2024/05/some-post/']);
});

test('directory listing lines: yes needs a link on that directory', () => {
  const parsed = parseListingLines([
    '1. designrush.com | yes | https://www.designrush.com/agency/profile/kp-webbate',
    '- clutch.co | No | none',
    'themanifest.com | yes | https://example.com/kp',
    'goodfirms.co | not sure',
  ].join('\n'), ['designrush.com', 'clutch.co', 'themanifest.com', 'goodfirms.co']);
  assert.deepEqual(parsed.get('designrush.com'), { yes: true, url: 'https://www.designrush.com/agency/profile/kp-webbate' });
  assert.deepEqual(parsed.get('clutch.co'), { yes: false, url: undefined });
  // A "yes" pointing somewhere else keeps no URL, so it won't count as listed without a citation.
  assert.deepEqual(parsed.get('themanifest.com'), { yes: true, url: undefined });
  assert.deepEqual(parsed.get('goodfirms.co'), { yes: null, url: undefined });
});
