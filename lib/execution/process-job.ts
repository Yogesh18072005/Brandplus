import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { recordOperationalEvent } from '@/lib/ops/events';
import { SupabaseExecutionRepository } from './repository';
import { ExecutionConflictError, ExecutionService } from '@/src/execution/service';

type AdminClient = SupabaseClient<Database>;
type QueueJob = Database['public']['Tables']['audit_queue']['Row'];

export interface ExecutionJobResult {
  status: 'completed' | 'failed';
  message: string;
  executionRunId?: string;
  error?: string;
}

export async function processExecutionQueueJob(client: AdminClient, job: QueueJob): Promise<ExecutionJobResult> {
  if (!job.execution_run_id) return failQueueJob(client, job, 'Execution queue job has no execution run');
  const repository = new SupabaseExecutionRepository(client);
  const existing = await repository.getRun(job.project_id, job.execution_run_id, true);
  if (!existing) return failQueueJob(client, job, 'Linked execution run was not found');
  if (['SUCCEEDED', 'PARTIALLY_SUCCEEDED', 'FAILED', 'BLOCKED', 'MANUAL_REQUIRED', 'CANCELLED'].includes(existing.status)) {
    const queueStatus = existing.status === 'SUCCEEDED' || existing.status === 'PARTIALLY_SUCCEEDED' ? 'done' : 'failed';
    const { error } = await client.from('audit_queue').update({
      status: queueStatus, completed_at: existing.completedAt ?? new Date().toISOString(),
      error: queueStatus === 'failed' ? existing.errorMessage ?? `Execution ended as ${existing.status}` : null,
    }).eq('id', job.id).eq('status', 'processing');
    if (error) return { status: 'failed', message: error.message, error: error.message, executionRunId: existing.id };
    return { status: queueStatus === 'done' ? 'completed' : 'failed', message: `Existing ${existing.status} execution recovered without duplicate work`, executionRunId: existing.id };
  }

  try {
    const startedAt = Date.now();
    const service = new ExecutionService({ repository });
    const completed = await service.execute(existing.id);
    const queueStatus = ['SUCCEEDED', 'PARTIALLY_SUCCEEDED'].includes(completed.status) ? 'done' : 'failed';
    const { error } = await client.from('audit_queue').update({
      status: queueStatus, completed_at: new Date().toISOString(),
      error: queueStatus === 'failed' ? completed.errorMessage ?? `Execution ended as ${completed.status}` : null,
      last_heartbeat_at: new Date().toISOString(),
    }).eq('id', job.id).eq('status', 'processing');
    if (error) throw new Error(`Execution persisted, but queue completion failed: ${error.message}`);
    await recordOperationalEvent({
      eventType: 'execution_completed', projectId: job.project_id,
      metadata: {
        executionRunId: completed.id, status: completed.status, adapterId: completed.activePlan?.adapterId ?? 'unknown',
        stepCount: completed.steps?.length ?? 0, estimatedCostUsd: completed.estimatedCostUsd,
        externalCostUsd: completed.externalCostUsd, latencyMs: Date.now() - startedAt,
      },
    }, client);
    return { status: queueStatus === 'done' ? 'completed' : 'failed', message: `Execution ${completed.status}`, executionRunId: completed.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const context = await repository.loadContext(existing.id).catch(() => null);
    const safe = context?.plan.retrySafety === 'SAFE_TO_RETRY';
    const stateAllowsRetry = context?.run.status === 'QUEUED' || context?.run.status === 'RUNNING';
    const shouldRetry = safe && stateAllowsRetry && job.attempts < job.max_attempts && !(error instanceof ExecutionConflictError);
    if (shouldRetry && context) {
      const delaySeconds = Math.min(900, 15 * 2 ** Math.max(job.attempts - 1, 0));
      if (context.run.status === 'RUNNING') {
        await repository.transition({
          executionId: existing.id, from: ['RUNNING'], to: 'QUEUED', actorType: 'WORKER', actorId: null,
          eventType: 'RETRY_QUEUED', payloadHash: context.plan.payloadHash,
          metadata: { attempt: job.attempts, delaySeconds, reason: message.slice(0, 500) },
        });
      }
      const { error: queueError } = await client.from('audit_queue').update({
        status: 'pending', started_at: null, completed_at: null, error: message.slice(0, 2_000),
        available_at: new Date(Date.now() + delaySeconds * 1_000).toISOString(),
        last_heartbeat_at: new Date().toISOString(),
      }).eq('id', job.id).eq('status', 'processing');
      const finalMessage = queueError ? `${message}; retry scheduling failed: ${queueError.message}` : message;
      return { status: 'failed', message: finalMessage, error: finalMessage, executionRunId: existing.id };
    }
    const latest = await repository.getRun(job.project_id, existing.id).catch(() => null);
    if (latest && ['QUEUED', 'RUNNING', 'UNKNOWN'].includes(latest.status)) {
      await repository.transition({
        executionId: existing.id, from: [latest.status], to: 'FAILED', actorType: 'WORKER', actorId: null,
        eventType: 'EXECUTION_FAILED', payloadHash: context?.plan.payloadHash ?? null,
        metadata: { retrySafety: context?.plan.retrySafety ?? 'UNKNOWN' },
        errorCode: 'EXECUTION_PROCESSING_FAILED', errorMessage: message,
      }).catch(() => undefined);
    }
    await recordOperationalEvent({
      eventType: 'execution_failed', severity: 'error', projectId: job.project_id,
      metadata: { executionRunId: existing.id, attempt: job.attempts, retrySafety: context?.plan.retrySafety ?? 'UNKNOWN', error: message.slice(0, 800) },
    }, client);
    return failQueueJob(client, job, message);
  }
}

async function failQueueJob(client: AdminClient, job: QueueJob, message: string): Promise<ExecutionJobResult> {
  const { error } = await client.from('audit_queue').update({
    status: 'failed', error: message.slice(0, 2_000), completed_at: new Date().toISOString(),
  }).eq('id', job.id).eq('status', 'processing');
  const finalMessage = error ? `${message}; queue update failed: ${error.message}` : message;
  return { status: 'failed', message: finalMessage, error: finalMessage, executionRunId: job.execution_run_id ?? undefined };
}
