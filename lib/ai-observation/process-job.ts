import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { SupabaseObservationRepository } from './repository';
import { GeminiObservationProvider } from '@/src/ai-observation/gemini-provider';
import { ObservationService } from '@/src/ai-observation/service';
import { recordOperationalEvent } from '@/lib/ops/events';
import { advanceCanonicalAfterObservation, failCanonicalAuditForStage } from '@/lib/reports/canonical-audit-orchestration';

type AdminClient = SupabaseClient<Database>;
type QueueJob = Database['public']['Tables']['audit_queue']['Row'];

export interface ObservationJobResult {
  status: 'completed' | 'failed' | 'cap_reached';
  message: string;
  observationRunId?: string;
  error?: string;
  spentInr?: number;
  capInr?: number;
}

function positive(value: string | undefined, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

export async function processObservationQueueJob(client: AdminClient, job: QueueJob): Promise<ObservationJobResult> {
  if (!job.observation_run_id) return failJob(client, job, 'Observation queue job has no observation run');
  const repository = new SupabaseObservationRepository(client);
  const existing = await repository.getRun(job.project_id, job.observation_run_id);
  if (!existing) return failJob(client, job, 'Linked observation run was not found');
  if (['COMPLETED', 'PARTIAL_SUCCESS'].includes(existing.status)) {
    const { error } = await client.from('audit_queue').update({ status: 'done', completed_at: existing.completedAt ?? new Date().toISOString(), error: null })
      .eq('id', job.id).eq('status', 'processing');
    if (error) return { status: 'failed', message: error.message, error: error.message, observationRunId: existing.id };
    try {
      await advanceCanonicalAfterObservation(client, existing);
    } catch (advanceError) {
      await client.from('audit_queue').update({ status: 'pending', started_at: null, completed_at: null, error: advanceError instanceof Error ? advanceError.message : String(advanceError) }).eq('id', job.id).eq('status', 'done');
      throw advanceError;
    }
    return { status: 'completed', message: 'Existing observation run recovered without provider calls', observationRunId: existing.id };
  }
  if (existing.status === 'FAILED') return failJob(client, job, 'Linked observation run is terminally failed');

  const capInr = positive(process.env.MAX_TOTAL_SPEND_INR, 1000);
  const usdInr = positive(process.env.USD_INR, 90);
  const [audits, observations] = await Promise.all([
    client.from('audits').select('cost_estimate_cents'),
    client.from('ai_observation_runs').select('cost_usd'),
  ]);
  if (audits.error || observations.error) return failJob(client, job, `Unable to read cumulative spend: ${audits.error?.message ?? observations.error?.message}`);
  const spentUsd = (audits.data ?? []).reduce((sum, row) => sum + (row.cost_estimate_cents ?? 0) / 100, 0)
    + (observations.data ?? []).reduce((sum, row) => sum + (row.cost_usd ?? 0), 0);
  const spentInr = spentUsd * usdInr;
  if (spentInr >= capInr) {
    const { error } = await client.from('audit_queue').update({
      status: 'pending', attempts: Math.max(0, job.attempts - 1), started_at: null,
      error: `Global spend cap ₹${capInr} reached (est. ₹${spentInr.toFixed(0)} spent)`,
    }).eq('id', job.id).eq('status', 'processing');
    if (error) return { status: 'failed', message: error.message, error: error.message, spentInr, capInr };
    return { status: 'cap_reached', message: `Global spend cap ₹${capInr} reached`, spentInr, capInr };
  }

  try {
    const service = new ObservationService({
      repository,
      providers: [new GeminiObservationProvider()],
      onProgress: async (completed, total) => {
        const { error } = await client.from('audit_queue').update({ last_heartbeat_at: new Date().toISOString() })
          .eq('id', job.id).eq('status', 'processing');
        if (error) throw new Error(`Observation worker heartbeat failed: ${error.message}`);
        await recordOperationalEvent({ eventType: 'ai_observation_progress', projectId: job.project_id, metadata: { observationRunId: existing.id, completed, total } }, client);
      },
    });
    const completed = await service.executeRun(existing.id);
    const { error } = await client.from('audit_queue').update({ status: 'done', completed_at: new Date().toISOString(), error: null })
      .eq('id', job.id).eq('status', 'processing');
    if (error) throw new Error(`Observation saved, but queue completion failed: ${error.message}`);
    await recordOperationalEvent({ eventType: 'ai_observation_completed', projectId: job.project_id, metadata: { observationRunId: completed.id, status: completed.status, completedQuestions: completed.completedQuestionCount, failedQuestions: completed.failedQuestionCount, costUsd: completed.costUsd } }, client);
    if (['COMPLETED', 'PARTIAL_SUCCESS'].includes(completed.status)) {
      try {
        await advanceCanonicalAfterObservation(client, completed);
      } catch (advanceError) {
        await client.from('audit_queue').update({ status: 'pending', started_at: null, completed_at: null, error: advanceError instanceof Error ? advanceError.message : String(advanceError) }).eq('id', job.id).eq('status', 'done');
        throw advanceError;
      }
    }
    else await failCanonicalAuditForStage(client, job.project_id, 'observationRunId', completed.id, `Engine 03 ended with ${completed.status}`);
    return { status: 'completed', message: 'AI observation run completed', observationRunId: completed.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const shouldRetry = job.attempts < job.max_attempts;
    const delaySeconds = Math.min(900, 30 * 2 ** Math.max(job.attempts - 1, 0));
    const { error: queueError } = await client.from('audit_queue').update({
      status: shouldRetry ? 'pending' : 'failed', error: message.slice(0, 2_000),
      started_at: shouldRetry ? null : job.started_at,
      completed_at: shouldRetry ? null : new Date().toISOString(),
      available_at: shouldRetry ? new Date(Date.now() + delaySeconds * 1_000).toISOString() : job.available_at,
    }).eq('id', job.id).eq('status', 'processing');
    const finalMessage = queueError ? `${message}; queue update failed: ${queueError.message}` : message;
    await recordOperationalEvent({ eventType: shouldRetry ? 'ai_observation_retry_scheduled' : 'ai_observation_failed', severity: shouldRetry ? 'warning' : 'error', projectId: job.project_id, metadata: { observationRunId: existing.id, attempt: job.attempts, error: finalMessage.slice(0, 800) } }, client);
    if (!shouldRetry) await failCanonicalAuditForStage(client, job.project_id, 'observationRunId', existing.id, finalMessage);
    return { status: 'failed', message: finalMessage, error: finalMessage, observationRunId: existing.id };
  }
}

async function failJob(client: AdminClient, job: QueueJob, message: string): Promise<ObservationJobResult> {
  const { error } = await client.from('audit_queue').update({ status: 'failed', error: message, completed_at: new Date().toISOString() })
    .eq('id', job.id).eq('status', 'processing');
  const finalMessage = error ? `${message}; queue update failed: ${error.message}` : message;
  await failCanonicalAuditForStage(client, job.project_id, 'observationRunId', job.observation_run_id, finalMessage);
  return { status: 'failed', message: finalMessage, error: finalMessage, observationRunId: job.observation_run_id ?? undefined };
}
