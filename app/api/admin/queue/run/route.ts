import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isOpsUser } from '@/lib/auth/ops-access';
import { guardMutationRequest } from '@/lib/http/request-security';
import { consumeRateLimit, rateLimitError } from '@/lib/security/rate-limit';
import { processNextQueueJob } from '@/lib/queue/process-next-job';
import { recordOperationalEvent } from '@/lib/ops/events';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const ADMIN_QUEUE_RUN_RATE_LIMIT = {
  scope: 'admin-queue-run',
  limit: 12,
  windowSeconds: 60 * 60,
} as const;

export async function POST(request: Request) {
  const guard = guardMutationRequest(request, { json: true, maxBodyBytes: 1024 });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const email = clerkUser.primaryEmailAddress?.emailAddress ?? null;
  if (!isOpsUser(email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const rateLimit = await consumeRateLimit(request, ADMIN_QUEUE_RUN_RATE_LIMIT, clerkUser.id);
  if (!rateLimit.allowed) return rateLimitError(rateLimit, 'Admin queue run limit reached.');

  const admin = createAdminClient();
  const { data: recovered, error: recoveryError } = await admin.rpc('recover_stale_audit_jobs', {
    // This route runs at most 5 minutes (maxDuration) and live jobs heartbeat,
    // so a job silent for 6 minutes was killed by the platform: retry it.
    p_stale_minutes: 6,
  });

  if (recoveryError) {
    await recordOperationalEvent({
      eventType: 'stale_job_recovery_failed',
      severity: 'error',
      metadata: { source: 'admin-console', error: recoveryError.message },
    }, admin);
  } else if ((recovered ?? 0) > 0) {
    await recordOperationalEvent({
      eventType: 'stale_jobs_recovered',
      severity: 'warning',
      metadata: { source: 'admin-console', count: recovered ?? 0 },
    }, admin);
  }

  const result = await processNextQueueJob(admin);
  return NextResponse.json(result, { status: result.status === 'failed' ? 500 : 200 });
}
