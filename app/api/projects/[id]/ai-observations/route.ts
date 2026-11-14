import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { guardMutationRequest } from '@/lib/http/request-security';
import { consumeRateLimit, rateLimitError } from '@/lib/security/rate-limit';
import { recordOperationalEvent } from '@/lib/ops/events';
import { SupabaseObservationRepository } from '@/lib/ai-observation/repository';
import { GeminiObservationProvider } from '@/src/ai-observation/gemini-provider';
import { ObservationInputError, ObservationService } from '@/src/ai-observation/service';
import { founderOnly } from '@/lib/auth/founder-only';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const requestSchema = z.object({
  buyerQuestionSetId: z.string().uuid(),
  provider: z.literal('gemini').default('gemini'),
}).strict();
const OBSERVATION_RATE_LIMIT = { scope: 'ai-observation', limit: 3, windowSeconds: 60 * 60 } as const;

async function ownedProject(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const;
  { const denied = founderOnly(user.email); if (denied) return { error: denied } as const; }
  const { data, error } = await supabase.from('projects').select('id').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (error || !data) return { error: NextResponse.json({ error: 'Project not found' }, { status: 404 }) } as const;
  return { user, project: data } as const;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await ownedProject(id);
  if ('error' in owned) return owned.error;
  const url = new URL(request.url);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') ?? 20) || 20));
  const offset = Math.max(0, Number(url.searchParams.get('offset') ?? 0) || 0);
  const repository = new SupabaseObservationRepository(createAdminClient());
  return NextResponse.json({ runs: await repository.listRuns(owned.project.id, limit, offset), limit, offset });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = guardMutationRequest(request, { json: true, maxBodyBytes: 8 * 1024 });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { id } = await params;
  const owned = await ownedProject(id);
  if ('error' in owned) return owned.error;
  const rateLimit = await consumeRateLimit(request, OBSERVATION_RATE_LIMIT, owned.user.id);
  if (!rateLimit.allowed) return rateLimitError(rateLimit, 'AI observation run limit reached.');
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
  const idempotencyKey = request.headers.get('idempotency-key')?.trim() ?? '';

  const admin = createAdminClient();
  const { data: questionSet, error: setError } = await admin.from('buyer_question_sets')
    .select('id,project_id,business_understanding_run_id,is_frozen,question_count')
    .eq('id', parsed.data.buyerQuestionSetId).eq('project_id', owned.project.id).maybeSingle();
  if (setError || !questionSet) return NextResponse.json({ error: 'Buyer Question Set not found' }, { status: 404 });
  if (!questionSet.is_frozen || questionSet.question_count < 1) {
    return NextResponse.json({ error: 'A non-empty frozen Buyer Question Set is required' }, { status: 409 });
  }

  const repository = new SupabaseObservationRepository(admin);
  const service = new ObservationService({ repository, providers: [new GeminiObservationProvider()] });
  try {
    const created = await service.createRun({
      projectId: owned.project.id,
      buyerQuestionSetId: questionSet.id,
      businessUnderstandingRunId: questionSet.business_understanding_run_id,
      providerName: parsed.data.provider,
      idempotencyKey,
    });
    await recordOperationalEvent({
      eventType: created.kind === 'CREATED' ? 'ai_observation_queued' : 'ai_observation_idempotent_replay',
      projectId: owned.project.id,
      metadata: { observationRunId: created.run.id, provider: created.run.provider, questionCount: created.run.requestedQuestionCount },
    }, admin);
    return NextResponse.json(created.run, { status: created.kind === 'CREATED' ? 202 : 200 });
  } catch (error) {
    if (error instanceof ObservationInputError) return NextResponse.json({ error: error.message }, { status: 400 });
    const message = error instanceof Error ? error.message : String(error);
    if (/active|unique|queue/i.test(message)) return NextResponse.json({ error: 'This project already has active processing work' }, { status: 409 });
    throw error;
  }
}
