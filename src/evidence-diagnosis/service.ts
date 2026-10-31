import { diagnoseQuestion } from './diagnose';
import { diagnosisSourceHashes } from './hash';
import type {
  CreateDiagnosisRunResult,
  DiagnosisRepository,
  DiagnosisSourceBundle,
  EvidenceDiagnosisRun,
} from './types';

export class EvidenceDiagnosisInputError extends Error {}

export interface EvidenceDiagnosisServiceOptions {
  repository: DiagnosisRepository;
  concurrency?: number;
  onProgress?: (completed: number, total: number) => Promise<void> | void;
}

async function mapWithConcurrency<T>(
  items: readonly T[],
  concurrency: number,
  work: (item: T) => Promise<void>,
): Promise<void> {
  const limit = Math.max(1, Math.min(Math.floor(concurrency), items.length || 1));
  let cursor = 0;
  async function worker(): Promise<void> {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;
      await work(items[index]!);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
}

export function validateDiagnosisSourceBundle(bundle: DiagnosisSourceBundle): void {
  const { projectId, businessUnderstandingRunId, understanding, questionSet, observationRun } = bundle;
  if (understanding.project_id !== projectId || questionSet.project_id !== projectId || observationRun.projectId !== projectId) {
    throw new EvidenceDiagnosisInputError('Engine 04 inputs must belong to the same project');
  }
  if (questionSet.business_understanding_run_id !== businessUnderstandingRunId
    || observationRun.businessUnderstandingRunId !== businessUnderstandingRunId) {
    throw new EvidenceDiagnosisInputError('Engine 04 inputs do not reference the same Business Understanding run');
  }
  if (observationRun.buyerQuestionSetId !== bundle.buyerQuestionSetRecordId) {
    throw new EvidenceDiagnosisInputError('Observation run does not reference the supplied Buyer Question Set');
  }
  if (!['SUCCESS', 'PARTIAL_SUCCESS'].includes(understanding.status)) {
    throw new EvidenceDiagnosisInputError('A usable Business Understanding result is required');
  }
  if (!questionSet.frozen || !questionSet.finalized_at || !questionSet.questions.length
    || !['COMPLETED', 'PARTIAL_SUCCESS'].includes(questionSet.status)) {
    throw new EvidenceDiagnosisInputError('A non-empty frozen Buyer Question Set is required');
  }
  if (!['COMPLETED', 'PARTIAL_SUCCESS'].includes(observationRun.status)) {
    throw new EvidenceDiagnosisInputError('A completed or partially successful Observation run is required');
  }
  if (questionSet.business_understanding_version !== understanding.version
    || questionSet.business_understanding_content_hash !== understanding.content_hash) {
    throw new EvidenceDiagnosisInputError('Buyer Question Set Business Understanding snapshot does not match Engine 01');
  }

  const observations = observationRun.observations;
  if (observations.length !== questionSet.questions.length) {
    throw new EvidenceDiagnosisInputError('Observation run does not contain one record for every frozen buyer question');
  }
  const observationByQuestion = new Map(observations.map((item) => [item.buyerQuestionId, item]));
  if (observationByQuestion.size !== observations.length) {
    throw new EvidenceDiagnosisInputError('Observation run contains duplicate buyer-question records');
  }
  for (const question of questionSet.questions) {
    const observation = observationByQuestion.get(question.id);
    if (!observation || observation.exactQuestion !== question.question) {
      throw new EvidenceDiagnosisInputError('Observation text or identity does not match the frozen Buyer Question Set');
    }
    if (!['COMPLETED', 'FAILED'].includes(observation.status)) {
      throw new EvidenceDiagnosisInputError('Observation run contains unfinished question records');
    }
  }
}

export class EvidenceDiagnosisService {
  private readonly repository: DiagnosisRepository;
  private readonly concurrency: number;
  private readonly onProgress?: EvidenceDiagnosisServiceOptions['onProgress'];

  constructor(options: EvidenceDiagnosisServiceOptions) {
    this.repository = options.repository;
    this.concurrency = Math.max(1, Math.min(8, options.concurrency ?? Number(process.env.DIAGNOSIS_CONCURRENCY ?? 4)));
    this.onProgress = options.onProgress;
  }

  async createRun(input: {
    projectId: string;
    observationRunId: string;
    idempotencyKey: string;
  }): Promise<CreateDiagnosisRunResult> {
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/.test(input.idempotencyKey)) {
      throw new EvidenceDiagnosisInputError('Idempotency-Key must contain 16 to 128 safe characters');
    }
    const bundle = await this.repository.loadSourceBundle(input.projectId, input.observationRunId);
    if (!bundle) throw new EvidenceDiagnosisInputError('Completed Observation run not found');
    validateDiagnosisSourceBundle(bundle);
    const hashes = diagnosisSourceHashes(bundle);
    return this.repository.createRun({ bundle, idempotencyKey: input.idempotencyKey, ...hashes });
  }

  async executeRun(runId: string): Promise<EvidenceDiagnosisRun> {
    const plan = await this.repository.loadExecutionPlan(runId);
    validateDiagnosisSourceBundle(plan.bundle);
    await this.repository.markRunRunning(runId);

    const completed = new Set(plan.completedQuestionIds);
    const observationByQuestion = new Map(plan.bundle.observationRun.observations.map((item) => [item.buyerQuestionId, item]));
    const pending = plan.bundle.questionSet.questions.filter((question) => !completed.has(question.id));
    let progress = completed.size;

    await mapWithConcurrency(pending, this.concurrency, async (question) => {
      await this.repository.markQuestionRunning(runId, question.id);
      try {
        const observation = observationByQuestion.get(question.id);
        if (!observation) throw new Error('Missing validated question observation');
        const diagnosis = diagnoseQuestion({ question, observation, understanding: plan.bundle.understanding });
        await this.repository.saveQuestion(runId, diagnosis);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await this.repository.failQuestion(runId, question.id, message.slice(0, 2_000));
      }
      progress += 1;
      await this.onProgress?.(progress, plan.bundle.questionSet.questions.length);
    });
    return this.repository.completeRun(runId);
  }
}
