import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { guardMutationRequest } from '@/lib/http/request-security';
import { consumeRateLimit, RATE_LIMITS, rateLimitError } from '@/lib/security/rate-limit';
import { ACCOUNT_BLOCK_MESSAGES, claimAccountIdentity } from '@/lib/security/account-guard';
import { sendEmail } from '@/lib/email/mailer';
import { welcomeEmail } from '@/lib/email/templates';

const claimSchema = z.object({
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/, 'Invalid device signal'),
  timeZone: z.string().max(64).nullable(),
}).strict();

/**
 * Decide, once per account, whether it gets the free audit: one account per
 * network and per device, no VPNs. Sends the welcome email the first time a
 * decision is recorded. Called by onboarding before anything else.
 */
export async function POST(request: Request) {
  const guard = guardMutationRequest(request, { json: true, maxBodyBytes: 1024 });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimit = await consumeRateLimit(request, RATE_LIMITS.accountMutation, user.id);
  if (!rateLimit.allowed) return rateLimitError(rateLimit);

  const parsed = claimSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });

  const admin = createAdminClient();
  let decision: Awaited<ReturnType<typeof claimAccountIdentity>>;
  try {
    decision = await claimAccountIdentity(admin, user.id, request.headers, parsed.data);
  } catch (error) {
    console.error('[account-claim] decision failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'We couldn’t finish setting up your account. Refresh to try again.' }, { status: 503 });
  }

  if (decision.firstClaim && user.email) {
    const name = typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim() ? user.user_metadata.full_name.trim() : null;
    await sendEmail({ to: user.email, ...welcomeEmail({ name, freeAudit: decision.allowed }) });
  }

  return NextResponse.json({
    allowed: decision.allowed,
    reason: decision.reason,
    message: decision.allowed ? null : ACCOUNT_BLOCK_MESSAGES[decision.reason === 'granted' ? 'blocked' : decision.reason],
  });
}
