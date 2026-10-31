import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { recordOperationalEvent } from '@/lib/ops/events';
import { SupabaseEvidenceDiagnosisRepository } from './repository';
import { EvidenceDiagnosisInputError, EvidenceDiagnosisService } from '@/src/evidence-diagnosis/service';
import { advanceCanonicalAfterDiagnosis, failCanonicalAuditForStage } from '@/lib/reports/canonical-audit-orchestration';

type AdminClient = SupabaseClient<Database>;
type QueueJob = Database['public']['Tables']['audit_queue']['Row'];

export interface EvidenceDiagnosisJobResult {
  status: 'completed' | 'failed';
  message: string;
  diagnosisRunId?: string;
  error?: string;
}

export async function processEvidenceDiagnosisQueueJob(
  client: AdminClient,
  job: QueueJob,
): Promise<EvidenceDiagnosisJobResult> {
  if (!job.diagnosis_run_id) return failJob(client, job, 'Evidence diagnosis queue job has no diagnosis run');
  const repository = new SupabaseEvidenceDiagnosisRepository(client);
  const existing = await repository.getRun(job.project_id, job.diagnosis_run_id);
  if (!existing) return failJob(client, job, 'Linked evidence diagnosis run was not found');

  if (['COMPLETED', 'PARTIAL_SUCCESS', 'INCONCLUSIVE'].includes(existing.status)) {
    const { error } = await client.from('audit_queue').update({
      status: 'done', completed_at: existing.completedAt ?? new Date().toISOString(), error: null,
    }).eq('id', job.id).eq('status', 'processing');
    if (error) return { status: 'failed', message: error.message, error: error.message, diagnosisRunId: existing.id };
    try {
      await advanceCanonicalAfterDiagnosis(client, existing);
    } catch (advanceError) {
      await client.from('audit_queue').update({ status: 'pending', started_at: null, completed_at: null, error: advanceError instanceof Error ? advanceError.message : String(advanceError) }).eq('id', job.id).eq('status', 'done');
      throw advanceError;
    }
    return { status: 'completed', message: 'Existing evidence diagnosis run recovered without model calls', diagnosisRunId: existing.id };
  }
  if (existing.status === 'FAILED') return failJob(client, job, 'Linked evidence diagnosis run is terminally failed');

  try {
    const startedAt = Date.now();
    const service = new EvidenceDiagnosisService({
      repository,
      onProgress: async (completed, total) => {
        const { error } = await client.from('audit_queue').update({ last_heartbeat_at: new Date().toISOString() })
          .eq('id', job.id).eq('status', 'processing');
        if (error) throw new Error(`Evidence diagnosis worker heartbeat failed: ${error.message}`);
        await recordOperationalEvent({
          eventType: 'evidence_diagnosis_progress', projectId: job.project_id,
          metadata: { diagnosisRunId: existing.id, completed, total, llmCalls: 0 },
        }, client);
      },
    });
    const completed = await service.executeRun(existing.id);
    const queueStatus = completed.status === 'FAILED' ? 'failed' : 'done';
    const errorMessage = completed.status === 'FAILED' ? 'All evidence question diagnoses failed' : null;
    const { error } = await client.from('audit_queue').update({
      status: queueStatus, completed_at: new Date().toISOString(), error: errorMessage,
    }).eq('id', job.id).eq('status', 'processing');
    if (error) throw new Error(`Evidence diagnosis saved, but queue completion failed: ${error.message}`);
    await recordOperationalEvent({
      eventType: completed.status === 'FAILED' ? 'evidence_diagnosis_failed' : 'evidence_diagnosis_completed',
      severity: completed.status === 'FAILED' ? 'error' : 'info', projectId: job.project_id,
      metadata: {
        diagnosisRunId: completed.id, status: completed.status,
        completedQuestions: completed.completedQuestionCount, failedQuestions: completed.failedQuestionCount,
        inconclusiveQuestions: completed.inconclusiveQuestionCount, evidenceCount: completed.evidenceCount,
        gapCount: completed.gapCount, llmCalls: completed.llmCallCount, costUsd: completed.costUsd,
        latencyMs: Date.now() - startedAt,
      },
    }, client);
    if (completed.status !== 'FAILED') {
      try {
        await advanceCanonicalAfterDiagnosis(client, completed);
      } catch (advanceError) {
        await client.from('audit_queue').update({ status: 'pending', started_at: null, completed_at: null, error: advanceError instanceof Error ? advanceError.message : String(advanceError) }).eq('id', job.id).eq('status', 'done');
        throw advanceError;
      }
    }
    else await failCanonicalAuditForStage(client, job.project_id, 'diagnosisRunId', completed.id, errorMessage!);
    return completed.status === 'FAILED'
      ? { status: 'failed', message: errorMessage!, error: errorMessage!, diagnosisRunId: completed.id }
      : { status: 'completed', message: 'Evidence diagnosis run completed', diagnosisRunId: completed.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const shouldRetry = !(error instanceof EvidenceDiagnosisInputError) && job.attempts < job.max_attempts;
    const delaySeconds = Math.min(900, 15 * 2 ** Math.max(job.attempts - 1, 0));
    if (!shouldRetry) {
      await client.from('evidence_diagnosis_runs').update({ status: 'FAILED', completed_at: new Date().toISOString() })
        .eq('id', existing.id).in('status', ['PENDING', 'RUNNING']);
    }
    const { error: queueError } = await client.from('audit_queue').update({
      status: shouldRetry ? 'pending' : 'failed', error: message.slice(0, 2_000),
      started_at: shouldRetry ? null : job.started_at,
      completed_at: shouldRetry ? null : new Date().toISOString(),
      available_at: shouldRetry ? new Date(Date.now() + delaySeconds * 1_000).toISOString() : job.available_at,
    }).eq('id', job.id).eq('status', 'processing');
    const finalMessage = queueError ? `${message}; queue update failed: ${queueError.message}` : message;
    await recordOperationalEvent({
      eventType: shouldRetry ? 'evidence_diagnosis_retry_scheduled' : 'evidence_diagnosis_failed',
      severity: shouldRetry ? 'warning' : 'error', projectId: job.project_id,
      metadata: { diagnosisRunId: existing.id, attempt: job.attempts, error: finalMessage.slice(0, 800), llmCalls: 0 },
    }, client);
    if (!shouldRetry) await failCanonicalAuditForStage(client, job.project_id, 'diagnosisRunId', existing.id, finalMessage);
    return { status: 'failed', message: finalMessage, error: finalMessage, diagnosisRunId: existing.id };
  }
}

async function failJob(client: AdminClient, job: QueueJob, message: string): Promise<EvidenceDiagnosisJobResult> {
  const { error } = await client.from('audit_queue').update({
    status: 'failed', error: message, completed_at: new Date().toISOString(),
  }).eq('id', job.id).eq('status', 'processing');
  const finalMessage = error ? `${message}; queue update failed: ${error.message}` : message;
  await failCanonicalAuditForStage(client, job.project_id, 'diagnosisRunId', job.diagnosis_run_id, finalMessage);
  return { status: 'failed', message: finalMessage, error: finalMessage, diagnosisRunId: job.diagnosis_run_id ?? undefined };
}
