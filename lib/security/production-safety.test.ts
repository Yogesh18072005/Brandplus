import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getRequestIdentity } from './rate-limit';
import { getRequestNetworkIdentity, normalizeNetworkAddress } from './request-network';
import { missingProductionEnvironment } from '@/lib/env/production';

test('P0: ownership migration removes anonymous completed-report access', () => {
  const sql = readFileSync('supabase/migrations/008_production_safety.sql', 'utf8');
  assert.match(sql, /drop policy if exists "Anyone can view audits by id for public reports"/);
  assert.match(sql, /drop policy if exists "Anyone can view results for completed audits"/);
  assert.match(sql, /revoke select on table public\.audits from anon/);
  assert.match(sql, /revoke select on table public\.audit_results from anon/);
  assert.match(sql, /to authenticated[\s\S]*p\.user_id = auth\.uid\(\)/);
});

test('P0: rate-limit identity prefers authenticated user and normalizes proxy IP', () => {
  const request = new Request('https://brandpulse.test/api/audit-request', {
    headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' },
  });
  assert.equal(getRequestIdentity(request), 'network:v4:203.0.113.7');
  assert.equal(getRequestIdentity(request, 'user-123'), 'user:user-123');
});

test('P0: production environment validation names missing critical services', () => {
  const missing = missingProductionEnvironment({ NODE_ENV: 'production' });
  const names = new Set(missing.map((item) => item.name));
  for (const expected of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GOOGLE_API_KEY', 'CRON_SECRET', 'RATE_LIMIT_SALT']) {
    assert.equal(names.has(expected), true);
  }
});
test('P0: production validation rejects copied example placeholders', () => {
  const missing = missingProductionEnvironment({
    NODE_ENV: 'production',
    RATE_LIMIT_SALT: 'replace_with_at_least_32_random_characters',
    CRON_SECRET: 'your_cron_secret_that_is_long_but_not_real',
    ADMIN_SECRET: 'change_me_change_me_change_me_change_me',
    ADMIN_EMAILS: 'founder@example.com',
  });
  const names = new Set(missing.map((item) => item.name));
  for (const expected of ['RATE_LIMIT_SALT', 'CRON_SECRET', 'ADMIN_SECRET', 'ADMIN_EMAILS']) {
    assert.equal(names.has(expected), true);
  }
});

test('P0: Razorpay and Clerk webhook endpoints remain public for signed server callbacks', () => {
  const proxy = readFileSync('proxy.ts', 'utf8');
  assert.match(proxy, /isPublicWebhookRoute/);
  assert.match(proxy, /['"]\/api\/billing\/verify['"]/);
  assert.match(proxy, /['"]\/api\/webhooks\/clerk['"]/);
  assert.match(proxy, /isProtectedRoute\(request\) && !isPublicWebhookRoute\(request\)/);
});
test('P0: production network identity trusts only the configured proxy', () => {
  const previous = {
    nodeEnv: process.env.NODE_ENV,
    vercel: process.env.VERCEL,
    trusted: process.env.TRUSTED_PROXY_IP_HEADER,
  };
  try {
    Reflect.set(process.env, 'NODE_ENV', 'production');
    delete process.env.VERCEL;
    delete process.env.TRUSTED_PROXY_IP_HEADER;
    const spoofed = new Headers({ 'x-forwarded-for': '203.0.113.9' });
    assert.equal(getRequestNetworkIdentity(spoofed), null);

    process.env.VERCEL = '1';
    const trusted = new Headers({ 'x-vercel-forwarded-for': '203.0.113.9, 10.0.0.1' });
    assert.equal(getRequestNetworkIdentity(trusted), 'v4:203.0.113.9');
  } finally {
    if (previous.nodeEnv === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV'); else Reflect.set(process.env, 'NODE_ENV', previous.nodeEnv);
    if (previous.vercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = previous.vercel;
    if (previous.trusted === undefined) delete process.env.TRUSTED_PROXY_IP_HEADER; else process.env.TRUSTED_PROXY_IP_HEADER = previous.trusted;
  }
});

test('P0: IPv6 privacy addresses are grouped into one /64 network', () => {
  assert.equal(normalizeNetworkAddress('2001:db8:abcd:12::1'), 'v6:2001:0db8:abcd:0012/64');
  assert.equal(normalizeNetworkAddress('2001:db8:abcd:12:ffff::9'), 'v6:2001:0db8:abcd:0012/64');
});

test('P0: free-tier claims are hashed, atomic, service-only, and capped at two', () => {
  const sql = readFileSync('supabase/migrations/017_free_tier_abuse_protection.sql', 'utf8');
  assert.match(sql, /granted_count < 2/);
  assert.match(sql, /claimed_count >= 2/);
  assert.equal((sql.match(/select count\(\*\) from public\.free_signup_credit_claims/g) ?? []).length, 2);
  assert.equal((sql.match(/select count\(\*\) from public\.free_audit_claims/g) ?? []).length, 2);
  const entitlement = readFileSync('lib/security/free-entitlement.ts', 'utf8');
  assert.equal((entitlement.match(/free-entitlement-network/g) ?? []).length, 2);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /claim_free_signup_credit requires service_role/);
  assert.match(sql, /claim_free_public_audit requires service_role/);
  assert.match(sql, /alter column credits_remaining set default 0/);
  assert.match(sql, /if effective_plan = 'free'/);
});

test('P0: Supabase configuration cannot fall back to browser-exposed names', () => {
  const config = readFileSync('lib/supabase/config.ts', 'utf8');
  assert.doesNotMatch(config, /NEXT_PUBLIC_SUPABASE/);
});
