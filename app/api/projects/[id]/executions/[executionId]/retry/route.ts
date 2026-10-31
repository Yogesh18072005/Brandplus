import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { guardMutationRequest } from '@/lib/http/request-security';
import { consumeRateLimit, rateLimitError } from '@/lib/security/rate-limit';
import { executionApiError, EXECUTION_RATE_LIMIT, ownedExecutionProject } from '@/lib/execution/api';
import { SupabaseExecutionRepository } from '@/lib/execution/repository';
import { ExecutionService } from '@/src/execution/service';

export async function POST(request: Request, { params }: { params: Promise<{ id: string; executionId: string }> }) {
  const guard = guardMutationRequest(request, { maxBodyBytes: 1024 });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { id, executionId } = await params; const owned = await ownedExecutionProject(id); if ('error' in owned) return owned.error;
  const limited = await consumeRateLimit(request, EXECUTION_RATE_LIMIT, owned.user.id); if (!limited.allowed) return rateLimitError(limited);
  try {
    const created = await new ExecutionService({ repository: new SupabaseExecutionRepository(createAdminClient()) }).retry({
      projectId: owned.project.id, executionId, actorId: owned.user.id,
      idempotencyKey: request.headers.get('idempotency-key')?.trim() ?? '',
    });
    return NextResponse.json(created.run, { status: created.kind === 'CREATED' ? 202 : 200 });
  } catch (error) { return executionApiError(error); }
}
