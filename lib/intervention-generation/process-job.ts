import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { recordOperationalEvent } from '@/lib/ops/events';
import { GlobalSpendCapError } from '@/src/spend-ledger';
import { config } from '@/src/config';
import { GeminiInterventionGenerator, InterventionGenerationError } from '@/src/intervention-generation/gemini-generator';
import { InterventionGenerationService, InterventionInputError } from '@/src/intervention-generation/service';
import { SupabaseInterventionRepository } from './repository';
import { completeCanonicalAfterIntervention, failCanonicalAuditForStage } from '@/lib/reports/canonical-audit-orchestration';

type AdminClient = SupabaseClient<Database>;
type QueueJob = Database['public']['Tables']['audit_queue']['Row'];

export interface InterventionJobResult {
  status: 'completed' | 'failed' | 'cap_reached';
  message: string;
  interventionRunId?: string;
  error?: string;
}

async function databaseSpendUsd(client: AdminClient): Promise<number> {
  const [audits, observations, interventions] = await Promise.all([
    client.from('audits').select('cost_estimate_cents'),
    client.from('ai_observation_runs').select('cost_usd'),
    client.from('intervention_generation_runs').select('cost_usd'),
  ]);
  if (audits.error) throw new Error(`Unable to read audit spend: ${audits.error.message}`);
  if (observations.error) throw new Error(`Unable to read observation spend: ${observations.error.message}`);
  if (interventions.error) throw new Error(`Unable to read intervention spend: ${interventions.error.message}`);
  const auditUsd = (audits.data ?? []).reduce((sum, row) => sum + Number(row.cost_estimate_cents ?? 0) / 100, 0);
  const observationUsd = (observations.data ?? []).reduce((sum, row) => sum + Number(row.cost_usd ?? 0), 0);
  const interventionUsd = (interventions.data ?? []).reduce((sum, row) => sum + Number(row.cost_usd ?? 0), 0);
  return auditUsd + observationUsd + interventionUsd;
}

export async function processInterventionQueueJob(client: AdminClient, job: QueueJob): Promise<InterventionJobResult> {
  if (!job.intervention_run_id) return failJob(client, job, 'Intervention generation queue job has no intervention run');
  const repository = new SupabaseInterventionRepository(client);
  const existing = await repository.getRun(job.project_id, job.intervention_run_id);
  if (!existing) return failJob(client, job, 'Linked intervention generation run was not found');
  if (['COMPLETED', 'PARTIAL_SUCCESS', 'INCONCLUSIVE'].includes(existing.status)) {
    const canonical = await completeCanonicalAfterIntervention(client, existing);
    const { error } = await client.from('audit_queue').update({
      status: 'done', completed_at: existing.completedAt ?? new Date().toISOString(), error: null,
    }).eq('id', job.id).eq('status', 'processing');
    if (error) return { status: 'failed', message: error.message, error: error.message, interventionRunId: existing.id };
    return { status: 'completed', message: 'Existing intervention plan recovered without another model call', interventionRunId: existing.id, ...(canonical ?? {}) };
  }
  if (existing.status === 'FAILED') return failJob(client, job, 'Linked intervention generation run is terminally failed');

  try {
    const spentUsd = await databaseSpendUsd(client);
    const capUsd = config.maxTotalSpendInr / config.usdInr;
    if (spentUsd >= capUsd) {
      const message = `Global spend cap reached before intervention generation`;
      const { error } = await client.from('audit_queue').update({
        status: 'pending', attempts: Math.max(0, job.attempts - 1), started_at: null, error: message,
      }).eq('id', job.id).eq('status', 'processing');
      if (error) throw new Error(`${message}; queue release failed: ${error.message}`);
      return { status: 'cap_reached', message, interventionRunId: existing.id };
    }

    const startedAt = Date.now();
    const service = new InterventionGenerationService({
      repository,
      generator: new GeminiInterventionGenerator(existing.model),
      onProgress: async (metadata) => {
        const { error } = await client.from('audit_queue').update({ last_heartbeat_at: new Date().toISOString() })
          .eq('id', job.id).eq('status', 'processing');
        if (error) throw new Error(`Intervention worker heartbeat failed: ${error.message}`);
        await recordOperationalEvent({
          eventType: 'intervention_generation_progress', projectId: job.project_id,
          metadata: { interventionRunId: existing.id, ...metadata },
        }, client);
      },
    });
    const completed = await service.executeRun(existing.id);
    const canonical = completed.status === 'FAILED' ? null : await completeCanonicalAfterIntervention(client, completed);
    const { error } = await client.from('audit_queue').update({
      status: completed.status === 'FAILED' ? 'failed' : 'done', completed_at: new Date().toISOString(), error: null,
    }).eq('id', job.id).eq('status', 'processing');
    if (error) throw new Error(`Intervention plan saved, but queue completion failed: ${error.message}`);
    await recordOperationalEvent({
      eventType: 'intervention_generation_completed', projectId: job.project_id,
      metadata: {
        interventionRunId: completed.id, status: completed.status, eligibleGaps: completed.eligibleGapCount,
        interventions: completed.interventionCount, rejectedCandidates: completed.rejectedCandidateCount,
        llmCalls: completed.llmCallCount, inputTokens: completed.inputTokens, outputTokens: completed.outputTokens,
        costUsd: completed.costUsd, latencyMs: Date.now() - startedAt,
      },
    }, client);
    if (completed.status === 'FAILED') await failCanonicalAuditForStage(client, job.project_id, 'interventionRunId', completed.id, 'Engine 05 failed');
    return { status: 'completed', message: 'Intervention generation completed', interventionRunId: completed.id, ...(canonical ?? {}) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const nonRetryable = error instanceof InterventionInputError || error instanceof InterventionGenerationError || error instanceof GlobalSpendCapError;
    const shouldRetry = !nonRetryable && job.attempts < job.max_attempts;
    const delaySeconds = Math.min(900, 15 * 2 ** Math.max(job.attempts - 1, 0));
    if (!shouldRetry) await repository.failRun(existing.id, message.slice(0, 2_000));
    const { error: queueError } = await client.from('audit_queue').update({
      status: shouldRetry ? 'pending' : 'failed', error: message.slice(0, 2_000),
      started_at: shouldRetry ? null : job.started_at, completed_at: shouldRetry ? null : new Date().toISOString(),
      available_at: shouldRetry ? new Date(Date.now() + delaySeconds * 1_000).toISOString() : job.available_at,
    }).eq('id', job.id).eq('status', 'processing');
    const finalMessage = queueError ? `${message}; queue update failed: ${queueError.message}` : message;
    await recordOperationalEvent({
      eventType: shouldRetry ? 'intervention_generation_retry_scheduled' : 'intervention_generation_failed',
      severity: shouldRetry ? 'warning' : 'error', projectId: job.project_id,
      metadata: { interventionRunId: existing.id, attempt: job.attempts, error: finalMessage.slice(0, 800) },
    }, client);
    if (!shouldRetry) await failCanonicalAuditForStage(client, job.project_id, 'interventionRunId', existing.id, finalMessage);
    return { status: 'failed', message: finalMessage, error: finalMessage, interventionRunId: existing.id };
  }
}

async function failJob(client: AdminClient, job: QueueJob, message: string): Promise<InterventionJobResult> {
  const { error } = await client.from('audit_queue').update({ status: 'failed', error: message, completed_at: new Date().toISOString() })
    .eq('id', job.id).eq('status', 'processing');
  const finalMessage = error ? `${message}; queue update failed: ${error.message}` : message;
  await failCanonicalAuditForStage(client, job.project_id, 'interventionRunId', job.intervention_run_id, finalMessage);
  return { status: 'failed', message: finalMessage, error: finalMessage, interventionRunId: job.intervention_run_id ?? undefined };
}
