import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { hashDeviceFingerprint, utcOffsetMinutes, vpnSuspected } from './account-guard';

const headers = (values: Record<string, string>) => new Headers(values);
const at = new Date('2026-10-12T06:00:00Z');
const source = (file: string) => readFileSync(file, 'utf8');

test('UTC offsets compare zones by offset, so aliases match', () => {
  assert.equal(utcOffsetMinutes('Asia/Kolkata', at), 330);
  assert.equal(utcOffsetMinutes('Asia/Calcutta', at), 330);
  assert.equal(utcOffsetMinutes('UTC', at), 0);
  assert.equal(utcOffsetMinutes('Not/AZone', at), null);
});

test('VPN suspected when the browser timezone disagrees with the IP timezone', () => {
  assert.equal(vpnSuspected(headers({ 'x-vercel-ip-timezone': 'Asia/Kolkata' }), 'Asia/Calcutta', at), false);
  assert.equal(vpnSuspected(headers({ 'x-vercel-ip-timezone': 'America/New_York' }), 'Asia/Kolkata', at), true);
  assert.equal(vpnSuspected(headers({ 'x-vercel-ip-timezone': 'Europe/Amsterdam' }), 'Asia/Kolkata', at), true);
});

test('a hidden or fake browser timezone is suspicious; no IP timezone means no verdict', () => {
  assert.equal(vpnSuspected(headers({ 'x-vercel-ip-timezone': 'Asia/Kolkata' }), null, at), true);
  assert.equal(vpnSuspected(headers({ 'x-vercel-ip-timezone': 'Asia/Kolkata' }), 'Mars/Olympus', at), true);
  assert.equal(vpnSuspected(headers({}), 'Asia/Kolkata', at), false);
});

test('device fingerprints are re-hashed with the server salt and must look like SHA-256', () => {
  const fingerprint = 'a'.repeat(64);
  const hashed = hashDeviceFingerprint(fingerprint);
  assert.match(hashed ?? '', /^[a-f0-9]{64}$/);
  assert.notEqual(hashed, fingerprint);
  assert.equal(hashDeviceFingerprint('not-a-hash'), null);
});

test('one account per network and device: the database decides, once, under locks', () => {
  const sql = source('supabase/migrations/025_admin_approved_audits_and_account_guard.sql');
  const fn = sql.slice(sql.indexOf('function public.claim_account_identity'));
  assert.match(fn, /requires service_role/);
  assert.match(fn, /pg_advisory_xact_lock\(hashtextextended\('network:'/);
  assert.match(fn, /pg_advisory_xact_lock\(hashtextextended\('device:'/);
  assert.match(fn, /decision := 'network_used'/);
  assert.match(fn, /decision := 'device_used'/);
  // A VPN verdict is not recorded, so switching it off lets them retry.
  assert.match(fn, /if decision in \('vpn_suspected', 'identity_unavailable'\) then\s+return query select false, decision, false;/);
});

test('requests wait for the founder; workers never claim an unapproved request', () => {
  const sql = source('supabase/migrations/025_admin_approved_audits_and_account_guard.sql');
  const claimNext = sql.slice(sql.indexOf('function public.claim_next_audit_job'), sql.indexOf('function public.claim_project_audit_job'));
  assert.match(claimNext, /and \(not q\.requires_approval or q\.approved_at is not null\)/);
  const approve = sql.slice(sql.indexOf('function public.approve_audit_request'));
  assert.match(approve, /for update/);
  assert.match(approve, /if job\.approved_at is not null then\s+return query select true, 'already_approved'/);
  assert.match(sql, /create unique index if not exists audit_queue_one_open_request_per_project/);
});

test('requesting an audit checks credit but never takes it; the founder charges on run', () => {
  const route = source('app/api/audits/route.ts');
  assert.doesNotMatch(route, /reserveAuditCredit|refundAuditCredit/);
  assert.match(route, /requires_approval: true/);
  assert.match(route, /requested_by: user\.id/);
  const runner = source('scripts/run-audit-request.ts');
  assert.match(runner, /approve_audit_request/);
  assert.match(runner, /if \(!confirm\)/);
  assert.match(runner, /processNextProjectJob/);
});

test('no audit without an account: the public endpoint is retired', async () => {
  const { POST } = await import('../../app/api/audit-request/route');
  const response = await POST();
  assert.equal(response.status, 410);
  assert.equal((await response.json()).code, 'ACCOUNT_REQUIRED');
  assert.doesNotMatch(source('components/landing/AuditForm.tsx'), /\/api\/audit-request/);
});

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? routeFiles(full) : name === 'route.ts' ? [full] : [];
  });
}

test('every engine, fix-plan and content-tool route is founder-only', () => {
  const guarded = [
    ...['interventions', 'actions', 'ai-observations', 'evidence-diagnoses', 'business-understanding', 'buyer-intent', 'refresh-prompts', 'experiments']
      .flatMap((name) => routeFiles(path.join('app/api/projects/[id]', name))),
    ...routeFiles('app/api/tools'),
  ];
  assert.ok(guarded.length > 15);
  for (const file of guarded) assert.match(source(file), /founderOnly\(user\.email\)/, file);
  assert.match(source('lib/execution/api.ts'), /founderOnly\(user\.email\)/);
  assert.match(source('app/r/[id]/page.tsx'), /currentViewerIsOps/);
  assert.match(source('app/api/reports/[id]/pdf/route.ts'), /currentViewerIsOps/);
});
