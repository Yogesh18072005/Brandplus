import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAppUrl } from '@/lib/app-url';
import { safeRedirectPath } from '@/lib/auth/safe-redirect';
import { guardMutationRequest } from '@/lib/http/request-security';
import { authValidationError, signupSchema } from '@/lib/validation/auth';
import { consumeRateLimit, RATE_LIMITS, rateLimitError } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
  const guard = guardMutationRequest(request, { json: true, maxBodyBytes: 8 * 1024 });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const rateLimit = await consumeRateLimit(request, RATE_LIMITS.authSignup);
  if (!rateLimit.allowed) return rateLimitError(rateLimit, 'Too many account requests. Try again later.');

  const parsed = signupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: authValidationError(parsed.error) }, { status: 400 });
  }

  const { fullName, email, password } = parsed.data;
  const next = safeRedirectPath(parsed.data.next);
  const callback = new URL('/callback', getAppUrl());
  callback.searchParams.set('next', next);

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: callback.toString(),
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(
    { ok: true, requiresEmailConfirmation: !data.session },
    { status: 201, headers: { 'Cache-Control': 'private, no-store' } },
  );
}
