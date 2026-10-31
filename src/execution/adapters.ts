import type { InterventionType, ImplementationSurface } from '@/src/intervention-generation/types';
import { executionHash, executionRequestId } from './hash';
import type {
  AdapterStepDefinition,
  AdapterStepResult,
  ExecutionAdapter,
  ExecutionAdapterId,
  ExecutionArtifact,
  ExecutionEvidence,
  ExecutionPlan,
} from './types';

const ALL_TYPES: readonly InterventionType[] = [
  'ENTITY_CLARIFICATION', 'PRODUCT_EVIDENCE', 'SERVICE_EVIDENCE', 'INDUSTRY_EVIDENCE',
  'USE_CASE_EVIDENCE', 'BUYER_EVIDENCE', 'TECHNICAL_EVIDENCE', 'COMPLIANCE_EVIDENCE',
  'CERTIFICATION_EVIDENCE', 'GEOGRAPHIC_EVIDENCE', 'PROOF_EVIDENCE', 'CASE_STUDY',
  'CUSTOMER_PROOF', 'SOURCE_COVERAGE', 'THIRD_PARTY_EVIDENCE', 'CONTENT_BRIEF',
  'INFORMATION_ARCHITECTURE', 'STRUCTURED_DATA', 'PROFILE_COMPLETENESS', 'DOCUMENTATION', 'OTHER',
];
const ALL_SURFACES: readonly ImplementationSurface[] = [
  'WEBSITE_PAGE', 'WEBSITE_SECTION', 'PRODUCT_PAGE', 'SERVICE_PAGE', 'INDUSTRY_PAGE',
  'USE_CASE_PAGE', 'CASE_STUDY', 'TECHNICAL_DOCUMENT', 'CERTIFICATION_PAGE', 'ABOUT_PAGE',
  'CONTACT_PAGE', 'THIRD_PARTY_PROFILE', 'DIRECTORY_PROFILE', 'BUSINESS_PROFILE',
  'STRUCTURED_DATA', 'CONTENT_LIBRARY', 'OTHER',
];
const WEBSITE_SURFACES: readonly ImplementationSurface[] = ALL_SURFACES.filter((surface) =>
  !['THIRD_PARTY_PROFILE', 'DIRECTORY_PROFILE', 'BUSINESS_PROFILE', 'STRUCTURED_DATA', 'OTHER'].includes(surface));

function artifact(type: ExecutionArtifact['artifactType'], content: Record<string, unknown>): ExecutionArtifact {
  return { artifactType: type, mediaType: 'application/json', content, contentHash: executionHash(content), isDraft: true };
}

function evidence(plan: ExecutionPlan, status: ExecutionEvidence['executionStatus'], artifactHash: string | null, confirmation: string): ExecutionEvidence {
  return {
    requestId: executionRequestId(), externalResourceId: null, responseStatus: null, resultingUrl: null,
    artifactHash, beforeSnapshotHash: null, afterSnapshotHash: artifactHash,
    timestamp: new Date().toISOString(), adapterVersion: plan.adapterVersion,
    executionStatus: status, confirmation,
  };
}

function ok(plan: ExecutionPlan, output: ExecutionArtifact, confirmation: string): AdapterStepResult {
  return { status: 'SUCCEEDED', artifact: output, evidence: evidence(plan, 'SUCCEEDED', output.contentHash, confirmation), errorCode: null, errorMessage: null };
}

function fail(plan: ExecutionPlan, code: string, message: string): AdapterStepResult {
  return { status: 'FAILED', artifact: null, evidence: evidence(plan, 'FAILED', null, message), errorCode: code, errorMessage: message };
}

function baseValidation(plan: ExecutionPlan, adapter: ExecutionAdapter): string[] {
  const failures: string[] = [];
  if (plan.adapterId !== adapter.id || plan.adapterVersion !== adapter.version) failures.push('Plan adapter identity does not match the selected adapter');
  if (!adapter.supportedInterventionTypes.includes(plan.interventionType)) failures.push('Intervention type is not supported by this adapter');
  if (!adapter.supportedSurfaces.includes(plan.targetSurface)) failures.push('Implementation surface is not supported by this adapter');
  if (executionHash(plan.payload) !== plan.payloadHash) failures.push('Execution payload hash does not match the immutable payload');
  if (plan.requiredInputs.some((item) => item.required && !item.satisfied)) failures.push('Required inputs are missing');
  if (plan.risk === 'CRITICAL') failures.push('Critical execution is blocked by policy');
  return failures;
}

export function validateEvidenceBoundClaims(plan: ExecutionPlan, claims: readonly string[]): string[] {
  const evidence = new Set(plan.payload.evidence.map((item) => item.text.trim()));
  const inputs = new Set(plan.payload.requiredInputs.map((item) => item.value.trim()));
  const authorized = new Set([...evidence, ...inputs]);
  const prohibited = plan.payload.prohibitedClaims.map((item) => item.toLowerCase());
  const failures: string[] = [];
  for (const claim of claims) {
    const normalized = claim.trim();
    if (!authorized.has(normalized)) failures.push(`Unsupported claim: ${normalized.slice(0, 120)}`);
    if (prohibited.some((item) => item && normalized.toLowerCase().includes(item))) failures.push(`Prohibited claim: ${normalized.slice(0, 120)}`);
  }
  return failures;
}

class WebsiteContentDraftAdapter implements ExecutionAdapter {
  readonly id = 'WEBSITE_CONTENT_DRAFT' as const;
  readonly version = 'website-content-draft-1.0.0';
  readonly supportedInterventionTypes = ALL_TYPES.filter((item) => item !== 'STRUCTURED_DATA' && item !== 'PROFILE_COMPLETENESS');
  readonly supportedSurfaces = WEBSITE_SURFACES;
  readonly requiredPermissions: readonly string[] = [];
  readonly requiredInputTypes: readonly [] = [];
  readonly idempotencyStrategy = 'PROJECT_INTERVENTION_PAYLOAD_ADAPTER' as const;
  readonly timeoutMs = 10_000;
  readonly retrySafety = 'SAFE_TO_RETRY' as const;
  readonly supportsCancellation = false;
  readonly supportsRollback = false;
  validate(plan: ExecutionPlan): string[] {
    const failures = baseValidation(plan, this);
    if (!plan.payload.contentBrief) failures.push('Engine 05 did not authorize content generation with a content brief');
    if (!plan.payload.evidence.length && !plan.payload.requiredInputs.length) failures.push('No verified facts are available for the draft');
    return failures;
  }
  steps(): AdapterStepDefinition[] {
    return [
      { key: 'BUILD_EVIDENCE_DRAFT', name: 'Build evidence-bound content draft', sequence: 1, retrySafety: 'SAFE_TO_RETRY', maxAttempts: 3 },
      { key: 'VALIDATE_EVIDENCE_DRAFT', name: 'Validate content claims and acceptance criteria', sequence: 2, retrySafety: 'SAFE_TO_RETRY', maxAttempts: 3 },
    ];
  }
  async executeStep(plan: ExecutionPlan, step: AdapterStepDefinition): Promise<AdapterStepResult> {
    const validation = this.validate(plan);
    if (validation.length) return fail(plan, 'VALIDATION_FAILED', validation.join('; '));
    const facts = [...plan.payload.evidence.map((item) => item.text), ...plan.payload.requiredInputs.map((item) => item.value)];
    const claimFailures = validateEvidenceBoundClaims(plan, facts);
    if (claimFailures.length) return fail(plan, 'UNSUPPORTED_CLAIM', claimFailures.join('; '));
    const draft = artifact('CONTENT_DRAFT', {
      status: 'DRAFT_ONLY', title: plan.payload.action, objective: plan.payload.objective,
      targetSurface: plan.targetSurface, sections: plan.payload.contentBrief!.requiredSections,
      verifiedFacts: facts.map((text, index) => ({ id: `fact-${index + 1}`, text, status: 'VERIFIED_SOURCE_DATA' })),
      factsStillRequired: plan.payload.contentBrief!.requiredFactsToClarify,
      prohibitedClaims: plan.payload.prohibitedClaims,
      evidenceReferences: plan.payload.evidence.map((item) => ({ id: item.id, contentHash: item.contentHash, sourceUrl: item.sourceUrl })),
      acceptanceCriteria: plan.acceptanceCriteria,
      publicationAuthorized: false,
    });
    return ok(plan, draft, step.key === 'BUILD_EVIDENCE_DRAFT'
      ? 'An internal evidence-bound draft artifact was created; nothing was published.'
      : 'The deterministic draft validation completed; no visibility outcome was measured.');
  }
}

class StructuredDataDraftAdapter implements ExecutionAdapter {
  readonly id = 'WEBSITE_STRUCTURED_DATA_DRAFT' as const;
  readonly version = 'website-structured-data-draft-1.0.0';
  readonly supportedInterventionTypes = ['STRUCTURED_DATA'] as const;
  readonly supportedSurfaces = ['STRUCTURED_DATA'] as const;
  readonly requiredPermissions: readonly string[] = [];
  readonly requiredInputTypes: readonly [] = [];
  readonly idempotencyStrategy = 'PROJECT_INTERVENTION_PAYLOAD_ADAPTER' as const;
  readonly timeoutMs = 10_000;
  readonly retrySafety = 'SAFE_TO_RETRY' as const;
  readonly supportsCancellation = false;
  readonly supportsRollback = false;
  validate(plan: ExecutionPlan): string[] {
    const failures = baseValidation(plan, this);
    const structured = plan.payload.structuredData;
    if (!structured) failures.push('Engine 05 structured-data requirements are missing');
    if (structured?.supportedProperties.length && !plan.payload.evidence.length && !plan.payload.requiredInputs.length) {
      failures.push('Structured-data properties have no verified evidence or approved input');
    }
    if (structured && structured.supportedProperties.some((property) => !property.trim())) failures.push('Structured-data property names cannot be empty');
    if (structured && structured.supportedProperties.some((property) => structured.inputRequiredProperties.includes(property))) {
      failures.push('A property cannot be both supported and input-required');
    }
    return failures;
  }
  steps(): AdapterStepDefinition[] {
    return [
      { key: 'BUILD_STRUCTURED_DATA_DIFF', name: 'Build supported structured-data draft', sequence: 1, retrySafety: 'SAFE_TO_RETRY', maxAttempts: 3 },
      { key: 'VALIDATE_STRUCTURED_DATA_DIFF', name: 'Validate structured-data evidence bindings', sequence: 2, retrySafety: 'SAFE_TO_RETRY', maxAttempts: 3 },
    ];
  }
  async executeStep(plan: ExecutionPlan, step: AdapterStepDefinition): Promise<AdapterStepResult> {
    const failures = this.validate(plan);
    if (failures.length) return fail(plan, 'STRUCTURED_DATA_INVALID', failures.join('; '));
    const structured = plan.payload.structuredData!;
    const output = artifact('STRUCTURED_DATA_DRAFT', {
      status: 'DRAFT_ONLY', schemaType: structured.schemaType, representedEntity: structured.representedEntity,
      targetSurfaces: structured.proposedSurfaces,
      properties: structured.supportedProperties.map((property) => ({
        property, status: 'SUPPORTED_BY_ENGINE_05',
        evidenceIds: plan.payload.evidence.map((item) => item.id),
      })),
      evidenceIds: plan.payload.evidence.map((item) => item.id),
      inputRequiredProperties: structured.inputRequiredProperties,
      acceptanceCriteria: structured.acceptanceCriteria,
      deploymentAuthorized: false,
    });
    return ok(plan, output, step.key === 'BUILD_STRUCTURED_DATA_DIFF'
      ? 'A structured-data draft/diff was created; it was not deployed.'
      : 'The structured-data draft uses only Engine 05-supported properties; it was not deployed.');
  }
}

class ProfileUpdateDraftAdapter implements ExecutionAdapter {
  readonly id = 'PROFILE_UPDATE_DRAFT' as const;
  readonly version = 'profile-update-draft-1.0.0';
  readonly supportedInterventionTypes = ALL_TYPES;
  readonly supportedSurfaces = ['THIRD_PARTY_PROFILE', 'DIRECTORY_PROFILE', 'BUSINESS_PROFILE'] as const;
  readonly requiredPermissions: readonly string[] = [];
  readonly requiredInputTypes: readonly [] = [];
  readonly idempotencyStrategy = 'PROJECT_INTERVENTION_PAYLOAD_ADAPTER' as const;
  readonly timeoutMs = 10_000;
  readonly retrySafety = 'SAFE_TO_RETRY' as const;
  readonly supportsCancellation = false;
  readonly supportsRollback = false;
  validate(plan: ExecutionPlan): string[] {
    const failures = baseValidation(plan, this);
    if (plan.approvalStatus !== 'APPROVED') failures.push('Exact profile draft payload is not approved');
    return failures;
  }
  steps(): AdapterStepDefinition[] {
    return [{ key: 'BUILD_PROFILE_UPDATE_DRAFT', name: 'Build approved profile update payload', sequence: 1, retrySafety: 'SAFE_TO_RETRY', maxAttempts: 3 }];
  }
  async executeStep(plan: ExecutionPlan): Promise<AdapterStepResult> {
    const failures = this.validate(plan);
    if (failures.length) return fail(plan, 'APPROVAL_OR_VALIDATION_FAILED', failures.join('; '));
    const output = artifact('PROFILE_UPDATE_DRAFT', {
      status: 'DRAFT_ONLY', targetSurface: plan.targetSurface, requestedChange: plan.payload.action,
      fields: plan.payload.requiredInputs.map((item) => ({ field: item.inputKey, value: item.value, source: 'APPROVED_INPUT' })),
      evidenceReferences: plan.payload.evidence.map((item) => ({ id: item.id, contentHash: item.contentHash })),
      approvedPayloadHash: plan.payloadHash, publicationAuthorized: false,
    });
    return ok(plan, output, 'An approved internal profile update draft was created; no external profile was modified.');
  }
}

class ContentBriefArtifactAdapter implements ExecutionAdapter {
  readonly id = 'CONTENT_BRIEF_ARTIFACT' as const;
  readonly version = 'content-brief-artifact-1.0.0';
  readonly supportedInterventionTypes = ['CONTENT_BRIEF'] as const;
  readonly supportedSurfaces = WEBSITE_SURFACES;
  readonly requiredPermissions: readonly string[] = [];
  readonly requiredInputTypes: readonly [] = [];
  readonly idempotencyStrategy = 'PROJECT_INTERVENTION_PAYLOAD_ADAPTER' as const;
  readonly timeoutMs = 10_000;
  readonly retrySafety = 'SAFE_TO_RETRY' as const;
  readonly supportsCancellation = false;
  readonly supportsRollback = false;
  validate(plan: ExecutionPlan): string[] {
    const failures = baseValidation(plan, this);
    if (!plan.payload.contentBrief) failures.push('Engine 05 content brief is missing');
    return failures;
  }
  steps(): AdapterStepDefinition[] {
    return [{ key: 'CREATE_CONTENT_BRIEF_ARTIFACT', name: 'Create execution-ready content brief artifact', sequence: 1, retrySafety: 'SAFE_TO_RETRY', maxAttempts: 3 }];
  }
  async executeStep(plan: ExecutionPlan): Promise<AdapterStepResult> {
    const failures = this.validate(plan);
    if (failures.length) return fail(plan, 'CONTENT_BRIEF_INVALID', failures.join('; '));
    const output = artifact('CONTENT_BRIEF', {
      status: 'EXECUTION_READY_INTERNAL_ARTIFACT', ...plan.payload.contentBrief,
      targetSurface: plan.targetSurface,
      affectedQuestions: plan.affectedQuestions,
      verifiedEvidence: plan.payload.evidence.map((item) => ({ id: item.id, text: item.text, contentHash: item.contentHash })),
      submittedInputs: plan.payload.requiredInputs.map((item) => ({ key: item.inputKey, value: item.value })),
      publicationAuthorized: false,
    });
    return ok(plan, output, 'An execution-ready internal content brief artifact was created; no content was published.');
  }
}

class ManualExecutionPackageAdapter implements ExecutionAdapter {
  readonly id = 'MANUAL_EXECUTION_PACKAGE' as const;
  readonly version = 'manual-execution-package-1.0.0';
  readonly supportedInterventionTypes = ALL_TYPES;
  readonly supportedSurfaces = ALL_SURFACES;
  readonly requiredPermissions = ['CUSTOMER_OWNED_SURFACE_ACCESS'] as const;
  readonly requiredInputTypes: readonly [] = [];
  readonly idempotencyStrategy = 'PROJECT_INTERVENTION_PAYLOAD_ADAPTER' as const;
  readonly timeoutMs = 10_000;
  readonly retrySafety = 'SAFE_TO_RETRY' as const;
  readonly supportsCancellation = false;
  readonly supportsRollback = false;
  validate(plan: ExecutionPlan): string[] { return baseValidation(plan, this); }
  steps(): AdapterStepDefinition[] { return []; }
  async executeStep(plan: ExecutionPlan): Promise<AdapterStepResult> {
    return fail(plan, 'MANUAL_REQUIRED', 'This action has no supported authenticated integration and cannot be executed by BrandPulse.');
  }
}

const ADAPTERS: Readonly<Record<ExecutionAdapterId, ExecutionAdapter>> = {
  WEBSITE_CONTENT_DRAFT: new WebsiteContentDraftAdapter(),
  WEBSITE_STRUCTURED_DATA_DRAFT: new StructuredDataDraftAdapter(),
  PROFILE_UPDATE_DRAFT: new ProfileUpdateDraftAdapter(),
  CONTENT_BRIEF_ARTIFACT: new ContentBriefArtifactAdapter(),
  MANUAL_EXECUTION_PACKAGE: new ManualExecutionPackageAdapter(),
};

export function getExecutionAdapter(id: string): ExecutionAdapter {
  if (!Object.prototype.hasOwnProperty.call(ADAPTERS, id)) throw new Error('Arbitrary or unregistered execution adapter rejected');
  return ADAPTERS[id as ExecutionAdapterId];
}

export function listExecutionAdapters(): ExecutionAdapter[] {
  return Object.values(ADAPTERS);
}
