import { stableId } from '@/src/business-understanding/normalize';
import { BUYER_INTENT_PROMPT_VERSION } from './prompts';
import { deduplicateCandidates, filterCandidates, finalizeQuestions } from './normalize';
import { GeminiBuyerIntentExtractor } from './extractor';
import {
  BUYER_INTENT_GENERATION_VERSION,
  BUYER_INTENT_RANKING_VERSION,
  BUYER_INTENT_SCHEMA_VERSION,
  BUYER_INTENT_VERSION,
  type BuyerIntentExtractor,
  type BuyerIntentInput,
  type BuyerIntentLogger,
  type BuyerIntentRepository,
  type BuyerIntentRunIdentity,
  type BuyerQuestionSet,
} from './types';

/** Fewer questions than this is not an audit; the run fails and can be retried. */
const MINIMUM_AUDIT_QUESTIONS = 5;

export class BuyerIntentInputError extends Error {}
export class BuyerIntentRunInProgressError extends Error {}

export interface BuyerIntentServiceOptions {
  extractor?: BuyerIntentExtractor;
  repository?: BuyerIntentRepository;
  logger?: BuyerIntentLogger;
  defaultQuestionCount?: number;
}

function requestedCount(input: BuyerIntentInput, fallback: number): number {
  const value = input.questionCount ?? fallback;
  if (!Number.isInteger(value) || value < 1 || value > 30) throw new BuyerIntentInputError('questionCount must be an integer from 1 to 30');
  return value;
}

function identityFor(input: BuyerIntentInput, count: number, extractor: BuyerIntentExtractor): BuyerIntentRunIdentity {
  return {
    projectId: input.projectId,
    businessUnderstandingRunId: input.businessUnderstandingRunId,
    businessUnderstandingVersion: input.understanding.version,
    businessUnderstandingContentHash: input.understanding.content_hash,
    requestedQuestionCount: count,
    engineVersion: BUYER_INTENT_VERSION,
    promptVersion: BUYER_INTENT_PROMPT_VERSION,
    schemaVersion: BUYER_INTENT_SCHEMA_VERSION,
    generationVersion: BUYER_INTENT_GENERATION_VERSION,
    rankingVersion: BUYER_INTENT_RANKING_VERSION,
    model: extractor.model,
  };
}

function baseResult(input: BuyerIntentInput, identity: BuyerIntentRunIdentity): BuyerQuestionSet {
  return {
    id: stableId('buyer_question_set', [
      identity.projectId,
      identity.businessUnderstandingRunId,
      identity.engineVersion,
      identity.promptVersion,
      identity.schemaVersion,
      identity.generationVersion,
      identity.rankingVersion,
      identity.requestedQuestionCount,
    ].join(':')),
    version: identity.engineVersion,
    project_id: identity.projectId,
    business_understanding_run_id: identity.businessUnderstandingRunId,
    business_understanding_version: identity.businessUnderstandingVersion,
    business_understanding_content_hash: identity.businessUnderstandingContentHash,
    status: 'FAILED',
    generated_at: new Date().toISOString(),
    finalized_at: null,
    frozen: false,
    requested_question_count: identity.requestedQuestionCount,
    candidate_count: 0,
    rejected_candidate_count: 0,
    questions: [],
    warnings: [],
    generation: {
      model: identity.model,
      prompt_version: identity.promptVersion,
      schema_version: identity.schemaVersion,
      generation_version: identity.generationVersion,
      ranking_version: identity.rankingVersion,
      reused: false,
    },
  };
}

function assertUsableInput(input: BuyerIntentInput): void {
  if (input.understanding.project_id !== input.projectId) throw new BuyerIntentInputError('Business Understanding belongs to a different project');
  if (!['SUCCESS', 'PARTIAL_SUCCESS'].includes(input.understanding.status)) {
    throw new BuyerIntentInputError('A successful Business Understanding run is required');
  }
  if (!input.understanding.evidence.length) throw new BuyerIntentInputError('Business Understanding contains no supporting evidence');
  const groundedEntities = [
    ...input.understanding.products, ...input.understanding.services, ...input.understanding.capabilities,
    ...input.understanding.industries, ...input.understanding.use_cases, ...input.understanding.buyer_types,
  ];
  if (!groundedEntities.length) throw new BuyerIntentInputError('Business Understanding contains no commercially usable entities');
}

export class BuyerIntentService {
  private readonly extractor: BuyerIntentExtractor;
  private readonly repository?: BuyerIntentRepository;
  private readonly logger?: BuyerIntentLogger;
  private readonly defaultQuestionCount: number;

  constructor(options: BuyerIntentServiceOptions = {}) {
    this.extractor = options.extractor ?? new GeminiBuyerIntentExtractor();
    this.repository = options.repository;
    this.logger = options.logger;
    this.defaultQuestionCount = options.defaultQuestionCount ?? Number(process.env.BUYER_INTENT_QUESTION_COUNT ?? 20);
  }

  async generate(input: BuyerIntentInput): Promise<BuyerQuestionSet> {
    assertUsableInput(input);
    const count = requestedCount(input, this.defaultQuestionCount);
    const identity = identityFor(input, count, this.extractor);
    const reusable = await this.repository?.findReusable(identity);
    if (reusable) return { ...reusable, generation: { ...reusable.generation, reused: true } };

    let runId = stableId('buyer_intent_run', `${identity.businessUnderstandingRunId}:${identity.engineVersion}:${count}`);
    if (this.repository) {
      const begun = await this.repository.begin(identity);
      if (begun.kind === 'REUSED') return { ...begun.result, generation: { ...begun.result.generation, reused: true } };
      runId = begun.runId;
    }

    const started = Date.now();
    const result = baseResult(input, identity);
    await this.logger?.record('buyer_intent_started', {
      projectId: input.projectId,
      businessUnderstandingRunId: input.businessUnderstandingRunId,
      requestedQuestionCount: count,
      version: BUYER_INTENT_VERSION,
    });

    try {
      const candidateTarget = Math.min(40, Math.max(20, count * 2));
      const generated = await this.extractor.generateCandidates(input.understanding, candidateTarget);
      result.candidate_count = generated.length;
      const filtered = filterCandidates(generated, input.understanding);
      // When strict grounding leaves too few questions, take back candidates
      // that failed only on one plain unfamiliar word. Invented numbers,
      // geography, compliance and company bias never come back.
      const strict = deduplicateCandidates(filtered.accepted);
      const distinct = strict.length >= count
        ? strict
        : deduplicateCandidates([...filtered.accepted, ...filtered.nearMisses]);
      if (distinct.length > strict.length) {
        result.warnings.push(`Re-admitted ${distinct.length - strict.length} near-miss candidates to reach the requested question count.`);
      }
      const deterministicRejections = generated.length - distinct.length;
      result.rejected_candidate_count = deterministicRejections;
      if (filtered.rejected.length) {
        const summary = new Map<string, number>();
        for (const rejection of filtered.rejected) summary.set(rejection.reason, (summary.get(rejection.reason) ?? 0) + 1);
        result.warnings.push(`Deterministic filtering rejected ${filtered.rejected.length} candidates: ${[...summary].map(([reason, total]) => `${reason} (${total})`).join('; ')}`);
      }
      if (!distinct.length) throw new Error('No grounded buyer-question candidates passed deterministic validation');

      await this.logger?.record('buyer_intent_candidates_filtered', {
        projectId: input.projectId,
        generated: generated.length,
        accepted: distinct.length,
        rejected: deterministicRejections,
      });
      const evaluations = await this.extractor.evaluateCandidates(input.understanding, distinct);
      result.questions = finalizeQuestions(distinct, evaluations, input.understanding, result.id, count);
      result.rejected_candidate_count = generated.length - result.questions.length;
      if (!result.questions.length) throw new Error('No evaluated buyer questions met the minimum quality threshold');
      // A report built on a couple of questions is not an audit. Fail loudly so
      // the run can be retried instead of emailing a thin report.
      const minimum = Math.min(count, MINIMUM_AUDIT_QUESTIONS);
      if (result.questions.length < minimum) {
        throw new Error(`Only ${result.questions.length} defensible buyer questions survived validation (minimum ${minimum})`);
      }

      result.status = result.questions.length >= count ? 'COMPLETED' : 'PARTIAL_SUCCESS';
      result.finalized_at = new Date().toISOString();
      result.frozen = true;
      if (result.status === 'PARTIAL_SUCCESS') {
        result.warnings.push(`Finalized ${result.questions.length} defensible questions from a requested ${count}; unsupported or low-quality candidates were omitted.`);
      }
      await this.logger?.record('buyer_intent_completed', {
        projectId: input.projectId,
        status: result.status,
        questionCount: result.questions.length,
        candidateCount: result.candidate_count,
        durationMs: Date.now() - started,
        model: this.extractor.model,
      });
      return this.repository ? this.repository.finalize(runId, result) : result;
    } catch (error) {
      if (result.frozen) throw error;
      const message = error instanceof Error ? error.message : String(error);
      result.status = 'FAILED';
      result.warnings.push(`Buyer intent generation failed: ${message}`);
      await this.logger?.record('buyer_intent_failed', { projectId: input.projectId, durationMs: Date.now() - started });
      return this.repository ? this.repository.fail(runId, result, message) : result;
    }
  }
}
