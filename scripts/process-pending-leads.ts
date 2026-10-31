#!/usr/bin/env npx tsx
/**
 * Queue audits for leads that were saved without GUEST_AUDIT_USER_ID configured.
 *
 *   npx tsx scripts/process-pending-leads.ts
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY, GUEST_AUDIT_USER_ID in .env.local
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { createAdminClient } from '../lib/supabase/admin';
import { processPendingLeadAudits, guestAuditUserId } from '../lib/onboarding/queue-free-audit';

async function main() {
  if (!guestAuditUserId()) {
    console.error('Set GUEST_AUDIT_USER_ID in .env.local (Supabase auth user UUID for guest audits).');
    process.exit(1);
  }

  const admin = createAdminClient();
  const results = await processPendingLeadAudits(admin, 20);

  if (results.length === 0) {
    console.log('No pending leads without audits.');
    return;
  }

  for (const r of results) {
    if (r.ok) {
      console.log(`✓ lead ${r.leadId} → audit ${r.auditId}`);
    } else {
      console.error(`✗ lead ${r.leadId}: ${r.error}`);
    }
  }

  const ok = results.filter((r) => r.ok).length;
  console.log(`\nDone: ${ok}/${results.length} queued.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
