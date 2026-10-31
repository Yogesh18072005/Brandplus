import { DEFAULT_OBSERVATION_PARAMETERS, OBSERVATION_SYSTEM_INSTRUCTION } from './prompt';
import { deriveObservation } from './extract';
import { normalizeProviderError, observeWithRetries } from './provider';
import type {
  CreateObservationRunResult,
  ObservationProvider,
  ObservationRepository,
  ObservationRun,
} from './types';

export class ObservationInputError extends Error {}

export interface ObservationServiceOptions {
  repository: ObservationRepository;
  providers: ObservationProvider[];
  concurrency?: number;
  maxRetries?: number;
  retryBaseDelayMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
  onProgress?: (completed: number, total: number) => Promise<void> | void;
}

export async function mapWithConcurrency<T>(
  items: readonly T[],
  concurrency: number,
  work: (item: T, index: number) => Promise<void>,
): Promise<void> {
  const limit = Math.max(1, Math.min(Math.floor(concurrency), items.length || 1));
  let cursor = 0;
  async function worker() {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      await work(items[index]!, index);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
}

export class ObservationService {
  private readonly repository: ObservationRepository;
  private readonly providers: Map<string, ObservationProvider>;
  private readonly concurrency: number;
  private readonly maxRetries: number;
  private readonly retryBaseDelayMs: number;
  private readonly sleep?: (milliseconds: number) => Promise<void>;
  private readonly onProgress?: (completed: number, total: number) => Promise<void> | void;

  constructor(options: ObservationServiceOptions) {
    this.repository = options.repository;
    this.providers = new Map(options.providers.map((provider) => [provider.name, provider]));
    this.concurrency = Math.max(1, Math.min(5, options.concurrency ?? Number(process.env.OBSERVATION_CONCURRENCY ?? 1)));
    this.maxRetries = Math.max(0, Math.min(3, options.maxRetries ?? Number(process.env.OBSERVATION_MAX_RETRIES ?? 2)));
    this.retryBaseDelayMs = Math.max(100, options.retryBaseDelayMs ?? 2_000);
    this.sleep = options.sleep;
    this.onProgress = options.onProgress;
  }

  provider(name: string): ObservationProvider {
    const provider = this.providers.get(name);
    if (!provider) throw new ObservationInputError(`Observation provider "${name}" is not supported`);
    const availability = provider.availability();
    if (!availability.available) throw new ObservationInputError(availability.reason ?? `Observation provider "${name}" is unavailable`);
    return provider;
  }

  async createRun(input: {
    projectId: string;
    buyerQuestionSetId: string;
    businessUnderstandingRunId: string | null;
    providerName: string;
    idempotencyKey: string;
    generationParameters?: Readonly<Record<string, string | number | boolean>>;
  }): Promise<CreateObservationRunResult> {
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/.test(input.idempotencyKey)) {
      throw new ObservationInputError('Idempotency-Key must contain 16 to 128 safe characters');
    }
    const provider = this.provider(input.providerName);
    return this.repository.createRun({
      projectId: input.projectId,
      buyerQuestionSetId: input.buyerQuestionSetId,
      businessUnderstandingRunId: input.businessUnderstandingRunId,
      provider,
      idempotencyKey: input.idempotencyKey,
      generationParameters: { ...DEFAULT_OBSERVATION_PARAMETERS, ...(input.generationParameters ?? {}) },
    });
  }

  async executeRun(runId: string): Promise<ObservationRun> {
    const plan = await this.repository.loadExecutionPlan(runId);
    const provider = this.provider(plan.run.provider);
    await this.repository.markRunRunning(runId);
    const completed = new Set(plan.completedBuyerQuestionIds);
    const pending = plan.questions.filter((question) => !completed.has(question.id));
    let progress = completed.size;

    await mapWithConcurrency(pending, this.concurrency, async (question) => {
      await this.repository.markQuestionRunning(runId, question.id);
      try {
        const response = await observeWithRetries(provider, {
          question: question.question,
          systemInstruction: OBSERVATION_SYSTEM_INSTRUCTION,
          generationParameters: plan.run.generationParameters,
        }, {
          maxRetries: this.maxRetries,
          baseDelayMs: this.retryBaseDelayMs,
          sleep: this.sleep,
        });
        const derived = deriveObservation(response, plan.target);
        await this.repository.saveQuestionSuccess(runId, question.id, response, derived);
      } catch (error) {
        await this.repository.saveQuestionFailure(runId, question.id, normalizeProviderError(error));
      }
      progress += 1;
      await this.onProgress?.(progress, plan.questions.length);
    });
    return this.repository.completeRun(runId);
  }
}
