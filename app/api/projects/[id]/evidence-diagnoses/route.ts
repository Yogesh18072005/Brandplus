import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { guardMutationRequest } from '@/lib/http/request-security';
import { consumeRateLimit, rateLimitError } from '@/lib/security/rate-limit';
import { recordOperationalEvent } from '@/lib/ops/events';
import { SupabaseEvidenceDiagnosisRepository } from '@/lib/evidence-diagnosis/repository';
import { EvidenceDiagnosisInputError, EvidenceDiagnosisService } from '@/src/evidence-diagnosis/service';
import { founderOnly } from '@/lib/auth/founder-only';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const requestSchema = z.object({ observationRunId: z.string().uuid() }).strict();
const DIAGNOSIS_RATE_LIMIT = { scope: 'evidence-diagnosis', limit: 10, windowSeconds: 60 * 60 } as const;

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
  const repository = new SupabaseEvidenceDiagnosisRepository(createAdminClient());
  return NextResponse.json({ runs: await repository.listRuns(owned.project.id, limit, offset), limit, offset });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = guardMutationRequest(request, { json: true, maxBodyBytes: 4 * 1024 });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { id } = await params;
  const owned = await ownedProject(id);
  if ('error' in owned) return owned.error;
  const rateLimit = await consumeRateLimit(request, DIAGNOSIS_RATE_LIMIT, owned.user.id);
  if (!rateLimit.allowed) return rateLimitError(rateLimit, 'Evidence diagnosis run limit reached.');
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });

  const idempotencyKey = request.headers.get('idempotency-key')?.trim() ?? '';
  const admin = createAdminClient();
  const repository = new SupabaseEvidenceDiagnosisRepository(admin);
  const service = new EvidenceDiagnosisService({ repository });
  try {
    const created = await service.createRun({
      projectId: owned.project.id,
      observationRunId: parsed.data.observationRunId,
      idempotencyKey,
    });
    await recordOperationalEvent({
      eventType: created.kind === 'CREATED' ? 'evidence_diagnosis_queued' : 'evidence_diagnosis_reused',
      projectId: owned.project.id,
      metadata: {
        diagnosisRunId: created.run.id, observationRunId: created.run.observationRunId,
        questionCount: created.run.requestedQuestionCount, outcome: created.kind, llmCalls: 0,
      },
    }, admin);
    return NextResponse.json(created.run, { status: created.kind === 'CREATED' ? 202 : 200 });
  } catch (error) {
    if (error instanceof EvidenceDiagnosisInputError) return NextResponse.json({ error: error.message }, { status: 400 });
    const message = error instanceof Error ? error.message : String(error);
    if (/active|unique|queue/i.test(message)) return NextResponse.json({ error: 'This project already has active processing work' }, { status: 409 });
    throw error;
  }
}
