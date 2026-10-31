import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { guardMutationRequest } from '@/lib/http/request-security';
import { consumeRateLimit, RATE_LIMITS, rateLimitError } from '@/lib/security/rate-limit';
import { firstValidationError } from '@/lib/validation/project';
import { notifyTalkRequested } from '@/lib/notifications/talk-requested';

const talkSchema = z.object({
  topic: z.enum(['fixes', 'more_audits']),
  projectId: z.string().uuid('Invalid project id').optional(),
  phone: z.string().trim().max(40, 'Phone number is too long').regex(/^[+()\d\s-]*$/, 'Use digits, spaces, + and - only').optional(),
  note: z.string().trim().max(1000, 'Keep the note under 1,000 characters').optional(),
}).strict();

/** A signed-in client asks a person to get in touch: about fixes, or more audits. */
export async function POST(request: Request) {
  const guard = guardMutationRequest(request, { json: true });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimit = await consumeRateLimit(request, RATE_LIMITS.talkRequest, user.id);
  if (!rateLimit.allowed) return rateLimitError(rateLimit, 'We already have your request. We’ll be in touch shortly.');

  const parsed = talkSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstValidationError(parsed.error) }, { status: 400 });
  const { topic, projectId, phone, note } = parsed.data;

  let project: { id: string; business_name: string; website: string } | null = null;
  if (projectId) {
    const { data } = await supabase
      .from('projects')
      .select('id, business_name, website')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!data) return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    project = data;
  }

  const sent = await notifyTalkRequested({
    topic,
    requesterEmail: user.email,
    projectId: project?.id ?? null,
    businessName: project?.business_name ?? null,
    website: project?.website ?? null,
    phone: phone || null,
    note: note || null,
  });

  return NextResponse.json({ ok: true, email: user.email, delivered: sent.admins > 0 });
}
