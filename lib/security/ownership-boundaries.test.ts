import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('tenant APIs verify project ownership before returning nested data', () => {
  for (const route of [
    'app/api/projects/[id]/actions/route.ts',
    'app/api/projects/[id]/experiments/route.ts',
    'app/api/projects/[id]/tracking/route.ts',
  ]) {
    const code = source(route);
    assert.match(code, /\.eq\(['"]user_id['"],\s*user\.id\)/, `${route} must bind the project lookup to the session user`);
  }
});

test('BrandPulse intelligence tables replace UUID auth policies with Clerk profile ownership', () => {
  const migration = source('supabase/migrations/009_zerociate_intelligence.sql');
  const clerkMigration = source('supabase/migrations/012_clerk_intelligence_rls.sql');
  for (const table of ['monitored_prompts', 'audit_citations', 'action_items', 'experiments']) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
  }
  assert.match(clerkMigration, /p\.user_id = public\.current_clerk_profile_id\(\)/i);
  assert.match(clerkMigration, /drop policy if exists "Users can view own monitored prompts"/i);
  assert.match(migration, /revoke insert, update, delete on public\.audit_citations from anon, authenticated/i);
});

test('customer reports stay private while authenticated allowlisted admins can inspect them', () => {
  const page = source('app/r/[id]/page.tsx');
  const access = source('lib/reports/access.ts');
  const report = source('components/report/DecisionReport.tsx');
  const operations = source('components/admin/OperationsConsole.tsx');
  assert.match(page, /const full = sampleReport \|\| await currentUserCanViewFullReport\(id\)/);
  assert.match(page, /reportPreview\(model\)/);
  assert.match(page, /currentUserCanViewFullReport/);
  assert.match(report, /One complete evidence chain is included in this preview/);
  assert.match(report, /See how we fix this/);
  assert.match(access, /const clerkUser = await currentUser\(\)/);
  assert.match(access, /if \(isOpsUser\(email\)\)/);
  assert.match(access, /authenticatedUserId && \(isAdmin \|\| authenticatedUserId === ownerUserId\)/);
  assert.match(operations, /\.select\('id, audit_id,/);
  // Absolute main-site links: the console is served from the admin subdomain.
  assert.match(operations, /mainSiteUrl\(`\/r\/\$\{row\.audit_id\}`\)/);
});

test('the admin console page requires a signed-in, allowlisted administrator', () => {
  const page = source('app/admin/page.tsx');
  assert.match(page, /const clerkUser = await currentUser\(\);\s*if \(!clerkUser\) redirect\(signInHref\);/);
  assert.match(page, /if \(!isOpsUser\(email\)\) redirect\(/);
  // The privileged console renders only after both checks.
  assert.ok(page.indexOf('isOpsUser(email)') < page.indexOf('<OperationsConsole'));
});

test('client modules do not import provider SDKs or server credentials', () => {
  function files(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const file = path.join(directory, entry.name);
      return entry.isDirectory() ? files(file) : /\.(ts|tsx)$/.test(entry.name) ? [file] : [];
    });
  }
  for (const file of [...files(path.join(process.cwd(), 'app')), ...files(path.join(process.cwd(), 'components'))]) {
    const code = readFileSync(file, 'utf8');
    if (!/^['"]use client['"];/.test(code.trimStart())) continue;
    assert.doesNotMatch(code, /@google\/genai|supabase\/admin|SUPABASE_SERVICE_ROLE_KEY|GOOGLE_API_KEY|RAZORPAY_KEY_SECRET|BREVO_API_KEY|CLERK_SECRET_KEY|CLERK_WEBHOOK_SIGNING_SECRET|RATE_LIMIT_SALT|CRON_SECRET|ADMIN_SECRET/, file);
  }
});

test('admin audit launcher is allowlist-protected and never spends customer credits', () => {
  const route = source('app/api/admin/audits/route.ts');
  assert.match(route, /if \(!isOpsUser\(user\.email\)\).*403/);
  assert.match(route, /guardMutationRequest\(request, \{ json: true/);
  assert.match(route, /consumeRateLimit\(request, ADMIN_AUDIT_RATE_LIMIT, user\.id\)/);
  assert.doesNotMatch(route, /reserveAuditCredit|refundAuditCredit/);
  assert.match(route, /requestedPlan: planId/);
});
test('customer dashboard never exposes the operations navigation', () => {
  const layout = source('app/dashboard/layout.tsx');
  const shell = source('components/layout/DashboardShell.tsx');
  // The ops flag only reaches the display-only ViewerProvider (hides engine cost
  // from clients); it never adds navigation to the customer shell.
  assert.doesNotMatch(layout, /<DashboardShell[^>]*(isOps|showOps)/);
  assert.doesNotMatch(shell, /isOps|showOps|isOpsUser/);
  assert.doesNotMatch(shell, /label:\s*['"]Operations['"]/);
});
test('admin queue runner is same-origin, Clerk-authenticated, allowlisted, and rate-limited', () => {
  const route = source('app/api/admin/queue/run/route.ts');
  const control = source('components/admin/AdminQueueRunner.tsx');
  assert.match(route, /guardMutationRequest/);
  assert.match(route, /currentUser/);
  assert.match(route, /isOpsUser/);
  assert.match(route, /consumeRateLimit/);
  assert.match(route, /processNextQueueJob/);
  assert.match(control, /\/api\/admin\/queue\/run/);
});
test('billing migration makes top-up grants atomic and records signed refunds', () => {
  const migration = source('supabase/migrations/010_billing_reconciliation.sql');
  assert.match(migration, /for update/i);
  assert.match(migration, /grant_topup_credits/i);
  assert.match(migration, /record_payment_refund/i);
  assert.match(migration, /status in \('created', 'paid', 'failed', 'refunded'\)/i);
});
