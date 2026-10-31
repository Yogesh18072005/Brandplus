import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { guardMutationRequest } from '@/lib/http/request-security';
import { consumeRateLimit, rateLimitError } from '@/lib/security/rate-limit';
import { executionApiError, EXECUTION_RATE_LIMIT, ownedExecutionProject } from '@/lib/execution/api';
import { SupabaseExecutionRepository } from '@/lib/execution/repository';
import { ExecutionService } from '@/src/execution/service';

const schema = z.object({ inputKey: z.string().min(3).max(128), value: z.string().min(1).max(4000) }).strict();
export async function POST(request: Request, { params }: { params: Promise<{ id: string; executionId: string }> }) {
  const guard = guardMutationRequest(request, { json: true, maxBodyBytes: 8 * 1024 });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { id, executionId } = await params; const owned = await ownedExecutionProject(id); if ('error' in owned) return owned.error;
  const limited = await consumeRateLimit(request, EXECUTION_RATE_LIMIT, owned.user.id); if (!limited.allowed) return rateLimitError(limited);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
  try {
    return NextResponse.json(await new ExecutionService({ repository: new SupabaseExecutionRepository(createAdminClient()) }).submitInput({
      projectId: owned.project.id, executionId, actorId: owned.user.id, ...parsed.data,
    }));
  } catch (error) { return executionApiError(error); }
}

