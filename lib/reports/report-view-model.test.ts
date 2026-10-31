import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCanonicalReportViewModel, buildLegacyReportViewModel, reportPreview } from './report-view-model';
import { summarizeObservations, type CanonicalIntelligenceReport } from './intelligence-contract';
import type { ReportData } from '@/src/scoring';

function canonical(outcome: 'NOT_MENTIONED' | 'MENTIONED' = 'NOT_MENTIONED', generatedAt = '2026-09-20T10:00:00.000Z'): CanonicalIntelligenceReport {
  const question = {
    id: 'question-1', question: 'Who supplies verified packaging for pharmaceutical exporters?', normalized_question: 'who supplies verified packaging for pharmaceutical exporters?',
    intent: 'COMPARISON', buyer_stage: 'EVALUATION', dimensions: ['PRODUCT'], supporting_business_evidence_ids: ['evidence-1'], supporting_business_entity_ids: ['product-1'],
    commercial_relevance: 5, business_relevance: 5, specificity: 5, rationale: 'A buyer comparison question.', confidence: 'HIGH', priority_score: 5, rank: 1,
  } as const;
  const observation = {
    id: 'observation-1', buyerQuestionId: question.id, exactQuestion: question.question, status: 'COMPLETED', provider: 'Gemini', model: 'gemini-test',
    rawResponse: outcome === 'MENTIONED' ? 'Example Business supplies verified packaging.' : 'Observed Supplier provides verified packaging.', responseTimestamp: generatedAt,
    latencyMs: 10, usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 }, costUsd: 0.01, completeness: 'COMPLETE', parsingStatus: 'SUCCESS', extractionStatus: 'SUCCESS',
    targetStatus: outcome, entities: outcome === 'MENTIONED' ? [{ id: 'target', surfaceForm: 'Example Business', normalizedName: 'example business', entityType: 'COMPANY', matchStatus: 'MATCHED', targetMatch: true, mentionCount: 1, firstCharacterPosition: 0, firstParagraphPosition: 0, recommendationPosition: null, recommendationStrength: 'MENTION', mentions: [] }] : [{ id: 'other', surfaceForm: 'Observed Supplier', normalizedName: 'observed supplier', entityType: 'COMPANY', matchStatus: 'UNMATCHED', targetMatch: false, mentionCount: 1, firstCharacterPosition: 0, firstParagraphPosition: 0, recommendationPosition: 1, recommendationStrength: 'RECOMMENDED', mentions: [] }],
    citations: [{ id: 'citation-1', sourceId: 'source-1', displayedText: 'Industry directory', url: 'https://directory.example/suppliers', domain: 'directory.example', title: 'Verified suppliers', providerCitationId: null, context: 'Supplier list', characterPosition: 10, claimAssociation: 'STRUCTURAL' }],
    sources: [{ id: 'source-1', fullUrl: 'https://directory.example/suppliers', normalizedUrl: 'https://directory.example/suppliers', domain: 'directory.example', title: 'Verified suppliers', targetDomainMatch: false }],
    errorCode: null, errorMessage: null,
  } as CanonicalIntelligenceReport['observationRun']['observations'][number];
  const summary = summarizeObservations('Example Business', [question] as never, [observation], generatedAt);
  return {
    kind: 'NEW_INTELLIGENCE', id: `report-${generatedAt}`, projectId: 'project-1', status: 'COMPLETE', missingStages: [],
    chain: { businessUnderstandingRunId: 'business-run', buyerIntentRunId: 'intent-run', buyerQuestionSetId: 'set-1', observationRunId: 'observation-run', diagnosisRunId: 'diagnosis-run', interventionRunId: `intervention-${generatedAt}`, executionRunIds: [] },
    business: {
      version: '1', status: 'SUCCESS', project_id: 'project-1', content_hash: 'hash', generated_at: generatedAt,
      business: { name: 'Example Business', website: 'https://example.com', description: { value: 'Verified packaging manufacturer.', evidence_ids: ['evidence-1'] }, business_model: null },
      products: [{ id: 'product-1', type: 'PRODUCT', value: 'Pharmaceutical packaging', description: null, category: null, statement_kind: 'FACT', confidence: 'HIGH', evidence_ids: ['evidence-1'] }],
      services: [], capabilities: [], buyer_types: [{ id: 'buyer-1', type: 'BUYER_TYPE', value: 'Export procurement teams', description: null, category: null, statement_kind: 'FACT', confidence: 'HIGH', evidence_ids: ['evidence-1'] }],
      industries: [], use_cases: [], geographies: [{ id: 'geo-1', type: 'GEOGRAPHY', value: 'India', description: null, category: null, statement_kind: 'FACT', confidence: 'HIGH', evidence_ids: ['evidence-1'] }],
      proof_assets: [], certifications: [], commercial_claims: [], differentiators: [], conversion_signals: [], business_model_signals: [], company_identity: [],
      evidence: [], conflicts: [], unknowns: [], source_coverage: { pages_analyzed: 1, pages_successfully_analyzed: 1, pages_failed: 0, pages_empty: 0, pages_blocked: 0, pages_partial: 0, pages_duplicate: 0 }, warnings: [], extraction: { model: 'test', schema_version: '1', prompt_version: '1', reused: false },
    },
    questionSet: { id: 'set-1', version: '1', project_id: 'project-1', business_understanding_run_id: 'business-run', business_understanding_version: '1', business_understanding_content_hash: 'hash', status: 'COMPLETED', generated_at: generatedAt, finalized_at: generatedAt, frozen: true, requested_question_count: 1, candidate_count: 1, rejected_candidate_count: 0, questions: [question] as never, warnings: [], generation: { model: 'test', prompt_version: '1', schema_version: '1', generation_version: '1', ranking_version: '1', reused: false } },
    observationRun: { id: 'observation-run', projectId: 'project-1', buyerQuestionSetId: 'set-1', businessUnderstandingRunId: 'business-run', provider: 'Gemini', model: 'gemini-test', modelVersion: '2026-09', providerAdapterVersion: '1', engineVersion: '1', promptVersion: '1', parserVersion: '1', schemaVersion: '1', generationParameters: { locale: 'India', language: 'English' }, status: 'COMPLETED', requestedQuestionCount: 1, completedQuestionCount: 1, failedQuestionCount: 0, inputTokens: 10, outputTokens: 20, totalTokens: 30, costUsd: 0.01, idempotencyKey: 'key', startedAt: generatedAt, completedAt: generatedAt, createdAt: generatedAt, observations: [observation] },
    diagnosisRun: { id: 'diagnosis-run', projectId: 'project-1', businessUnderstandingRunId: 'business-run', buyerQuestionSetId: 'set-1', observationRunId: 'observation-run', diagnoses: [{ id: 'diagnosis-1', buyerQuestionId: question.id, questionObservationId: observation.id, exactQuestion: question.question, status: 'COMPLETED', targetMentionStatus: outcome, classifications: ['TARGET_PROOF_GAP'], primaryClassification: 'TARGET_PROOF_GAP', commercialImplication: 'HIGH', confidence: 'HIGH', evidenceScope: 'INSPECTED_NOT_FOUND', evidenceComparison: 'OBSERVED_STRONGER', assessments: [], gaps: [{ id: 'gap-1', gapType: 'TARGET_PROOF_GAP', questionDimension: 'proof', description: 'Verified buyer-facing proof is missing.', targetEvidencePresent: false, observedEntityEvidencePresent: true, evidenceStrength: 'HIGH', confidence: 'HIGH', scope: 'INSPECTED_NOT_FOUND', supportingEvidenceIds: [], provenance: [] }], claims: [{ id: 'claim-1', classification: 'TARGET_PROOF_GAP', statement: 'Observed suppliers had clearer proof.', confidence: 'HIGH', provenance: [] }], entityRelationships: [], unknowns: [] }] } as unknown as CanonicalIntelligenceReport['diagnosisRun'],
    interventionRun: { id: `intervention-${generatedAt}`, projectId: 'project-1', businessUnderstandingRunId: 'business-run', buyerQuestionSetId: 'set-1', observationRunId: 'observation-run', diagnosisRunId: 'diagnosis-run', interventions: [{ id: 'action-1', diagnosisId: 'diagnosis-1', affectedDiagnosisIds: ['diagnosis-1'], affectedGapIds: ['gap-1'], questionId: question.id, exactBuyerQuestion: question.question, affectedQuestions: [{ id: question.id, exactQuestion: question.question }], interventionType: 'PRODUCT_EVIDENCE', category: 'ADD_PROOF', title: 'Publish a verified packaging proof section', objective: 'Make verified proof inspectable.', problemStatement: 'Proof is absent.', diagnosedGap: 'Verified buyer-facing proof is missing.', whyThisAddressesGap: 'The section connects verified facts to the buyer question.', requiredBusinessInputs: [{ id: 'input-1', type: 'BUSINESS_FACT', description: 'Verified materials and testing facts', status: 'INPUT_REQUIRED' }], evidenceToPreserve: [], evidenceToAdd: [{ id: 'link-1', kind: 'EVIDENCE_TO_ADD', evidenceId: null, evidenceType: 'CUSTOMER_PROOF', description: 'Add verified testing proof.' }], expectedDeliverable: 'A reviewed product-page section containing only verified facts.', implementationSurface: 'PRODUCT_PAGE', proposedSurface: true, priority: 'HIGH', priorityScore: 90, priorityFactors: { commercialRelevance: 5, diagnosisSeverity: 5, evidenceGapStrength: 5, crossQuestionImpact: 3, confidence: 5, effortEfficiency: 4 }, impact: 'HIGH', effort: 'MEDIUM', confidence: 'HIGH', dependencyIds: [], acceptanceCriteria: [{ id: 'criterion-1', criterion: 'Approved proof is visible on the live product URL.' }], measurementLinkage: [{ id: 'measure-1', type: 'QUESTION_REOBSERVATION', affectedQuestionIds: [question.id], evidenceDimensions: ['proof'], description: 'Repeat the same buyer question.' }], provenance: [], status: 'NEEDS_INPUT', contentBrief: null, structuredData: null }] } as unknown as CanonicalIntelligenceReport['interventionRun'],
    executions: [], executionStates: [], summary, generatedAt,
  };
}

test('canonical customer report keeps one coherent question-to-action evidence chain', () => {
  const model = buildCanonicalReportViewModel(canonical());
  assert.equal(model.outcomes.notMentioned, 1);
  assert.equal(model.outcomes.meaningfulAppearances, 0);
  assert.equal(model.evidence[0]?.question, 'Who supplies verified packaging for pharmaceutical exporters?');
  assert.equal(model.evidence[0]?.citations[0]?.url, 'https://directory.example/suppliers');
  assert.equal(model.evidence[0]?.diagnosedGap, 'Verified buyer-facing proof is missing.');
  assert.deepEqual(model.evidence[0]?.actionIds, ['action-1']);
  assert.equal(model.actions[0]?.questions[0]?.id, 'question-1');
  assert.equal(model.actions[0]?.needsValidation, true);
  assert.doesNotMatch(JSON.stringify(model), /visibilityScore|brandpulseScore|Engine 0/i);
});

test('preview selects linked evidence and intervention instead of unrelated first records', () => {
  const preview = reportPreview(buildCanonicalReportViewModel(canonical()));
  assert.equal(preview.evidence.length, 1);
  assert.equal(preview.actions.length, 1);
  assert.equal(preview.evidence[0]?.actionIds[0], preview.actions[0]?.id);
});

test('comparison uses only like-for-like usable questions and avoids causal language', () => {
  const current = buildCanonicalReportViewModel(canonical('MENTIONED'), canonical('NOT_MENTIONED', '2026-08-20T10:00:00.000Z'));
  assert.equal(current.comparison.kind, 'COMPARISON');
  assert.equal(current.comparison.comparableQuestions, 1);
  assert.equal(current.comparison.improved, 1);
  assert.match(current.comparison.statement, /not proof/i);
});

test('legacy reports expose literal counts and suppress unsupported generic priorities', () => {
  const legacy = {
    business: { name: 'Legacy Business', category: 'Packaging', city: 'Delhi', website: 'https://legacy.example' }, generatedAt: '2026-09-01T00:00:00.000Z',
    totals: { promptCount: 10, enginesUsed: ['gemini'], failedPrompts: 0 },
    scores: { visibilityScore: 0, brandpulseScore: 10, presenceRate: 0, citationRate: 0, shareOfVoice: 0, commercialVisibility: 0, promptCoverage: 1, sourceQualityRate: 1, components: { mention: 0, recommendation: 0, position: 0, citation: 0, competitive: 0, sourceQuality: 100 } },
    competitors: [{ name: 'Tracked Rival', presenceRate: 0 }], byEngine: [{ engine: 'gemini', presenceRate: 0 }], missedPrompts: [], citationGap: [{ domain: 'indiamart.com', count: 4 }],
    fixPlan: { generatedAt: '2026-09-01T00:00:00.000Z', sections: [], executionQueue: [
      { id: 'listing', title: 'Validate the indiamart.com listing', detail: '', effort: 'easy', impact: 'medium', status: 'todo', actionable: true, rank: 1, sourceSection: 'get_listed', whyItMatters: 'The source appeared in four answers.', deliverable: 'Review the existing listing before changing it.', targetsQueries: [] },
      { id: 'gbp', title: 'Complete Google Business Profile 100%', detail: '', effort: 'easy', impact: 'medium', status: 'todo', actionable: true, rank: 2, sourceSection: 'foundations', whyItMatters: 'Generic.', deliverable: 'Complete it.', targetsQueries: [] },
      { id: 'schema', title: 'Add LocalBusiness markup', detail: '', effort: 'easy', impact: 'medium', status: 'todo', actionable: true, rank: 3, sourceSection: 'structured_data', whyItMatters: 'Generic.', deliverable: 'Add it.', targetsQueries: [] },
    ], jsonLd: { localBusiness: {}, faqPage: {} }, summary: { totalActions: 3, quickWins: 3, leadInsight: 'Historical' } },
  } as unknown as ReportData;
  const model = buildLegacyReportViewModel('legacy-report', legacy);
  assert.deepEqual(model.outcomes, { meaningfulAppearances: 0, recommended: 0, mentioned: 0, notMentioned: 10, inconclusive: 0 });
  assert.equal(JSON.stringify(model).includes('NaN'), false);
  assert.deepEqual(model.actions.map((item) => item.id), ['listing']);
  assert.doesNotMatch(JSON.stringify(model.actions), /Google Business Profile|LocalBusiness/i);
  assert.equal(model.scope.dataQuality, 'HISTORICAL_SUMMARY');
  assert.deepEqual(model.sources.map((source) => [source.domain, source.observedCount]), [['indiamart.com', 4]]);
});
