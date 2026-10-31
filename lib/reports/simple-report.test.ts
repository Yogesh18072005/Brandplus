import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSimpleReport } from './simple-report';
import { summarizeObservations, type CanonicalIntelligenceReport } from './intelligence-contract';
import type { BuyerQuestionSet } from '@/src/buyer-intent/types';
import type { QuestionObservation } from '@/src/ai-observation/types';

const questions = Array.from({ length: 4 }, (_, index) => ({ id: `q${index + 1}`, question: `Q${index + 1}?` })) as unknown as BuyerQuestionSet['questions'];

function observation(id: string, targetStatus: string, rawResponse: string | null, domains: string[] = []): QuestionObservation {
  return {
    id, buyerQuestionId: id, exactQuestion: `Question ${id}?`, status: 'COMPLETED', targetStatus, rawResponse,
    entities: targetStatus === 'MENTIONED' ? [{ targetMatch: true, recommendationStrength: 'MENTION' }] : [],
    citations: [], sources: domains.map((domain) => ({ domain })),
  } as unknown as QuestionObservation;
}

function report(observations: QuestionObservation[]): CanonicalIntelligenceReport {
  return {
    kind: 'NEW_INTELLIGENCE', id: 'run-1', projectId: 'project-1', status: 'COMPLETE', missingStages: [], chain: {} as CanonicalIntelligenceReport['chain'],
    business: { business: { name: 'CityBond', website: 'https://citybond.in' } } as CanonicalIntelligenceReport['business'],
    questionSet: { questions } as BuyerQuestionSet,
    observationRun: { observations } as CanonicalIntelligenceReport['observationRun'],
    diagnosisRun: { diagnoses: [] } as unknown as CanonicalIntelligenceReport['diagnosisRun'],
    interventionRun: { interventions: [{ id: 'fix-1' }] } as unknown as CanonicalIntelligenceReport['interventionRun'],
    executions: [], executionStates: [],
    summary: summarizeObservations('CityBond', questions, observations, '2026-10-10T19:10:59.000Z'),
    generatedAt: '2026-10-11T00:00:00.000Z',
  };
}

const sample = report([
  observation('o1', 'NOT_MENTIONED', '### Options\n* **Natural Stone Veneer:** Real stone layers for walls.\n* **Popular Brands:** Trespa, Fundermax, Parklex.', ['vivaacp.com', 'www.aludecor.com']),
  observation('o2', 'NOT_MENTIONED', 'It depends on the component:\n* **Recommended Thickness:** **4 mm** ACP panels for the fascia.', ['vivaacp.com']),
  observation('o3', 'INCONCLUSIVE', '* **Aludecor / Viva / CityBond:** Known for 3D textured panels for feature walls.', ['citybond.in']),
  observation('o4', 'MENTIONED', 'CityBond makes 3mm, 4mm and 6mm ACP sheets for facades.'),
]);

test('counts verdicts from the recorded outcomes and writes a plain headline', () => {
  const model = buildSimpleReport(sample, ['Alstone', 'Aludecor', 'Viva Composite panel']);
  assert.equal(model.total, 4);
  assert.equal(model.mentioned + model.recommended, 1);
  assert.equal(model.missed, 2);
  assert.equal(model.unclear, 1);
  assert.equal(model.gaps, 2);
  assert.equal(model.headline, 'AI mentioned CityBond in 1 of the 4 questions your buyers ask.');
});

test('competitor names match whole words only', () => {
  const model = buildSimpleReport(sample, ['Alstone', 'Aludecor', 'Viva Composite panel']);
  // "Natural Stone" must not count as Alstone; "Viva" counts for "Viva Composite panel".
  assert.deepEqual(model.competitors, [{ name: 'Aludecor', answers: 1 }, { name: 'Viva Composite panel', answers: 1 }]);
});

test('quotes are verbatim answer sentences with markdown stripped, never lead-ins', () => {
  const model = buildSimpleReport(sample, ['Aludecor']);
  const quote = (id: string) => model.questions.find((question) => question.id === id)?.quote;
  assert.equal(quote('o1'), 'Popular Brands: Trespa, Fundermax, Parklex.');
  assert.equal(quote('o2'), 'Recommended Thickness: 4 mm ACP panels for the fascia.');
  assert.equal(quote('o3'), 'Aludecor / Viva / CityBond: Known for 3D textured panels for feature walls.');
});

test('answers naming a competitor lead, then clear misses', () => {
  const model = buildSimpleReport(sample, ['Aludecor']);
  assert.equal(model.questions[0]?.id, 'o3');
  assert.equal(model.questions[1]?.verdict, 'missed');
});

test('sources are counted per answer, www-normalised, with the business site flagged', () => {
  const model = buildSimpleReport(sample, []);
  assert.deepEqual(model.sources.slice(0, 3), [
    { domain: 'vivaacp.com', answers: 2, isYou: false },
    { domain: 'citybond.in', answers: 1, isYou: true },
    { domain: 'aludecor.com', answers: 1, isYou: false },
  ]);
});

test('a missing answer yields no quote rather than an invented one', () => {
  const model = buildSimpleReport(report([observation('o1', 'INCONCLUSIVE', null)]), []);
  assert.equal(model.questions[0]?.quote, null);
});
