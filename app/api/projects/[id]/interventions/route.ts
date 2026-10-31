import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { guardMutationRequest } from '@/lib/http/request-security';
import { consumeRateLimit, rateLimitError } from '@/lib/security/rate-limit';
import { recordOperationalEvent } from '@/lib/ops/events';
import { SupabaseInterventionRepository } from '@/lib/intervention-generation/repository';
import { GeminiInterventionGenerator } from '@/src/intervention-generation/gemini-generator';
import { InterventionGenerationService, InterventionInputError } from '@/src/intervention-generation/service';
import { founderOnly } from '@/lib/auth/founder-only';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const requestSchema = z.object({ diagnosisRunId: z.string().uuid() }).strict();
const RUN_LIMIT = { scope: 'intervention-generation', limit: 10, windowSeconds: 60 * 60 } as const;

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
  const repository = new SupabaseInterventionRepository(createAdminClient());
  return NextResponse.json({ runs: await repository.listRuns(owned.project.id, limit, offset), limit, offset });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = guardMutationRequest(request, { json: true, maxBodyBytes: 4 * 1024 });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { id } = await params;
  const owned = await ownedProject(id);
  if ('error' in owned) return owned.error;
  const rateLimit = await consumeRateLimit(request, RUN_LIMIT, owned.user.id);
  if (!rateLimit.allowed) return rateLimitError(rateLimit, 'Intervention generation limit reached.');
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
  const admin = createAdminClient();
  const service = new InterventionGenerationService({
    repository: new SupabaseInterventionRepository(admin),
    generator: new GeminiInterventionGenerator(),
  });
  try {
    const created = await service.createRun({
      projectId: owned.project.id,
      diagnosisRunId: parsed.data.diagnosisRunId,
      idempotencyKey: request.headers.get('idempotency-key')?.trim() ?? '',
    });
    await recordOperationalEvent({
      eventType: created.kind === 'CREATED' ? 'intervention_generation_queued' : 'intervention_generation_reused',
      projectId: owned.project.id,
      metadata: { interventionRunId: created.run.id, diagnosisRunId: created.run.diagnosisRunId, outcome: created.kind },
    }, admin);
    return NextResponse.json(created.run, { status: created.kind === 'CREATED' ? 202 : 200 });
  } catch (error) {
    if (error instanceof InterventionInputError) return NextResponse.json({ error: error.message }, { status: 400 });
    const message = error instanceof Error ? error.message : String(error);
    if (/active|unique|queue/i.test(message)) return NextResponse.json({ error: 'This project already has active processing work' }, { status: 409 });
    throw error;
  }
}
