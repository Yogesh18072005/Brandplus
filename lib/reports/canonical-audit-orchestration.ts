import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/lib/supabase/types';
import { SupabaseBusinessUnderstandingRepository } from '@/lib/business-understanding/repository';
import { SupabaseBuyerIntentRepository } from '@/lib/buyer-intent/repository';
import { SupabaseObservationRepository } from '@/lib/ai-observation/repository';
import { SupabaseEvidenceDiagnosisRepository } from '@/lib/evidence-diagnosis/repository';
import { SupabaseInterventionRepository } from '@/lib/intervention-generation/repository';
import { BusinessUnderstandingService } from '@/src/business-understanding/service';
import { BuyerIntentService } from '@/src/buyer-intent/service';
import { ObservationService } from '@/src/ai-observation/service';
import { GeminiObservationProvider } from '@/src/ai-observation/gemini-provider';
import { EvidenceDiagnosisService } from '@/src/evidence-diagnosis/service';
import { InterventionGenerationService } from '@/src/intervention-generation/service';
import { GeminiInterventionGenerator } from '@/src/intervention-generation/gemini-generator';
import type { ObservationRun } from '@/src/ai-observation/types';
import type { EvidenceDiagnosisRun } from '@/src/evidence-diagnosis/types';
import type { InterventionRun } from '@/src/intervention-generation/types';
import { recordOperationalEvent } from '@/lib/ops/events';
import { sendEmail } from '@/lib/email/mailer';
import { resolveReportRecipient } from '@/lib/email/recipients';
import { intelligenceCompleteEmail } from '@/lib/email/templates';
import { getAppUrl } from '@/lib/app-url';
import {
  canonicalAuditJson,
  parseCanonicalAuditEnvelope,
  type CanonicalAuditEnvelope,
  type CanonicalAuditState,
} from '@/lib/reports/canonical-audit-envelope';

type AdminClient = SupabaseClient<Database>;
type QueueJob = Database['public']['Tables']['audit_queue']['Row'];
type AuditRow = Pick<Database['public']['Tables']['audits']['Row'], 'id' | 'project_id' | 'prompt_count' | 'status' | 'report_data' | 'cost_estimate_cents' | 'started_at' | 'completed_at'>;

export interface CanonicalQueueResult {
  status: 'completed' | 'failed';
  message: string;
  auditId: string;
  reportUrl?: string;
  emailed?: boolean;
  error?: string;
}

interface ActiveCanonicalAudit {
  id: string;
  project_id: string;
  status: string;
  report_data: Json | null;
  created_at: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function mergeEnvelope(envelope: CanonicalAuditEnvelope, state: CanonicalAuditState, chain: Partial<CanonicalAuditEnvelope['chain']>, failure?: string): CanonicalAuditEnvelope {
  return { ...envelope, state, chain: { ...envelope.chain, ...chain }, ...(failure ? { failure } : { failure: undefined }) };
}

async function saveEnvelope(client: AdminClient, auditId: string, envelope: CanonicalAuditEnvelope, fields: Database['public']['Tables']['audits']['Update'] = {}): Promise<void> {
  const { error } = await client.from('audits').update({ ...fields, report_data: canonicalAuditJson(envelope) }).eq('id', auditId);
  if (error) throw new Error(`Canonical audit lineage update failed: ${error.message}`);
}

async function findActiveCanonicalAudit(client: AdminClient, projectId: string): Promise<{ row: ActiveCanonicalAudit; envelope: CanonicalAuditEnvelope } | null> {
  const { data, error } = await client.from('audits')
    .select('id,project_id,status,report_data,created_at')
    .eq('project_id', projectId)
    .in('status', ['queued', 'running'])
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw new Error(`Canonical audit lookup failed: ${error.message}`);
  for (const row of data ?? []) {
    const envelope = parseCanonicalAuditEnvelope(row.report_data);
    if (envelope) return { row, envelope };
  }
  return null;
}

async function physicalQuestionSet(client: AdminClient, value: string): Promise<{ id: string; run_id: string } | null> {
  if (UUID_PATTERN.test(value)) {
    const byId = await client.from('buyer_question_sets').select('id,run_id').eq('id', value).maybeSingle();
    if (byId.error) throw new Error(`Buyer question set lookup failed: ${byId.error.message}`);
    if (byId.data) return byId.data;
  }
  const byKey = await client.from('buyer_question_sets').select('id,run_id').eq('set_key', value).maybeSingle();
  if (byKey.error) throw new Error(`Buyer question set lookup failed: ${byKey.error.message}`);
  return byKey.data;
}

async function failBootstrap(client: AdminClient, job: QueueJob, audit: AuditRow, envelope: CanonicalAuditEnvelope, message: string): Promise<CanonicalQueueResult> {
  const retry = job.attempts < job.max_attempts;
  const delaySeconds = Math.min(900, 30 * 2 ** Math.max(job.attempts - 1, 0));
  const failedEnvelope = mergeEnvelope(envelope, retry ? envelope.state : 'FAILED', {}, retry ? undefined : message.slice(0, 2_000));
  const [queueResult, auditResult] = await Promise.all([
    client.from('audit_queue').update({
      status: retry ? 'pending' : 'failed',
      error: message.slice(0, 2_000),
      started_at: retry ? null : job.started_at,
      completed_at: retry ? null : new Date().toISOString(),
      available_at: retry ? new Date(Date.now() + delaySeconds * 1_000).toISOString() : job.available_at,
    }).eq('id', job.id).in('status', ['processing', 'done']),
    client.from('audits').update({
      status: retry ? 'queued' : 'failed',
      report_data: canonicalAuditJson(failedEnvelope),
      completed_at: retry ? null : new Date().toISOString(),
    }).eq('id', audit.id),
  ]);
  const errors = [queueResult.error?.message, auditResult.error?.message].filter(Boolean).join('; ');
  const finalMessage = errors ? `${message}; ${errors}` : message;
  return { status: 'failed', message: finalMessage, auditId: audit.id, error: finalMessage };
}

export async function processCanonicalAuditBootstrap(client: AdminClient, job: QueueJob, audit: AuditRow, initialEnvelope: CanonicalAuditEnvelope): Promise<CanonicalQueueResult> {
  let envelope = initialEnvelope;
  let observationQueued = false;
  // Engines 01–02 can take minutes. Heartbeat on their progress events so stale
  // recovery can tell a live run from one the platform killed.
  let lastBeat = 0;
  const heartbeat = async () => {
    if (Date.now() - lastBeat < 30_000) return;
    lastBeat = Date.now();
    await client.from('audit_queue').update({ last_heartbeat_at: new Date().toISOString() }).eq('id', job.id).eq('status', 'processing');
  };
  const recordProgress = async (event: string, metadata?: Record<string, string | number | boolean | null>) => {
    await heartbeat();
    await recordOperationalEvent({ eventType: event, projectId: audit.project_id, auditId: audit.id, metadata: metadata ?? {} }, client);
  };
  try {
    if (envelope.state === 'COMPLETE' && envelope.chain.interventionRunId) {
      const completedAt = audit.completed_at ?? new Date().toISOString();
      await Promise.all([
        client.from('audits').update({ status: 'completed', completed_at: completedAt }).eq('id', audit.id),
        client.from('audit_queue').update({ status: 'done', error: null, completed_at: completedAt }).eq('id', job.id).eq('status', 'processing'),
      ]);
      return { status: 'completed', message: 'Existing canonical report recovered without model calls', auditId: audit.id, reportUrl: `${getAppUrl()}/r/${audit.id}`, emailed: false };
    }

    if (envelope.chain.observationRunId) {
      await Promise.all([
        client.from('audits').update({ status: 'running' }).eq('id', audit.id),
        client.from('audit_queue').update({ status: 'done', error: null, completed_at: new Date().toISOString() }).eq('id', job.id).eq('status', 'processing'),
      ]);
      return { status: 'completed', message: 'Canonical Engine 03 run is already queued', auditId: audit.id };
    }

    const { data: project, error: projectError } = await client.from('projects')
      .select('id,user_id,business_name,website')
      .eq('id', audit.project_id)
      .maybeSingle();
    if (projectError || !project) throw new Error(projectError?.message ?? 'Project not found');

    await client.from('audits').update({ status: 'running', started_at: audit.started_at ?? new Date().toISOString() }).eq('id', audit.id);

    const businessRepository = new SupabaseBusinessUnderstandingRepository(client);
    let understanding = envelope.chain.businessUnderstandingRunId
      ? await businessRepository.findByRunId(project.id, envelope.chain.businessUnderstandingRunId)
      : null;
    if (!understanding) {
      envelope = mergeEnvelope(envelope, 'BUILDING_UNDERSTANDING', {});
      await saveEnvelope(client, audit.id, envelope);
      understanding = await new BusinessUnderstandingService({
        repository: businessRepository,
        logger: { record: recordProgress },
      }).understand({ projectId: project.id, businessName: project.business_name, website: project.website });
      if (!['SUCCESS', 'PARTIAL_SUCCESS'].includes(understanding.status)) throw new Error(`Engine 01 ended with ${understanding.status}`);
      const record = await businessRepository.findLatestRecord(project.id);
      if (!record || record.understanding.content_hash !== understanding.content_hash) throw new Error('Engine 01 run could not be reconstructed');
      envelope = mergeEnvelope(envelope, 'BUILDING_BUYER_INTENT', { businessUnderstandingRunId: record.runId });
      await saveEnvelope(client, audit.id, envelope);
    }

    const businessRunId = envelope.chain.businessUnderstandingRunId;
    if (!businessRunId) throw new Error('Engine 01 run ID is missing');
    const buyerRepository = new SupabaseBuyerIntentRepository(client);
    let questionSet = envelope.chain.buyerQuestionSetId
      ? await buyerRepository.findBySetId(project.id, envelope.chain.buyerQuestionSetId)
      : null;
    let storedSet = envelope.chain.buyerQuestionSetId && envelope.chain.buyerIntentRunId
      ? { id: envelope.chain.buyerQuestionSetId, run_id: envelope.chain.buyerIntentRunId }
      : null;
    if (!questionSet || !storedSet) {
      envelope = mergeEnvelope(envelope, 'BUILDING_BUYER_INTENT', { businessUnderstandingRunId: businessRunId });
      await saveEnvelope(client, audit.id, envelope);
      questionSet = await new BuyerIntentService({
        repository: buyerRepository,
        logger: { record: recordProgress },
      }).generate({
        projectId: project.id,
        businessUnderstandingRunId: businessRunId,
        understanding,
        questionCount: Math.min(30, Math.max(1, audit.prompt_count || 10)),
      });
      if (!questionSet.frozen || !['COMPLETED', 'PARTIAL_SUCCESS'].includes(questionSet.status)) throw new Error(`Engine 02 ended with ${questionSet.status}`);
      storedSet = await physicalQuestionSet(client, questionSet.id);
      if (!storedSet) throw new Error('Engine 02 physical frozen question set was not found');
      envelope = mergeEnvelope(envelope, 'OBSERVING', {
        businessUnderstandingRunId: businessRunId,
        buyerIntentRunId: storedSet.run_id,
        buyerQuestionSetId: storedSet.id,
      });
      await saveEnvelope(client, audit.id, envelope);
    }

    const { error: bootstrapDoneError } = await client.from('audit_queue').update({ status: 'done', error: null, completed_at: new Date().toISOString() }).eq('id', job.id).eq('status', 'processing');
    if (bootstrapDoneError) throw new Error(`Canonical bootstrap queue completion failed: ${bootstrapDoneError.message}`);
    const observationService = new ObservationService({
      repository: new SupabaseObservationRepository(client),
      providers: [new GeminiObservationProvider()],
    });
    const created = await observationService.createRun({
      projectId: project.id,
      buyerQuestionSetId: storedSet.id,
      businessUnderstandingRunId: businessRunId,
      providerName: 'gemini',
      idempotencyKey: `canonical-audit:${audit.id}:engine-03`,
    });
    observationQueued = true;
    envelope = mergeEnvelope(envelope, 'OBSERVING', { observationRunId: created.run.id });
    await saveEnvelope(client, audit.id, envelope);
    await recordOperationalEvent({ eventType: 'canonical_audit_observation_queued', projectId: project.id, auditId: audit.id, metadata: { observationRunId: created.run.id, buyerQuestionSetId: storedSet.id } }, client);
    return { status: 'completed', message: 'Canonical Engines 01–02 completed and Engine 03 queued', auditId: audit.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (observationQueued) {
      return { status: 'failed', message: `Engine 03 was queued, but its audit lineage needs repair: ${message}`, auditId: audit.id, error: message };
    }
    return failBootstrap(client, job, audit, envelope, message);
  }
}

export async function advanceCanonicalAfterObservation(client: AdminClient, run: ObservationRun): Promise<void> {
  const active = await findActiveCanonicalAudit(client, run.projectId);
  if (!active || active.envelope.chain.diagnosisRunId) return;
  if (active.envelope.chain.observationRunId && active.envelope.chain.observationRunId !== run.id) return;
  if (active.envelope.chain.businessUnderstandingRunId !== run.businessUnderstandingRunId || active.envelope.chain.buyerQuestionSetId !== run.buyerQuestionSetId) return;
  const service = new EvidenceDiagnosisService({ repository: new SupabaseEvidenceDiagnosisRepository(client) });
  const created = await service.createRun({ projectId: run.projectId, observationRunId: run.id, idempotencyKey: `canonical-audit:${active.row.id}:engine-04` });
  await saveEnvelope(client, active.row.id, mergeEnvelope(active.envelope, 'DIAGNOSING', { observationRunId: run.id, diagnosisRunId: created.run.id }), { status: 'running' });
  await recordOperationalEvent({ eventType: 'canonical_audit_diagnosis_queued', projectId: run.projectId, auditId: active.row.id, metadata: { observationRunId: run.id, diagnosisRunId: created.run.id } }, client);
}

export async function advanceCanonicalAfterDiagnosis(client: AdminClient, run: EvidenceDiagnosisRun): Promise<void> {
  const active = await findActiveCanonicalAudit(client, run.projectId);
  if (!active || active.envelope.chain.observationRunId !== run.observationRunId || (active.envelope.chain.diagnosisRunId && active.envelope.chain.diagnosisRunId !== run.id) || active.envelope.chain.interventionRunId) return;
  const service = new InterventionGenerationService({ repository: new SupabaseInterventionRepository(client), generator: new GeminiInterventionGenerator() });
  const created = await service.createRun({ projectId: run.projectId, diagnosisRunId: run.id, idempotencyKey: `canonical-audit:${active.row.id}:engine-05` });
  await saveEnvelope(client, active.row.id, mergeEnvelope(active.envelope, 'GENERATING_INTERVENTIONS', { diagnosisRunId: run.id, interventionRunId: created.run.id }), { status: 'running' });
  await recordOperationalEvent({ eventType: 'canonical_audit_interventions_queued', projectId: run.projectId, auditId: active.row.id, metadata: { diagnosisRunId: run.id, interventionRunId: created.run.id } }, client);
}

export async function completeCanonicalAfterIntervention(client: AdminClient, run: InterventionRun): Promise<{ auditId: string; reportUrl: string; emailed: boolean } | null> {
  const active = await findActiveCanonicalAudit(client, run.projectId);
  if (!active || active.envelope.chain.diagnosisRunId !== run.diagnosisRunId || (active.envelope.chain.interventionRunId && active.envelope.chain.interventionRunId !== run.id)) return null;
  const completedAt = run.completedAt ?? new Date().toISOString();
  const envelope = mergeEnvelope(active.envelope, 'COMPLETE', { interventionRunId: run.id });
  await saveEnvelope(client, active.row.id, envelope, { status: 'completed', completed_at: completedAt });
  const reportUrl = `${getAppUrl()}/r/${active.row.id}`;
  const { data: project } = await client.from('projects').select('business_name,user_id').eq('id', run.projectId).maybeSingle();
  // Free-audit lead first, then the account email on the profile (Clerk users), then legacy auth.
  const email = await resolveReportRecipient(client, run.projectId, project?.user_id);
  let emailed = false;
  if (email) emailed = Boolean(await sendEmail({ to: email, ...intelligenceCompleteEmail({ businessName: project?.business_name ?? 'Your business', reportUrl }) }));
  await recordOperationalEvent({ eventType: 'canonical_audit_completed', projectId: run.projectId, auditId: active.row.id, metadata: { interventionRunId: run.id, reportUrl, emailed } }, client);
  return { auditId: active.row.id, reportUrl, emailed };
}

export async function failCanonicalAuditForStage(client: AdminClient, projectId: string, stage: keyof CanonicalAuditEnvelope['chain'], runId: string | null, message: string): Promise<void> {
  const active = await findActiveCanonicalAudit(client, projectId);
  if (!active || (runId && active.envelope.chain[stage] && active.envelope.chain[stage] !== runId)) return;
  await saveEnvelope(client, active.row.id, mergeEnvelope(active.envelope, 'FAILED', runId ? { [stage]: runId } : {}, message.slice(0, 2_000)), { status: 'failed', completed_at: new Date().toISOString() });
}
