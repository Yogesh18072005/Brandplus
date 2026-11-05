import { NextResponse } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isOpsUser } from '@/lib/auth/ops-access';
import { getPlanLimits, type PlanId } from '@/lib/billing/plans';
import { guardMutationRequest } from '@/lib/http/request-security';
import { consumeRateLimit, rateLimitError } from '@/lib/security/rate-limit';
import { recordOperationalEvent } from '@/lib/ops/events';
import { canonicalAuditJson } from '@/lib/reports/canonical-audit-envelope';

const requestSchema = z.object({
  projectId: z.string().uuid(),
  planId: z.enum(['free', 'starter', 'pro']),
}).strict();

const ADMIN_AUDIT_RATE_LIMIT = {
  scope: 'admin-audit',
  limit: 20,
  windowSeconds: 60 * 60,
} as const;

export async function POST(request: Request) {
  const guard = guardMutationRequest(request, { json: true, maxBodyBytes: 8 * 1024 });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = {
    id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
  };
  if (!isOpsUser(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const rateLimit = await consumeRateLimit(request, ADMIN_AUDIT_RATE_LIMIT, user.id);
  if (!rateLimit.allowed) return rateLimitError(rateLimit, 'Admin audit queue limit reached.');

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
  }

  const { projectId, planId } = parsed.data;
  const admin = createAdminClient();
  const { data: project, error: projectError } = await admin
    .from('projects')
    .select('id, business_name')
    .eq('id', projectId)
    .maybeSingle();

  if (projectError) return NextResponse.json({ error: 'Project lookup failed' }, { status: 500 });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const { data: activeJobs, error: activeJobError } = await admin
    .from('audit_queue')
    .select('id')
    .eq('project_id', projectId)
    .in('status', ['pending', 'processing'])
    .limit(1);

  if (activeJobError) return NextResponse.json({ error: 'Queue lookup failed' }, { status: 500 });
  if (activeJobs?.length) {
    return NextResponse.json({ error: 'An audit is already queued or running for this project' }, { status: 409 });
  }

  const limits = getPlanLimits(planId as PlanId);
  const { data: audit, error: auditError } = await admin
    .from('audits')
    .insert({
      project_id: projectId,
      status: 'queued',
      trigger_type: 'manual',
      prompt_count: limits.promptsPerAudit,
      report_data: canonicalAuditJson(),
    })
    .select('id')
    .single();

  if (auditError || !audit) {
    return NextResponse.json({ error: auditError?.message ?? 'Audit creation failed' }, { status: 500 });
  }

  // Audits outlive Vercel's time limit, so even founder-launched ones wait for
  // the local runner instead of being picked up by a serverless worker.
  const { data: queued, error: queueError } = await admin.from('audit_queue').insert({
    project_id: projectId,
    audit_id: audit.id,
    priority: limits.priorityQueue ? 10 : 0,
    requires_approval: true,
  }).select('id').single();

  if (queueError || !queued) {
    await admin
      .from('audits')
      .update({ status: 'failed', completed_at: new Date().toISOString() })
      .eq('id', audit.id);
    return NextResponse.json(
      { error: queueError?.code === '23505' ? 'An audit is already queued or running for this project' : 'Queue insertion failed' },
      { status: queueError?.code === '23505' ? 409 : 500 },
    );
  }
  // Automatically approve the request and reserve one credit atomically.
  const { data: approvalRows, error: approvalError } = await admin.rpc(
    'approve_audit_request',
    {
      p_queue_id: queued.id,
      p_mode: 'charge',
    }
  );

  const approval = approvalRows?.[0];

  if (approvalError || !approval?.ok) {
    console.error('[audits] Automatic approval failed:', approvalError?.message ?? approval?.reason);

    // Close the request only if it is still pending and unapproved.
    const { data: closedQueue } = await admin
      .from('audit_queue')
      .update({
        status: 'failed',
        error: approvalError?.message ?? `Automatic approval failed: ${approval?.reason ?? 'unknown'}`,
        completed_at: new Date().toISOString(),
      })
      .eq('id', queued.id)
      .eq('status', 'pending')
      .is('approved_at', null)
      .select('id')
      .maybeSingle();

    if (closedQueue) {
      await admin
        .from('audits')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', audit.id);
    }

    if (approval?.reason === 'no_credit') {
      return NextResponse.json({
        error: upgradeMessage(plan),
        code: 'NO_CREDITS',
        plan,
      }, { status: 402 });
    }

    return NextResponse.json({
      error: 'Your audit could not be approved. Please try again.',
    }, { status: 500 });
  }
  await recordOperationalEvent({
    eventType: 'admin_audit_queued',
    projectId,
    auditId: audit.id,
    metadata: {
      requestedPlan: planId,
      promptCount: limits.promptsPerAudit,
      adminProfileId: user.id,
    },
  }, admin);

  return NextResponse.json({
    ok: true,
    auditId: audit.id,
    projectName: project.business_name,
    planId,
    promptCount: limits.promptsPerAudit,
    queueId: queued.id,
    command: `npm run audit:run -- ${queued.id} --free --confirm`,
    message: `${planId[0]?.toUpperCase()}${planId.slice(1)} audit queued, no credits used. Run it from your terminal:`,
  }, { status: 201 });
}
