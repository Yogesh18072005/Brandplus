import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { guardMutationRequest } from '@/lib/http/request-security';
import { consumeRateLimit, rateLimitError } from '@/lib/security/rate-limit';
import { recordOperationalEvent } from '@/lib/ops/events';
import { SupabaseBusinessUnderstandingRepository } from '@/lib/business-understanding/repository';
import { BusinessUnderstandingService } from '@/src/business-understanding/service';
import { founderOnly } from '@/lib/auth/founder-only';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const requestSchema = z.object({
  userProvidedContext: z.array(z.string().trim().min(1).max(2_000)).max(10).optional(),
}).strict();

const EXTRACTION_RATE_LIMIT = { scope: 'business-understanding', limit: 2, windowSeconds: 60 * 60 } as const;

async function ownedProject(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const;
  { const denied = founderOnly(user.email); if (denied) return { error: denied } as const; }
  const { data, error } = await supabase.from('projects').select('id,business_name,website').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (error || !data) return { error: NextResponse.json({ error: 'Project not found' }, { status: 404 }) } as const;
  return { user, project: data } as const;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await ownedProject(id);
  if ('error' in owned) return owned.error;
  const repository = new SupabaseBusinessUnderstandingRepository(createAdminClient());
  const result = await repository.findLatest(owned.project.id);
  return result ? NextResponse.json(result) : NextResponse.json({ error: 'Business understanding has not been generated' }, { status: 404 });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = guardMutationRequest(request, { json: true, maxBodyBytes: 24 * 1024 });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { id } = await params;
  const owned = await ownedProject(id);
  if ('error' in owned) return owned.error;
  const rateLimit = await consumeRateLimit(request, EXTRACTION_RATE_LIMIT, owned.user.id);
  if (!rateLimit.allowed) return rateLimitError(rateLimit, 'Business understanding extraction limit reached.');
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });

  const admin = createAdminClient();
  const repository = new SupabaseBusinessUnderstandingRepository(admin);
  const service = new BusinessUnderstandingService({
    repository,
    logger: {
      record(event, metadata) {
        return recordOperationalEvent({ eventType: event, projectId: owned.project.id, metadata: metadata ?? {} }, admin);
      },
    },
  });
  const result = await service.understand({
    projectId: owned.project.id,
    businessName: owned.project.business_name,
    website: owned.project.website,
    userProvidedContext: parsed.data.userProvidedContext,
  });
  return NextResponse.json(result, { status: result.status === 'FAILED' ? 502 : 200 });
}
