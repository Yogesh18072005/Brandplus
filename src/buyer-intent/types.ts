import type { CanonicalBusinessUnderstanding } from '@/src/business-understanding/types';

export const BUYER_INTENT_VERSION = '1.0.0' as const;
export const BUYER_INTENT_SCHEMA_VERSION = '1.0.0' as const;
// 1.1.0: common buyer words are generic, near-miss backfill, five-question floor.
export const BUYER_INTENT_GENERATION_VERSION = '1.1.0' as const;
export const BUYER_INTENT_RANKING_VERSION = '1.0.1' as const;

export type BuyerIntentCategory =
  | 'DISCOVERY'
  | 'COMPARISON'
  | 'SHORTLIST'
  | 'VENDOR_SELECTION'
  | 'PURCHASE'
  | 'SPECIFICATION'
  | 'COMPLIANCE'
  | 'ALTERNATIVE'
  | 'GEOGRAPHIC';

export type BuyerStage = 'AWARENESS' | 'RESEARCH' | 'EVALUATION' | 'SHORTLISTING' | 'DECISION' | 'PURCHASE';
export type BuyerIntentDimension =
  | 'PRODUCT'
  | 'SERVICE'
  | 'INDUSTRY'
  | 'USE_CASE'
  | 'GEOGRAPHY'
  | 'BUYER_TYPE'
  | 'TECHNICAL_REQUIREMENT'
  | 'COMPLIANCE'
  | 'APPLICATION'
  | 'ORDER_PROCUREMENT';
export type BuyerQuestionConfidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type BuyerIntentRunStatus = 'PENDING' | 'RUNNING' | 'PARTIAL_SUCCESS' | 'COMPLETED' | 'FAILED';

export interface BuyerQuestionCandidate {
  id: string;
  question: string;
  intent: BuyerIntentCategory;
  buyer_stage: BuyerStage;
  dimensions: BuyerIntentDimension[];
  supporting_business_evidence_ids: string[];
  supporting_business_entity_ids: string[];
}

export interface BuyerQuestionEvaluation {
  candidate_id: string;
  commercial_relevance: number;
  business_relevance: number;
  specificity: number;
  rationale: string;
  confidence: BuyerQuestionConfidence;
}

export interface BuyerQuestion extends Omit<BuyerQuestionCandidate, 'id'>, Omit<BuyerQuestionEvaluation, 'candidate_id'> {
  id: string;
  normalized_question: string;
  priority_score: number;
  rank: number;
}

export interface BuyerQuestionSet {
  id: string;
  version: string;
  project_id: string;
  business_understanding_run_id: string;
  business_understanding_version: string;
  business_understanding_content_hash: string;
  status: Extract<BuyerIntentRunStatus, 'PARTIAL_SUCCESS' | 'COMPLETED' | 'FAILED'>;
  generated_at: string;
  finalized_at: string | null;
  frozen: boolean;
  requested_question_count: number;
  candidate_count: number;
  rejected_candidate_count: number;
  questions: BuyerQuestion[];
  warnings: string[];
  generation: {
    model: string;
    prompt_version: string;
    schema_version: string;
    generation_version: string;
    ranking_version: string;
    reused: boolean;
  };
}

export interface BuyerIntentInput {
  projectId: string;
  businessUnderstandingRunId: string;
  understanding: CanonicalBusinessUnderstanding;
  questionCount?: number;
}

export interface BuyerIntentExtractor {
  model: string;
  generateCandidates(understanding: CanonicalBusinessUnderstanding, candidateCount: number): Promise<BuyerQuestionCandidate[]>;
  evaluateCandidates(understanding: CanonicalBusinessUnderstanding, candidates: BuyerQuestionCandidate[]): Promise<BuyerQuestionEvaluation[]>;
}

export interface BuyerIntentRunIdentity {
  projectId: string;
  businessUnderstandingRunId: string;
  businessUnderstandingVersion: string;
  businessUnderstandingContentHash: string;
  requestedQuestionCount: number;
  engineVersion: string;
  promptVersion: string;
  schemaVersion: string;
  generationVersion: string;
  rankingVersion: string;
  model: string;
}

export type BeginBuyerIntentRunResult =
  | { kind: 'STARTED'; runId: string }
  | { kind: 'REUSED'; runId: string; result: BuyerQuestionSet };

export interface BuyerIntentRepository {
  findReusable(identity: BuyerIntentRunIdentity): Promise<BuyerQuestionSet | null>;
  findLatest(projectId: string): Promise<BuyerQuestionSet | null>;
  begin(identity: BuyerIntentRunIdentity): Promise<BeginBuyerIntentRunResult>;
  finalize(runId: string, result: BuyerQuestionSet): Promise<BuyerQuestionSet>;
  fail(runId: string, result: BuyerQuestionSet, message: string): Promise<BuyerQuestionSet>;
}

export interface BuyerIntentLogger {
  record(event: string, metadata?: Record<string, string | number | boolean | null>): Promise<void> | void;
}
