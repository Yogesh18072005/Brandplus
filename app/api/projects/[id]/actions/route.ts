import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { guardMutationRequest } from '@/lib/http/request-security';
import { getEffectivePlan } from '@/lib/billing/effective-plan';
import { consumeRateLimit, RATE_LIMITS, rateLimitError } from '@/lib/security/rate-limit';
import { founderOnly } from '@/lib/auth/founder-only';

const updateSchema = z.object({
  actionId: z.string().uuid(),
  status: z.enum(['open', 'in_progress', 'implemented', 'verified']),
}).strict();

async function ownedProject(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, project: null };
  const { data: project } = await supabase.from('projects').select('id').eq('id', id).eq('user_id', user.id).maybeSingle();
  return { supabase, user, project };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, project } = await ownedProject(id);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  { const denied = founderOnly(user.email); if (denied) return denied; }
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const { data, error } = await supabase
    .from('action_items')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ actions: data ?? [] });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = guardMutationRequest(request, { json: true, maxBodyBytes: 4 * 1024 });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { id } = await params;
  const { supabase, user, project } = await ownedProject(id);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  { const denied = founderOnly(user.email); if (denied) return denied; }
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const rateLimit = await consumeRateLimit(request, RATE_LIMITS.projectMutation, user.id);
  if (!rateLimit.allowed) return rateLimitError(rateLimit);

  const { data: profile } = await supabase.from('profiles').select('plan, plan_expires_at').eq('id', user.id).maybeSingle();
  if (getEffectivePlan(profile) === 'free') {
    return NextResponse.json({ error: 'Updating the action plan requires a paid plan' }, { status: 403 });
  }
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid action update' }, { status: 400 });

  const { data, error } = await supabase.from('action_items')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.actionId)
    .eq('project_id', id)
    .select()
    .single();
  if (error || !data) return NextResponse.json({ error: 'Action not found' }, { status: 404 });
  return NextResponse.json(data);
}
