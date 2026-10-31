import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAppUrl } from '@/lib/app-url';
import { guardMutationRequest } from '@/lib/http/request-security';
import { resetPasswordSchema } from '@/lib/validation/auth';
import { consumeRateLimit, RATE_LIMITS, rateLimitError } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
  const guard = guardMutationRequest(request, { json: true, maxBodyBytes: 4 * 1024 });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const rateLimit = await consumeRateLimit(request, RATE_LIMITS.authReset);
  if (!rateLimit.allowed) return rateLimitError(rateLimit, 'Too many reset requests. Try again later.');

  const parsed = resetPasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
  }

  const callback = new URL('/callback', getAppUrl());
  callback.searchParams.set('next', '/dashboard/settings');

  const supabase = await createServerSupabaseClient();
  // Do not reveal whether an account exists. Supabase rate limits delivery.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: callback.toString() });

  return NextResponse.json({ ok: true });
}
