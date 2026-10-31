import { getExecutionAdapter } from './adapters';
import { executionHash } from './hash';
import {
  assertExecutionTransition,
  buildExecutionPlan,
  initialExecutionStatus,
  isTerminalExecutionStatus,
  type SupportedExecutionOptions,
  validateExecutionInput,
} from './policy';
import type {
  ApprovalStatus,
  CreateExecutionResult,
  ExecutionApproval,
  ExecutionAdapter,
  ExecutionPlan,
  ExecutionRepository,
  ExecutionRun,
  ExecutionStatus,
  RetrySafety,
  StepStatus,
} from './types';

export class ExecutionInputError extends Error {
  constructor(message: string) { super(message); this.name = 'ExecutionInputError'; }
}

export class ExecutionConflictError extends Error {
  constructor(message: string) { super(message); this.name = 'ExecutionConflictError'; }
}

export class ExecutionAuthorizationError extends Error {
  constructor(message: string) { super(message); this.name = 'ExecutionAuthorizationError'; }
}

export function validIdempotencyKey(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/.test(value);
}

export function effectiveApprovalStatus(plan: ExecutionPlan, approvals: readonly ExecutionApproval[], now = Date.now()): ApprovalStatus {
  if (plan.approvalStatus === 'NO_APPROVAL') return 'NO_APPROVAL';
  const exact = [...approvals].reverse().find((item) => item.planId === plan.id && item.payloadHash === plan.payloadHash);
  if (!exact) return 'REQUIRED_APPROVAL';
  if (exact.status === 'APPROVED' && exact.expiresAt && new Date(exact.expiresAt).getTime() <= now) return 'EXPIRED';
  return exact.status;
}

export function retrySafetyForFailure(input: { adapterRetrySafety: RetrySafety; responseKnown: boolean; sideEffectPossible: boolean }): RetrySafety {
  if (!input.responseKnown && input.sideEffectPossible) return 'UNKNOWN';
  if (input.sideEffectPossible) return 'UNSAFE_TO_RETRY';
  return input.adapterRetrySafety;
}

export function canCancelExecution(status: ExecutionStatus, adapterSupportsCancellation: boolean): boolean {
  if (['QUEUED', 'WAITING_FOR_APPROVAL', 'WAITING_FOR_INPUT', 'READY', 'PLANNED'].includes(status)) return true;
  return status === 'RUNNING' && adapterSupportsCancellation;
}

export interface ExecutionServiceOptions {
  repository: ExecutionRepository;
  now?: () => Date;
  resolveAdapter?: (id: string) => ExecutionAdapter;
}

export class ExecutionService {
  private readonly now: () => Date;
  private readonly resolveAdapter: (id: string) => ExecutionAdapter;
  constructor(private readonly options: ExecutionServiceOptions) {
    this.now = options.now ?? (() => new Date());
    this.resolveAdapter = options.resolveAdapter ?? getExecutionAdapter;
  }

  async create(input: {
    projectId: string;
    interventionId: string;
    idempotencyKey: string;
    actorId: string;
    options?: SupportedExecutionOptions;
  }): Promise<CreateExecutionResult> {
    if (!validIdempotencyKey(input.idempotencyKey)) throw new ExecutionInputError('Idempotency-Key must contain 16 to 128 safe characters');
    const source = await this.options.repository.loadSourceBundle(input.projectId, input.interventionId);
    if (!source) throw new ExecutionInputError('Finalized Engine 05 intervention not found');
    let plan: ExecutionPlan;
    try {
      plan = buildExecutionPlan({ source, options: input.options, now: this.now().toISOString() });
    } catch (error) {
      throw new ExecutionInputError(error instanceof Error ? error.message : String(error));
    }
    const initialStatus = initialExecutionStatus(plan);
    const created = await this.options.repository.createExecution({ source, plan, idempotencyKey: input.idempotencyKey, initialStatus, actorId: input.actorId });
    if (created.run.status === 'QUEUED') await this.options.repository.enqueue(created.run.id, input.projectId);
    return created;
  }

  async approve(input: { projectId: string; executionId: string; actorId: string; payloadHash: string; expiresAt?: string | null }): Promise<ExecutionRun> {
    const context = await this.ownedContext(input.projectId, input.executionId);
    if (context.run.status !== 'WAITING_FOR_APPROVAL') throw new ExecutionConflictError('Execution is not waiting for approval');
    if (context.plan.payloadHash !== input.payloadHash) throw new ExecutionConflictError('Approval payload hash does not match the active execution plan');
    if (input.expiresAt && new Date(input.expiresAt).getTime() <= this.now().getTime()) throw new ExecutionInputError('Approval expiration must be in the future');
    const currentApproval = effectiveApprovalStatus(context.plan, context.approvals, this.now().getTime());
    if (currentApproval !== 'APPROVED') {
      await this.options.repository.recordApproval({
        executionId: context.run.id, plan: context.plan, approverId: input.actorId,
        decision: 'APPROVED', expiresAt: input.expiresAt ?? null,
      });
    }
    const next: ExecutionStatus = context.plan.adapterId === 'MANUAL_EXECUTION_PACKAGE' ? 'MANUAL_REQUIRED' : 'QUEUED';
    assertExecutionTransition(context.run.status, next);
    const run = await this.options.repository.transition({
      executionId: context.run.id, from: ['WAITING_FOR_APPROVAL'], to: next,
      actorType: 'USER', actorId: input.actorId,
      eventType: next === 'QUEUED' ? 'EXECUTION_QUEUED' : 'MANUAL_REQUIRED',
      payloadHash: context.plan.payloadHash,
      metadata: { planId: context.plan.id, approval: 'APPROVED' },
    });
    if (next === 'QUEUED') await this.options.repository.enqueue(run.id, run.projectId);
    return run;
  }

  async reject(input: { projectId: string; executionId: string; actorId: string; payloadHash: string }): Promise<ExecutionRun> {
    const context = await this.ownedContext(input.projectId, input.executionId);
    if (context.run.status !== 'WAITING_FOR_APPROVAL') throw new ExecutionConflictError('Execution is not waiting for approval');
    if (context.plan.payloadHash !== input.payloadHash) throw new ExecutionConflictError('Rejection payload hash does not match the active execution plan');
    const currentApproval = effectiveApprovalStatus(context.plan, context.approvals, this.now().getTime());
    if (currentApproval !== 'REJECTED') {
      await this.options.repository.recordApproval({ executionId: context.run.id, plan: context.plan, approverId: input.actorId, decision: 'REJECTED', expiresAt: null });
    }
    return this.options.repository.transition({
      executionId: context.run.id, from: ['WAITING_FOR_APPROVAL'], to: 'BLOCKED', actorType: 'USER', actorId: input.actorId,
      eventType: 'EXECUTION_BLOCKED', payloadHash: context.plan.payloadHash, metadata: { reason: 'APPROVAL_REJECTED' },
      errorCode: 'APPROVAL_REJECTED', errorMessage: 'The active execution plan was explicitly rejected.',
    });
  }

  async submitInput(input: { projectId: string; executionId: string; actorId: string; inputKey: string; value: string }): Promise<ExecutionRun> {
    const context = await this.ownedContext(input.projectId, input.executionId);
    if (context.run.status !== 'WAITING_FOR_INPUT') throw new ExecutionConflictError('Execution is not waiting for input');
    const requirement = context.plan.requiredInputs.find((item) => item.inputKey === input.inputKey && item.required);
    if (!requirement) throw new ExecutionInputError('Input is not required by the active execution plan');
    let value: string;
    try { value = validateExecutionInput(input.inputKey, input.value); }
    catch (error) { throw new ExecutionInputError(error instanceof Error ? error.message : String(error)); }
    const valueHash = executionHash(value);
    await this.options.repository.storeInput({
      executionId: context.run.id, planId: context.plan.id, projectId: input.projectId,
      inputKey: requirement.inputKey, inputType: requirement.inputType, value, valueHash, actorId: input.actorId,
    });
    const inputs = [...context.inputs.filter((item) => item.inputKey !== requirement.inputKey), {
      inputKey: requirement.inputKey, inputType: requirement.inputType, value, valueHash,
      submittedBy: input.actorId, submittedAt: this.now().toISOString(),
    }];
    const plan = buildExecutionPlan({
      source: context.source, inputs, planVersion: context.plan.planVersion + 1,
      executionId: context.run.id, now: this.now().toISOString(),
      options: context.plan.adapterId === 'WEBSITE_CONTENT_DRAFT' ? { artifact: 'CONTENT_DRAFT' }
        : context.plan.adapterId === 'CONTENT_BRIEF_ARTIFACT' ? { artifact: 'CONTENT_BRIEF' }
          : context.plan.adapterId === 'MANUAL_EXECUTION_PACKAGE' ? { artifact: 'MANUAL_PACKAGE' } : {},
    });
    const next = initialExecutionStatus(plan);
    const run = await this.options.repository.replacePlan({
      executionId: context.run.id, previousPlanId: context.plan.id, plan, status: next, actorId: input.actorId,
    });
    if (next === 'QUEUED') await this.options.repository.enqueue(run.id, run.projectId);
    return run;
  }

  async cancel(input: { projectId: string; executionId: string; actorId: string }): Promise<ExecutionRun> {
    const context = await this.ownedContext(input.projectId, input.executionId);
    const adapter = this.resolveAdapter(context.plan.adapterId);
    if (!canCancelExecution(context.run.status, adapter.supportsCancellation)) {
      throw new ExecutionConflictError('Execution cannot be cancelled in its current state');
    }
    return this.options.repository.transition({
      executionId: context.run.id, from: [context.run.status], to: 'CANCELLED', actorType: 'USER', actorId: input.actorId,
      eventType: 'EXECUTION_CANCELLED', payloadHash: context.plan.payloadHash,
      metadata: { adapterId: adapter.id, runningCancellationSupported: adapter.supportsCancellation },
    });
  }

  async retry(input: { projectId: string; executionId: string; actorId: string; idempotencyKey: string }): Promise<CreateExecutionResult> {
    if (!validIdempotencyKey(input.idempotencyKey)) throw new ExecutionInputError('Idempotency-Key must contain 16 to 128 safe characters');
    const context = await this.ownedContext(input.projectId, input.executionId);
    if (!['FAILED', 'UNKNOWN', 'PARTIALLY_SUCCEEDED'].includes(context.run.status)) throw new ExecutionConflictError('Only failed, unknown, or partially succeeded executions can be retried');
    if (context.plan.retrySafety !== 'SAFE_TO_RETRY') throw new ExecutionConflictError('Execution is not safe to retry automatically');
    const plan = buildExecutionPlan({
      source: context.source, inputs: context.inputs, planVersion: 1, now: this.now().toISOString(),
      options: context.plan.adapterId === 'WEBSITE_CONTENT_DRAFT' ? { artifact: 'CONTENT_DRAFT' }
        : context.plan.adapterId === 'CONTENT_BRIEF_ARTIFACT' ? { artifact: 'CONTENT_BRIEF' }
          : context.plan.adapterId === 'MANUAL_EXECUTION_PACKAGE' ? { artifact: 'MANUAL_PACKAGE' } : {},
    });
    const status = initialExecutionStatus(plan);
    const created = await this.options.repository.createExecution({
      source: context.source, plan, idempotencyKey: input.idempotencyKey, initialStatus: status, actorId: input.actorId,
      retryOfExecutionId: context.run.id, attemptNumber: context.run.attemptNumber + 1,
    });
    if (created.run.status === 'QUEUED') await this.options.repository.enqueue(created.run.id, input.projectId);
    return created;
  }

  async execute(executionId: string): Promise<ExecutionRun> {
    const context = await this.options.repository.loadContext(executionId);
    if (isTerminalExecutionStatus(context.run.status)) return context.run;
    if (context.run.status !== 'QUEUED') throw new ExecutionConflictError(`Execution is ${context.run.status}, not QUEUED`);
    const approval = effectiveApprovalStatus(context.plan, context.approvals, this.now().getTime());
    if (context.plan.approvalStatus === 'REQUIRED_APPROVAL' && approval !== 'APPROVED') {
      const code = approval === 'EXPIRED' ? 'APPROVAL_EXPIRED' : 'APPROVAL_REQUIRED';
      return this.options.repository.transition({
        executionId, from: ['QUEUED'], to: 'BLOCKED', actorType: 'WORKER', actorId: null,
        eventType: 'EXECUTION_BLOCKED', payloadHash: context.plan.payloadHash,
        metadata: { approval }, errorCode: code, errorMessage: 'No valid approval exists for the exact active payload.',
      });
    }
    const effectivePlan: ExecutionPlan = { ...context.plan, approvalStatus: approval };
    const adapter = this.resolveAdapter(effectivePlan.adapterId);
    const validation = adapter.validate(effectivePlan);
    if (validation.length) {
      return this.options.repository.transition({
        executionId, from: ['QUEUED'], to: 'BLOCKED', actorType: 'WORKER', actorId: null,
        eventType: 'EXECUTION_BLOCKED', payloadHash: effectivePlan.payloadHash,
        metadata: { failures: validation }, errorCode: 'PLAN_VALIDATION_FAILED', errorMessage: validation.join('; '),
      });
    }
    await this.options.repository.transition({
      executionId, from: ['QUEUED'], to: 'RUNNING', actorType: 'WORKER', actorId: null,
      eventType: 'EXECUTION_STARTED', payloadHash: effectivePlan.payloadHash, metadata: { adapterId: adapter.id, adapterVersion: adapter.version },
    });
    let succeeded = 0;
    let failed = 0;
    let unknown = 0;
    const definitions = adapter.steps(effectivePlan);
    for (const definition of definitions) {
      const completedStep = context.steps.find((step) => step.planId === effectivePlan.id && step.stepKey === definition.key && step.status === 'SUCCEEDED');
      if (completedStep) { succeeded += 1; continue; }
      const step = await this.options.repository.prepareStep(executionId, effectivePlan.id, definition);
      let result;
      try { result = await adapter.executeStep(effectivePlan, definition); }
      catch (error) {
        result = {
          status: 'FAILED' as const, artifact: null,
          evidence: {
            requestId: null, externalResourceId: null, responseStatus: null, resultingUrl: null, artifactHash: null,
            beforeSnapshotHash: null, afterSnapshotHash: null, timestamp: this.now().toISOString(), adapterVersion: adapter.version,
            executionStatus: 'FAILED' as StepStatus, confirmation: 'The adapter threw before positive execution confirmation.',
          },
          errorCode: 'ADAPTER_ERROR', errorMessage: error instanceof Error ? error.message : String(error),
        };
      }
      await this.options.repository.completeStep({
        stepId: step.id, executionId, status: result.status, artifact: result.artifact, evidence: result.evidence,
        errorCode: result.errorCode, errorMessage: result.errorMessage,
      });
      if (result.status === 'SUCCEEDED') succeeded += 1;
      else if (result.status === 'UNKNOWN') { unknown += 1; break; }
      else { failed += 1; break; }
    }
    let finalStatus: ExecutionStatus;
    if (unknown > 0) finalStatus = 'UNKNOWN';
    else if (succeeded === definitions.length && failed === 0) finalStatus = 'SUCCEEDED';
    else if (succeeded > 0) finalStatus = 'PARTIALLY_SUCCEEDED';
    else finalStatus = 'FAILED';
    const eventType = finalStatus === 'SUCCEEDED' ? 'EXECUTION_SUCCEEDED'
      : finalStatus === 'PARTIALLY_SUCCEEDED' ? 'EXECUTION_PARTIAL' : 'EXECUTION_FAILED';
    return this.options.repository.transition({
      executionId, from: ['RUNNING'], to: finalStatus, actorType: 'WORKER', actorId: null,
      eventType, payloadHash: effectivePlan.payloadHash,
      metadata: { succeededSteps: succeeded, failedSteps: failed, unknownSteps: unknown, totalSteps: definitions.length },
      errorCode: failed ? 'STEP_FAILED' : unknown ? 'EXECUTION_OUTCOME_UNKNOWN' : null,
      errorMessage: failed ? 'One or more execution steps failed.' : unknown ? 'The execution outcome could not be confirmed.' : null,
    });
  }

  private async ownedContext(projectId: string, executionId: string) {
    const context = await this.options.repository.loadContext(executionId);
    if (context.run.projectId !== projectId || context.plan.projectId !== projectId || context.source.projectId !== projectId) {
      throw new ExecutionAuthorizationError('Execution does not belong to this project');
    }
    return context;
  }
}
