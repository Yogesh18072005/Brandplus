import assert from 'node:assert/strict';
import test from 'node:test';
import { authorizeServiceRequest } from './service-request';

const KEYS = ['TEST_ADMIN_SECRET', 'TEST_CRON_SECRET'] as const;

function req(token?: string): Request {
  return new Request('https://example.test/internal', {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

test('service auth fails closed when no secret is configured', () => {
  delete process.env.TEST_ADMIN_SECRET;
  delete process.env.TEST_CRON_SECRET;
  assert.deepEqual(authorizeServiceRequest(req(), KEYS), { configured: false, authorized: false });
});

test('service auth rejects missing and incorrect bearer tokens', () => {
  process.env.TEST_CRON_SECRET = 'correct-secret';
  assert.equal(authorizeServiceRequest(req(), KEYS).authorized, false);
  assert.equal(authorizeServiceRequest(req('wrong-secret'), KEYS).authorized, false);
  delete process.env.TEST_CRON_SECRET;
});

test('service auth accepts either configured bearer token', () => {
  process.env.TEST_ADMIN_SECRET = 'correct-secret';
  process.env.TEST_CRON_SECRET = 'cron-secret';
  assert.deepEqual(authorizeServiceRequest(req('correct-secret'), KEYS), { configured: true, authorized: true });
  assert.deepEqual(authorizeServiceRequest(req('cron-secret'), KEYS), { configured: true, authorized: true });
  delete process.env.TEST_ADMIN_SECRET;
  delete process.env.TEST_CRON_SECRET;
});
