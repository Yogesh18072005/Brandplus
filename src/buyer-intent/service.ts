import { stableId } from '@/src/business-understanding/normalize';
import { BUYER_INTENT_PROMPT_VERSION } from './prompts';
import { deduplicateCandidates, filterCandidates, finalizeQuestions } from './normalize';
import { GeminiBuyerIntentExtractor } from './extractor';
import { config } from '@/src/config';
import { ollamaCall } from '@/src/ollama-client';
import { buyerIntentBusinessEntities } from './schema';
import type { BusinessEntity } from '@/src/business-understanding/types';
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


const BUYER_INTENT_BATCH_SIZE = 8;
const BUYER_INTENT_EVALUATION_BATCH_SIZE = 5;

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) batches.push(items.slice(index, index + size));
  return batches;
}

/** Keep only entities and their own linked evidence in each model request. */
function understandingForEntities(
  understanding: BuyerIntentInput['understanding'],
  entities: BusinessEntity[],
): BuyerIntentInput['understanding'] {
  const entityIds = new Set(entities.map((entity) => entity.id));
  const evidenceIds = new Set(entities.flatMap((entity) => entity.evidence_ids));
  return {
    ...understanding,
    products: understanding.products.filter((item) => entityIds.has(item.id)),
    services: understanding.services.filter((item) => entityIds.has(item.id)),
    capabilities: understanding.capabilities.filter((item) => entityIds.has(item.id)),
    buyer_types: understanding.buyer_types.filter((item) => entityIds.has(item.id)),
    industries: understanding.industries.filter((item) => entityIds.has(item.id)),
    use_cases: understanding.use_cases.filter((item) => entityIds.has(item.id)),
    geographies: understanding.geographies.filter((item) => entityIds.has(item.id)),
    certifications: understanding.certifications.filter((item) => entityIds.has(item.id)),
    business_model_signals: understanding.business_model_signals.filter((item) => entityIds.has(item.id)),
    evidence: understanding.evidence.filter((item) => evidenceIds.has(item.id)),
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
    const provider = config.buyerIntentProvider;
    if (options.extractor) {
      this.extractor = options.extractor;
    } else if (provider === 'ollama') {
      this.extractor = new GeminiBuyerIntentExtractor(ollamaCall, `ollama:${config.ollamaModel}`);
    } else if (provider === 'gemini') {
      this.extractor = new GeminiBuyerIntentExtractor();
    } else {
      throw new Error(`Unsupported BUYER_INTENT_PROVIDER: ${provider}. Use ollama or gemini.`);
    }
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
      // Break the canonical grounding graph into small, evidence-preserving batches.
      // Each entity travels only with evidence explicitly linked to it.
      const evidenceIds = new Set(input.understanding.evidence.map((item) => item.id));
      const groundedEntities = buyerIntentBusinessEntities(input.understanding)
        .filter((entity) => entity.evidence_ids.some((id) => evidenceIds.has(id)));
      const entityBatches = chunk(groundedEntities, BUYER_INTENT_BATCH_SIZE);
      if (!entityBatches.length) throw new Error('Business Understanding contains no entities with linked supporting evidence');

      const candidateTarget = Math.min(25, Math.max(10, count + 5));
      const perBatchTarget = Math.max(2, Math.ceil(candidateTarget / entityBatches.length));
      const batchResults: Array<{ entities: BusinessEntity[]; candidates: ReturnType<typeof filterCandidates>['accepted']; failed: boolean }> = [];
      let generated: BuyerQuestionCandidate[] = [];

      for (let batchIndex = 0; batchIndex < entityBatches.length; batchIndex++) {
        const entities = entityBatches[batchIndex]!;
        const batchUnderstanding = understandingForEntities(input.understanding, entities);
        try {
          const batchCandidates = await this.extractor.generateCandidates(batchUnderstanding, perBatchTarget);
          const namespaced = batchCandidates.map((item) => ({
            ...item,
            id: (`b${batchIndex + 1}-${item.id}`).slice(0, 120),
          }));
          generated.push(...namespaced);
          batchResults.push({ entities, candidates: filterCandidates(namespaced, input.understanding).accepted, failed: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          result.warnings.push(`Buyer-intent batch ${batchIndex + 1}/${entityBatches.length} failed: ${message.slice(0, 240)}`);
          batchResults.push({ entities, candidates: [], failed: true });
        }
      }

      let filtered = filterCandidates(generated, input.understanding);
      const minimumDistinctCandidates = Math.min(count, MINIMUM_AUDIT_QUESTIONS);
      const distinctAcceptedBeforeRetry = deduplicateCandidates(filtered.accepted).length;
      if (distinctAcceptedBeforeRetry < minimumDistinctCandidates) {
        const reasons = [...new Set(filtered.rejected.map((item) => item.reason))].slice(0, 6).join('; ');
        const examples = generated.slice(0, 8).map((item) => item.question.replace(/\s+/g, ' ').slice(0, 140));
        const feedback = [
          'The previous candidate batches did not produce enough distinct, grounded buyer questions.',
          'Distinct grounded candidates: ' + distinctAcceptedBeforeRetry + '; minimum required: ' + minimumDistinctCandidates + '.',
          reasons ? 'Rejection reasons: ' + reasons : 'The batches may contain repeated or overly similar questions.',
          'Previous questions to avoid: ' + examples.join(' | '),
          'Generate additional, genuinely different buyer questions. Do not repeat or lightly rephrase previous questions, do not mention the target business name, and preserve exact entity/evidence ID grounding.',
        ].join(' ');
        result.warnings.push(
          `First-pass generation produced only ${distinctAcceptedBeforeRetry} distinct grounded candidates; retrying successful entity batches once.`,
        );

        const retryCandidates: BuyerQuestionCandidate[] = [];
        for (let batchIndex = 0; batchIndex < batchResults.length; batchIndex++) {
          const batch = batchResults[batchIndex]!;
          if (batch.failed) continue; // A timed-out batch is not immediately repeated.
          const batchUnderstanding = understandingForEntities(input.understanding, batch.entities);
          try {
            const retry = await this.extractor.generateCandidates(batchUnderstanding, perBatchTarget, feedback);
            retryCandidates.push(...retry.map((item) => ({
              ...item,
              id: (`retry-b${batchIndex + 1}-${item.id}`).slice(0, 120),
            })));
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            result.warnings.push(`Buyer-intent retry batch ${batchIndex + 1} failed: ${message.slice(0, 200)}`);
          }
        }
        generated = [...generated, ...retryCandidates];
        filtered = filterCandidates(generated, input.understanding);
      }
      result.candidate_count = generated.length;
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
        const rejectionSamples = filtered.rejected.slice(0, 5).map((rejection) => {
          const rejectedCandidate = generated.find((candidate) => candidate.id === rejection.id);
          const question = rejectedCandidate?.question.replace(/\s+/g, ' ').slice(0, 160) ?? `candidate id ${rejection.id}`;
          return `"${question}" [${rejection.reason}]`;
        });
        result.warnings.push(
          `Deterministic filtering rejected ${filtered.rejected.length} candidates: ${[...summary].map(([reason, total]) => `${reason} (${total})`).join('; ')}. Samples: ${rejectionSamples.join(' | ')}`,
        );
      }
      if (!distinct.length) throw new Error('No grounded buyer-question candidates passed deterministic validation');

      await this.logger?.record('buyer_intent_candidates_filtered', {
        projectId: input.projectId,
        generated: generated.length,
        accepted: distinct.length,
        rejected: deterministicRejections,
      });
      const evaluations: Awaited<ReturnType<BuyerIntentExtractor['evaluateCandidates']>> = [];
      const entityById = new Map(buyerIntentBusinessEntities(input.understanding).map((entity) => [entity.id, entity]));
      for (const candidateBatch of chunk(distinct, BUYER_INTENT_EVALUATION_BATCH_SIZE)) {
        const referencedEntities = [...new Set(candidateBatch.flatMap((item) => item.supporting_business_entity_ids))]
          .map((id) => entityById.get(id))
          .filter((item): item is BusinessEntity => Boolean(item));
        const evaluationUnderstanding = understandingForEntities(input.understanding, referencedEntities);
        const batchEvaluations = await this.extractor.evaluateCandidates(evaluationUnderstanding, candidateBatch);
        evaluations.push(...batchEvaluations);
      }
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
