import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { getPlanLimits } from '@/lib/billing/plans';
import { getEffectivePlan } from '@/lib/billing/effective-plan';
import { guardMutationRequest } from '@/lib/http/request-security';
import { firstValidationError, projectCreateSchema } from '@/lib/validation/project';
import { consumeRateLimit, RATE_LIMITS, rateLimitError } from '@/lib/security/rate-limit';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('projects')
    .select('*, audits(id, status, report_data, created_at)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const guard = guardMutationRequest(request, { json: true });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimit = await consumeRateLimit(request, RATE_LIMITS.projectMutation, user.id);
  if (!rateLimit.allowed) return rateLimitError(rateLimit);

  const parsed = projectCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: firstValidationError(parsed.error) }, { status: 400 });
  }
  const { businessName, website, category, city, competitors, aliases, products, services, locations, targetCustomers, markets } = parsed.data;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at')
    .eq('id', user.id)
    .single();
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  const plan = getEffectivePlan(profile);
  const limits = getPlanLimits(plan);

  const { count, error: countError } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .neq('status', 'archived');
  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });

  if ((count ?? 0) >= limits.maxProjects) {
    return NextResponse.json(
      { error: `Your ${plan} plan allows ${limits.maxProjects} active project(s). Upgrade to add more.` },
      { status: 403 }
    );
  }

  const competitorList = competitors.map((name) => ({ name }));

  // Browser clients have no direct project INSERT grant. Only this validated
  // route writes through the service role after ownership and plan checks.
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('projects')
    .insert({
      user_id: user.id,
      business_name: businessName,
      website,
      category,
      city,
      competitors: competitorList,
      aliases,
      products,
      services,
      locations,
      target_customers: targetCustomers,
      markets,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
