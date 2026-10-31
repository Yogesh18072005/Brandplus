import type { CanonicalBusinessUnderstanding } from '@/src/business-understanding/types';
import type { BuyerQuestion, BuyerQuestionSet } from '@/src/buyer-intent/types';
import type { ObservationRun, ObservedEntity, QuestionObservation, TargetEntityStatus } from '@/src/ai-observation/types';

export const EVIDENCE_DIAGNOSIS_ENGINE_VERSION = '1.0.0' as const;
export const EVIDENCE_DIAGNOSIS_PROMPT_VERSION = 'none-deterministic-v1' as const;
export const EVIDENCE_DIAGNOSIS_SCHEMA_VERSION = '1.0.0' as const;
export const EVIDENCE_DIAGNOSIS_VERSION = '1.0.1' as const;
export const EVIDENCE_MATCHING_VERSION = '1.0.0' as const;

export type DiagnosisRunStatus = 'PENDING' | 'RUNNING' | 'PARTIAL_SUCCESS' | 'COMPLETED' | 'FAILED' | 'INCONCLUSIVE';
export type QuestionDiagnosisStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'INCONCLUSIVE';
export type ControlledConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
export type CommercialImplication = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export type EvidenceType =
  | 'IDENTITY' | 'PRODUCT' | 'SERVICE' | 'CAPABILITY' | 'INDUSTRY' | 'USE_CASE' | 'BUYER_TYPE'
  | 'GEOGRAPHY' | 'TECHNICAL_SPECIFICATION' | 'COMPLIANCE' | 'CERTIFICATION' | 'STANDARD'
  | 'APPLICATION' | 'CASE_STUDY' | 'CUSTOMER_PROOF' | 'MANUFACTURING' | 'FACILITY'
  | 'ORDER_INFORMATION' | 'DISTRIBUTION' | 'BRAND_AUTHORITY' | 'THIRD_PARTY_MENTION' | 'PUBLICATION' | 'OTHER';

export type EvidenceStatus =
  | 'SUPPORTED' | 'PARTIALLY_SUPPORTED' | 'WEAK' | 'MISSING' | 'CONFLICTING' | 'AMBIGUOUS'
  | 'STALE' | 'UNVERIFIED' | 'NOT_APPLICABLE' | 'UNKNOWN';
export type EvidenceRelevance = 'DIRECT' | 'RELATED' | 'LOW' | 'UNKNOWN';
export type EvidenceSpecificity = 'EXACT' | 'SPECIFIC' | 'GENERAL' | 'UNKNOWN';
export type EvidenceDirectness = 'DIRECT' | 'INDIRECT' | 'OBSERVED_ONLY' | 'UNKNOWN';
export type EvidenceFreshness = 'CURRENT' | 'RECENT' | 'DATED' | 'STALE' | 'UNKNOWN';
export type SourceReliability = 'PRIMARY' | 'INDEPENDENT' | 'DIRECTORY' | 'COMMUNITY' | 'AI_GENERATED' | 'UNKNOWN';
export type ProvenanceCompleteness = 'COMPLETE' | 'PARTIAL' | 'MISSING';
export type EvidenceOrigin = 'TARGET_BUSINESS' | 'OBSERVED_ENTITY' | 'AI_OBSERVATION' | 'CITATION_REFERENCE';
export type EvidenceScope = 'INSPECTED_FOUND' | 'INSPECTED_NOT_FOUND' | 'NOT_SEARCHED' | 'INACCESSIBLE' | 'PARTIALLY_INSPECTED' | 'UNKNOWN';
export type SourceHierarchy =
  | 'OFFICIAL_WEBSITE' | 'OFFICIAL_DOCUMENT' | 'OFFICIAL_PROFILE' | 'REGULATORY' | 'CERTIFICATION_BODY'
  | 'TRUSTED_THIRD_PARTY' | 'DIRECTORY' | 'MARKETPLACE' | 'SOCIAL' | 'FORUM' | 'AI_GENERATED' | 'UNKNOWN';

export type DiagnosisClassification =
  | 'NO_TARGET_MENTION' | 'TARGET_MENTIONED_WEAKLY' | 'TARGET_MENTIONED_BUT_NOT_PREFERRED'
  | 'TARGET_RELEVANCE_EVIDENCE_GAP' | 'TARGET_SPECIFICITY_GAP' | 'TARGET_PROOF_GAP'
  | 'TARGET_AUTHORITY_GAP' | 'TARGET_CITATION_GAP' | 'TARGET_ENTITY_RECOGNITION_GAP'
  | 'TARGET_GEOGRAPHY_EVIDENCE_GAP' | 'TARGET_INDUSTRY_EVIDENCE_GAP' | 'TARGET_USE_CASE_EVIDENCE_GAP'
  | 'TARGET_TECHNICAL_EVIDENCE_GAP' | 'TARGET_COMPLIANCE_EVIDENCE_GAP'
  | 'OBSERVED_ENTITY_HAS_STRONGER_RELEVANT_EVIDENCE' | 'CONFLICTING_EVIDENCE'
  | 'INSUFFICIENT_OBSERVATION' | 'INCONCLUSIVE';

export type EntityRelationship = 'TARGET' | 'OBSERVED_ENTITY' | 'POTENTIAL_ALTERNATIVE' | 'POTENTIAL_COMPETITOR' | 'RELATED_ENTITY' | 'UNKNOWN';
export type ProvenanceKind = 'BUSINESS_EVIDENCE' | 'BUSINESS_ENTITY' | 'BUSINESS_CONFLICT' | 'BUSINESS_UNKNOWN' | 'QUESTION' | 'AI_OBSERVATION' | 'OBSERVED_ENTITY' | 'CITATION' | 'SOURCE';

export interface DiagnosisProvenance {
  kind: ProvenanceKind;
  sourceId: string;
  sourceUrl: string | null;
  sourceTitle: string | null;
  sourceType: string | null;
  snippet: string | null;
  timestamp: string | null;
}

export interface EvidenceAssessment {
  id: string;
  origin: EvidenceOrigin;
  subjectEntityId: string | null;
  evidenceType: EvidenceType;
  status: EvidenceStatus;
  relevance: EvidenceRelevance;
  specificity: EvidenceSpecificity;
  directness: EvidenceDirectness;
  freshness: EvidenceFreshness;
  sourceReliability: SourceReliability;
  sourceHierarchy: SourceHierarchy;
  provenanceCompleteness: ProvenanceCompleteness;
  confidence: ControlledConfidence;
  scope: EvidenceScope;
  statement: string;
  provenance: DiagnosisProvenance[];
}

export interface EvidenceGap {
  id: string;
  gapType: DiagnosisClassification;
  questionDimension: string;
  description: string;
  targetEvidencePresent: boolean;
  observedEntityEvidencePresent: boolean;
  evidenceStrength: ControlledConfidence;
  confidence: ControlledConfidence;
  scope: EvidenceScope;
  supportingEvidenceIds: string[];
  provenance: DiagnosisProvenance[];
}

export interface DiagnosisClaim {
  id: string;
  classification: DiagnosisClassification;
  statement: string;
  confidence: ControlledConfidence;
  provenance: DiagnosisProvenance[];
}

export interface DiagnosedEntityRelationship {
  id: string;
  observedEntityId: string;
  surfaceForm: string;
  relationship: EntityRelationship;
  confidence: ControlledConfidence;
  rationale: string;
  provenance: DiagnosisProvenance[];
}

export interface DiagnosisUnknown {
  id: string;
  area: string;
  reason: 'NOT_INSPECTED' | 'INACCESSIBLE' | 'AMBIGUOUS' | 'UNSUPPORTED' | 'OBSERVATION_FAILURE' | 'PARSER_FAILURE';
  detail: string;
  provenance: DiagnosisProvenance[];
}

export type DiagnosisTheme =
  | 'PRODUCT_EVIDENCE'
  | 'CAPABILITY_EVIDENCE'
  | 'QUALITY_TRUST_EVIDENCE'
  | 'EXPORT_LOGISTICS_EVIDENCE'
  | 'INDUSTRY_USE_CASE_EVIDENCE'
  | 'ENTITY_CLARITY'
  | 'SOURCE_DISTRIBUTION_EVIDENCE';

export interface DiagnosisGroup {
  theme: DiagnosisTheme;
  label: string;
  diagnosisIds: string[];
  gapIds: string[];
  sharedClassifications: DiagnosisClassification[];
  sharedDimensions: string[];
  confidence: ControlledConfidence;
}

export interface QuestionDiagnosis {
  id: string;
  buyerQuestionId: string;
  questionObservationId: string;
  exactQuestion: string;
  status: QuestionDiagnosisStatus;
  targetMentionStatus: TargetEntityStatus;
  classifications: DiagnosisClassification[];
  primaryClassification: DiagnosisClassification;
  commercialImplication: CommercialImplication;
  confidence: ControlledConfidence;
  evidenceScope: EvidenceScope;
  evidenceComparison: 'TARGET_STRONGER' | 'OBSERVED_STRONGER' | 'COMPARABLE' | 'INCONCLUSIVE';
  assessments: EvidenceAssessment[];
  gaps: EvidenceGap[];
  claims: DiagnosisClaim[];
  entityRelationships: DiagnosedEntityRelationship[];
  unknowns: DiagnosisUnknown[];
}

export interface EvidenceDiagnosisRun {
  id: string;
  projectId: string;
  businessUnderstandingRunId: string;
  buyerQuestionSetId: string;
  observationRunId: string;
  status: DiagnosisRunStatus;
  inputHash: string;
  idempotencyKey: string;
  engineVersion: string;
  promptVersion: string;
  schemaVersion: string;
  diagnosisVersion: string;
  matchingVersion: string;
  model: string | null;
  modelVersion: string | null;
  businessUnderstandingVersion: string;
  businessUnderstandingContentHash: string;
  buyerQuestionSetVersion: string;
  buyerQuestionSetHash: string;
  observationEngineVersion: string;
  observationRunHash: string;
  requestedQuestionCount: number;
  completedQuestionCount: number;
  failedQuestionCount: number;
  inconclusiveQuestionCount: number;
  evidenceCount: number;
  gapCount: number;
  llmCallCount: number;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  diagnoses?: QuestionDiagnosis[];
}

export interface DiagnosisSourceBundle {
  projectId: string;
  businessUnderstandingRunId: string;
  buyerQuestionSetRecordId: string;
  understanding: CanonicalBusinessUnderstanding;
  questionSet: BuyerQuestionSet;
  observationRun: ObservationRun & { observations: QuestionObservation[] };
}

export interface DiagnosisExecutionPlan {
  run: EvidenceDiagnosisRun;
  bundle: DiagnosisSourceBundle;
  completedQuestionIds: string[];
}

export type CreateDiagnosisRunResult =
  | { kind: 'CREATED'; run: EvidenceDiagnosisRun }
  | { kind: 'EXISTING'; run: EvidenceDiagnosisRun }
  | { kind: 'REUSED'; run: EvidenceDiagnosisRun };

export interface DiagnosisRepository {
  loadSourceBundle(projectId: string, observationRunId: string): Promise<DiagnosisSourceBundle | null>;
  createRun(input: {
    bundle: DiagnosisSourceBundle;
    inputHash: string;
    buyerQuestionSetHash: string;
    observationRunHash: string;
    idempotencyKey: string;
  }): Promise<CreateDiagnosisRunResult>;
  getRun(projectId: string, runId: string, includeDiagnoses?: boolean): Promise<EvidenceDiagnosisRun | null>;
  listRuns(projectId: string, limit: number, offset: number): Promise<EvidenceDiagnosisRun[]>;
  loadExecutionPlan(runId: string): Promise<DiagnosisExecutionPlan>;
  markRunRunning(runId: string): Promise<void>;
  markQuestionRunning(runId: string, buyerQuestionId: string): Promise<void>;
  saveQuestion(runId: string, diagnosis: QuestionDiagnosis): Promise<void>;
  failQuestion(runId: string, buyerQuestionId: string, message: string): Promise<void>;
  completeRun(runId: string): Promise<EvidenceDiagnosisRun>;
}

export interface QuestionDiagnosisInput {
  question: BuyerQuestion;
  observation: QuestionObservation;
  understanding: CanonicalBusinessUnderstanding;
}

export interface EvidenceCandidateContext {
  entity: ObservedEntity;
  observation: QuestionObservation;
}
