import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { Database } from '@/lib/supabase/types';
import { getEffectivePlan } from '@/lib/billing/effective-plan';
import { canTrackWeekly } from '@/lib/billing/capabilities';
import { guardMutationRequest } from '@/lib/http/request-security';
import { firstValidationError, projectUpdateSchema } from '@/lib/validation/project';
import { consumeRateLimit, RATE_LIMITS, rateLimitError } from '@/lib/security/rate-limit';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('projects')
    .select('*, audits(id, status, report_data, prompt_count, created_at, completed_at)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at')
    .eq('id', user.id)
    .single();

  return NextResponse.json({
    ...data,
    capabilities: {
      weeklyTracking: canTrackWeekly(getEffectivePlan(profile)),
    },
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = guardMutationRequest(request, { json: true });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rateLimit = await consumeRateLimit(request, RATE_LIMITS.projectMutation, user.id);
  if (!rateLimit.allowed) return rateLimitError(rateLimit);

  const parsed = projectUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: firstValidationError(parsed.error) }, { status: 400 });
  }
  const body = parsed.data;
  const updates: Record<string, unknown> = {};

  if (body.businessName !== undefined) updates.business_name = body.businessName;
  if (body.website !== undefined) updates.website = body.website;
  if (body.category !== undefined) updates.category = body.category;
  if (body.city !== undefined) updates.city = body.city;
  if (body.competitors !== undefined) {
    updates.competitors = body.competitors.map((name) => ({ name }));
  }
  if (body.aliases !== undefined) {
    updates.aliases = body.aliases;
  }
  if (body.products !== undefined) updates.products = body.products;
  if (body.services !== undefined) updates.services = body.services;
  if (body.locations !== undefined) updates.locations = body.locations;
  if (body.targetCustomers !== undefined) updates.target_customers = body.targetCustomers;
  if (body.markets !== undefined) updates.markets = body.markets;
  if (body.status !== undefined) {
    updates.status = body.status;
  }

  const { data, error } = await supabase
    .from('projects')
    .update(updates as Database['public']['Tables']['projects']['Update'])
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: 'Project not found or update failed' }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = guardMutationRequest(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rateLimit = await consumeRateLimit(request, RATE_LIMITS.projectMutation, user.id);
  if (!rateLimit.allowed) return rateLimitError(rateLimit);

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
