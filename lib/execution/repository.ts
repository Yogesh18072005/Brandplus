import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/lib/supabase/types';
import { SupabaseInterventionRepository } from '@/lib/intervention-generation/repository';
import { executionHash, redactExecutionMetadata } from '@/src/execution/hash';
import type {
  AdapterStepDefinition,
  CreateExecutionResult,
  ExecutionApproval,
  ExecutionArtifact,
  ExecutionContext,
  ExecutionEvent,
  ExecutionEvidence,
  ExecutionPlan,
  ExecutionRepository,
  ExecutionRun,
  ExecutionSourceBundle,
  ExecutionStatus,
  ExecutionStep,
} from '@/src/execution/types';
import type { RequiredInputType } from '@/src/intervention-generation/types';

type AdminClient = SupabaseClient<Database>;
type RunRow = Database['public']['Tables']['execution_runs']['Row'];
type PlanRow = Database['public']['Tables']['execution_plans']['Row'];

const asStrings = (value: Json): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

export class SupabaseExecutionRepository implements ExecutionRepository {
  private readonly interventions: SupabaseInterventionRepository;
  constructor(private readonly client: AdminClient) {
    this.interventions = new SupabaseInterventionRepository(client);
  }

  async loadSourceBundle(projectId: string, interventionRecordId: string): Promise<ExecutionSourceBundle | null> {
    const { data: row, error } = await this.client.from('generated_interventions').select('*')
      .eq('id', interventionRecordId).eq('project_id', projectId).maybeSingle();
    if (error) throw new Error(`Execution intervention lookup failed: ${error.message}`);
    if (!row) return null;
    const interventionRun = await this.interventions.getRun(projectId, row.run_id, true);
    if (!interventionRun) return null;
    const intervention = interventionRun.interventions?.find((item) => item.id === row.intervention_key);
    if (!intervention) throw new Error('Engine 05 intervention detail is unavailable');
    const { data: links, error: linkError } = await this.client.from('intervention_evidence_links').select('*')
      .eq('intervention_id', row.id).eq('project_id', projectId).eq('link_kind', 'EVIDENCE_TO_REUSE');
    if (linkError) throw new Error(`Execution evidence links failed: ${linkError.message}`);
    const evidencePhysicalIds = (links ?? []).map((item) => item.business_evidence_id).filter((id): id is string => Boolean(id));
    const { data: evidenceRows, error: evidenceError } = evidencePhysicalIds.length
      ? await this.client.from('business_evidence').select('*').eq('project_id', projectId).in('id', evidencePhysicalIds)
      : { data: [], error: null };
    if (evidenceError) throw new Error(`Execution verified evidence load failed: ${evidenceError.message}`);
    const pageIds = (evidenceRows ?? []).map((item) => item.source_page_id).filter((id): id is string => Boolean(id));
    const { data: pages, error: pageError } = pageIds.length
      ? await this.client.from('business_source_pages').select('*').eq('project_id', projectId).in('id', pageIds)
      : { data: [], error: null };
    if (pageError) throw new Error(`Execution evidence source load failed: ${pageError.message}`);
    const pageById = new Map((pages ?? []).map((item) => [item.id, item]));
    const typeByEvidenceId = new Map((links ?? []).map((item) => [item.business_evidence_id, item.evidence_type]));
    return {
      projectId,
      interventionRecordId: row.id,
      intervention,
      interventionRun,
      verifiedEvidence: (evidenceRows ?? []).map((item) => {
        const page = item.source_page_id ? pageById.get(item.source_page_id) : undefined;
        return {
          id: item.evidence_key,
          type: typeByEvidenceId.get(item.id) ?? 'UNKNOWN',
          text: item.evidence_text,
          sourceUrl: page?.canonical_url ?? page?.source_url ?? null,
          sourceTitle: page?.page_title ?? null,
          contentHash: executionHash({ id: item.evidence_key, text: item.evidence_text, source: page?.canonical_url ?? null }),
        };
      }),
    };
  }

  async createExecution(input: {
    source: ExecutionSourceBundle;
    plan: ExecutionPlan;
    idempotencyKey: string;
    initialStatus: ExecutionStatus;
    actorId: string;
    retryOfExecutionId?: string | null;
    attemptNumber?: number;
  }): Promise<CreateExecutionResult> {
    const executionKey = executionHash({
      projectId: input.source.projectId,
      interventionId: input.source.interventionRecordId,
      payloadHash: input.plan.payloadHash,
      adapterVersion: input.plan.adapterVersion,
    });
    const { data, error } = await this.client.rpc('create_execution_run', {
      p_project_id: input.source.projectId,
      p_intervention_id: input.source.interventionRecordId,
      p_idempotency_key: input.idempotencyKey,
      p_execution_key: executionKey,
      p_initial_status: input.initialStatus,
      p_plan: input.plan as unknown as Json,
      p_actor_id: input.actorId,
      p_retry_of_execution_id: input.retryOfExecutionId ?? null,
      p_attempt_number: input.attemptNumber ?? 1,
    });
    if (error || !data?.[0]) throw new Error(`Execution creation failed: ${error?.message ?? 'missing run'}`);
    const run = await this.getRun(input.source.projectId, data[0].run_id, true);
    if (!run) throw new Error('Execution creation returned an unreadable run');
    return { kind: data[0].outcome === 'CREATED' ? 'CREATED' : 'EXISTING', run };
  }

  async getRun(projectId: string, executionId: string, includeDetails = false): Promise<ExecutionRun | null> {
    const { data, error } = await this.client.from('execution_runs').select('*')
      .eq('id', executionId).eq('project_id', projectId).maybeSingle();
    if (error) throw new Error(`Execution lookup failed: ${error.message}`);
    if (!data) return null;
    return this.hydrateRun(this.mapRun(data), includeDetails);
  }

  async listRuns(projectId: string, limit: number, offset: number): Promise<ExecutionRun[]> {
    const { data, error } = await this.client.from('execution_runs').select('*').eq('project_id', projectId)
      .order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (error) throw new Error(`Execution listing failed: ${error.message}`);
    return (data ?? []).map((row) => this.mapRun(row));
  }

  async loadContext(executionId: string): Promise<ExecutionContext> {
    const { data: row, error } = await this.client.from('execution_runs').select('*').eq('id', executionId).single();
    if (error || !row) throw new Error(`Execution context failed: ${error?.message ?? 'missing run'}`);
    const run = await this.hydrateRun(this.mapRun(row), true);
    if (!run.activePlan) throw new Error('Execution active plan is unavailable');
    const source = await this.loadSourceBundle(run.projectId, run.interventionRecordId);
    if (!source) throw new Error('Execution source intervention is unavailable');
    const { data: inputRows, error: inputError } = await this.client.from('execution_inputs').select('*')
      .eq('execution_id', executionId).order('submitted_at', { ascending: true });
    if (inputError) throw new Error(`Execution input load failed: ${inputError.message}`);
    const latest = new Map<string, (typeof inputRows)[number]>();
    for (const item of inputRows ?? []) latest.set(item.input_key, item);
    return {
      run, plan: run.activePlan, source,
      inputs: [...latest.values()].map((item) => ({
        inputKey: item.input_key, inputType: item.input_type as RequiredInputType,
        value: item.submitted_value, valueHash: item.value_hash,
        submittedBy: item.submitted_by, submittedAt: item.submitted_at,
      })),
      approvals: run.approvals ?? [], steps: run.steps ?? [],
    };
  }

  async replacePlan(input: { executionId: string; previousPlanId: string; plan: ExecutionPlan; status: ExecutionStatus; actorId: string }): Promise<ExecutionRun> {
    const { error } = await this.client.rpc('replace_execution_plan', {
      p_execution_id: input.executionId, p_previous_plan_id: input.previousPlanId,
      p_plan: input.plan as unknown as Json, p_status: input.status, p_actor_id: input.actorId,
    });
    if (error) throw new Error(`Execution plan replacement failed: ${error.message}`);
    const { data: row, error: rowError } = await this.client.from('execution_runs').select('project_id').eq('id', input.executionId).single();
    if (rowError || !row) throw new Error(`Execution plan replacement reload failed: ${rowError?.message ?? 'missing run'}`);
    const run = await this.getRun(row.project_id, input.executionId, true);
    if (!run) throw new Error('Execution plan replacement returned an unreadable run');
    return run;
  }

  async storeInput(input: { executionId: string; planId: string; projectId: string; inputKey: string; inputType: RequiredInputType; value: string; valueHash: string; actorId: string }): Promise<void> {
    const { error } = await this.client.from('execution_inputs').insert({
      execution_id: input.executionId, plan_id: input.planId, project_id: input.projectId,
      input_key: input.inputKey, input_type: input.inputType, submitted_value: input.value,
      value_hash: input.valueHash, submitted_by: input.actorId,
    });
    if (error && error.code !== '23505') throw new Error(`Execution input persistence failed: ${error.message}`);
    const { error: eventError } = await this.client.from('execution_events').insert({
      project_id: input.projectId, execution_id: input.executionId, actor_type: 'USER', actor_id: input.actorId,
      event_type: 'INPUT_SUBMITTED', payload_hash: null,
      metadata: { inputKey: input.inputKey, inputType: input.inputType, valueHash: input.valueHash } as Json,
    });
    if (eventError) throw new Error(`Execution input audit event failed: ${eventError.message}`);
  }

  async recordApproval(input: { executionId: string; plan: ExecutionPlan; approverId: string; decision: 'APPROVED' | 'REJECTED'; expiresAt: string | null }): Promise<ExecutionRun> {
    const { error } = await this.client.rpc('record_execution_approval', {
      p_execution_id: input.executionId, p_plan_id: input.plan.id, p_approver_id: input.approverId,
      p_decision: input.decision, p_expires_at: input.expiresAt, p_payload_hash: input.plan.payloadHash,
    });
    if (error) throw new Error(`Execution approval failed: ${error.message}`);
    const run = await this.getRun(input.plan.projectId, input.executionId, true);
    if (!run) throw new Error('Execution approval returned an unreadable run');
    return run;
  }

  async transition(input: Parameters<ExecutionRepository['transition']>[0]): Promise<ExecutionRun> {
    const { error } = await this.client.rpc('transition_execution_run', {
      p_execution_id: input.executionId, p_from: input.from, p_to: input.to,
      p_actor_type: input.actorType, p_actor_id: input.actorId, p_event_type: input.eventType,
      p_payload_hash: input.payloadHash,
      p_metadata: redactExecutionMetadata(input.metadata ?? {}) as Json,
      p_error_code: input.errorCode ?? null, p_error_message: input.errorMessage?.slice(0, 2_000) ?? null,
    });
    if (error) throw new Error(`Execution transition failed: ${error.message}`);
    const { data: row, error: rowError } = await this.client.from('execution_runs').select('project_id').eq('id', input.executionId).single();
    if (rowError || !row) throw new Error(`Execution transition reload failed: ${rowError?.message ?? 'missing run'}`);
    const run = await this.getRun(row.project_id, input.executionId, true);
    if (!run) throw new Error('Execution transition returned an unreadable run');
    return run;
  }

  async enqueue(executionId: string, projectId: string): Promise<void> {
    const { error } = await this.client.from('audit_queue').upsert({
      project_id: projectId, audit_id: null, observation_run_id: null, diagnosis_run_id: null,
      intervention_run_id: null, execution_run_id: executionId, job_type: 'EXECUTION', priority: 0, status: 'pending',
    }, { onConflict: 'execution_run_id', ignoreDuplicates: true });
    if (error) throw new Error(`Execution queueing failed: ${error.message}`);
  }

  async prepareStep(executionId: string, planId: string, step: AdapterStepDefinition): Promise<ExecutionStep> {
    const { data, error } = await this.client.rpc('prepare_execution_step', {
      p_execution_id: executionId, p_plan_id: planId, p_step_key: step.key, p_name: step.name,
      p_sequence: step.sequence, p_retry_safety: step.retrySafety, p_max_attempts: step.maxAttempts,
    });
    if (error || !data) throw new Error(`Execution step start failed: ${error?.message ?? 'missing step'}`);
    const { data: row, error: rowError } = await this.client.from('execution_steps').select('*').eq('id', data).single();
    if (rowError || !row) throw new Error(`Execution step reload failed: ${rowError?.message ?? 'missing step'}`);
    return this.mapStep(row, null, null);
  }

  async completeStep(input: { stepId: string; executionId: string; status: ExecutionStep['status']; artifact: ExecutionArtifact | null; evidence: ExecutionEvidence; errorCode: string | null; errorMessage: string | null }): Promise<void> {
    const { error } = await this.client.rpc('complete_execution_step', {
      p_step_id: input.stepId, p_execution_id: input.executionId, p_status: input.status,
      p_artifact: input.artifact as unknown as Json | null, p_evidence: input.evidence as unknown as Json,
      p_error_code: input.errorCode, p_error_message: input.errorMessage?.slice(0, 2_000) ?? null,
    });
    if (error) throw new Error(`Execution step completion failed: ${error.message}`);
  }

  private async hydrateRun(run: ExecutionRun, includeDetails: boolean): Promise<ExecutionRun> {
    if (!includeDetails) return run;
    const [planResult, stepResult, approvalResult, eventResult, artifactResult, evidenceResult] = await Promise.all([
      this.client.from('execution_plans').select('*').eq('id', run.activePlanId).maybeSingle(),
      this.client.from('execution_steps').select('*').eq('execution_id', run.id).order('sequence'),
      this.client.from('execution_approvals').select('*').eq('execution_id', run.id).order('created_at'),
      this.client.from('execution_events').select('*').eq('execution_id', run.id).order('created_at'),
      this.client.from('execution_artifacts').select('*').eq('execution_id', run.id).order('created_at'),
      this.client.from('execution_evidence').select('*').eq('execution_id', run.id).order('created_at'),
    ]);
    const failed = [planResult, stepResult, approvalResult, eventResult, artifactResult, evidenceResult].find((item) => item.error);
    if (failed?.error) throw new Error(`Execution detail load failed: ${failed.error.message}`);
    const artifactByStep = new Map((artifactResult.data ?? []).filter((item) => item.step_id).map((item) => [item.step_id!, item]));
    const evidenceByStep = new Map((evidenceResult.data ?? []).map((item) => [item.step_id, item]));
    return {
      ...run,
      activePlan: planResult.data ? this.mapPlan(planResult.data) : undefined,
      steps: (stepResult.data ?? []).map((item) => this.mapStep(item, artifactByStep.get(item.id) ?? null, evidenceByStep.get(item.id) ?? null)),
      approvals: (approvalResult.data ?? []).map((item) => ({
        id: item.id, projectId: item.project_id, executionId: item.execution_id, planId: item.plan_id,
        requestedAction: item.requested_action, requestedScope: item.requested_scope, requestedAt: item.requested_at,
        approverId: item.approver_id, approvedAt: item.approved_at, expiresAt: item.expires_at,
        status: item.status as ExecutionApproval['status'], artifactVersion: item.artifact_version, payloadHash: item.payload_hash,
      })),
      events: (eventResult.data ?? []).map((item) => ({
        id: item.id, projectId: item.project_id, executionId: item.execution_id, stepId: item.step_id,
        actorType: item.actor_type as ExecutionEvent['actorType'], actorId: item.actor_id,
        eventType: item.event_type as ExecutionEvent['eventType'], payloadHash: item.payload_hash,
        metadata: item.metadata as Record<string, unknown>, createdAt: item.created_at,
      })),
    };
  }

  private mapRun(row: RunRow): ExecutionRun {
    return {
      id: row.id, projectId: row.project_id, interventionRecordId: row.intervention_id,
      interventionRunId: row.intervention_run_id, diagnosisRunId: row.diagnosis_run_id,
      observationRunId: row.observation_run_id, buyerQuestionSetId: row.buyer_question_set_id,
      businessUnderstandingRunId: row.business_understanding_run_id, activePlanId: row.active_plan_id ?? '',
      status: row.status as ExecutionRun['status'], idempotencyKey: row.idempotency_key, executionKey: row.execution_key,
      retryOfExecutionId: row.retry_of_execution_id, attemptNumber: row.attempt_number,
      providerCallCount: row.provider_call_count, inputTokens: row.input_tokens, outputTokens: row.output_tokens,
      estimatedCostUsd: Number(row.estimated_cost_usd), externalCostUsd: Number(row.external_cost_usd),
      errorCode: row.error_code, errorMessage: row.error_message, startedAt: row.started_at,
      completedAt: row.completed_at, cancelledAt: row.cancelled_at, createdAt: row.created_at,
    };
  }

  private mapPlan(row: PlanRow): ExecutionPlan {
    return {
      id: row.id, executionId: row.execution_id, projectId: row.project_id, planVersion: row.plan_version,
      interventionRecordId: row.intervention_id, interventionId: row.intervention_key, diagnosisId: row.diagnosis_key,
      affectedQuestions: row.affected_questions as unknown as ExecutionPlan['affectedQuestions'],
      interventionType: row.intervention_type as ExecutionPlan['interventionType'],
      targetSurface: row.target_surface as ExecutionPlan['targetSurface'],
      adapterId: row.adapter_id as ExecutionPlan['adapterId'], adapterVersion: row.adapter_version,
      requiredPermissions: asStrings(row.required_permissions),
      requiredInputs: row.required_inputs as unknown as ExecutionPlan['requiredInputs'],
      payload: row.payload as unknown as ExecutionPlan['payload'], payloadHash: row.payload_hash,
      prerequisites: row.prerequisites as unknown as ExecutionPlan['prerequisites'],
      approvalStatus: row.approval_status as ExecutionPlan['approvalStatus'],
      acceptanceCriteria: asStrings(row.acceptance_criteria), risk: row.risk as ExecutionPlan['risk'],
      retrySafety: row.retry_safety as ExecutionPlan['retrySafety'], rollback: row.rollback as unknown as ExecutionPlan['rollback'],
      engineVersion: row.engine_version, schemaVersion: row.schema_version, payloadVersion: row.payload_version,
      contentGenerationVersion: row.content_generation_version,
      upstreamVersions: row.upstream_versions as unknown as ExecutionPlan['upstreamVersions'], createdAt: row.created_at,
    };
  }

  private mapStep(
    row: Database['public']['Tables']['execution_steps']['Row'],
    artifactRow: Database['public']['Tables']['execution_artifacts']['Row'] | null,
    evidenceRow: Database['public']['Tables']['execution_evidence']['Row'] | null,
  ): ExecutionStep {
    return {
      id: row.id, executionId: row.execution_id, planId: row.plan_id, stepKey: row.step_key,
      sequence: row.sequence, name: row.name, status: row.status as ExecutionStep['status'],
      retrySafety: row.retry_safety as ExecutionStep['retrySafety'], attemptCount: row.attempt_count,
      maxAttempts: row.max_attempts, rollbackStatus: row.rollback_status as ExecutionStep['rollbackStatus'],
      errorCode: row.error_code, errorMessage: row.error_message, startedAt: row.started_at, completedAt: row.completed_at,
      artifact: artifactRow ? {
        id: artifactRow.id, artifactType: artifactRow.artifact_type as ExecutionArtifact['artifactType'],
        mediaType: artifactRow.media_type as ExecutionArtifact['mediaType'],
        content: artifactRow.content as Record<string, unknown>, contentHash: artifactRow.content_hash, isDraft: true,
      } : null,
      evidence: evidenceRow ? {
        requestId: evidenceRow.request_id, externalResourceId: evidenceRow.external_resource_id,
        responseStatus: evidenceRow.response_status, resultingUrl: evidenceRow.resulting_url,
        artifactHash: evidenceRow.artifact_hash, beforeSnapshotHash: evidenceRow.before_snapshot_hash,
        afterSnapshotHash: evidenceRow.after_snapshot_hash, timestamp: evidenceRow.occurred_at,
        adapterVersion: evidenceRow.adapter_version, executionStatus: evidenceRow.execution_status as ExecutionEvidence['executionStatus'],
        confirmation: evidenceRow.confirmation,
      } : null,
    };
  }
}
