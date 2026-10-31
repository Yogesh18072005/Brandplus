import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { guardMutationRequest } from '@/lib/http/request-security';
import { authValidationError, profileUpdateSchema } from '@/lib/validation/auth';
import { consumeRateLimit, RATE_LIMITS, rateLimitError } from '@/lib/security/rate-limit';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('full_name, company_name')
    .eq('id', user.id)
    .single();
  if (error) return NextResponse.json({ error: 'Could not load account' }, { status: 500 });

  return NextResponse.json(
    { email: user.email ?? '', fullName: profile.full_name ?? '', companyName: profile.company_name ?? '' },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export async function PATCH(request: Request) {
  const guard = guardMutationRequest(request, { json: true, maxBodyBytes: 8 * 1024 });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const parsed = profileUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: authValidationError(parsed.error) }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimit = await consumeRateLimit(request, RATE_LIMITS.accountMutation, user.id);
  if (!rateLimit.allowed) return rateLimitError(rateLimit);

  const { fullName, companyName } = parsed.data;
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ full_name: fullName, company_name: companyName })
    .eq('id', user.id);
  if (profileError) return NextResponse.json({ error: 'Could not save profile' }, { status: 500 });

  return NextResponse.json({ ok: true });
}
