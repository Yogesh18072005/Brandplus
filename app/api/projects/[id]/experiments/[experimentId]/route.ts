import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { guardMutationRequest } from '@/lib/http/request-security';
import { consumeRateLimit, RATE_LIMITS, rateLimitError } from '@/lib/security/rate-limit';
import { founderOnly } from '@/lib/auth/founder-only';

const updateSchema = z.object({
  title: z.string().trim().min(3).max(120).optional(),
  changeSummary: z.string().trim().min(5).max(1000).optional(),
  affectedPage: z.string().trim().max(300).nullable().optional(),
  targetCluster: z.string().trim().max(100).nullable().optional(),
  implementedAt: z.string().date().optional(),
  comparisonAuditId: z.string().uuid().nullable().optional(),
  status: z.enum(['planned', 'monitoring', 'completed', 'cancelled']).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one field is required');

type Context = { params: Promise<{ id: string; experimentId: string }> };

async function ownedExperiment(context: Context) {
  const { id, experimentId } = await context.params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, id, experimentId, experiment: null };

  const { data: project } = await supabase
    .from('projects').select('id').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (!project) return { supabase, user, id, experimentId, experiment: null };

  const { data: experiment } = await supabase
    .from('experiments').select('*').eq('id', experimentId).eq('project_id', id).maybeSingle();
  return { supabase, user, id, experimentId, experiment };
}

export async function GET(_request: Request, context: Context) {
  const { user, experiment } = await ownedExperiment(context);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  { const denied = founderOnly(user.email); if (denied) return denied; }
  if (!experiment) return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
  return NextResponse.json(experiment);
}

export async function PATCH(request: Request, context: Context) {
  const guard = guardMutationRequest(request, { json: true, maxBodyBytes: 16 * 1024 });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { supabase, user, id, experimentId, experiment } = await ownedExperiment(context);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  { const denied = founderOnly(user.email); if (denied) return denied; }
  if (!experiment) return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
  const rateLimit = await consumeRateLimit(request, RATE_LIMITS.projectMutation, user.id);
  if (!rateLimit.allowed) return rateLimitError(rateLimit);

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid experiment update' }, { status: 400 });
  }

  const body = parsed.data;
  const updates = {
    ...(body.title !== undefined ? { title: body.title } : {}),
    ...(body.changeSummary !== undefined ? { change_summary: body.changeSummary } : {}),
    ...(body.affectedPage !== undefined ? { affected_page: body.affectedPage || null } : {}),
    ...(body.targetCluster !== undefined ? { target_cluster: body.targetCluster || null } : {}),
    ...(body.implementedAt !== undefined ? { implemented_at: body.implementedAt } : {}),
    ...(body.comparisonAuditId !== undefined ? { comparison_audit_id: body.comparisonAuditId } : {}),
    ...(body.status !== undefined ? { status: body.status } : {}),
  };

  if (body.comparisonAuditId) {
    const { data: audit } = await supabase
      .from('audits').select('id').eq('id', body.comparisonAuditId).eq('project_id', id).maybeSingle();
    if (!audit) return NextResponse.json({ error: 'Comparison audit not found' }, { status: 400 });
  }

  const { data, error } = await supabase.from('experiments')
    .update(updates).eq('id', experimentId).eq('project_id', id).select().single();
  if (error || !data) return NextResponse.json({ error: 'Experiment update failed' }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request, context: Context) {
  const guard = guardMutationRequest(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { supabase, user, id, experimentId, experiment } = await ownedExperiment(context);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  { const denied = founderOnly(user.email); if (denied) return denied; }
  if (!experiment) return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
  const rateLimit = await consumeRateLimit(request, RATE_LIMITS.projectMutation, user.id);
  if (!rateLimit.allowed) return rateLimitError(rateLimit);

  const { error } = await supabase.from('experiments')
    .delete().eq('id', experimentId).eq('project_id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
