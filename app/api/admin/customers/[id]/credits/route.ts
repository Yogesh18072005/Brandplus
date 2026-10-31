import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { guardMutationRequest } from '@/lib/http/request-security';
import { recordOperationalEvent } from '@/lib/ops/events';
import { requireOps } from '@/lib/admin/require-ops';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const body = z.object({ delta: z.union([z.literal(1), z.literal(-1)]) });

/** Give or take back one audit credit from a customer, logged as an event. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = guardMutationRequest(request, { json: true, maxBodyBytes: 256 });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const ops = await requireOps();
  if (!ops.ok) return ops.response;
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: 'Bad customer id' }, { status: 400 });
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'delta must be 1 or -1' }, { status: 400 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('id, email, credits_remaining').eq('id', id).maybeSingle();
  if (!profile) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  const next = Math.max(0, Math.min(50, (profile.credits_remaining ?? 0) + parsed.data.delta));
  const { error } = await admin.from('profiles').update({ credits_remaining: next }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await recordOperationalEvent({ eventType: 'credits_adjusted', severity: 'info', metadata: { profileId: id, email: profile.email, delta: parsed.data.delta, credits: next, by: ops.email } }).catch(() => null);
  return NextResponse.json({ credits: next });
}
