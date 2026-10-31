#!/usr/bin/env npx tsx
/**
 * Run one user's audit request on THIS machine, start to finish. Audits take
 * several minutes, longer than Vercel allows, so the admin console gives you
 * this command instead of a button.
 *
 *   npm run audit:run -- <request-id> --charge            # dry run: who, what, credits
 *   npm run audit:run -- <request-id> --charge --confirm  # take 1 credit, run, email the report
 *   npm run audit:run -- <request-id> --free --confirm    # run without touching their credits
 *
 * Safe to re-run with the same id: the credit is only ever taken once, and
 * finished stages are not repeated. Needs .env.local (Supabase service key,
 * GOOGLE_API_KEY, BREVO_API_KEY, EMAIL_FROM).
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

// The report email leaves this machine, so its link must point at the live site.
if (!process.env.NEXT_PUBLIC_APP_URL || /localhost|127\.0\.0\.1/.test(process.env.NEXT_PUBLIC_APP_URL)) {
  process.env.NEXT_PUBLIC_APP_URL = 'https://www.zerociate.com';
}

import { createAdminClient } from '../lib/supabase/admin';
import { processNextProjectJob } from '../lib/queue/process-next-job';
import { resolveCredits } from '../lib/billing/credits';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_STAGES = 40;
const MAX_IDLE_CHECKS = 36; // 36 × 5s = 3 minutes waiting for a retry window

function usage(message?: string): never {
  if (message) console.error(`✗ ${message}\n`);
  console.log('Usage: npm run audit:run -- <request-id> --charge|--free [--confirm]');
  process.exit(1);
}

/** A run that started but could not finish: no usage hint, just what to do next. */
function fail(message: string): never {
  console.error(`
✗ ${message}`);
  process.exit(1);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== '--');
  const queueId = args.find((arg) => UUID.test(arg));
  const charge = args.includes('--charge');
  const free = args.includes('--free');
  const confirm = args.includes('--confirm');
  if (!queueId) usage('Pass the request id from the admin console.');
  if (charge === free) usage('Choose exactly one: --charge (take 1 credit) or --free.');
  const mode = charge ? 'charge' : 'free';

  const admin = createAdminClient();
  const { data: job, error: jobError } = await admin.from('audit_queue')
    .select('id, project_id, audit_id, job_type, status, requires_approval, requested_by, approved_at, credit_mode, credit_charged_at, attempts, max_attempts, error, created_at')
    .eq('id', queueId).maybeSingle();
  if (jobError) throw new Error(`Request lookup failed: ${jobError.message}`);
  if (!job) usage('No request with that id.');
  if (job.job_type !== 'AUDIT') usage('That id is an engine stage, not an audit request.');

  const [{ data: project }, { data: profile }, { data: audit }] = await Promise.all([
    admin.from('projects').select('id, business_name, website').eq('id', job.project_id).maybeSingle(),
    job.requested_by
      ? admin.from('profiles').select('email, plan, plan_expires_at, credits_remaining, credits_reset_at, free_credit_status').eq('id', job.requested_by).maybeSingle()
      : Promise.resolve({ data: null }),
    job.audit_id ? admin.from('audits').select('status, prompt_count').eq('id', job.audit_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (!project) usage('The business for this request no longer exists.');

  const credits = profile ? resolveCredits(profile).creditsRemaining : null;
  console.log('\nBrandPulse · run an audit request');
  console.log(`  Business   ${project.business_name} (${project.website})`);
  console.log(`  Requested  ${new Date(job.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST by ${profile?.email ?? 'admin console'}`);
  console.log(`  Questions  ${audit?.prompt_count ?? '?'}`);
  console.log(`  Credits    ${credits ?? '—'} left${profile?.free_credit_status === 'blocked' ? ' · account flagged (network/device already used)' : ''}`);
  console.log(`  Mode       ${mode === 'charge' ? (job.credit_charged_at ? 'charge (already charged, not charged again)' : 'charge 1 credit') : 'free (credits untouched)'}`);
  console.log(`  Report to  ${process.env.NEXT_PUBLIC_APP_URL}`);

  if (job.status === 'done' && audit?.status === 'completed') {
    console.log('\n✓ This audit already finished. Nothing to do.');
    return;
  }
  if (!confirm) {
    console.log('\nDRY RUN: nothing charged, nothing run. Add --confirm to go.');
    return;
  }

  // A previous run killed mid-stage (closed laptop, Vercel timeout) is retried.
  await admin.rpc('recover_stale_audit_jobs', { p_stale_minutes: 6 });

  const { data: approval, error: approvalError } = await admin
    .rpc('approve_audit_request', { p_queue_id: job.id, p_mode: mode }).single();
  if (approvalError || !approval) throw new Error(`Approval failed: ${approvalError?.message ?? 'no result'}`);
  if (!approval.ok) {
    const reasons: Record<string, string> = {
      no_credit: 'They have no credits left. Re-run with --free to comp it, or ask them to top up.',
      no_requester: 'This was queued from the admin console, not by a user. Re-run with --free.',
      not_found: 'The request disappeared. Refresh the admin console.',
    };
    usage(reasons[approval.reason] ?? `Can’t run it (${approval.reason}). It may already be running or done.`);
  }
  console.log(`\n✓ Approved${approval.reason === 'charged' ? ` · 1 credit taken (${approval.remaining} left)` : approval.reason === 'free' ? ' · free run' : ''}`);

  let idle = 0;
  for (let stage = 1; stage <= MAX_STAGES; stage++) {
    const started = Date.now();
    const result = await processNextProjectJob(admin, project.id);
    if (result.status === 'empty') {
      const { data: latest } = job.audit_id
        ? await admin.from('audits').select('status').eq('id', job.audit_id).maybeSingle()
        : { data: null };
      if (latest?.status === 'completed') {
        console.log(`\n✓ Done. Report: ${process.env.NEXT_PUBLIC_APP_URL}/r/${job.audit_id}`);
        return;
      }
      if (latest?.status === 'failed') fail('The audit failed. Check the admin console for the error, then re-run this command to retry.');
      if (++idle > MAX_IDLE_CHECKS) fail('Nothing runnable for 3 minutes. Re-run this command to continue where it stopped.');
      if (idle === 1) console.log('  … waiting for the next stage');
      await sleep(5_000);
      stage--;
      continue;
    }
    idle = 0;
    const seconds = Math.round((Date.now() - started) / 1000);
    if (result.status === 'cap_reached') fail(`Spend cap reached (₹${result.spentInr?.toFixed(0)} of ₹${result.capInr}). Raise MAX_TOTAL_SPEND_INR to continue.`);
    if (result.status === 'failed') fail(`Stage failed after ${seconds}s: ${result.error ?? result.message}\n  Re-run this command to retry; finished stages are kept.`);
    console.log(`  ✓ ${result.message} (${seconds}s)`);
    if (result.reportUrl) {
      console.log(`\n✓ Report ready: ${result.reportUrl}`);
      console.log(`  Email to ${profile?.email ?? 'the requester'}: ${result.emailed ? 'sent' : 'NOT sent (check Brevo / EMAIL_FROM)'}`);
      return;
    }
  }
  fail('Stopped after too many stages. Re-run this command to continue.');
}

main().catch((error) => {
  console.error(`\n✗ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
