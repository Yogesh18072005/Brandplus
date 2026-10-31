import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { processNextQueueJob } from '@/lib/queue/process-next-job';
import { authorizeServiceRequest } from '@/lib/auth/service-request';
import { recordOperationalEvent } from '@/lib/ops/events';
import { consumeRateLimit, RATE_LIMITS, rateLimitError } from '@/lib/security/rate-limit';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/**
 * Optional HTTP trigger for the queue — same logic as `npm run queue`.
 * Prefer the CLI on your machine: Vercel Hobby times out at 60s and audits take minutes.
 *
 * Auth: Authorization: Bearer <CRON_SECRET or ADMIN_SECRET>
 */
export async function GET(request: Request) {
  const auth = authorizeServiceRequest(request);
  if (!auth.configured) {
    return NextResponse.json({ error: 'Service authentication is not configured' }, { status: 503 });
  }
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const rateLimit = await consumeRateLimit(request, RATE_LIMITS.cronWorker, 'process-queue');
  if (!rateLimit.allowed) return rateLimitError(rateLimit, 'Queue trigger limit reached.');

  const supabase = createAdminClient();
  const { data: recovered, error: recoveryError } = await supabase.rpc('recover_stale_audit_jobs', {
    // This route runs at most 5 minutes (maxDuration) and live jobs heartbeat,
    // so a job silent for 6 minutes was killed by the platform: retry it.
    p_stale_minutes: 6,
  });
  if (recoveryError) {
    await recordOperationalEvent({
      eventType: 'stale_job_recovery_failed',
      severity: 'error',
      metadata: { error: recoveryError.message },
    }, supabase);
  } else if ((recovered ?? 0) > 0) {
    await recordOperationalEvent({
      eventType: 'stale_jobs_recovered',
      severity: 'warning',
      metadata: { count: recovered ?? 0 },
    }, supabase);
  }
  const result = await processNextQueueJob(supabase);
  const status = result.status === 'failed' ? 500 : 200;
  return NextResponse.json(result, { status });
}
