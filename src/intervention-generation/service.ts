import { buildInterventionContext, generateInterventions } from './generate';
import { InterventionGenerationError } from './gemini-generator';
import { interventionResultHash, interventionSourceHashes } from './hash';
import {
  INTERVENTION_GENERATION_PARAMETERS,
} from './prompt';
import {
  INTERVENTION_MAX_GENERATION_ATTEMPTS,
  type CreateInterventionRunResult,
  type InterventionGenerator,
  type InterventionRepository,
  type InterventionRun,
  type InterventionSourceBundle,
} from './types';

export class InterventionInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InterventionInputError';
  }
}

export interface InterventionGenerationServiceOptions {
  repository: InterventionRepository;
  generator: InterventionGenerator;
  maximumAttempts?: number;
  onProgress?: (metadata: { attempt: number; eligibleGaps: number; accepted: number; rejected: number }) => Promise<void> | void;
}

export function validateInterventionSourceBundle(bundle: InterventionSourceBundle): void {
  const { projectId, diagnosisRun, understanding, questionSet, observationRun } = bundle;
  if (diagnosisRun.projectId !== projectId || understanding.project_id !== projectId
    || questionSet.project_id !== projectId || observationRun.projectId !== projectId) {
    throw new InterventionInputError('Engine 05 inputs must belong to the same project');
  }
  if (!['COMPLETED', 'PARTIAL_SUCCESS'].includes(diagnosisRun.status)) {
    throw new InterventionInputError('A finalized usable Engine 04 diagnosis run is required');
  }
  if (!['SUCCESS', 'PARTIAL_SUCCESS'].includes(understanding.status)) {
    throw new InterventionInputError('A usable Engine 01 Business Understanding is required');
  }
  if (!questionSet.frozen || !questionSet.finalized_at || !['COMPLETED', 'PARTIAL_SUCCESS'].includes(questionSet.status)) {
    throw new InterventionInputError('A finalized frozen Engine 02 Buyer Question Set is required');
  }
  if (!['COMPLETED', 'PARTIAL_SUCCESS'].includes(observationRun.status)) {
    throw new InterventionInputError('A finalized Engine 03 Observation run is required');
  }
  if (diagnosisRun.businessUnderstandingRunId !== questionSet.business_understanding_run_id
    || diagnosisRun.businessUnderstandingRunId !== observationRun.businessUnderstandingRunId) {
    throw new InterventionInputError('Engine 05 inputs do not share the same Engine 01 run');
  }
  if (diagnosisRun.buyerQuestionSetId !== observationRun.buyerQuestionSetId) {
    throw new InterventionInputError('Engine 05 inputs do not share the same Engine 02 question set');
  }
  if (diagnosisRun.observationRunId !== observationRun.id) {
    throw new InterventionInputError('Engine 05 diagnosis does not reference the supplied Engine 03 run');
  }
  if (diagnosisRun.businessUnderstandingVersion !== understanding.version
    || diagnosisRun.businessUnderstandingContentHash !== understanding.content_hash
    || diagnosisRun.buyerQuestionSetVersion !== questionSet.version
    || diagnosisRun.observationEngineVersion !== observationRun.engineVersion) {
    throw new InterventionInputError('Engine 05 upstream versions do not match the Engine 04 snapshot');
  }
  if (diagnosisRun.diagnoses.length !== questionSet.questions.length) {
    throw new InterventionInputError('Engine 04 run does not contain one diagnosis record per frozen question');
  }
  const questions = new Map(questionSet.questions.map((question) => [question.id, question.question]));
  const observations = new Map(observationRun.observations.map((observation) => [observation.id, observation]));
  const seen = new Set<string>();
  for (const diagnosis of diagnosisRun.diagnoses) {
    if (seen.has(diagnosis.buyerQuestionId)) throw new InterventionInputError('Engine 04 contains duplicate question diagnoses');
    seen.add(diagnosis.buyerQuestionId);
    if (questions.get(diagnosis.buyerQuestionId) !== diagnosis.exactQuestion) {
      throw new InterventionInputError('Engine 04 changed a frozen buyer question');
    }
    const observation = observations.get(diagnosis.questionObservationId);
    if (!observation || observation.buyerQuestionId !== diagnosis.buyerQuestionId || observation.exactQuestion !== diagnosis.exactQuestion) {
      throw new InterventionInputError('Engine 04 diagnosis does not trace to the exact Engine 03 observation');
    }
  }
}

export class InterventionGenerationService {
  private readonly maximumAttempts: number;

  constructor(private readonly options: InterventionGenerationServiceOptions) {
    this.maximumAttempts = Math.max(1, Math.min(INTERVENTION_MAX_GENERATION_ATTEMPTS, options.maximumAttempts ?? INTERVENTION_MAX_GENERATION_ATTEMPTS));
  }

  async createRun(input: { projectId: string; diagnosisRunId: string; idempotencyKey: string }): Promise<CreateInterventionRunResult> {
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/.test(input.idempotencyKey)) {
      throw new InterventionInputError('Idempotency-Key must contain 16 to 128 safe characters');
    }
    const bundle = await this.options.repository.loadSourceBundle(input.projectId, input.diagnosisRunId);
    if (!bundle) throw new InterventionInputError('Finalized Engine 04 diagnosis run not found');
    validateInterventionSourceBundle(bundle);
    const hashes = interventionSourceHashes(bundle);
    return this.options.repository.createRun({
      bundle,
      idempotencyKey: input.idempotencyKey,
      generator: this.options.generator,
      generationParameters: INTERVENTION_GENERATION_PARAMETERS,
      ...hashes,
    });
  }

  async executeRun(runId: string): Promise<InterventionRun> {
    const plan = await this.options.repository.loadExecutionPlan(runId);
    validateInterventionSourceBundle(plan.bundle);
    await this.options.repository.markRunRunning(runId);
    const context = buildInterventionContext(plan.bundle);
    const eligibleGapCount = context.eligibleDiagnoses.reduce((sum, diagnosis) => sum + diagnosis.gaps.filter((gap) =>
      !['INACCESSIBLE', 'NOT_SEARCHED', 'UNKNOWN'].includes(gap.scope)).length, 0);
    if (eligibleGapCount === 0) {
      await this.options.repository.saveInterventions(runId, []);
      return this.options.repository.completeRun(runId, {
        resultHash: interventionResultHash([]), eligibleGapCount: 0, rejectedCandidateCount: 0,
        llmCallCount: 0, inputTokens: 0, outputTokens: 0, costUsd: 0,
        modelVersion: null,
      });
    }

    let llmCallCount = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    let costUsd = 0;
    let modelVersion: string | null = null;
    let rejectedCandidateCount = 0;
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.maximumAttempts; attempt += 1) {
      try {
        const generated = await this.options.generator.generate(context);
        llmCallCount += 1;
        inputTokens += generated.usage.inputTokens;
        outputTokens += generated.usage.outputTokens;
        costUsd += generated.usage.costUsd;
        modelVersion = generated.usage.modelVersion ?? modelVersion;
        const finalized = generateInterventions(generated.proposals, context);
        rejectedCandidateCount += finalized.rejectedCount;
        await this.options.onProgress?.({ attempt, eligibleGaps: eligibleGapCount, accepted: finalized.interventions.length, rejected: rejectedCandidateCount });
        if (!finalized.interventions.length) {
          lastError = new InterventionGenerationError('No evidence-backed intervention candidate survived deterministic validation');
          continue;
        }
        await this.options.repository.saveInterventions(runId, finalized.interventions);
        return this.options.repository.completeRun(runId, {
          resultHash: interventionResultHash(finalized.interventions), eligibleGapCount, rejectedCandidateCount,
          llmCallCount, inputTokens, outputTokens, costUsd, modelVersion,
        });
      } catch (error) {
        lastError = error;
        if (error instanceof InterventionGenerationError) {
          llmCallCount += error.usage.inputTokens || error.usage.outputTokens ? 1 : 0;
          inputTokens += error.usage.inputTokens;
          outputTokens += error.usage.outputTokens;
          costUsd += error.usage.costUsd;
          modelVersion = error.usage.modelVersion ?? modelVersion;
          await this.options.onProgress?.({ attempt, eligibleGaps: eligibleGapCount, accepted: 0, rejected: rejectedCandidateCount });
          if (!error.retryable) break;
          continue;
        }
        throw error;
      }
    }
    const message = lastError instanceof Error ? lastError.message : 'Intervention generation failed';
    await this.options.repository.failRun(runId, message.slice(0, 2_000));
    throw new InterventionGenerationError(message, {
      retryable: false,
      usage: { inputTokens, outputTokens, costUsd, modelVersion: null },
    });
  }
}
