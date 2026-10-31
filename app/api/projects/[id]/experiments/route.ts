import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { guardMutationRequest } from '@/lib/http/request-security';
import { consumeRateLimit, RATE_LIMITS, rateLimitError } from '@/lib/security/rate-limit';
import { founderOnly } from '@/lib/auth/founder-only';

const experimentSchema = z.object({
  title: z.string().trim().min(3).max(120),
  changeSummary: z.string().trim().min(5).max(1000),
  affectedPage: z.string().trim().max(300).optional().default(''),
  targetCluster: z.string().trim().max(100).optional().default(''),
  implementedAt: z.string().date(),
}).strict();

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  { const denied = founderOnly(user.email); if (denied) return denied; }
  const { data: project } = await supabase.from('projects').select('id').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const { data, error } = await supabase.from('experiments').select('*').eq('project_id', id).order('implemented_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data: audits } = await supabase.from('audits').select('id, report_data, completed_at').eq('project_id', id).eq('status', 'completed').order('completed_at', { ascending: true });
  const score = (reportData: unknown): number | null => {
    if (!reportData || typeof reportData !== 'object') return null;
    const scores = (reportData as Record<string, unknown>).scores;
    if (!scores || typeof scores !== 'object') return null;
    const values = scores as Record<string, unknown>;
    return typeof values.brandpulseScore === 'number' ? values.brandpulseScore : typeof values.visibilityScore === 'number' ? values.visibilityScore : null;
  };
  const enriched = (data ?? []).map((experiment) => {
    const baseline = (audits ?? []).find((audit) => audit.id === experiment.baseline_audit_id);
    const comparison = [...(audits ?? [])].reverse().find((audit) => Boolean(audit.completed_at && audit.completed_at > `${experiment.implemented_at}T23:59:59.999Z`));
    const baselineScore = score(baseline?.report_data);
    const comparisonScore = score(comparison?.report_data);
    return {
      ...experiment,
      baselineScore,
      comparisonScore,
      comparisonAuditId: comparison?.id ?? null,
      observedChange: baselineScore != null && comparisonScore != null ? comparisonScore - baselineScore : null,
    };
  });
  return NextResponse.json({ experiments: enriched });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = guardMutationRequest(request, { json: true, maxBodyBytes: 16 * 1024 });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  { const denied = founderOnly(user.email); if (denied) return denied; }
  const rateLimit = await consumeRateLimit(request, RATE_LIMITS.projectMutation, user.id);
  if (!rateLimit.allowed) return rateLimitError(rateLimit);
  const { data: project } = await supabase.from('projects').select('id').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const parsed = experimentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid experiment' }, { status: 400 });

  const { data: baseline } = await supabase.from('audits').select('id').eq('project_id', id).eq('status', 'completed').lte('completed_at', `${parsed.data.implementedAt}T23:59:59.999Z`).order('completed_at', { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await supabase.from('experiments').insert({
    project_id: id,
    title: parsed.data.title,
    change_summary: parsed.data.changeSummary,
    affected_page: parsed.data.affectedPage || null,
    target_cluster: parsed.data.targetCluster || null,
    implemented_at: parsed.data.implementedAt,
    baseline_audit_id: baseline?.id ?? null,
    status: 'monitoring',
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
