import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { guardMutationRequest } from '@/lib/http/request-security';
import { consumeRateLimit, rateLimitError } from '@/lib/security/rate-limit';
import { recordOperationalEvent } from '@/lib/ops/events';
import { executionApiError, EXECUTION_RATE_LIMIT, ownedExecutionProject } from '@/lib/execution/api';
import { SupabaseExecutionRepository } from '@/lib/execution/repository';
import { ExecutionService } from '@/src/execution/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  interventionId: z.string().uuid(),
  options: z.object({ artifact: z.enum(['AUTO', 'CONTENT_DRAFT', 'CONTENT_BRIEF', 'MANUAL_PACKAGE']).optional() }).strict().optional(),
}).strict();

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await ownedExecutionProject(id);
  if ('error' in owned) return owned.error;
  const url = new URL(request.url);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') ?? 20) || 20));
  const offset = Math.max(0, Number(url.searchParams.get('offset') ?? 0) || 0);
  const runs = await new SupabaseExecutionRepository(createAdminClient()).listRuns(owned.project.id, limit, offset);
  return NextResponse.json({ runs, limit, offset });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = guardMutationRequest(request, { json: true, maxBodyBytes: 8 * 1024 });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { id } = await params;
  const owned = await ownedExecutionProject(id);
  if ('error' in owned) return owned.error;
  const limited = await consumeRateLimit(request, EXECUTION_RATE_LIMIT, owned.user.id);
  if (!limited.allowed) return rateLimitError(limited, 'Execution request limit reached.');
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
  const admin = createAdminClient();
  try {
    const created = await new ExecutionService({ repository: new SupabaseExecutionRepository(admin) }).create({
      projectId: owned.project.id, interventionId: parsed.data.interventionId,
      idempotencyKey: request.headers.get('idempotency-key')?.trim() ?? '',
      actorId: owned.user.id, options: parsed.data.options,
    });
    await recordOperationalEvent({
      eventType: created.kind === 'CREATED' ? 'execution_created' : 'execution_reused', projectId: owned.project.id,
      metadata: { executionRunId: created.run.id, interventionId: parsed.data.interventionId, status: created.run.status },
    }, admin);
    return NextResponse.json(created.run, { status: created.kind === 'CREATED' ? 202 : 200 });
  } catch (error) { return executionApiError(error); }
}

