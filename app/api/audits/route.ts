import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { getPlanLimits } from '@/lib/billing/plans';
import { getEffectivePlan } from '@/lib/billing/effective-plan';
import { guardMutationRequest } from '@/lib/http/request-security';
import { firstValidationError, queueAuditSchema } from '@/lib/validation/project';
import { consumeRateLimit, RATE_LIMITS, rateLimitError } from '@/lib/security/rate-limit';
import { ACCOUNT_BLOCK_MESSAGES } from '@/lib/security/account-guard';
import { canonicalAuditJson } from '@/lib/reports/canonical-audit-envelope';

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  let query = supabase
    .from('audits')
    .select('*, projects!inner(user_id, business_name)')
    .eq('projects.user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const guard = guardMutationRequest(request, { json: true });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimit = await consumeRateLimit(request, RATE_LIMITS.createAudit, user.id);
  if (!rateLimit.allowed) return rateLimitError(rateLimit, 'Audit request limit reached. Try again later.');

  const parsed = queueAuditSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: firstValidationError(parsed.error) }, { status: 400 });
  }
  const { projectId } = parsed.data;

  const { data: project } = await supabase
    .from('projects')
    .select('id, user_id, business_name, website')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at, free_credit_status, email, credits_reset_at')
    .eq('id', user.id)
    .single();

  const plan = getEffectivePlan(profile);
  const limits = getPlanLimits(plan);
  const admin = createAdminClient();

  // Block a second concurrent run for the same project (no credit spent).
  const { data: existingQueue } = await admin
    .from('audit_queue')
    .select('id')
    .eq('project_id', projectId)
    .in('status', ['pending', 'processing'])
    .limit(1);

  if (existingQueue && existingQueue.length > 0) {
    return NextResponse.json({ error: 'An audit is already queued or running for this business.' }, { status: 409 });
  }

  // Audits are free to customers: no credit is reserved or deducted.
  // Keep the plan's included audit allowance as a usage limit so a free
  // account cannot generate unlimited provider usage.
  if (profile?.free_credit_status !== 'granted' && plan === 'free') {
    const pendingSetup = profile?.free_credit_status === 'pending';
    return NextResponse.json({
      error: pendingSetup ? 'Finish setting up your account first, then request your audit.' : ACCOUNT_BLOCK_MESSAGES.blocked,
      code: pendingSetup ? 'ACCOUNT_SETUP_REQUIRED' : 'FREE_CREDIT_LIMIT_REACHED',
    }, { status: 402 });
  }
  if (limits.auditsPerMonth !== -1) {
    let usageQuery = admin
      .from('audits')
      .select('id, projects!inner(user_id)', { count: 'exact', head: true })
      .eq('projects.user_id', user.id)
      .neq('status', 'failed');
    if (plan !== 'free') {
      const resetAt = profile?.credits_reset_at ? new Date(profile.credits_reset_at).getTime() : Number.NaN;
      const periodStart = Number.isFinite(resetAt) && resetAt > Date.now()
        ? new Date(resetAt - 30 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      usageQuery = usageQuery.gte('created_at', periodStart);
    }
    const { count: usedAudits, error: usageError } = await usageQuery;
    if (usageError) {
      console.error('[audits] Usage lookup failed:', usageError.message);
      return NextResponse.json({ error: 'We couldn’t verify your free audit allowance. Please try again.' }, { status: 503 });
    }
    if ((usedAudits ?? 0) >= limits.auditsPerMonth) {
      return NextResponse.json({
        error: plan === 'free'
          ? 'Your included free audit has already been used.'
          : 'Your included audits for this period have been used.',
        code: 'AUDIT_ALLOWANCE_REACHED',
        plan,
      }, { status: 402 });
    }
  }

  // Trusted writes use the service role. Browser clients have no direct INSERT
  // grant on audits/audit_queue; ownership and the credit check above are
  // therefore the only supported path into the queue.
  const { data: audit, error: auditErr } = await admin
    .from('audits')
    .insert({
      project_id: projectId,
      status: 'queued',
      trigger_type: 'manual',
      prompt_count: limits.promptsPerAudit,
      report_data: canonicalAuditJson(),
    })
    .select()
    .single();

  if (auditErr || !audit) {
    return NextResponse.json({ error: 'We couldn’t create your audit. Try again in a minute.' }, { status: 500 });
  }

  const { data: queued, error: queueErr } = await admin
    .from('audit_queue')
    .insert({
      project_id: projectId,
      audit_id: audit.id,
      priority: limits.priorityQueue ? 10 : 0,
      requires_approval: true,
      requested_by: user.id,
    })
    .select('id')
    .single();

  if (queueErr || !queued) {
    const { error: failAuditError } = await admin
      .from('audits')
      .update({ status: 'failed', completed_at: new Date().toISOString() })
      .eq('id', audit.id);
    if (failAuditError) console.error('[audits] Failed to close unqueued audit:', failAuditError.message);
    // The unique open-request index turns a double click into a conflict, not a second audit.
    const duplicate = queueErr?.code === '23505';
    return NextResponse.json(
      { error: duplicate ? 'An audit is already queued or running for this business.' : 'We couldn’t queue your audit. Try again in a minute.' },
      { status: duplicate ? 409 : 500 },
    );
  }

  // Approve in free mode immediately. This does not reserve or deduct a
  // customer credit; the queue worker still enforces the global provider spend cap.
  const { data: approval, error: approvalError } = await admin
    .rpc('approve_audit_request', { p_queue_id: queued.id, p_mode: 'free' })
    .single();

  if (approvalError || !approval?.ok) {
    const reason = approvalError?.message ?? approval?.reason ?? 'Approval was not confirmed';
    await Promise.all([
      admin.from('audit_queue').update({ status: 'failed', error: reason, completed_at: new Date().toISOString() }).eq('id', queued.id),
      admin.from('audits').update({ status: 'failed', completed_at: new Date().toISOString() }).eq('id', audit.id),
    ]);
    console.error('[audits] Automatic free approval failed:', reason);
    return NextResponse.json({ error: 'Your business was saved, but the free audit could not be started. Please try again from the business page.' }, { status: 503 });
  }

  return NextResponse.json(
    {
      id: audit.id,
      auditId: audit.id,
      status: 'queued',
      message: 'Your free audit has started. This page will update when your report is ready.',
    },
    { status: 201 }
  );
}
