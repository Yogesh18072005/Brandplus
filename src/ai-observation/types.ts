import type { BuyerQuestion } from '@/src/buyer-intent/types';

export const AI_OBSERVATION_ENGINE_VERSION = '1.0.0' as const;
export const AI_OBSERVATION_PROMPT_VERSION = '1.0.0' as const;
export const AI_OBSERVATION_PARSER_VERSION = '1.0.1' as const;
export const AI_OBSERVATION_SCHEMA_VERSION = '1.0.0' as const;
export const GEMINI_OBSERVATION_ADAPTER_VERSION = '1.0.0' as const;

export type ObservationRunStatus = 'PENDING' | 'RUNNING' | 'PARTIAL_SUCCESS' | 'COMPLETED' | 'FAILED';
export type QuestionObservationStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export type ResponseCompleteness = 'COMPLETE' | 'PARTIAL' | 'EMPTY' | 'FAILED' | 'INCONCLUSIVE';
export type ProcessingStatus = 'NOT_STARTED' | 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'INCONCLUSIVE';
export type TargetEntityStatus = 'MENTIONED' | 'NOT_MENTIONED' | 'INCONCLUSIVE';
export type EntityType = 'COMPANY' | 'ORGANIZATION' | 'BRAND' | 'PRODUCT' | 'OTHER';
export type EntityMatchStatus = 'MATCHED' | 'UNMATCHED' | 'AMBIGUOUS';
export type RecommendationStrength = 'NONE' | 'MENTION' | 'SUGGESTED' | 'RECOMMENDED' | 'STRONGLY_RECOMMENDED' | 'UNKNOWN';
export type ClaimAssociation = 'STRUCTURAL' | 'UNASSOCIATED' | 'INCONCLUSIVE';

export interface ProviderUsage {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
}

export interface ProviderCitation {
  displayedText: string | null;
  url: string | null;
  domain: string | null;
  title: string | null;
  providerCitationId: string | null;
  context: string | null;
  characterPosition: number | null;
  claimAssociation: ClaimAssociation;
  metadata?: Record<string, unknown>;
}

export interface ObservationProviderResult {
  provider: string;
  model: string;
  modelVersion: string | null;
  providerResponseId: string | null;
  rawResponse: string;
  observedAt: string;
  latencyMs: number | null;
  completeness: ResponseCompleteness;
  finishReason: string | null;
  usage: ProviderUsage;
  estimatedCostUsd: number | null;
  citations: ProviderCitation[];
  metadata: Record<string, unknown>;
}

export interface ObservationProvider {
  readonly name: string;
  readonly model: string;
  readonly adapterVersion: string;
  availability(): { available: boolean; reason?: string };
  observeQuestion(input: {
    question: string;
    systemInstruction: string;
    generationParameters: Readonly<Record<string, string | number | boolean>>;
  }): Promise<ObservationProviderResult>;
}

export interface TargetIdentity {
  canonicalName: string;
  website: string;
  aliases: string[];
}

export interface EntityMention {
  surfaceForm: string;
  characterPosition: number;
  paragraphPosition: number;
  context: string;
}

export interface ObservedEntity {
  id: string;
  surfaceForm: string;
  normalizedName: string;
  entityType: EntityType;
  matchStatus: EntityMatchStatus;
  targetMatch: boolean;
  mentionCount: number;
  firstCharacterPosition: number;
  firstParagraphPosition: number;
  recommendationPosition: number | null;
  recommendationStrength: RecommendationStrength;
  mentions: EntityMention[];
}

export interface SourceObservation {
  id: string;
  fullUrl: string | null;
  normalizedUrl: string | null;
  domain: string | null;
  title: string | null;
  targetDomainMatch: boolean;
}

export interface CitationObservation extends ProviderCitation {
  id: string;
  sourceId: string | null;
}

export interface DerivedObservation {
  targetStatus: TargetEntityStatus;
  parsingStatus: ProcessingStatus;
  extractionStatus: ProcessingStatus;
  entities: ObservedEntity[];
  citations: CitationObservation[];
  sources: SourceObservation[];
}

export interface QuestionObservation {
  id: string;
  buyerQuestionId: string;
  exactQuestion: string;
  status: QuestionObservationStatus;
  provider: string;
  model: string;
  rawResponse: string | null;
  responseTimestamp: string | null;
  latencyMs: number | null;
  usage: ProviderUsage;
  costUsd: number | null;
  completeness: ResponseCompleteness;
  parsingStatus: ProcessingStatus;
  extractionStatus: ProcessingStatus;
  targetStatus: TargetEntityStatus;
  entities: ObservedEntity[];
  citations: CitationObservation[];
  sources: SourceObservation[];
  errorCode: string | null;
  errorMessage: string | null;
}

export interface ObservationRun {
  id: string;
  projectId: string;
  buyerQuestionSetId: string;
  businessUnderstandingRunId: string | null;
  provider: string;
  model: string;
  modelVersion: string | null;
  providerAdapterVersion: string;
  engineVersion: string;
  promptVersion: string;
  parserVersion: string;
  schemaVersion: string;
  generationParameters: Readonly<Record<string, string | number | boolean>>;
  status: ObservationRunStatus;
  requestedQuestionCount: number;
  completedQuestionCount: number;
  failedQuestionCount: number;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  costUsd: number | null;
  idempotencyKey: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  observations?: QuestionObservation[];
}

export interface ObservationExecutionPlan {
  run: ObservationRun;
  target: TargetIdentity;
  questions: Array<Pick<BuyerQuestion, 'id' | 'question' | 'rank'>>;
  completedBuyerQuestionIds: string[];
}

export type CreateObservationRunResult =
  | { kind: 'CREATED'; run: ObservationRun }
  | { kind: 'EXISTING'; run: ObservationRun };

export interface ObservationRepository {
  createRun(input: {
    projectId: string;
    buyerQuestionSetId: string;
    businessUnderstandingRunId: string | null;
    provider: ObservationProvider;
    idempotencyKey: string;
    generationParameters: Readonly<Record<string, string | number | boolean>>;
  }): Promise<CreateObservationRunResult>;
  getRun(projectId: string, runId: string, includeObservations?: boolean): Promise<ObservationRun | null>;
  listRuns(projectId: string, limit: number, offset: number): Promise<ObservationRun[]>;
  loadExecutionPlan(runId: string): Promise<ObservationExecutionPlan>;
  markRunRunning(runId: string): Promise<void>;
  markQuestionRunning(runId: string, buyerQuestionId: string): Promise<void>;
  saveQuestionSuccess(runId: string, buyerQuestionId: string, provider: ObservationProviderResult, derived: DerivedObservation): Promise<void>;
  saveQuestionFailure(runId: string, buyerQuestionId: string, error: ObservedProviderError): Promise<void>;
  completeRun(runId: string): Promise<ObservationRun>;
}

export interface ObservedProviderError {
  code: string;
  message: string;
  retryable: boolean;
  completeness: Extract<ResponseCompleteness, 'FAILED' | 'INCONCLUSIVE'>;
}
