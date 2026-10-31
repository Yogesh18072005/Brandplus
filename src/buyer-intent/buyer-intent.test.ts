import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import type { BusinessEntity, CanonicalBusinessUnderstanding } from '@/src/business-understanding/types';
import { buyerIntentExtractorTestables, GeminiBuyerIntentExtractor } from './extractor';
import { buyerIntentGrounding } from './prompts';
import { deduplicateCandidates, filterCandidates, finalizeQuestions } from './normalize';
import { validateCandidateBatch, validateCandidateBatchWithOmissions, validateEvaluationBatch } from './schema';
import { BuyerIntentService } from './service';
import type { BeginBuyerIntentRunResult, BuyerIntentExtractor, BuyerIntentRepository, BuyerIntentRunIdentity, BuyerQuestionCandidate, BuyerQuestionEvaluation, BuyerQuestionSet } from './types';

const evidence = (id: string, evidence_text: string) => ({
  id, source_url: 'https://example.com', page_title: 'Business', source_type: 'PRODUCT_SERVICE' as const,
  evidence_text, extracted_at: '2026-09-10T00:00:00.000Z', confidence: 'HIGH' as const,
});
const entity = (id: string, type: BusinessEntity['type'], value: string, evidenceIds: string[]): BusinessEntity => ({
  id, type, value, description: null, category: null, statement_kind: 'FACT', confidence: 'HIGH', evidence_ids: evidenceIds,
});

function profile(over: Partial<CanonicalBusinessUnderstanding> = {}): CanonicalBusinessUnderstanding {
  return {
    version: '1.0.0', status: 'SUCCESS', project_id: '11111111-1111-4111-8111-111111111111',
    content_hash: 'business-hash', generated_at: '2026-09-10T00:00:00.000Z',
    business: { name: 'Acme Pumps', website: 'https://example.com', description: null, business_model: null },
    products: [entity('product-pump', 'PRODUCT', 'industrial pumps', ['e-product'])],
    services: [], capabilities: [entity('cap-chemical', 'CAPABILITY', 'chemical processing applications', ['e-product'])],
    buyer_types: [entity('buyer-procurement', 'BUYER_TYPE', 'industrial procurement teams', ['e-buyer'])],
    industries: [], use_cases: [], geographies: [entity('geo-india', 'GEOGRAPHY', 'India', ['e-geo'])],
    proof_assets: [], certifications: [], commercial_claims: [], differentiators: [], conversion_signals: [],
    business_model_signals: [], company_identity: [], conflicts: [], unknowns: [],
    evidence: [
      evidence('e-product', 'We manufacture industrial pumps for chemical processing applications.'),
      evidence('e-buyer', 'Our pumps are designed for industrial procurement teams.'),
      evidence('e-geo', 'We supply industrial customers across India.'),
    ],
    source_coverage: { pages_analyzed: 3, pages_successfully_analyzed: 3, pages_failed: 0, pages_empty: 0, pages_blocked: 0, pages_partial: 0, pages_duplicate: 0 },
    warnings: [], extraction: { model: 'fake', schema_version: '1.0.0', prompt_version: '1.0.0', reused: false },
    ...over,
  };
}

function candidate(over: Partial<BuyerQuestionCandidate> = {}): BuyerQuestionCandidate {
  return {
    id: 'candidate-1',
    question: 'Which industrial pump manufacturers should procurement teams shortlist?',
    intent: 'SHORTLIST', buyer_stage: 'SHORTLISTING', dimensions: ['PRODUCT', 'BUYER_TYPE'],
    supporting_business_evidence_ids: ['e-product', 'e-buyer'],
    supporting_business_entity_ids: ['product-pump', 'buyer-procurement'],
    ...over,
  };
}

function evaluation(item: BuyerQuestionCandidate, over: Partial<BuyerQuestionEvaluation> = {}): BuyerQuestionEvaluation {
  return {
    candidate_id: item.id,
    commercial_relevance: item.intent === 'PURCHASE' ? 5 : 4,
    business_relevance: 5,
    specificity: 4,
    rationale: 'Represents a documented product and a commercially meaningful buyer decision.',
    confidence: 'HIGH',
    ...over,
  };
}

class FakeExtractor implements BuyerIntentExtractor {
  model = 'fake-model';
  generationCalls = 0;
  constructor(public candidates: BuyerQuestionCandidate[], private readonly malformed = false) {}
  async generateCandidates(): Promise<BuyerQuestionCandidate[]> {
    this.generationCalls++;
    if (this.malformed) throw new Error('malformed model response');
    return structuredClone(this.candidates);
  }
  async evaluateCandidates(_understanding: CanonicalBusinessUnderstanding, candidates: BuyerQuestionCandidate[]): Promise<BuyerQuestionEvaluation[]> {
    if (this.malformed) throw new Error('malformed model response');
    return candidates.map((item) => evaluation(item));
  }
}

class MemoryRepository implements BuyerIntentRepository {
  saved: BuyerQuestionSet | null = null;
  running = false;
  finalizations = 0;
  async findReusable(_identity: BuyerIntentRunIdentity) { return this.saved ? structuredClone(this.saved) : null; }
  async findLatest() { return this.saved ? structuredClone(this.saved) : null; }
  async begin(): Promise<BeginBuyerIntentRunResult> {
    if (this.saved) return { kind: 'REUSED', runId: 'run-1', result: structuredClone(this.saved) };
    this.running = true;
    return { kind: 'STARTED', runId: 'run-1' };
  }
  async finalize(_runId: string, result: BuyerQuestionSet) {
    if (this.saved?.frozen) throw new Error('Frozen set cannot be changed');
    this.finalizations++;
    this.running = false;
    this.saved = structuredClone(result);
    return result;
  }
  async fail(_runId: string, result: BuyerQuestionSet) { this.running = false; return result; }
}

const input = (understanding = profile(), questionCount = 1) => ({
  projectId: understanding.project_id,
  businessUnderstandingRunId: '22222222-2222-4222-8222-222222222222',
  understanding,
  questionCount,
});

test('1: clear B2B manufacturer produces a commercial supplier question', async () => {
  const item = candidate();
  const result = await new BuyerIntentService({ extractor: new FakeExtractor([item]) }).generate(input());
  assert.equal(result.questions[0]?.intent, 'SHORTLIST');
  assert.ok((result.questions[0]?.commercial_relevance ?? 0) >= 4);
});

test('2: SaaS profile supports software comparison and vendor-selection intent', () => {
  const saas = profile({
    products: [], capabilities: [], buyer_types: [entity('buyer-remote', 'BUYER_TYPE', 'remote teams', ['e-saas'])],
    services: [entity('service-pm', 'SERVICE', 'project management software', ['e-saas'])], geographies: [],
    evidence: [evidence('e-saas', 'Project management software for remote teams and distributed work.')],
  });
  const item = candidate({ id: 'saas', question: 'Which project management software is better for remote teams?', intent: 'COMPARISON', buyer_stage: 'EVALUATION', dimensions: ['SERVICE', 'BUYER_TYPE'], supporting_business_evidence_ids: ['e-saas'], supporting_business_entity_ids: ['service-pm', 'buyer-remote'] });
  assert.equal(filterCandidates([item], saas).accepted.length, 1);
});

test('3: multiple products retain meaningful coverage without duplicate padding', () => {
  const multi = profile({ products: [
    entity('product-pump', 'PRODUCT', 'industrial pumps', ['e-product']),
    entity('product-valve', 'PRODUCT', 'control valves', ['e-valve']),
  ], evidence: [...profile().evidence, evidence('e-valve', 'We manufacture control valves for industrial flow systems.')] });
  const pump = candidate({ id: 'pump' });
  const valve = candidate({ id: 'valve', question: 'Which control valve manufacturers should procurement teams shortlist?', supporting_business_evidence_ids: ['e-valve', 'e-buyer'], supporting_business_entity_ids: ['product-valve', 'buyer-procurement'] });
  const questions = finalizeQuestions([pump, valve], [evaluation(pump), evaluation(valve)], multi, 'set', 2);
  assert.deepEqual(new Set(questions.flatMap((item) => item.supporting_business_entity_ids)), new Set(['product-pump', 'product-valve', 'buyer-procurement']));
});

test('4: limited business information does not permit hallucinated capabilities', () => {
  const item = candidate({ id: 'solar', question: 'Which industrial pump suppliers offer solar-powered pumps?', intent: 'SPECIFICATION', buyer_stage: 'EVALUATION', dimensions: ['PRODUCT', 'TECHNICAL_REQUIREMENT'], supporting_business_evidence_ids: ['e-product'], supporting_business_entity_ids: ['product-pump'] });
  assert.match(filterCandidates([item], profile()).rejected[0]?.reason ?? '', /unsupported constraint/);
});

test('5: missing geography rejects location-specific questions', () => {
  const noGeo = profile({ geographies: [], evidence: profile().evidence.filter((item) => item.id !== 'e-geo') });
  const item = candidate({ id: 'germany', question: 'Which industrial pump suppliers in Germany should I choose?', intent: 'GEOGRAPHIC', buyer_stage: 'DECISION', dimensions: ['PRODUCT', 'GEOGRAPHY'], supporting_business_evidence_ids: ['e-product'], supporting_business_entity_ids: ['product-pump'] });
  assert.match(filterCandidates([item], noGeo).rejected[0]?.reason ?? '', /unsupported geography/);
});

test('6: missing certification rejects business-specific compliance questions', () => {
  const item = candidate({ id: 'iso', question: 'Which ISO-certified industrial pump suppliers should I shortlist?', intent: 'COMPLIANCE', buyer_stage: 'SHORTLISTING', dimensions: ['PRODUCT', 'COMPLIANCE'], supporting_business_evidence_ids: ['e-product'], supporting_business_entity_ids: ['product-pump'] });
  assert.match(filterCandidates([item], profile()).rejected[0]?.reason ?? '', /unsupported compliance/);
});

test('7: semantic duplicate questions collapse to one', () => {
  const items = [candidate({ id: 'a', question: 'Who are the best industrial pump manufacturers?' }), candidate({ id: 'b', question: 'Which are the top industrial pump companies?' })];
  assert.equal(deduplicateCandidates(items).length, 1);
});

test('8: best, top, and leading synonym variations are one intent', () => {
  const items = ['best', 'top', 'leading'].map((word, index) => candidate({ id: `v${index}`, question: `Which are the ${word} industrial pump suppliers?` }));
  assert.equal(deduplicateCandidates(items).length, 1);
});

test('9: target-company-biased questions are rejected', () => {
  const claimed = profile({
    commercial_claims: [{ ...entity('claim-leading', 'COMMERCIAL_CLAIM', "India's leading industrial pump manufacturer", ['e-claim']), statement_kind: 'COMMERCIAL_CLAIM' }],
    evidence: [...profile().evidence, evidence('e-claim', "We are India's leading industrial pump manufacturer.")],
  });
  const item = candidate({ question: 'Why should I choose Acme Pumps for industrial pumps?' });
  assert.match(filterCandidates([item], claimed).rejected[0]?.reason ?? '', /target-company bias/);
  assert.equal(filterCandidates([candidate()], claimed).accepted.length, 1);
  assert.throws(() => validateCandidateBatch({ candidates: [candidate({ supporting_business_evidence_ids: ['e-claim'], supporting_business_entity_ids: ['claim-leading'] })] }, claimed), /missing entity/);
});

test('10: keyword-only candidates are rejected', () => {
  const item = candidate({ question: 'industrial pump manufacturers' });
  assert.match(filterCandidates([item], profile()).rejected[0]?.reason ?? '', /not a natural buyer question/);
});

test('11: unsupported products are rejected rather than broadened by assumption', () => {
  const item = candidate({ question: 'Which solar pump manufacturers should procurement teams shortlist?' });
  assert.match(filterCandidates([item], profile()).rejected[0]?.reason ?? '', /unsupported constraint/);
});

test('a question may use evidence-backed context outside its minimal cited subset', () => {
  const item = candidate({
    question: 'Which industrial pump suppliers support chemical processing applications in India?',
    supporting_business_evidence_ids: ['e-product'],
    supporting_business_entity_ids: ['product-pump'],
  });
  assert.equal(filterCandidates([item], profile()).accepted.length, 1);
});

test('natural logistics workflow language is not mistaken for an unsupported business constraint', () => {
  const logistics = profile({
    products: [],
    capabilities: [entity('cap-logistics', 'CAPABILITY', 'advisory, customs, freight and delivery', ['e-logistics'])],
    services: [entity('service-cargo', 'SERVICE', 'Cargo Connect', ['e-cargo'])],
    buyer_types: [],
    industries: [],
    use_cases: [],
    geographies: [],
    evidence: [
      evidence('e-logistics', 'We bring advisory, customs, freight and delivery under one accountable team.'),
      evidence('e-cargo', 'Documents, freight partners and route risk are coordinated through one desk.'),
    ],
  });
  const item = candidate({
    id: 'logistics-workflow',
    question: 'Which service providers coordinate shipping documents and customs for one delivery?',
    intent: 'VENDOR_SELECTION',
    buyer_stage: 'DECISION',
    dimensions: ['SERVICE'],
    supporting_business_evidence_ids: ['e-logistics', 'e-cargo'],
    supporting_business_entity_ids: ['cap-logistics', 'service-cargo'],
  });

  assert.equal(filterCandidates([item], logistics).accepted.length, 1);
  assert.match(filterCandidates([candidate({ question: 'Which solar pump manufacturers should procurement teams shortlist?' })], profile()).rejected[0]?.reason ?? '', /unsupported constraint/);
});
test('12: strong purchase intent requires high commercial relevance', () => {
  const item = candidate({ intent: 'PURCHASE', buyer_stage: 'PURCHASE', question: 'Where can I purchase industrial pumps for chemical processing?' });
  assert.throws(() => validateEvaluationBatch({ evaluations: [evaluation(item, { commercial_relevance: 3 })] }, [item]), /high commercial relevance/);
  assert.equal(validateEvaluationBatch({ evaluations: [evaluation(item, { commercial_relevance: 5 })] }, [item])[0]?.commercial_relevance, 5);
});

test('13: educational questions cannot receive inflated commercial relevance', () => {
  const item = candidate({ question: 'What are industrial pumps used for in chemical processing?', intent: 'DISCOVERY', buyer_stage: 'AWARENESS', dimensions: ['PRODUCT', 'APPLICATION'] });
  assert.throws(() => validateEvaluationBatch({ evaluations: [evaluation(item, { commercial_relevance: 4 })] }, [item]), /Educational candidate/);
  assert.doesNotThrow(() => validateEvaluationBatch({ evaluations: [evaluation(item, { commercial_relevance: 2 })] }, [item]));
});

test('14: compliance intent is accepted only with evidenced certification grounding', () => {
  const certified = profile({
    certifications: [entity('cert-iso', 'CERTIFICATION', 'ISO 9001', ['e-iso'])],
    evidence: [...profile().evidence, evidence('e-iso', 'Our manufacturing facility is certified to ISO 9001.')],
  });
  const item = candidate({ id: 'certified', question: 'Which ISO 9001 industrial pump suppliers should I shortlist?', intent: 'COMPLIANCE', buyer_stage: 'SHORTLISTING', dimensions: ['PRODUCT', 'COMPLIANCE'], supporting_business_evidence_ids: ['e-product', 'e-iso'], supporting_business_entity_ids: ['product-pump', 'cert-iso'] });
  assert.equal(filterCandidates([item], certified).accepted.length, 1);
});

test('15: the same Business Understanding run reuses one question set', async () => {
  const repository = new MemoryRepository();
  const extractor = new FakeExtractor([candidate()]);
  const service = new BuyerIntentService({ extractor, repository });
  await service.generate(input());
  const second = await service.generate(input());
  assert.equal(extractor.generationCalls, 1);
  assert.equal(repository.finalizations, 1);
  assert.equal(second.generation.reused, true);
});

test('16: a finalized benchmark remains frozen across later extractor changes', async () => {
  const repository = new MemoryRepository();
  const firstExtractor = new FakeExtractor([candidate()]);
  const first = await new BuyerIntentService({ extractor: firstExtractor, repository }).generate(input());
  const changedExtractor = new FakeExtractor([candidate({ id: 'changed', question: 'Where can I purchase industrial pumps for chemical processing?', intent: 'PURCHASE', buyer_stage: 'PURCHASE', dimensions: ['PRODUCT', 'ORDER_PROCUREMENT'], supporting_business_evidence_ids: ['e-product'], supporting_business_entity_ids: ['product-pump'] })]);
  const second = await new BuyerIntentService({ extractor: changedExtractor, repository }).generate(input());
  assert.equal(first.frozen, true);
  assert.deepEqual(second.questions, first.questions);
  assert.equal(changedExtractor.generationCalls, 0);
});

test('17: API and migration enforce cross-tenant ownership boundaries', () => {
  const route = readFileSync(path.join(process.cwd(), 'app/api/projects/[id]/buyer-intent/route.ts'), 'utf8');
  const migration = readFileSync(path.join(process.cwd(), 'supabase/migrations/020_buyer_intent.sql'), 'utf8');
  assert.match(route, /\.eq\('id', id\)\.eq\('user_id', user\.id\)/);
  assert.match(migration, /alter table public\.buyer_questions enable row level security/i);
  assert.match(migration, /p\.user_id = public\.current_clerk_profile_id\(\)/);
  assert.match(migration, /revoke insert, update, delete[\s\S]+from anon, authenticated/i);
  assert.match(migration, /guard_frozen_buyer_questions/);
  assert.match(migration, /Frozen buyer question sets are immutable/);
  assert.match(migration, /foreign key \(business_understanding_run_id, project_id\)/i);
});

test('18: malformed model output has bounded retry and fails safely', async () => {
  let attempts = 0;
  await assert.rejects(() => buyerIntentExtractorTestables.withSchemaRetry(async () => { attempts++; throw new Error('malformed'); }, 2), /malformed/);
  assert.equal(attempts, 2);
  const result = await new BuyerIntentService({ extractor: new FakeExtractor([candidate()], true) }).generate(input());
  assert.equal(result.status, 'FAILED');
  assert.equal(result.questions.length, 0);
});

test('Gemini buyer-intent requests use the supported structured JSON text format', async () => {
  const calls: Array<{ responseFormat?: unknown }> = [];
  const item = candidate();
  const extractor = new GeminiBuyerIntentExtractor(async (options) => {
    calls.push(options);
    return { output_text: JSON.stringify({ candidates: [item] }) };
  });

  const result = await extractor.generateCandidates(profile(), 1);

  assert.equal(result[0]?.question, item.question);
  assert.deepEqual(calls[0]?.responseFormat, {
    type: 'text',
    mime_type: 'application/json',
    schema: buyerIntentExtractorTestables.CANDIDATE_SCHEMA,
  });
});

test('buyer-intent structured parser rejects prose-wrapped JSON', () => {
  assert.throws(
    () => buyerIntentExtractorTestables.parseJson('Result: {"candidates":[]}'),
    /Unexpected token|Unexpected non-whitespace character/,
  );
});

test('buyer-intent grounding labels entity IDs and evidence IDs unambiguously', () => {
  const grounding = buyerIntentGrounding(profile());
  assert.equal(grounding.entities[0]?.entity_id, 'product-pump');
  assert.deepEqual(grounding.entities[0]?.allowed_evidence_ids, ['e-product']);
  assert.equal(grounding.evidence[0]?.evidence_id, 'e-product');
  assert.equal('id' in grounding.entities[0]!, false);
  assert.equal('id' in grounding.evidence[0]!, false);
});

test('candidate retry receives bounded identifier-validation feedback', async () => {
  const inputs: string[] = [];
  let attempt = 0;
  const valid = candidate();
  const extractor = new GeminiBuyerIntentExtractor(async (options) => {
    inputs.push(String(options.input));
    attempt++;
    return {
      output_text: JSON.stringify({
        candidates: [attempt === 1
          ? { ...valid, supporting_business_evidence_ids: ['product-pump'] }
          : valid],
      }),
    };
  });

  const result = await extractor.generateCandidates(profile(), 1);

  assert.equal(result[0]?.id, valid.id);
  const retryInput = JSON.parse(inputs[1] ?? '{}') as { correction?: { validation_error?: string } };
  assert.match(retryInput.correction?.validation_error ?? '', /missing evidence/);
  assert.ok((retryInput.correction?.validation_error?.length ?? 0) <= 500);
});

test('19: invented evidence IDs fail schema validation', () => {
  const item = candidate({ supporting_business_evidence_ids: ['invented-evidence'] });
  assert.throws(() => validateCandidateBatch({ candidates: [item] }, profile()), /missing evidence/);
});

test('a mixed candidate batch keeps strictly valid items and omits invalid items', () => {
  const valid = candidate();
  const invalid = { ...candidate({ id: 'candidate-invalid', question: 'Which documented suppliers fit this requirement?' }), supporting_business_evidence_ids: ['missing-evidence'] };
  const result = validateCandidateBatchWithOmissions({ candidates: [invalid, valid] }, profile());
  assert.deepEqual(result.map((item) => item.id), [valid.id]);
  assert.throws(
    () => validateCandidateBatchWithOmissions({ candidates: [invalid] }, profile()),
    /missing evidence/,
  );
});

test('20: thirty near-identical questions are strongly reduced', () => {
  const adjectives = ['best', 'top', 'leading'];
  const items = Array.from({ length: 30 }, (_, index) => candidate({
    id: `near-${index}`,
    question: `Which are the ${adjectives[index % adjectives.length]} industrial pump ${index % 2 ? 'companies' : 'suppliers'}?`,
  }));
  assert.ok(deduplicateCandidates(items).length <= 2);
});

test('deterministic ranking reaches 100 only when every documented component is maximal', () => {
  const item = candidate({ intent: 'PURCHASE', buyer_stage: 'PURCHASE' });
  const question = finalizeQuestions([item], [evaluation(item, { commercial_relevance: 5, business_relevance: 5, specificity: 5, confidence: 'HIGH' })], profile(), 'max-set', 1)[0];
  assert.equal(question?.priority_score, 100);
});

test('ordinary buyer words no longer count as invented constraints', () => {
  const item = candidate({ question: 'Which industrial pump manufacturers supply directly to procurement teams?' });
  assert.equal(filterCandidates([item], profile()).accepted.length, 1);
});

test('one unfamiliar plain word is a near miss; invented numbers never are', () => {
  const solar = candidate({ id: 'solar', question: 'Which solar pump manufacturers should procurement teams shortlist?' });
  const numeric = candidate({ id: 'numeric', question: 'Which industrial pump manufacturers deliver within 48 hours?' });
  const result = filterCandidates([solar, numeric], profile());
  assert.equal(result.accepted.length, 0);
  assert.deepEqual(result.nearMisses.map((item) => item.id), ['solar']);
});

test('near misses backfill only when strict questions fall short of the request', async () => {
  const solar = candidate({ id: 'solar', question: 'Which solar pump manufacturers should procurement teams shortlist?', supporting_business_entity_ids: ['product-pump'] });
  const enough = await new BuyerIntentService({ extractor: new FakeExtractor([candidate(), solar]) }).generate(input(profile(), 1));
  assert.equal(enough.questions.length, 1);
  assert.ok(!enough.questions.some((question) => /solar/i.test(question.question)));
});

test('fewer than five defensible questions fails instead of producing a thin audit', async () => {
  const two = [candidate({ id: 'a' }), candidate({ id: 'b', question: 'Which control pump suppliers do procurement teams compare?', supporting_business_entity_ids: ['product-pump'] })];
  const result = await new BuyerIntentService({ extractor: new FakeExtractor(two) }).generate(input(profile(), 10));
  assert.equal(result.status, 'FAILED');
  assert.match(result.warnings.join(' '), /minimum 5/);
});
