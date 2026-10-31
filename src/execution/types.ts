import type { GeneratedIntervention, InterventionRun, InterventionType, ImplementationSurface, RequiredInputType } from '@/src/intervention-generation/types';

export const EXECUTION_ENGINE_VERSION = '1.0.0' as const;
export const EXECUTION_SCHEMA_VERSION = '1.0.0' as const;
export const EXECUTION_PAYLOAD_VERSION = '1.0.0' as const;
export const CONTENT_GENERATION_VERSION = 'deterministic-evidence-draft-1.0.0' as const;

export type ExecutionStatus =
  | 'PLANNED' | 'READY' | 'WAITING_FOR_INPUT' | 'WAITING_FOR_APPROVAL' | 'QUEUED'
  | 'RUNNING' | 'SUCCEEDED' | 'PARTIALLY_SUCCEEDED' | 'FAILED' | 'BLOCKED'
  | 'MANUAL_REQUIRED' | 'CANCELLED' | 'UNKNOWN';

export type ApprovalStatus = 'NO_APPROVAL' | 'REQUIRED_APPROVAL' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RetrySafety = 'SAFE_TO_RETRY' | 'UNSAFE_TO_RETRY' | 'UNKNOWN';
export type StepStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'UNKNOWN';
export type RollbackStatus = 'NOT_SUPPORTED' | 'AVAILABLE' | 'NOT_REQUESTED' | 'SUCCEEDED' | 'FAILED';
export type ExecutionAdapterId =
  | 'WEBSITE_CONTENT_DRAFT'
  | 'WEBSITE_STRUCTURED_DATA_DRAFT'
  | 'PROFILE_UPDATE_DRAFT'
  | 'CONTENT_BRIEF_ARTIFACT'
  | 'MANUAL_EXECUTION_PACKAGE';
export type ExecutionArtifactType = 'CONTENT_DRAFT' | 'STRUCTURED_DATA_DRAFT' | 'PROFILE_UPDATE_DRAFT' | 'CONTENT_BRIEF' | 'MANUAL_PACKAGE';
export type ExecutionActorType = 'USER' | 'SYSTEM' | 'WORKER';
export type ExecutionEventType =
  | 'EXECUTION_CREATED' | 'EXECUTION_READY' | 'APPROVAL_REQUESTED' | 'APPROVED' | 'REJECTED'
  | 'INPUT_REQUESTED' | 'INPUT_SUBMITTED' | 'EXECUTION_QUEUED' | 'EXECUTION_STARTED'
  | 'STEP_STARTED' | 'STEP_SUCCEEDED' | 'STEP_FAILED' | 'EXECUTION_SUCCEEDED'
  | 'EXECUTION_PARTIAL' | 'EXECUTION_FAILED' | 'EXECUTION_BLOCKED' | 'EXECUTION_CANCELLED'
  | 'MANUAL_REQUIRED' | 'PLAN_REPLACED' | 'APPROVAL_EXPIRED' | 'RETRY_QUEUED';

export interface VerifiedExecutionEvidence {
  id: string;
  type: string;
  text: string;
  sourceUrl: string | null;
  sourceTitle: string | null;
  contentHash: string;
}

export interface ExecutionSourceBundle {
  projectId: string;
  interventionRecordId: string;
  intervention: GeneratedIntervention;
  interventionRun: InterventionRun;
  verifiedEvidence: VerifiedExecutionEvidence[];
}

export interface ExecutionInputValue {
  inputKey: string;
  inputType: RequiredInputType;
  value: string;
  valueHash: string;
  submittedBy: string;
  submittedAt: string;
}

export interface ExecutionRequiredInput {
  inputKey: string;
  inputType: RequiredInputType;
  description: string;
  required: boolean;
  satisfied: boolean;
}

export interface ExecutionPrerequisite {
  code: string;
  description: string;
  satisfied: boolean;
}

export interface ExecutionRollback {
  supported: boolean;
  automatic: boolean;
  description: string;
  payload: Record<string, unknown> | null;
  payloadHash: string | null;
}

export interface ExecutionPayload {
  kind: ExecutionArtifactType;
  interventionId: string;
  interventionRecordId: string;
  action: string;
  objective: string;
  targetSurface: ImplementationSurface;
  affectedQuestions: Array<{ id: string; exactQuestion: string }>;
  evidence: VerifiedExecutionEvidence[];
  requiredInputs: Array<{ inputKey: string; inputType: RequiredInputType; value: string }>;
  prohibitedClaims: string[];
  acceptanceCriteria: string[];
  contentBrief: GeneratedIntervention['contentBrief'];
  structuredData: GeneratedIntervention['structuredData'];
  manualSteps: string[];
  verificationSteps: string[];
}

export interface ExecutionPlan {
  id: string;
  executionId: string;
  projectId: string;
  planVersion: number;
  interventionRecordId: string;
  interventionId: string;
  diagnosisId: string;
  affectedQuestions: Array<{ id: string; exactQuestion: string }>;
  interventionType: InterventionType;
  targetSurface: ImplementationSurface;
  adapterId: ExecutionAdapterId;
  adapterVersion: string;
  requiredPermissions: string[];
  requiredInputs: ExecutionRequiredInput[];
  payload: ExecutionPayload;
  payloadHash: string;
  prerequisites: ExecutionPrerequisite[];
  approvalStatus: ApprovalStatus;
  acceptanceCriteria: string[];
  risk: RiskLevel;
  retrySafety: RetrySafety;
  rollback: ExecutionRollback;
  engineVersion: string;
  schemaVersion: string;
  payloadVersion: string;
  contentGenerationVersion: string | null;
  upstreamVersions: {
    businessUnderstandingVersion: string;
    businessUnderstandingHash: string;
    buyerQuestionSetVersion: string;
    buyerQuestionSetHash: string;
    observationVersion: string;
    observationHash: string;
    diagnosisVersion: string;
    diagnosisHash: string;
    interventionEngineVersion: string;
    interventionSchemaVersion: string;
    interventionResultHash: string;
  };
  createdAt: string;
}

export interface ExecutionApproval {
  id: string;
  projectId: string;
  executionId: string;
  planId: string;
  requestedAction: string;
  requestedScope: string;
  requestedAt: string;
  approverId: string | null;
  approvedAt: string | null;
  expiresAt: string | null;
  status: ApprovalStatus;
  artifactVersion: number;
  payloadHash: string;
}

export interface ExecutionArtifact {
  id?: string;
  artifactType: ExecutionArtifactType;
  mediaType: 'application/json' | 'text/markdown';
  content: Record<string, unknown>;
  contentHash: string;
  isDraft: true;
}

export interface ExecutionEvidence {
  requestId: string | null;
  externalResourceId: string | null;
  responseStatus: number | null;
  resultingUrl: string | null;
  artifactHash: string | null;
  beforeSnapshotHash: string | null;
  afterSnapshotHash: string | null;
  timestamp: string;
  adapterVersion: string;
  executionStatus: StepStatus;
  confirmation: string;
}

export interface ExecutionStep {
  id: string;
  executionId: string;
  planId: string;
  stepKey: string;
  sequence: number;
  name: string;
  status: StepStatus;
  retrySafety: RetrySafety;
  attemptCount: number;
  maxAttempts: number;
  rollbackStatus: RollbackStatus;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  artifact?: ExecutionArtifact | null;
  evidence?: ExecutionEvidence | null;
}

export interface ExecutionEvent {
  id: string;
  projectId: string;
  executionId: string;
  stepId: string | null;
  actorType: ExecutionActorType;
  actorId: string | null;
  eventType: ExecutionEventType;
  payloadHash: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ExecutionRun {
  id: string;
  projectId: string;
  interventionRecordId: string;
  interventionRunId: string;
  diagnosisRunId: string;
  observationRunId: string;
  buyerQuestionSetId: string;
  businessUnderstandingRunId: string;
  activePlanId: string;
  status: ExecutionStatus;
  idempotencyKey: string;
  executionKey: string;
  retryOfExecutionId: string | null;
  attemptNumber: number;
  providerCallCount: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  externalCostUsd: number;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  activePlan?: ExecutionPlan;
  steps?: ExecutionStep[];
  approvals?: ExecutionApproval[];
  events?: ExecutionEvent[];
}

export interface AdapterStepDefinition {
  key: string;
  name: string;
  sequence: number;
  retrySafety: RetrySafety;
  maxAttempts: number;
}

export interface AdapterStepResult {
  status: 'SUCCEEDED' | 'FAILED' | 'UNKNOWN';
  artifact: ExecutionArtifact | null;
  evidence: ExecutionEvidence;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface ExecutionAdapter {
  readonly id: ExecutionAdapterId;
  readonly version: string;
  readonly supportedInterventionTypes: readonly InterventionType[];
  readonly supportedSurfaces: readonly ImplementationSurface[];
  readonly requiredPermissions: readonly string[];
  readonly requiredInputTypes: readonly RequiredInputType[];
  readonly idempotencyStrategy: 'PROJECT_INTERVENTION_PAYLOAD_ADAPTER';
  readonly timeoutMs: number;
  readonly retrySafety: RetrySafety;
  readonly supportsCancellation: boolean;
  readonly supportsRollback: boolean;
  validate(plan: ExecutionPlan): string[];
  steps(plan: ExecutionPlan): AdapterStepDefinition[];
  executeStep(plan: ExecutionPlan, step: AdapterStepDefinition): Promise<AdapterStepResult>;
  cancel?(plan: ExecutionPlan): Promise<AdapterStepResult>;
  rollback?(plan: ExecutionPlan): Promise<AdapterStepResult>;
}

export interface ExecutionContext {
  run: ExecutionRun;
  plan: ExecutionPlan;
  source: ExecutionSourceBundle;
  inputs: ExecutionInputValue[];
  approvals: ExecutionApproval[];
  steps: ExecutionStep[];
}

export type CreateExecutionResult = { kind: 'CREATED' | 'EXISTING'; run: ExecutionRun };

export interface ExecutionRepository {
  loadSourceBundle(projectId: string, interventionRecordId: string): Promise<ExecutionSourceBundle | null>;
  createExecution(input: { source: ExecutionSourceBundle; plan: ExecutionPlan; idempotencyKey: string; initialStatus: ExecutionStatus; actorId: string; retryOfExecutionId?: string | null; attemptNumber?: number }): Promise<CreateExecutionResult>;
  getRun(projectId: string, executionId: string, includeDetails?: boolean): Promise<ExecutionRun | null>;
  listRuns(projectId: string, limit: number, offset: number): Promise<ExecutionRun[]>;
  loadContext(executionId: string): Promise<ExecutionContext>;
  replacePlan(input: { executionId: string; previousPlanId: string; plan: ExecutionPlan; status: ExecutionStatus; actorId: string }): Promise<ExecutionRun>;
  storeInput(input: { executionId: string; planId: string; projectId: string; inputKey: string; inputType: RequiredInputType; value: string; valueHash: string; actorId: string }): Promise<void>;
  recordApproval(input: { executionId: string; plan: ExecutionPlan; approverId: string; decision: 'APPROVED' | 'REJECTED'; expiresAt: string | null }): Promise<ExecutionRun>;
  transition(input: { executionId: string; from: ExecutionStatus[]; to: ExecutionStatus; actorType: ExecutionActorType; actorId: string | null; eventType: ExecutionEventType; payloadHash: string | null; metadata?: Record<string, unknown>; errorCode?: string | null; errorMessage?: string | null }): Promise<ExecutionRun>;
  enqueue(executionId: string, projectId: string): Promise<void>;
  prepareStep(executionId: string, planId: string, step: AdapterStepDefinition): Promise<ExecutionStep>;
  completeStep(input: { stepId: string; executionId: string; status: StepStatus; artifact: ExecutionArtifact | null; evidence: ExecutionEvidence; errorCode: string | null; errorMessage: string | null }): Promise<void>;
}
