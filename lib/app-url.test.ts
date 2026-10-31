import assert from 'node:assert/strict';
import { describe, test, afterEach } from 'node:test';

// authCallbackUrl uses getClientAppUrl which reads window — test server paths via getAppUrl
import { getAppUrl } from './app-url';

describe('getAppUrl', () => {
  const orig = { ...process.env };

  afterEach(() => {
    process.env = { ...orig };
  });

  test('prefers NEXT_PUBLIC_APP_URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://aeoengine.ai/';
    delete process.env.VERCEL_URL;
    assert.equal(getAppUrl(), 'https://aeoengine.ai');
  });

  test('falls back to VERCEL_URL with https', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    process.env.VERCEL_URL = 'my-app.vercel.app';
    assert.equal(getAppUrl(), 'https://my-app.vercel.app');
  });

  test('falls back to localhost in dev', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_URL;
    assert.equal(getAppUrl(), 'http://localhost:3000');
  });
});

describe('authCallbackUrl shape', () => {
  test('encodes next path in callback URL', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://aeoengine.ai';
    // Dynamic import after env set — getClientAppUrl reads env at call time
    const { authCallbackUrl } = await import('./app-url');
    assert.equal(
      authCallbackUrl('/dashboard/billing?plan=starter'),
      'https://aeoengine.ai/callback?next=%2Fdashboard%2Fbilling%3Fplan%3Dstarter'
    );
  });
});
