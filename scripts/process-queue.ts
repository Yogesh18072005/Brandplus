#!/usr/bin/env npx tsx
/**
 * Process pending audits from audit_queue — run this on YOUR machine, not Vercel.
 *
 *   npm run queue          # process one job
 *   npm run queue -- --all # process until queue empty
 *
 * Requires .env.local with GOOGLE_API_KEY, Supabase keys, BREVO_API_KEY, EMAIL_FROM,
 * and NEXT_PUBLIC_APP_URL set to your production domain (for report links in emails).
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { createAdminClient } from '../lib/supabase/admin';
import { processAllQueueJobs, processNextQueueJob } from '../lib/queue/process-next-job';
import { getAppUrl } from '../lib/app-url';

async function main() {
  const all = process.argv.includes('--all');
  const statusOnly = process.argv.includes('--status');
  const appUrl = getAppUrl();

  console.log(`BrandPulse — queue processor`);
  console.log(`App URL for emails: ${appUrl}`);
  if (appUrl.includes('localhost')) {
    console.warn('⚠ NEXT_PUBLIC_APP_URL is not set — report links will point to localhost.');
  }

  const admin = createAdminClient();

  if (statusOnly) {
    const { count } = await admin
      .from('audit_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    console.log(`\nPending jobs: ${count ?? 0}`);
    return;
  }

  if (all) {
    const results = await processAllQueueJobs(admin);
    if (results.length === 0 || (results.length === 1 && results[0]!.status === 'empty')) {
      console.log('\nNo pending jobs.');
      return;
    }
    for (const r of results) {
      printResult(r);
    }
    const done = results.filter((r) => r.status === 'completed').length;
    console.log(`\nFinished: ${done} completed, ${results.length - done} stopped.`);
    return;
  }

  const result = await processNextQueueJob(admin);
  printResult(result);
}

function printResult(r: Awaited<ReturnType<typeof processNextQueueJob>>) {
  switch (r.status) {
    case 'empty':
      console.log('\n✓ Queue empty — nothing to do.');
      break;
    case 'completed':
      console.log(`\n✓ ${r.reportUrl ? 'Audit complete' : 'Engine stage complete'}`);
      if (typeof r.visibilityScore === 'number') console.log(`  Legacy score: ${r.visibilityScore}/100`);
      if (typeof r.costInr === 'number') console.log(`  Cost:  ₹${r.costInr}`);
      if (r.reportUrl) console.log(`  Report: ${r.reportUrl}`);
      else console.log(`  ${r.message}`);
      if (r.reportUrl && typeof r.emailed === 'boolean') {
        console.log(`  Email: ${r.emailed ? 'sent' : 'not sent'}`);
      }
      break;
    case 'cap_reached':
      console.error(`\n✗ Spend cap reached (₹${r.spentInr?.toFixed(0)} / ₹${r.capInr})`);
      break;
    case 'failed':
      console.error(`\n✗ Failed: ${r.error}`);
      break;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
