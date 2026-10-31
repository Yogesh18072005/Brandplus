import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { SupabaseBusinessUnderstandingRepository } from '@/lib/business-understanding/repository';
import { SupabaseBuyerIntentRepository } from '@/lib/buyer-intent/repository';
import { guardMutationRequest } from '@/lib/http/request-security';
import { consumeRateLimit, rateLimitError } from '@/lib/security/rate-limit';
import { recordOperationalEvent } from '@/lib/ops/events';
import { BuyerIntentInputError, BuyerIntentRunInProgressError, BuyerIntentService } from '@/src/buyer-intent/service';
import { founderOnly } from '@/lib/auth/founder-only';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const requestSchema = z.object({
  questionCount: z.number().int().min(10).max(30).optional(),
}).strict();
const GENERATION_RATE_LIMIT = { scope: 'buyer-intent', limit: 2, windowSeconds: 60 * 60 } as const;

async function ownedProject(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const;
  { const denied = founderOnly(user.email); if (denied) return { error: denied } as const; }
  const { data, error } = await supabase.from('projects').select('id').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (error || !data) return { error: NextResponse.json({ error: 'Project not found' }, { status: 404 }) } as const;
  return { user, project: data } as const;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await ownedProject(id);
  if ('error' in owned) return owned.error;
  const repository = new SupabaseBuyerIntentRepository(createAdminClient());
  const result = await repository.findLatest(owned.project.id);
  return result ? NextResponse.json(result) : NextResponse.json({ error: 'Buyer intent has not been generated' }, { status: 404 });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = guardMutationRequest(request, { json: true, maxBodyBytes: 8 * 1024 });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { id } = await params;
  const owned = await ownedProject(id);
  if ('error' in owned) return owned.error;
  const rateLimit = await consumeRateLimit(request, GENERATION_RATE_LIMIT, owned.user.id);
  if (!rateLimit.allowed) return rateLimitError(rateLimit, 'Buyer intent generation limit reached.');
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });

  const admin = createAdminClient();
  const businessRepository = new SupabaseBusinessUnderstandingRepository(admin);
  const businessRecord = await businessRepository.findLatestRecord(owned.project.id);
  if (!businessRecord || !['SUCCESS', 'PARTIAL_SUCCESS'].includes(businessRecord.understanding.status)) {
    return NextResponse.json({ error: 'Generate a successful Business Understanding before Buyer Intent' }, { status: 409 });
  }

  const repository = new SupabaseBuyerIntentRepository(admin);
  const service = new BuyerIntentService({
    repository,
    logger: {
      record(event, metadata) {
        return recordOperationalEvent({ eventType: event, projectId: owned.project.id, metadata: metadata ?? {} }, admin);
      },
    },
  });
  try {
    const result = await service.generate({
      projectId: owned.project.id,
      businessUnderstandingRunId: businessRecord.runId,
      understanding: businessRecord.understanding,
      questionCount: parsed.data.questionCount,
    });
    return NextResponse.json(result, { status: result.status === 'FAILED' ? 502 : 200 });
  } catch (error) {
    if (error instanceof BuyerIntentRunInProgressError) {
      return NextResponse.json({ error: error.message, code: 'BUYER_INTENT_RUNNING' }, { status: 409 });
    }
    if (error instanceof BuyerIntentInputError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
