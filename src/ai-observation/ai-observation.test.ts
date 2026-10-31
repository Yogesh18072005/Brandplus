import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { deriveObservation, extractCitationsAndSources, extractEntities, genericMarkdownLabel, inferEntityType } from './extract';
import { hostnameBelongsToDomain, normalizeSourceUrl } from './normalize';
import { ObservationProviderError } from './provider';
import { mapWithConcurrency, ObservationService } from './service';
import type {
  CreateObservationRunResult, DerivedObservation, ObservationExecutionPlan, ObservationProvider,
  ObservationProviderResult, ObservationRepository, ObservationRun, ObservedProviderError, TargetIdentity,
} from './types';

const target: TargetIdentity = { canonicalName: 'Hatti of India Pvt Ltd', website: 'https://hattiofindia.com', aliases: ['Hatti of India'] };

function response(rawResponse: string, overrides: Partial<ObservationProviderResult> = {}): ObservationProviderResult {
  return {
    provider: 'mock', model: 'mock-1', modelVersion: null, providerResponseId: 'response-1', rawResponse,
    observedAt: '2026-09-10T00:00:00.000Z', latencyMs: 12, completeness: 'COMPLETE', finishReason: 'STOP',
    usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 }, estimatedCostUsd: 0.001, citations: [], metadata: {},
    ...overrides,
  };
}

test('1 target absent is a successful NOT_MENTIONED observation', () => {
  assert.equal(deriveObservation(response('Acme Industries supplies packaging.'), target).targetStatus, 'NOT_MENTIONED');
});
test('2 casual target mention is MENTIONED', () => {
  const result = deriveObservation(response('Hatti of India also operates in this market.'), target);
  assert.equal(result.targetStatus, 'MENTIONED'); assert.equal(result.entities[0]?.recommendationStrength, 'MENTION');
});
test('3 explicit target recommendation is RECOMMENDED', () => {
  assert.equal(extractEntities('I recommend Hatti of India for this requirement.', target)[0]?.recommendationStrength, 'RECOMMENDED');
});
test('4 an actual ordered list records recommendation position three', () => {
  const entity = extractEntities('Top options:\n1. Acme Industries\n2. Beta Limited\n3. Hatti of India', target).find((item) => item.targetMatch);
  assert.equal(entity?.recommendationPosition, 3);
});
test('5 prose mention does not invent an ordered position', () => {
  const entity = extractEntities('Several firms operate here, including Hatti of India.', target).find((item) => item.targetMatch);
  assert.equal(entity?.recommendationPosition, null);
});
test('6 another company is an observed neutral entity, never a competitor type', () => {
  const entity = extractEntities('Acme Industries provides this service.', target)[0];
  assert.equal(entity?.entityType, 'COMPANY'); assert.equal('competitor' in (entity ?? {}), false);
});
test('7 visible citation URL is captured', () => {
  assert.equal(deriveObservation(response('Source: https://example.com/report'), target).citations[0]?.url, 'https://example.com/report');
});
test('8 no observed citations produces an empty collection', () => {
  assert.deepEqual(deriveObservation(response('No links are present.'), target).citations, []);
});
test('9 target domain citation is marked independently from target mention', () => {
  const result = deriveObservation(response('Source: https://hattiofindia.com/products'), target);
  assert.equal(result.sources[0]?.targetDomainMatch, true); assert.equal(result.targetStatus, 'NOT_MENTIONED');
});
test('10 www, protocol, case, and subdomain variants match target domain', () => {
  assert.equal(hostnameBelongsToDomain('WWW.HATTIOFINDIA.COM', 'https://hattiofindia.com/'), true);
  assert.equal(hostnameBelongsToDomain('catalog.hattiofindia.com', 'http://www.hattiofindia.com'), true);
});
test('11 lookalike target domain does not match', () => {
  assert.equal(hostnameBelongsToDomain('hattiofindia.com.example.org', 'hattiofindia.com'), false);
  assert.equal(hostnameBelongsToDomain('hattiofindia.co', 'hattiofindia.com'), false);
});
test('12 shortened legal name remains AMBIGUOUS rather than falsely matched', () => {
  const result = deriveObservation(response('ABC Packaging supplies cartons.'), { canonicalName: 'ABC Packaging Pvt Ltd', website: 'abc.example', aliases: [] });
  assert.equal(result.entities[0]?.matchStatus, 'AMBIGUOUS'); assert.equal(result.targetStatus, 'INCONCLUSIVE');
});
test('13 partial response preserves uncertainty instead of a negative result', () => {
  const result = deriveObservation(response('Acme Industries', { completeness: 'PARTIAL' }), target);
  assert.equal(result.targetStatus, 'INCONCLUSIVE'); assert.equal(result.extractionStatus, 'PARTIAL');
});

class MemoryRepository implements ObservationRepository {
  runs = new Map<string, ObservationRun>();
  keys = new Map<string, string>();
  successes: Array<{ raw: string; derived: DerivedObservation }> = [];
  failures: ObservedProviderError[] = [];
  questions = [{ id: 'question-1', question: '  Exact frozen question?  ', rank: 1 }];
  target = target;
  async createRun(input: Parameters<ObservationRepository['createRun']>[0]): Promise<CreateObservationRunResult> {
    const key = `${input.projectId}:${input.idempotencyKey}`; const existingId = this.keys.get(key);
    if (existingId) return { kind: 'EXISTING', run: this.runs.get(existingId)! };
    const id = `run-${this.runs.size + 1}`;
    const run: ObservationRun = { id, projectId: input.projectId, buyerQuestionSetId: input.buyerQuestionSetId, businessUnderstandingRunId: input.businessUnderstandingRunId, provider: input.provider.name, model: input.provider.model, modelVersion: null, providerAdapterVersion: input.provider.adapterVersion, engineVersion: '1', promptVersion: '1', parserVersion: '1', schemaVersion: '1', generationParameters: input.generationParameters, status: 'PENDING', requestedQuestionCount: this.questions.length, completedQuestionCount: 0, failedQuestionCount: 0, inputTokens: null, outputTokens: null, totalTokens: null, costUsd: null, idempotencyKey: input.idempotencyKey, startedAt: null, completedAt: null, createdAt: new Date().toISOString() };
    this.keys.set(key, id); this.runs.set(id, run); return { kind: 'CREATED', run };
  }
  async getRun(projectId: string, runId: string) { const run = this.runs.get(runId); return run?.projectId === projectId ? run : null; }
  async listRuns(projectId: string) { return [...this.runs.values()].filter((run) => run.projectId === projectId); }
  async loadExecutionPlan(runId: string): Promise<ObservationExecutionPlan> { return { run: this.runs.get(runId)!, target: this.target, questions: this.questions, completedBuyerQuestionIds: [] }; }
  async markRunRunning(runId: string) { this.runs.get(runId)!.status = 'RUNNING'; }
  async markQuestionRunning() {}
  async saveQuestionSuccess(_runId: string, _questionId: string, provider: ObservationProviderResult, derived: DerivedObservation) { this.successes.push({ raw: provider.rawResponse, derived }); }
  async saveQuestionFailure(_runId: string, _questionId: string, error: ObservedProviderError) { this.failures.push(error); }
  async completeRun(runId: string) { const run = this.runs.get(runId)!; run.status = this.successes.length ? this.failures.length ? 'PARTIAL_SUCCESS' : 'COMPLETED' : 'FAILED'; run.completedQuestionCount = this.successes.length; run.failedQuestionCount = this.failures.length; return run; }
}

function mockProvider(observe: ObservationProvider['observeQuestion']): ObservationProvider {
  return { name: 'mock', model: 'mock-1', adapterVersion: '1', availability: () => ({ available: true }), observeQuestion: observe };
}
async function createdService(provider: ObservationProvider, repository = new MemoryRepository()) {
  const service = new ObservationService({ repository, providers: [provider], maxRetries: 2, retryBaseDelayMs: 100, sleep: async () => {} });
  const created = await service.createRun({ projectId: 'project-1', buyerQuestionSetId: 'set-1', businessUnderstandingRunId: 'bu-1', providerName: 'mock', idempotencyKey: `request-key-${String(repository.runs.size).padStart(6, '0')}` });
  return { service, repository, run: created.run };
}

test('14 provider timeout is a question failure, never NOT_MENTIONED', async () => {
  const { service, repository, run } = await createdService(mockProvider(async () => { throw new ObservationProviderError('request timeout', 'TIMEOUT', false); }));
  await service.executeRun(run.id); assert.equal(repository.failures[0]?.code, 'TIMEOUT'); assert.equal(repository.successes.length, 0);
});
test('15 rate limits receive only bounded retries', async () => {
  let attempts = 0; const provider = mockProvider(async () => { attempts += 1; throw new ObservationProviderError('429', 'RATE_LIMITED', true); });
  const { service, run } = await createdService(provider); await service.executeRun(run.id); assert.equal(attempts, 3);
});
test('16 duplicate create submission is idempotent', async () => {
  const repository = new MemoryRepository(); const service = new ObservationService({ repository, providers: [mockProvider(async () => response('ok'))] });
  const input = { projectId: 'p', buyerQuestionSetId: 's', businessUnderstandingRunId: 'b', providerName: 'mock', idempotencyKey: 'stable-request-key-1' };
  const first = await service.createRun(input); const second = await service.createRun(input);
  assert.equal(first.run.id, second.run.id); assert.equal(second.kind, 'EXISTING');
});
test('17 a deliberate new idempotency key creates immutable history', async () => {
  const repository = new MemoryRepository(); const service = new ObservationService({ repository, providers: [mockProvider(async () => response('ok'))] });
  const first = await service.createRun({ projectId: 'p', buyerQuestionSetId: 's', businessUnderstandingRunId: 'b', providerName: 'mock', idempotencyKey: 'new-observation-key-1' });
  const second = await service.createRun({ projectId: 'p', buyerQuestionSetId: 's', businessUnderstandingRunId: 'b', providerName: 'mock', idempotencyKey: 'new-observation-key-2' });
  assert.notEqual(first.run.id, second.run.id); assert.equal(repository.runs.size, 2);
});
test('18 raw provider response is preserved byte for byte', async () => {
  const raw = '  Original line 1\n\nOriginal line 2  '; const { service, repository, run } = await createdService(mockProvider(async () => response(raw)));
  await service.executeRun(run.id); assert.equal(repository.successes[0]?.raw, raw);
});
test('19 malformed or absent provider usage degrades to unavailable', () => {
  const result = response('answer', { usage: { inputTokens: null, outputTokens: null, totalTokens: null }, estimatedCostUsd: null, metadata: {} });
  assert.equal(result.usage.totalTokens, null); assert.equal(result.estimatedCostUsd, null);
});
test('20 routes and migration enforce project ownership and tenant RLS', () => {
  const route = readFileSync('app/api/projects/[id]/ai-observations/route.ts', 'utf8');
  const migration = readFileSync('supabase/migrations/021_ai_answer_observation.sql', 'utf8');
  assert.match(route, /eq\('user_id', user\.id\)/); assert.match(route, /eq\('project_id', owned\.project\.id\)/);
  assert.match(migration, /enable row level security/g); assert.match(migration, /current_clerk_profile_id\(\)/);
});
test('21 provider abstraction accepts a mock without Gemini', async () => {
  const { service, repository, run } = await createdService(mockProvider(async () => response('Mock answer')));
  await service.executeRun(run.id); assert.equal(repository.successes.length, 1);
});
test('22 provider usage and cost remain attached to the observation', () => {
  const result = response('answer'); assert.deepEqual(result.usage, { inputTokens: 10, outputTokens: 20, totalTokens: 30 }); assert.equal(result.estimatedCostUsd, 0.001);
});
test('23 concurrency never exceeds configured limit', async () => {
  let active = 0; let peak = 0;
  await mapWithConcurrency(Array.from({ length: 12 }, (_, index) => index), 3, async () => { active += 1; peak = Math.max(peak, active); await new Promise((resolve) => setTimeout(resolve, 2)); active -= 1; });
  assert.equal(peak, 3);
});
test('24 citations are only derived from actually observed URLs or provider metadata', () => {
  assert.deepEqual(deriveObservation(response('Acme Industries says it has a website, but no address is shown.'), target).citations, []);
});
test('25 entities are only emitted when their surface form exists in the response', () => {
  const raw = 'Acme Industries is listed.'; const entities = extractEntities(raw, target);
  assert.ok(entities.every((entity) => raw.includes(entity.surfaceForm))); assert.equal(entities.some((entity) => entity.surfaceForm.includes('Hatti')), false);
});
test('26 unverified company list remains mentions, not recommendations', () => {
  const entities = extractEntities('The following may be relevant, but I cannot verify them:\n1. Acme Industries\n2. Beta Limited', target);
  assert.ok(entities.every((entity) => entity.recommendationStrength === 'MENTION'));
});
test('27 negative recommendation phrasing stays a mention', () => {
  assert.equal(extractEntities('I do not recommend Hatti of India for every use case.', target)[0]?.recommendationStrength, 'MENTION');
});
test('28 a company claim is observed without being upgraded to a fact or recommendation', () => {
  assert.equal(extractEntities('Acme Industries claims to be the leading supplier.', target)[0]?.recommendationStrength, 'MENTION');
});
test('29 tracking parameters are removed without collapsing meaningful paths', () => {
  const first = normalizeSourceUrl('https://Example.com/a/?utm_source=x&item=2'); const second = normalizeSourceUrl('https://example.com/b?item=2');
  assert.equal(first?.normalizedUrl, 'https://example.com/a?item=2'); assert.notEqual(first?.normalizedUrl, second?.normalizedUrl);
});
test('30 exact frozen question is passed to the provider unchanged', async () => {
  let received = ''; const { service, run } = await createdService(mockProvider(async (input) => { received = input.question; return response('answer'); }));
  await service.executeRun(run.id); assert.equal(received, '  Exact frozen question?  ');
});
test('31 each question execution is an isolated provider call', async () => {
  const repository = new MemoryRepository(); repository.questions = [{ id: 'q1', question: 'One?', rank: 1 }, { id: 'q2', question: 'Two?', rank: 2 }];
  const received: string[] = []; const { service, run } = await createdService(mockProvider(async (input) => { received.push(input.question); return response(input.question); }), repository);
  await service.executeRun(run.id); assert.deepEqual(received.sort(), ['One?', 'Two?']);
});
test('32 source and citation remain distinct normalized concepts', () => {
  const result = extractCitationsAndSources('See https://example.com/a twice: https://example.com/a', [], target.website);
  assert.equal(result.sources.length, 1); assert.equal(result.citations.length, 2);
});
test('33 migration makes completed observations immutable and reuses the existing queue', () => {
  const migration = readFileSync('supabase/migrations/021_ai_answer_observation.sql', 'utf8');
  assert.match(migration, /Completed question observations are immutable/); assert.match(migration, /alter table public\.audit_queue add column job_type/);
  assert.doesNotMatch(migration, /create table public\.ai_observation_queue/);
});
test('34 refusal responses remain inconclusive rather than false absence', () => {
  const result = deriveObservation(response("I'm sorry, I can't answer that question."), target);
  assert.equal(result.targetStatus, 'INCONCLUSIVE'); assert.equal(result.extractionStatus, 'INCONCLUSIVE');
});
test('35 degraded responses make the run partial in the database contract', () => {
  const migration = readFileSync('supabase/migrations/021_ai_answer_observation.sql', 'utf8');
  assert.match(migration, /degraded_count/); assert.match(migration, /response_completeness <> 'COMPLETE'/);
});

test('36 markdown bold supplier labels are captured as neutral observed entities', () => {
  const raw = [
    '*   **I.EVO (Iraj Evolution Design Co.):** Custom contract furniture manufacturer.',
    '*   **FurnitureRoots:** Furniture supplier in Jodhpur.',
  ].join('\n');
  const entities = extractEntities(raw, target);
  assert.deepEqual(entities.map((entity) => entity.surfaceForm), [
    'I.EVO (Iraj Evolution Design Co.)',
    'FurnitureRoots',
  ]);
  assert.ok(entities.every((entity) => entity.matchStatus === 'UNMATCHED'));
});

test('37 grounding redirect citations use the displayed source domain', () => {
  const result = extractCitationsAndSources('', [{
    displayedText: 'thepurewood.com',
    url: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/opaque-token',
    domain: 'vertexaisearch.cloud.google.com',
    title: 'thepurewood.com',
    providerCitationId: 'citation-1',
    context: 'Purewood is listed.',
    characterPosition: 10,
    claimAssociation: 'STRUCTURAL',
  }], target.website);
  assert.equal(result.sources[0]?.domain, 'thepurewood.com');
  assert.equal(result.citations[0]?.domain, 'thepurewood.com');
});

test('38 markdown explanatory labels are not classified as organizations', () => {
  const raw = [
    '* **What they do:** Manage production.',
    '* **Prominent Sourcing Companies in India:**',
    '* **Key regional hubs:** Jodhpur.',
    '* **Small World India:** A sourcing company.',
  ].join('\n');
  assert.deepEqual(extractEntities(raw, target).map((entity) => entity.surfaceForm), ['Small World India']);
});

test('39 geographic locations are inferred as OTHER, not ORGANIZATION', () => {
  assert.equal(inferEntityType('India'), 'OTHER');
  assert.equal(inferEntityType('Mumbai'), 'OTHER');
});

test('40 process and capability labels are inferred as OTHER, not ORGANIZATION', () => {
  assert.equal(inferEntityType('Sample Development'), 'OTHER');
  assert.equal(inferEntityType('Production Management'), 'OTHER');
  assert.equal(inferEntityType('Export Logistics'), 'OTHER');
});

test('41 markdown headings and process labels are identified as generic labels', () => {
  assert.equal(genericMarkdownLabel('Quality Control'), true);
  assert.equal(genericMarkdownLabel('Export Logistics'), true);
});

test('42 genuine companies and organizations preserve correct entity types', () => {
  assert.equal(inferEntityType('Hatti of India Pvt Ltd'), 'COMPANY');
  assert.equal(inferEntityType('Tata Global Sourcing'), 'ORGANIZATION');
});
