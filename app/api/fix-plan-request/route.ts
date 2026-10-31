import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { guardMutationRequest } from '@/lib/http/request-security';
import { consumeRateLimit, RATE_LIMITS, rateLimitError } from '@/lib/security/rate-limit';
import { firstValidationError } from '@/lib/validation/project';
import { notifyTalkRequested } from '@/lib/notifications/talk-requested';

const requestSchema = z.object({
  reportId: z.string().uuid('Invalid report'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(254),
  phone: z.string().trim().max(40, 'Phone number is too long').regex(/^[+()\d\s-]*$/, 'Use digits, spaces, + and - only').optional(),
  note: z.string().trim().max(1000, 'Keep the note under 1,000 characters').optional(),
}).strict();

/**
 * "Get my fix plan" from a shared report link. The reader is usually not signed
 * in, so the report id (not a session) ties the request to a business. Nothing
 * runs and nothing is charged: it only emails the founder and the reader.
 */
export async function POST(request: Request) {
  const guard = guardMutationRequest(request, { json: true });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const rateLimit = await consumeRateLimit(request, RATE_LIMITS.publicFixPlanRequest);
  if (!rateLimit.allowed) return rateLimitError(rateLimit, 'We already have your request. We’ll be in touch shortly.');

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstValidationError(parsed.error) }, { status: 400 });
  const { reportId, email, phone, note } = parsed.data;

  const admin = createAdminClient();
  const { data: run } = await admin.from('intervention_generation_runs').select('project_id').eq('id', reportId).maybeSingle();
  if (!run) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  const { data: project } = await admin.from('projects').select('id, business_name, website').eq('id', run.project_id).maybeSingle();
  if (!project) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

  await notifyTalkRequested({
    topic: 'fixes',
    requesterEmail: email,
    projectId: project.id,
    businessName: project.business_name,
    website: project.website,
    phone: phone || null,
    note: [note, `From the shared report /r/${reportId}`].filter(Boolean).join('\n\n'),
    // The address is unverified: alert the founder, never email the reader.
    confirmToRequester: false,
  });

  return NextResponse.json({ ok: true, email });
}
