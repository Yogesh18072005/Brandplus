// Unit tests for admin subdomain routing. Run: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adminHref, adminOrigin, isAdminHost, routeAdminRequest } from './host';

type Origins = { adminOrigin: string | null; appOrigin: string | null };
const opts: Origins = { adminOrigin: 'https://admin.zerociate.com', appOrigin: 'https://www.zerociate.com' };
const route = (url: string, host: string, o: Origins = opts) => routeAdminRequest(new URL(url), host, o);

test('recognises admin hosts', () => {
  assert.equal(isAdminHost('admin.zerociate.com'), true);
  assert.equal(isAdminHost('admin.localhost:3001'), true);
  assert.equal(isAdminHost('www.zerociate.com'), false);
  assert.equal(isAdminHost('administrator.com'), false);
  assert.equal(adminOrigin('https://admin.zerociate.com/'), 'https://admin.zerociate.com');
  assert.equal(adminOrigin(''), null);
});

test('admin host serves the console at clean paths', () => {
  assert.deepEqual(route('https://admin.zerociate.com/', 'admin.zerociate.com'), { kind: 'rewrite', pathname: '/admin' });
  assert.deepEqual(route('https://admin.zerociate.com/sign-in', 'admin.zerociate.com'), { kind: 'rewrite', pathname: '/admin/sign-in' });
  assert.deepEqual(route('https://admin.zerociate.com/sign-in/factor-one', 'admin.zerociate.com'), { kind: 'rewrite', pathname: '/admin/sign-in/factor-one' });
});

test('admin host canonicalises /admin paths and sends other pages to the main site', () => {
  assert.deepEqual(route('https://admin.zerociate.com/admin/sign-in?x=1', 'admin.zerociate.com'), { kind: 'redirect', url: 'https://admin.zerociate.com/sign-in?x=1' });
  assert.deepEqual(route('https://admin.zerociate.com/r/abc', 'admin.zerociate.com'), { kind: 'redirect', url: 'https://www.zerociate.com/r/abc' });
});

test('API, Next.js and Clerk paths always pass through', () => {
  for (const path of ['/api/admin/audits', '/_next/static/x.js', '/__clerk/v1/client']) {
    assert.deepEqual(route(`https://admin.zerociate.com${path}`, 'admin.zerociate.com'), { kind: 'pass' });
  }
});

test('main host redirects /admin to the admin host only when configured', () => {
  assert.deepEqual(route('https://www.zerociate.com/admin', 'www.zerociate.com'), { kind: 'redirect', url: 'https://admin.zerociate.com/' });
  assert.deepEqual(route('https://www.zerociate.com/admin/sign-in', 'www.zerociate.com'), { kind: 'redirect', url: 'https://admin.zerociate.com/sign-in' });
  assert.deepEqual(route('http://localhost:3001/admin', 'localhost:3001', { adminOrigin: null, appOrigin: null }), { kind: 'pass' });
  assert.deepEqual(route('https://www.zerociate.com/administer', 'www.zerociate.com'), { kind: 'pass' });
});

test('console links follow the host', () => {
  assert.equal(adminHref('/', true), '/');
  assert.equal(adminHref('/sign-in', true), '/sign-in');
  assert.equal(adminHref('/', false), '/admin');
  assert.equal(adminHref('/sign-in', false), '/admin/sign-in');
});
