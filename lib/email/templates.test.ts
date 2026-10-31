import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { adminTalkRequestEmail, talkRequestReceivedEmail } from './templates';
import { adminNotificationEmails } from './recipients';

const base = {
  topic: 'fixes' as const,
  requesterEmail: 'owner@citybond.in',
  businessName: 'Citybond <script>',
  website: 'https://citybond.in',
  phone: '+91 98765 43210',
  note: 'Line one\nLine <b>two</b>',
  requestedAt: '2026-10-12T06:30:00.000Z',
  adminUrl: 'https://admin.zerociate.com',
};

test('admin talk email names the request, escapes client text, and shows IST time', () => {
  const email = adminTalkRequestEmail(base);
  assert.match(email.subject, /^Fix request: Citybond/);
  assert.match(email.html, /Wants us to do the fixes/);
  assert.match(email.html, /Citybond &lt;script&gt;/);
  assert.doesNotMatch(email.html, /<script>/);
  assert.match(email.html, /Line one<br>Line &lt;b&gt;two&lt;\/b&gt;/);
  assert.match(email.html, /12 Oct 2026, 12:00\s?pm IST/i);
});

test('admin talk email omits rows the client left blank', () => {
  const email = adminTalkRequestEmail({ ...base, topic: 'more_audits', phone: null, note: null, businessName: null, website: null });
  assert.match(email.subject, /^More audits: owner@citybond\.in/);
  assert.doesNotMatch(email.html, />Phone</);
  assert.doesNotMatch(email.html, />Note</);
});

test('client confirmation never quotes a price', () => {
  for (const topic of ['fixes', 'more_audits'] as const) {
    const email = talkRequestReceivedEmail({ topic, businessName: 'Citybond' });
    assert.match(email.html, /one working day/);
    assert.doesNotMatch(email.html, /₹|\$\d/);
  }
});

test('admin allowlist is deduped, lowercased and drops junk', () => {
  assert.deepEqual(adminNotificationEmails(' A@x.com,a@x.com, not-an-email ,b@y.io'), ['a@x.com', 'b@y.io']);
});

test('talk route is same-origin, signed-in, rate-limited and ownership-checked', () => {
  const route = readFileSync('app/api/talk/route.ts', 'utf8');
  const proxy = readFileSync('proxy.ts', 'utf8');
  assert.match(route, /guardMutationRequest/);
  assert.match(route, /consumeRateLimit\(request, RATE_LIMITS\.talkRequest/);
  assert.match(route, /\.eq\('user_id', user\.id\)/);
  assert.match(proxy, /'\/api\/talk\(\.\*\)'/);
});
