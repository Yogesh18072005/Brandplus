import type { InterventionType, ImplementationSurface } from '@/src/intervention-generation/types';
import { executionHash, looksLikeSecret } from './hash';
import {
  CONTENT_GENERATION_VERSION,
  EXECUTION_ENGINE_VERSION,
  EXECUTION_PAYLOAD_VERSION,
  EXECUTION_SCHEMA_VERSION,
  type ApprovalStatus,
  type ExecutionAdapterId,
  type ExecutionInputValue,
  type ExecutionPlan,
  type ExecutionSourceBundle,
  type ExecutionStatus,
  type RiskLevel,
} from './types';

export interface SupportedExecutionOptions {
  artifact?: 'AUTO' | 'CONTENT_DRAFT' | 'CONTENT_BRIEF' | 'MANUAL_PACKAGE';
}

const WEBSITE_SURFACES: readonly ImplementationSurface[] = [
  'WEBSITE_PAGE', 'WEBSITE_SECTION', 'PRODUCT_PAGE', 'SERVICE_PAGE', 'INDUSTRY_PAGE',
  'USE_CASE_PAGE', 'CASE_STUDY', 'TECHNICAL_DOCUMENT', 'CERTIFICATION_PAGE', 'ABOUT_PAGE',
  'CONTACT_PAGE', 'CONTENT_LIBRARY',
];
const PROFILE_SURFACES: readonly ImplementationSurface[] = ['THIRD_PARTY_PROFILE', 'DIRECTORY_PROFILE', 'BUSINESS_PROFILE'];

const TERMINAL: readonly ExecutionStatus[] = ['SUCCEEDED', 'PARTIALLY_SUCCEEDED', 'FAILED', 'BLOCKED', 'MANUAL_REQUIRED', 'CANCELLED'];
const TRANSITIONS: Readonly<Record<ExecutionStatus, readonly ExecutionStatus[]>> = {
  PLANNED: ['READY', 'WAITING_FOR_INPUT', 'WAITING_FOR_APPROVAL', 'BLOCKED', 'MANUAL_REQUIRED', 'CANCELLED'],
  READY: ['QUEUED', 'WAITING_FOR_INPUT', 'WAITING_FOR_APPROVAL', 'BLOCKED', 'MANUAL_REQUIRED', 'CANCELLED'],
  WAITING_FOR_INPUT: ['READY', 'WAITING_FOR_APPROVAL', 'MANUAL_REQUIRED', 'BLOCKED', 'CANCELLED'],
  WAITING_FOR_APPROVAL: ['QUEUED', 'READY', 'BLOCKED', 'CANCELLED'],
  QUEUED: ['RUNNING', 'CANCELLED', 'BLOCKED'],
  RUNNING: ['SUCCEEDED', 'PARTIALLY_SUCCEEDED', 'FAILED', 'BLOCKED', 'CANCELLED', 'UNKNOWN'],
  SUCCEEDED: [], PARTIALLY_SUCCEEDED: [], FAILED: [], BLOCKED: [], MANUAL_REQUIRED: [], CANCELLED: [], UNKNOWN: ['FAILED', 'SUCCEEDED', 'PARTIALLY_SUCCEEDED', 'BLOCKED'],
};

export function isTerminalExecutionStatus(status: ExecutionStatus): boolean {
  return TERMINAL.includes(status);
}

export function canTransitionExecution(from: ExecutionStatus, to: ExecutionStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertExecutionTransition(from: ExecutionStatus, to: ExecutionStatus): void {
  if (!canTransitionExecution(from, to)) throw new Error(`Invalid execution transition: ${from} -> ${to}`);
}

export function selectExecutionAdapter(
  interventionType: InterventionType,
  surface: ImplementationSurface,
  hasContentBrief: boolean,
  hasStructuredData: boolean,
  options: SupportedExecutionOptions = {},
): ExecutionAdapterId {
  if (options.artifact === 'MANUAL_PACKAGE') return 'MANUAL_EXECUTION_PACKAGE';
  if (interventionType === 'STRUCTURED_DATA' && surface === 'STRUCTURED_DATA' && hasStructuredData) return 'WEBSITE_STRUCTURED_DATA_DRAFT';
  if (interventionType === 'PROFILE_COMPLETENESS' || PROFILE_SURFACES.includes(surface)) return 'PROFILE_UPDATE_DRAFT';
  if (interventionType === 'CONTENT_BRIEF' && hasContentBrief) {
    return options.artifact === 'CONTENT_DRAFT' ? 'WEBSITE_CONTENT_DRAFT' : 'CONTENT_BRIEF_ARTIFACT';
  }
  if (hasContentBrief && WEBSITE_SURFACES.includes(surface)) return 'WEBSITE_CONTENT_DRAFT';
  return 'MANUAL_EXECUTION_PACKAGE';
}

function artifactKind(adapterId: ExecutionAdapterId) {
  switch (adapterId) {
    case 'WEBSITE_CONTENT_DRAFT': return 'CONTENT_DRAFT' as const;
    case 'WEBSITE_STRUCTURED_DATA_DRAFT': return 'STRUCTURED_DATA_DRAFT' as const;
    case 'PROFILE_UPDATE_DRAFT': return 'PROFILE_UPDATE_DRAFT' as const;
    case 'CONTENT_BRIEF_ARTIFACT': return 'CONTENT_BRIEF' as const;
    default: return 'MANUAL_PACKAGE' as const;
  }
}

function approvalAndRisk(adapterId: ExecutionAdapterId, surface: ImplementationSurface): { approval: ApprovalStatus; risk: RiskLevel } {
  if (adapterId === 'PROFILE_UPDATE_DRAFT') return { approval: 'REQUIRED_APPROVAL', risk: 'MEDIUM' };
  if (adapterId === 'MANUAL_EXECUTION_PACKAGE' && PROFILE_SURFACES.includes(surface)) return { approval: 'REQUIRED_APPROVAL', risk: 'MEDIUM' };
  return { approval: 'NO_APPROVAL', risk: 'LOW' };
}

function adapterVersion(adapterId: ExecutionAdapterId): string {
  return `${adapterId.toLowerCase().replaceAll('_', '-')}-1.0.0`;
}

export function validateExecutionOptions(options: unknown): SupportedExecutionOptions {
  if (options === undefined) return {};
  if (!options || typeof options !== 'object' || Array.isArray(options)) throw new Error('Execution options must be an object');
  const keys = Object.keys(options as Record<string, unknown>);
  if (keys.some((key) => key !== 'artifact')) throw new Error('Unsupported execution option');
  const artifact = (options as { artifact?: unknown }).artifact;
  if (artifact === undefined) return {};
  if (!['AUTO', 'CONTENT_DRAFT', 'CONTENT_BRIEF', 'MANUAL_PACKAGE'].includes(String(artifact))) {
    throw new Error('Unsupported execution artifact option');
  }
  return { artifact: artifact as SupportedExecutionOptions['artifact'] };
}

export function validateExecutionInput(key: string, value: string): string {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/.test(key)) throw new Error('Invalid execution input key');
  if (!normalized || normalized.length > 4_000) throw new Error('Execution input must contain 1 to 4000 characters');
  if (looksLikeSecret(key, normalized)) throw new Error('Credentials and secrets cannot be submitted as execution input');
  return normalized;
}

export function buildExecutionPlan(input: {
  source: ExecutionSourceBundle;
  inputs?: ExecutionInputValue[];
  options?: SupportedExecutionOptions;
  planVersion?: number;
  executionId?: string;
  planId?: string;
  now?: string;
}): ExecutionPlan {
  const { source } = input;
  const intervention = source.intervention;
  if (!['COMPLETED', 'PARTIAL_SUCCESS'].includes(source.interventionRun.status)) throw new Error('A finalized Engine 05 run is required');
  if (!['READY_FOR_EXECUTION', 'NEEDS_INPUT'].includes(intervention.status)) throw new Error('A finalized executable Engine 05 intervention is required');
  if (source.interventionRun.projectId !== source.projectId || intervention.id.length === 0) throw new Error('Engine 05 intervention ownership is invalid');
  const options = validateExecutionOptions(input.options);
  const adapterId = selectExecutionAdapter(
    intervention.interventionType,
    intervention.implementationSurface,
    Boolean(intervention.contentBrief),
    Boolean(intervention.structuredData),
    options,
  );
  if (options.artifact === 'CONTENT_DRAFT' && !intervention.contentBrief) throw new Error('Content generation was not authorized by Engine 05');
  if (options.artifact === 'CONTENT_BRIEF' && !intervention.contentBrief) throw new Error('No Engine 05 content brief is available');
  const submitted = new Map((input.inputs ?? []).map((item) => [item.inputKey, item]));
  const requiredInputs = intervention.requiredBusinessInputs.map((item) => ({
    inputKey: item.id,
    inputType: item.type,
    description: item.description,
    required: item.status !== 'AVAILABLE',
    satisfied: item.status === 'AVAILABLE' || submitted.has(item.id),
  }));
  for (const property of intervention.structuredData?.inputRequiredProperties ?? []) {
    const inputKey = 'structured:' + property.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!requiredInputs.some((item) => item.inputKey === inputKey)) {
      requiredInputs.push({
        inputKey,
        inputType: 'BUSINESS_FACT',
        description: 'Verified value required for structured-data property: ' + property,
        required: true,
        satisfied: submitted.has(inputKey),
      });
    }
  }
  const evidenceIds = new Set(intervention.evidenceToPreserve.map((item) => item.evidenceId).filter(Boolean));
  const evidence = source.verifiedEvidence.filter((item) => evidenceIds.has(item.id));
  if (evidence.length !== evidenceIds.size) throw new Error('Engine 06 could not resolve all verified evidence within this project');
  const resolvedEvidenceIds = new Set(evidence.map((item) => item.id));
  if (intervention.contentBrief?.verifiedFactEvidenceIds.some((id) => !resolvedEvidenceIds.has(id))) {
    throw new Error('Engine 05 content brief references evidence that is not authorized for this intervention');
  }
  const { approval, risk } = approvalAndRisk(adapterId, intervention.implementationSurface);
  const acceptanceCriteria = intervention.acceptanceCriteria.map((item) => item.criterion);
  const payload = {
    kind: artifactKind(adapterId),
    interventionId: intervention.id,
    interventionRecordId: source.interventionRecordId,
    action: intervention.expectedDeliverable,
    objective: intervention.objective,
    targetSurface: intervention.implementationSurface,
    affectedQuestions: intervention.affectedQuestions.map((item) => ({ ...item })),
    evidence,
    requiredInputs: requiredInputs.filter((item) => item.satisfied && submitted.has(item.inputKey)).map((item) => ({
      inputKey: item.inputKey,
      inputType: item.inputType,
      value: submitted.get(item.inputKey)!.value,
    })),
    prohibitedClaims: intervention.contentBrief?.prohibitedUnsupportedClaims ?? [],
    acceptanceCriteria,
    contentBrief: intervention.contentBrief,
    structuredData: intervention.structuredData,
    manualSteps: [
      requiredInputs.length > 0
        ? `Review the verified evidence and required inputs for ${intervention.title}.`
        : `Review the verified evidence for ${intervention.title}.`,
      `Apply only the approved change to ${intervention.implementationSurface}.`,
      'Capture the resulting resource URL or change record.',
      'Verify every acceptance criterion without claiming a visibility outcome.',
    ],
    verificationSteps: acceptanceCriteria.length ? acceptanceCriteria : ['Confirm the exact approved change exists on the target surface.'],
  };
  const payloadHash = executionHash(payload);
  return {
    id: input.planId ?? '', executionId: input.executionId ?? '', projectId: source.projectId,
    planVersion: input.planVersion ?? 1,
    interventionRecordId: source.interventionRecordId, interventionId: intervention.id,
    diagnosisId: intervention.diagnosisId, affectedQuestions: intervention.affectedQuestions.map((item) => ({ ...item })),
    interventionType: intervention.interventionType, targetSurface: intervention.implementationSurface,
    adapterId, adapterVersion: adapterVersion(adapterId),
    requiredPermissions: adapterId === 'MANUAL_EXECUTION_PACKAGE' ? ['CUSTOMER_OWNED_SURFACE_ACCESS'] : [],
    requiredInputs, payload, payloadHash,
    prerequisites: [
      { code: 'ENGINE_05_FINALIZED', description: 'Engine 05 intervention is finalized', satisfied: true },
      { code: 'INPUTS_AVAILABLE', description: 'All required business inputs are available', satisfied: requiredInputs.every((item) => item.satisfied) },
      { code: 'ALLOWLISTED_ADAPTER', description: 'Adapter is registered in the Engine 06 allowlist', satisfied: true },
    ],
    approvalStatus: approval, acceptanceCriteria, risk,
    retrySafety: 'SAFE_TO_RETRY',
    rollback: { supported: false, automatic: false, description: 'Internal immutable draft artifacts require no rollback; create a new version instead.', payload: null, payloadHash: null },
    engineVersion: EXECUTION_ENGINE_VERSION, schemaVersion: EXECUTION_SCHEMA_VERSION,
    payloadVersion: EXECUTION_PAYLOAD_VERSION,
    contentGenerationVersion: adapterId === 'WEBSITE_CONTENT_DRAFT' ? CONTENT_GENERATION_VERSION : null,
    upstreamVersions: {
      businessUnderstandingVersion: source.interventionRun.businessUnderstandingVersion,
      businessUnderstandingHash: source.interventionRun.businessUnderstandingHash,
      buyerQuestionSetVersion: source.interventionRun.buyerQuestionSetVersion,
      buyerQuestionSetHash: source.interventionRun.buyerQuestionSetHash,
      observationVersion: source.interventionRun.observationVersion,
      observationHash: source.interventionRun.observationHash,
      diagnosisVersion: source.interventionRun.diagnosisVersion,
      diagnosisHash: source.interventionRun.diagnosisHash,
      interventionEngineVersion: source.interventionRun.engineVersion,
      interventionSchemaVersion: source.interventionRun.schemaVersion,
      interventionResultHash: source.interventionRun.resultHash ?? executionHash(intervention),
    },
    createdAt: input.now ?? new Date().toISOString(),
  };
}

export function initialExecutionStatus(plan: ExecutionPlan): ExecutionStatus {
  if (plan.risk === 'CRITICAL') return 'BLOCKED';
  if (plan.requiredInputs.some((item) => item.required && !item.satisfied)) return 'WAITING_FOR_INPUT';
  if (plan.approvalStatus === 'REQUIRED_APPROVAL') return 'WAITING_FOR_APPROVAL';
  if (plan.adapterId === 'MANUAL_EXECUTION_PACKAGE') return 'MANUAL_REQUIRED';
  return 'QUEUED';
}
