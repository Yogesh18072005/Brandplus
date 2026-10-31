import type { CanonicalBusinessUnderstanding } from '@/src/business-understanding/types';
import type { BuyerQuestionSet } from '@/src/buyer-intent/types';
import type { ObservationRun, QuestionObservation } from '@/src/ai-observation/types';
import type {
  ControlledConfidence,
  DiagnosisProvenance,
  EvidenceDiagnosisRun,
  EvidenceType,
  QuestionDiagnosis,
} from '@/src/evidence-diagnosis/types';

export const INTERVENTION_ENGINE_VERSION = '1.0.0' as const;
export const INTERVENTION_SCHEMA_VERSION = '1.0.0' as const;
export const INTERVENTION_PROMPT_VERSION = '1.0.2' as const;
export const INTERVENTION_GENERATION_VERSION = '1.0.2' as const;
export const INTERVENTION_PRIORITY_VERSION = '1.0.0' as const;
export const INTERVENTION_MAX_CANDIDATES_PER_DIAGNOSIS = 5;
export const INTERVENTION_MAX_GENERATION_ATTEMPTS = 3;

export type InterventionRunStatus = 'PENDING' | 'RUNNING' | 'PARTIAL_SUCCESS' | 'COMPLETED' | 'FAILED' | 'INCONCLUSIVE';
export type InterventionStatus = 'PROPOSED' | 'NEEDS_INPUT' | 'BLOCKED' | 'READY_FOR_EXECUTION' | 'SUPERSEDED' | 'REJECTED';
export type InterventionCategory = 'CLARIFY' | 'CONSOLIDATE' | 'ADD_PROOF' | 'ADD_INFORMATION' | 'IMPROVE_SOURCE' | 'STRUCTURE' | 'REMOVE_AMBIGUITY';
export type InterventionPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
export type InterventionImpact = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
export type InterventionEffort = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export type InterventionType =
  | 'ENTITY_CLARIFICATION' | 'PRODUCT_EVIDENCE' | 'SERVICE_EVIDENCE' | 'INDUSTRY_EVIDENCE'
  | 'USE_CASE_EVIDENCE' | 'BUYER_EVIDENCE' | 'TECHNICAL_EVIDENCE' | 'COMPLIANCE_EVIDENCE'
  | 'CERTIFICATION_EVIDENCE' | 'GEOGRAPHIC_EVIDENCE' | 'PROOF_EVIDENCE' | 'CASE_STUDY'
  | 'CUSTOMER_PROOF' | 'SOURCE_COVERAGE' | 'THIRD_PARTY_EVIDENCE' | 'CONTENT_BRIEF'
  | 'INFORMATION_ARCHITECTURE' | 'STRUCTURED_DATA' | 'PROFILE_COMPLETENESS' | 'DOCUMENTATION' | 'OTHER';

export type ImplementationSurface =
  | 'WEBSITE_PAGE' | 'WEBSITE_SECTION' | 'PRODUCT_PAGE' | 'SERVICE_PAGE' | 'INDUSTRY_PAGE'
  | 'USE_CASE_PAGE' | 'CASE_STUDY' | 'TECHNICAL_DOCUMENT' | 'CERTIFICATION_PAGE' | 'ABOUT_PAGE'
  | 'CONTACT_PAGE' | 'THIRD_PARTY_PROFILE' | 'DIRECTORY_PROFILE' | 'BUSINESS_PROFILE'
  | 'STRUCTURED_DATA' | 'CONTENT_LIBRARY' | 'OTHER';

export type RequiredInputType =
  | 'BUSINESS_FACT' | 'CERTIFICATION_DETAIL' | 'CUSTOMER_PROOF' | 'GEOGRAPHY_DETAIL'
  | 'CAPABILITY_DETAIL' | 'TECHNICAL_SPECIFICATION' | 'COMPLIANCE_DETAIL' | 'CASE_STUDY_DETAIL' | 'OTHER';
export type RequiredInputStatus = 'AVAILABLE' | 'INPUT_REQUIRED' | 'UNKNOWN';
export type MeasurementType =
  | 'TARGET_MENTION_STATUS' | 'RECOMMENDATION_STRENGTH' | 'CITATION_SOURCE_COVERAGE'
  | 'EVIDENCE_DIMENSION' | 'OBSERVED_ENTITY_RELATIONSHIP' | 'QUESTION_REOBSERVATION';
export type EvidenceLinkKind = 'EVIDENCE_TO_REUSE' | 'EVIDENCE_TO_ADD';

export interface RequiredBusinessInput {
  id: string;
  type: RequiredInputType;
  description: string;
  status: RequiredInputStatus;
}

export interface InterventionEvidenceLink {
  id: string;
  kind: EvidenceLinkKind;
  evidenceId: string | null;
  evidenceType: EvidenceType;
  description: string;
}

export interface AcceptanceCriterion {
  id: string;
  criterion: string;
}

export interface MeasurementLink {
  id: string;
  type: MeasurementType;
  affectedQuestionIds: string[];
  evidenceDimensions: string[];
  description: string;
}

export interface ContentBrief {
  targetBuyerQuestions: string[];
  discoveryIntent: string;
  objective: string;
  verifiedFactEvidenceIds: string[];
  requiredSections: string[];
  requiredFactsToClarify: string[];
  prohibitedUnsupportedClaims: string[];
  internalEvidenceReferences: string[];
  acceptanceCriteria: string[];
}

export interface StructuredDataRequirement {
  schemaType: 'Organization' | 'Product' | 'Service' | 'LocalBusiness';
  representedEntity: string;
  supportedProperties: string[];
  inputRequiredProperties: string[];
  proposedSurfaces: ImplementationSurface[];
  acceptanceCriteria: string[];
}

export interface GeneratedIntervention {
  id: string;
  diagnosisId: string;
  affectedDiagnosisIds: string[];
  affectedGapIds: string[];
  questionId: string;
  exactBuyerQuestion: string;
  affectedQuestions: Array<{ id: string; exactQuestion: string }>;
  interventionType: InterventionType;
  category: InterventionCategory;
  title: string;
  objective: string;
  problemStatement: string;
  diagnosedGap: string;
  whyThisAddressesGap: string;
  requiredBusinessInputs: RequiredBusinessInput[];
  evidenceToPreserve: InterventionEvidenceLink[];
  evidenceToAdd: InterventionEvidenceLink[];
  expectedDeliverable: string;
  implementationSurface: ImplementationSurface;
  proposedSurface: true;
  priority: InterventionPriority;
  priorityScore: number;
  priorityFactors: {
    commercialRelevance: number;
    diagnosisSeverity: number;
    evidenceGapStrength: number;
    crossQuestionImpact: number;
    confidence: number;
    effortEfficiency: number;
  };
  impact: InterventionImpact;
  effort: InterventionEffort;
  confidence: ControlledConfidence;
  dependencyIds: string[];
  acceptanceCriteria: AcceptanceCriterion[];
  measurementLinkage: MeasurementLink[];
  provenance: DiagnosisProvenance[];
  status: InterventionStatus;
  contentBrief: ContentBrief | null;
  structuredData: StructuredDataRequirement | null;
}

export interface InterventionProposal {
  candidateKey: string;
  diagnosisIds: string[];
  gapIds: string[];
  interventionType: InterventionType;
  category: InterventionCategory;
  implementationSurface: ImplementationSurface;
  evidenceToReuseIds: string[];
  requiredInputTypes: RequiredInputType[];
  dependsOnCandidateKeys: string[];
  schemaType?: StructuredDataRequirement['schemaType'];
  theme?: string;
}

export interface InterventionGenerationContext {
  businessName: string;
  eligibleDiagnoses: QuestionDiagnosis[];
  availableEvidence: Array<{ id: string; type: EvidenceType; text: string; confidence: string }>;
  totalQuestionCount: number;
}

export interface InterventionGeneratorUsage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  modelVersion: string | null;
}

export interface InterventionGeneratorResult {
  proposals: InterventionProposal[];
  usage: InterventionGeneratorUsage;
}

export interface InterventionGenerator {
  readonly model: string;
  generate(context: InterventionGenerationContext): Promise<InterventionGeneratorResult>;
}

export interface InterventionSourceBundle {
  projectId: string;
  diagnosisRun: EvidenceDiagnosisRun & { diagnoses: QuestionDiagnosis[] };
  understanding: CanonicalBusinessUnderstanding;
  questionSet: BuyerQuestionSet;
  observationRun: ObservationRun & { observations: QuestionObservation[] };
}

export interface InterventionRun {
  id: string;
  projectId: string;
  diagnosisRunId: string;
  businessUnderstandingRunId: string;
  buyerQuestionSetId: string;
  observationRunId: string;
  status: InterventionRunStatus;
  inputHash: string;
  resultHash: string | null;
  idempotencyKey: string;
  engineVersion: string;
  schemaVersion: string;
  promptVersion: string;
  generationVersion: string;
  priorityVersion: string;
  model: string;
  modelVersion: string | null;
  generationParameters: Readonly<Record<string, string | number | boolean>>;
  businessUnderstandingVersion: string;
  businessUnderstandingHash: string;
  buyerQuestionSetVersion: string;
  buyerQuestionSetHash: string;
  observationVersion: string;
  observationHash: string;
  diagnosisVersion: string;
  diagnosisHash: string;
  eligibleGapCount: number;
  interventionCount: number;
  rejectedCandidateCount: number;
  llmCallCount: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  interventions?: GeneratedIntervention[];
}

export type CreateInterventionRunResult =
  | { kind: 'CREATED'; run: InterventionRun }
  | { kind: 'EXISTING'; run: InterventionRun }
  | { kind: 'REUSED'; run: InterventionRun };

export interface InterventionExecutionPlan {
  run: InterventionRun;
  bundle: InterventionSourceBundle;
}

export interface InterventionRepository {
  loadSourceBundle(projectId: string, diagnosisRunId: string): Promise<InterventionSourceBundle | null>;
  createRun(input: {
    bundle: InterventionSourceBundle;
    inputHash: string;
    buyerQuestionSetHash: string;
    observationHash: string;
    diagnosisHash: string;
    idempotencyKey: string;
    generator: InterventionGenerator;
    generationParameters: Readonly<Record<string, string | number | boolean>>;
  }): Promise<CreateInterventionRunResult>;
  getRun(projectId: string, runId: string, includeInterventions?: boolean): Promise<InterventionRun | null>;
  listRuns(projectId: string, limit: number, offset: number): Promise<InterventionRun[]>;
  loadExecutionPlan(runId: string): Promise<InterventionExecutionPlan>;
  markRunRunning(runId: string): Promise<void>;
  saveInterventions(runId: string, interventions: GeneratedIntervention[]): Promise<void>;
  completeRun(runId: string, summary: {
    resultHash: string;
    eligibleGapCount: number;
    rejectedCandidateCount: number;
    llmCallCount: number;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    modelVersion: string | null;
  }): Promise<InterventionRun>;
  failRun(runId: string, message: string): Promise<void>;
}
