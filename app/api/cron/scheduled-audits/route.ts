// Vercel Cron: queues scheduled re-audits for projects with tracking enabled.
// Runs daily. Checks each project's plan to determine if it's eligible
// for weekly (Starter) or daily (Pro) re-audits.

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPlanLimits, type PlanId } from '@/lib/billing/plans';
import { getEffectivePlan } from '@/lib/billing/effective-plan';
import { authorizeServiceRequest } from '@/lib/auth/service-request';
import { recordOperationalEvent } from '@/lib/ops/events';
import { consumeRateLimit, RATE_LIMITS, rateLimitError } from '@/lib/security/rate-limit';
import { canonicalAuditJson } from '@/lib/reports/canonical-audit-envelope';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = authorizeServiceRequest(request, ['CRON_SECRET']);
  if (!auth.configured) {
    return NextResponse.json({ error: 'Service authentication is not configured' }, { status: 503 });
  }
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const rateLimit = await consumeRateLimit(request, RATE_LIMITS.cronScheduler, 'scheduled-audits');
  if (!rateLimit.allowed) return rateLimitError(rateLimit, 'Scheduled audit trigger limit reached.');

  const supabase = createAdminClient();
  const { data: schedulerRun } = await supabase
    .from('scheduler_runs')
    .insert({ job_name: 'scheduled-audits', status: 'running' })
    .select('id')
    .single();
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0=Sunday

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, user_id, profiles(plan, plan_expires_at)')
    .eq('status', 'active');

  if (projectsError) {
    if (schedulerRun) {
      await supabase.from('scheduler_runs').update({
        status: 'failed',
        error: projectsError.message,
        completed_at: new Date().toISOString(),
      }).eq('id', schedulerRun.id);
    }
    await recordOperationalEvent({ eventType: 'scheduler_failed', severity: 'error', metadata: { job: 'scheduled-audits', error: projectsError.message } }, supabase);
    return NextResponse.json({ error: 'Unable to load scheduled projects' }, { status: 500 });
  }

  if (!projects || projects.length === 0) {
    if (schedulerRun) {
      await supabase.from('scheduler_runs').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', schedulerRun.id);
    }
    return NextResponse.json({ message: 'No active projects' });
  }

  let queued = 0;
  let skippedAtPlanLimit = 0;
  const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  for (const project of projects) {
    const profile = project.profiles as { plan: string; plan_expires_at: string | null } | null;
    const plan = getEffectivePlan(profile);
    const limits = getPlanLimits(plan);

    const shouldRun =
      (limits.dailyTracking) ||
      (limits.weeklyTracking && dayOfWeek === 1); // Monday

    if (!shouldRun) continue;

    if (limits.auditsPerMonth !== -1) {
      const { count, error: countError } = await supabase
        .from('audits')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', project.id)
        .gte('created_at', periodStart);
      if (countError) {
        console.warn(`[scheduled-audits] Unable to count audits for ${project.id}: ${countError.message}`);
        continue;
      }
      if ((count ?? 0) >= limits.auditsPerMonth) {
        skippedAtPlanLimit++;
        continue;
      }
    }

    const { data: existingQueue } = await supabase
      .from('audit_queue')
      .select('id')
      .eq('project_id', project.id)
      .in('status', ['pending', 'processing'])
      .limit(1);

    if (existingQueue && existingQueue.length > 0) continue;

    const { data: audit } = await supabase
      .from('audits')
      .insert({
        project_id: project.id,
        status: 'queued',
        trigger_type: 'scheduled',
        prompt_count: limits.promptsPerAudit,
        report_data: canonicalAuditJson(),
      })
      .select()
      .single();

    if (audit) {
      const { error: queueError } = await supabase.from('audit_queue').insert({
        project_id: project.id,
        audit_id: audit.id,
        priority: limits.priorityQueue ? 10 : 0,
      });
      if (queueError) {
        console.warn(`[scheduled-audits] Unable to queue audit ${audit.id}: ${queueError.message}`);
        await supabase
          .from('audits')
          .update({ status: 'failed', completed_at: new Date().toISOString() })
          .eq('id', audit.id);
      } else {
        queued++;
      }
    }
  }

  if (schedulerRun) {
    await supabase.from('scheduler_runs').update({
      status: 'completed',
      queued_count: queued,
      completed_at: new Date().toISOString(),
    }).eq('id', schedulerRun.id);
  }
  await Promise.all([
    supabase.rpc('cleanup_expired_rate_limits'),
    supabase.rpc('recover_stale_audit_jobs', { p_stale_minutes: 15 }),
    recordOperationalEvent({
      eventType: 'scheduler_completed',
      metadata: { job: 'scheduled-audits', queued, skippedAtPlanLimit },
    }, supabase),
  ]);

  return NextResponse.json({
    message: `Queued ${queued} scheduled audit(s)`,
    queued,
    skippedAtPlanLimit,
  });
}
