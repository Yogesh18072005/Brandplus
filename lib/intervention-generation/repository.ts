import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/lib/supabase/types';
import { SupabaseEvidenceDiagnosisRepository } from '@/lib/evidence-diagnosis/repository';
import {
  INTERVENTION_ENGINE_VERSION,
  INTERVENTION_GENERATION_VERSION,
  INTERVENTION_PRIORITY_VERSION,
  INTERVENTION_PROMPT_VERSION,
  INTERVENTION_SCHEMA_VERSION,
  type CreateInterventionRunResult,
  type GeneratedIntervention,
  type InterventionExecutionPlan,
  type InterventionGenerator,
  type InterventionRepository,
  type InterventionRun,
  type InterventionSourceBundle,
} from '@/src/intervention-generation/types';

type AdminClient = SupabaseClient<Database>;
type RunRow = Database['public']['Tables']['intervention_generation_runs']['Row'];

const strings = (value: Json): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

export class SupabaseInterventionRepository implements InterventionRepository {
  private readonly diagnoses: SupabaseEvidenceDiagnosisRepository;

  constructor(private readonly client: AdminClient) {
    this.diagnoses = new SupabaseEvidenceDiagnosisRepository(client);
  }

  async loadSourceBundle(projectId: string, diagnosisRunId: string): Promise<InterventionSourceBundle | null> {
    const diagnosisRun = await this.diagnoses.getRun(projectId, diagnosisRunId, true);
    if (!diagnosisRun) return null;
    const source = await this.diagnoses.loadSourceBundle(projectId, diagnosisRun.observationRunId);
    if (!source) return null;
    return {
      projectId,
      diagnosisRun: { ...diagnosisRun, diagnoses: diagnosisRun.diagnoses ?? [] },
      understanding: source.understanding,
      questionSet: source.questionSet,
      observationRun: source.observationRun,
    };
  }

  async createRun(input: {
    bundle: InterventionSourceBundle;
    inputHash: string;
    buyerQuestionSetHash: string;
    observationHash: string;
    diagnosisHash: string;
    idempotencyKey: string;
    generator: InterventionGenerator;
    generationParameters: Readonly<Record<string, string | number | boolean>>;
  }): Promise<CreateInterventionRunResult> {
    const { data, error } = await this.client.rpc('create_intervention_generation_run', {
      p_project_id: input.bundle.projectId,
      p_diagnosis_run_id: input.bundle.diagnosisRun.id,
      p_input_hash: input.inputHash,
      p_buyer_question_set_hash: input.buyerQuestionSetHash,
      p_observation_hash: input.observationHash,
      p_diagnosis_hash: input.diagnosisHash,
      p_idempotency_key: input.idempotencyKey,
      p_engine_version: INTERVENTION_ENGINE_VERSION,
      p_schema_version: INTERVENTION_SCHEMA_VERSION,
      p_prompt_version: INTERVENTION_PROMPT_VERSION,
      p_generation_version: INTERVENTION_GENERATION_VERSION,
      p_priority_version: INTERVENTION_PRIORITY_VERSION,
      p_model: input.generator.model,
      p_generation_parameters: input.generationParameters as Json,
    });
    if (error || !data?.[0]) throw new Error(`Intervention run creation failed: ${error?.message ?? 'missing run'}`);
    const run = await this.getRun(input.bundle.projectId, data[0].run_id);
    if (!run) throw new Error('Intervention run creation returned an unreadable run');
    const kind = data[0].outcome;
    if (kind !== 'CREATED' && kind !== 'EXISTING' && kind !== 'REUSED') throw new Error('Intervention run returned an invalid outcome');
    return { kind, run };
  }

  async getRun(projectId: string, runId: string, includeInterventions = false): Promise<InterventionRun | null> {
    const { data, error } = await this.client.from('intervention_generation_runs').select('*')
      .eq('id', runId).eq('project_id', projectId).maybeSingle();
    if (error) throw new Error(`Intervention run lookup failed: ${error.message}`);
    if (!data) return null;
    const run = this.mapRun(data);
    if (includeInterventions) run.interventions = await this.loadInterventions(runId);
    return run;
  }

  async listRuns(projectId: string, limit: number, offset: number): Promise<InterventionRun[]> {
    const { data, error } = await this.client.from('intervention_generation_runs').select('*')
      .eq('project_id', projectId).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (error) throw new Error(`Intervention run listing failed: ${error.message}`);
    return (data ?? []).map((row) => this.mapRun(row));
  }

  async loadExecutionPlan(runId: string): Promise<InterventionExecutionPlan> {
    const { data, error } = await this.client.from('intervention_generation_runs').select('*').eq('id', runId).single();
    if (error || !data) throw new Error(`Intervention execution plan failed: ${error?.message ?? 'missing run'}`);
    const bundle = await this.loadSourceBundle(data.project_id, data.diagnosis_run_id);
    if (!bundle) throw new Error('Intervention source bundle is unavailable');
    return { run: this.mapRun(data), bundle };
  }

  async markRunRunning(runId: string): Promise<void> {
    const { error } = await this.client.rpc('prepare_intervention_generation_run', { p_run_id: runId });
    if (error) throw new Error(`Intervention run start failed: ${error.message}`);
  }

  async saveInterventions(runId: string, interventions: GeneratedIntervention[]): Promise<void> {
    if (!interventions.length) return;
    const { data: run, error: runError } = await this.client.from('intervention_generation_runs').select('*').eq('id', runId).single();
    if (runError || !run) throw new Error(`Intervention run lookup failed: ${runError?.message ?? 'missing run'}`);
    if (run.status !== 'RUNNING') throw new Error('Intervention run must be running before persistence');
    const [questionRows, diagnosisRows, evidenceRows] = await Promise.all([
      this.client.from('buyer_questions').select('id,question_key,question').eq('question_set_id', run.buyer_question_set_id),
      this.client.from('evidence_question_diagnoses').select('id,diagnosis_key,buyer_question_key').eq('run_id', run.diagnosis_run_id),
      this.client.from('business_evidence').select('id,evidence_key').eq('run_id', run.business_understanding_run_id),
    ]);
    const initialFailure = [questionRows, diagnosisRows, evidenceRows].find((result) => result.error);
    if (initialFailure?.error) throw new Error(`Intervention source reference load failed: ${initialFailure.error.message}`);
    const diagnosisPhysicalIds = (diagnosisRows.data ?? []).map((item) => item.id);
    const { data: gapRows, error: gapError } = diagnosisPhysicalIds.length
      ? await this.client.from('evidence_gaps').select('id,gap_key,question_diagnosis_id').in('question_diagnosis_id', diagnosisPhysicalIds)
      : { data: [], error: null };
    if (gapError) throw new Error(`Intervention gap reference load failed: ${gapError.message}`);

    const questionByKey = new Map((questionRows.data ?? []).map((item) => [item.question_key, item]));
    const diagnosisByKey = new Map((diagnosisRows.data ?? []).map((item) => [item.diagnosis_key, item]));
    const gapByKey = new Map((gapRows ?? []).map((item) => [item.gap_key, item]));
    const evidenceByKey = new Map((evidenceRows.data ?? []).map((item) => [item.evidence_key, item.id]));
    for (const intervention of interventions) {
      if (intervention.affectedQuestions.some((item) => questionByKey.get(item.id)?.question !== item.exactQuestion)) throw new Error('Intervention persistence rejected a changed buyer question');
      if (intervention.affectedDiagnosisIds.some((id) => !diagnosisByKey.has(id))) throw new Error('Intervention persistence rejected an unknown diagnosis');
      if (intervention.affectedGapIds.some((id) => !gapByKey.has(id))) throw new Error('Intervention persistence rejected an unknown evidence gap');
      if (intervention.evidenceToPreserve.some((item) => !item.evidenceId || !evidenceByKey.has(item.evidenceId))) throw new Error('Intervention persistence rejected cross-project or unknown evidence');
    }

    const { data: saved, error: saveError } = await this.client.from('generated_interventions').insert(interventions.map((item) => ({
      run_id: runId, project_id: run.project_id, intervention_key: item.id,
      primary_diagnosis_key: item.diagnosisId, primary_question_key: item.questionId,
      exact_buyer_question: item.exactBuyerQuestion, intervention_type: item.interventionType,
      category: item.category, title: item.title, objective: item.objective, problem_statement: item.problemStatement,
      diagnosed_gap: item.diagnosedGap, why_addresses_gap: item.whyThisAddressesGap,
      expected_deliverable: item.expectedDeliverable, implementation_surface: item.implementationSurface,
      proposed_surface: item.proposedSurface, priority: item.priority, priority_score: item.priorityScore,
      priority_factors: item.priorityFactors as unknown as Json, impact: item.impact, effort: item.effort,
      confidence: item.confidence, status: item.status,
    }))).select('id,intervention_key');
    if (saveError || !saved) throw new Error(`Intervention persistence failed: ${saveError?.message ?? 'missing rows'}`);
    const interventionByKey = new Map(saved.map((item) => [item.intervention_key, item.id]));

    const questionLinks = interventions.flatMap((item) => item.affectedQuestions.map((question) => ({
      intervention_id: interventionByKey.get(item.id)!, project_id: run.project_id,
      buyer_question_id: questionByKey.get(question.id)!.id, buyer_question_key: question.id, exact_question: question.exactQuestion,
    })));
    const diagnosisLinks = interventions.flatMap((item) => item.affectedGapIds.map((gapKey) => {
      const gap = gapByKey.get(gapKey)!;
      const diagnosis = (diagnosisRows.data ?? []).find((row) => row.id === gap.question_diagnosis_id)!;
      return {
        intervention_id: interventionByKey.get(item.id)!, project_id: run.project_id,
        question_diagnosis_id: diagnosis.id, evidence_gap_id: gap.id,
        diagnosis_key: diagnosis.diagnosis_key, gap_key: gapKey,
      };
    }));
    const evidenceLinks = interventions.flatMap((item) => [...item.evidenceToPreserve, ...item.evidenceToAdd].map((link) => ({
      intervention_id: interventionByKey.get(item.id)!, project_id: run.project_id, link_key: link.id,
      link_kind: link.kind, business_evidence_id: link.evidenceId ? evidenceByKey.get(link.evidenceId)! : null,
      source_evidence_key: link.evidenceId, evidence_type: link.evidenceType, description: link.description,
    })));
    const inputs = interventions.flatMap((item) => item.requiredBusinessInputs.map((input) => ({
      intervention_id: interventionByKey.get(item.id)!, project_id: run.project_id, input_key: input.id,
      input_type: input.type, description: input.description, status: input.status,
    })));
    const criteria = interventions.flatMap((item) => item.acceptanceCriteria.map((criterion, sortOrder) => ({
      intervention_id: interventionByKey.get(item.id)!, project_id: run.project_id,
      criterion_key: criterion.id, criterion: criterion.criterion, sort_order: sortOrder,
    })));
    const measurements = interventions.flatMap((item) => item.measurementLinkage.map((measurement) => ({
      intervention_id: interventionByKey.get(item.id)!, project_id: run.project_id,
      measurement_key: measurement.id, measurement_type: measurement.type,
      affected_question_keys: measurement.affectedQuestionIds as Json,
      evidence_dimensions: measurement.evidenceDimensions as Json, description: measurement.description,
    })));
    const provenance = interventions.flatMap((item) => item.provenance.map((source) => ({
      intervention_id: interventionByKey.get(item.id)!, project_id: run.project_id,
      provenance_kind: source.kind, source_key: source.sourceId, source_url: source.sourceUrl,
      source_title: source.sourceTitle, source_type: source.sourceType, snippet: source.snippet,
      source_timestamp: source.timestamp,
    })));
    const dependencies = interventions.flatMap((item) => item.dependencyIds.map((dependencyKey) => ({
      intervention_id: interventionByKey.get(item.id)!, project_id: run.project_id,
      depends_on_intervention_id: interventionByKey.get(dependencyKey)!,
    }))).filter((item) => item.depends_on_intervention_id);
    const briefs = interventions.filter((item) => item.contentBrief).map((item) => ({
      intervention_id: interventionByKey.get(item.id)!, project_id: run.project_id,
      target_buyer_questions: item.contentBrief!.targetBuyerQuestions as Json,
      discovery_intent: item.contentBrief!.discoveryIntent, objective: item.contentBrief!.objective,
      verified_fact_evidence_keys: item.contentBrief!.verifiedFactEvidenceIds as Json,
      required_sections: item.contentBrief!.requiredSections as Json,
      required_facts_to_clarify: item.contentBrief!.requiredFactsToClarify as Json,
      prohibited_unsupported_claims: item.contentBrief!.prohibitedUnsupportedClaims as Json,
      internal_evidence_references: item.contentBrief!.internalEvidenceReferences as Json,
      acceptance_criteria: item.contentBrief!.acceptanceCriteria as Json,
    }));
    const schemas = interventions.filter((item) => item.structuredData).map((item) => ({
      intervention_id: interventionByKey.get(item.id)!, project_id: run.project_id,
      schema_type: item.structuredData!.schemaType, represented_entity: item.structuredData!.representedEntity,
      supported_properties: item.structuredData!.supportedProperties as Json,
      input_required_properties: item.structuredData!.inputRequiredProperties as Json,
      proposed_surfaces: item.structuredData!.proposedSurfaces as Json,
      acceptance_criteria: item.structuredData!.acceptanceCriteria as Json,
    }));
    const operations = [
      questionLinks.length ? this.client.from('intervention_question_links').insert(questionLinks) : null,
      diagnosisLinks.length ? this.client.from('intervention_diagnosis_links').insert(diagnosisLinks) : null,
      evidenceLinks.length ? this.client.from('intervention_evidence_links').insert(evidenceLinks) : null,
      inputs.length ? this.client.from('intervention_inputs').insert(inputs) : null,
      criteria.length ? this.client.from('intervention_acceptance_criteria').insert(criteria) : null,
      measurements.length ? this.client.from('intervention_measurements').insert(measurements) : null,
      provenance.length ? this.client.from('intervention_provenance').insert(provenance) : null,
      briefs.length ? this.client.from('intervention_content_briefs').insert(briefs) : null,
      schemas.length ? this.client.from('intervention_structured_data').insert(schemas) : null,
    ].filter((operation): operation is NonNullable<typeof operation> => Boolean(operation));
    for (const operation of operations) {
      const { error } = await operation;
      if (error) throw new Error(`Intervention artifact persistence failed: ${error.message}`);
    }
    if (dependencies.length) {
      const { error } = await this.client.from('intervention_dependencies').insert(dependencies);
      if (error) throw new Error(`Intervention dependency persistence failed: ${error.message}`);
    }
  }

  async completeRun(runId: string, summary: {
    resultHash: string; eligibleGapCount: number; rejectedCandidateCount: number; llmCallCount: number;
    inputTokens: number; outputTokens: number; costUsd: number;
    modelVersion: string | null;
  }): Promise<InterventionRun> {
    const { error } = await this.client.rpc('complete_intervention_generation_run', {
      p_run_id: runId, p_result_hash: summary.resultHash, p_eligible_gap_count: summary.eligibleGapCount,
      p_rejected_candidate_count: summary.rejectedCandidateCount, p_llm_call_count: summary.llmCallCount,
      p_input_tokens: summary.inputTokens, p_output_tokens: summary.outputTokens, p_cost_usd: summary.costUsd,
      p_model_version: summary.modelVersion,
    });
    if (error) throw new Error(`Intervention run completion failed: ${error.message}`);
    const { data, error: loadError } = await this.client.from('intervention_generation_runs').select('*').eq('id', runId).single();
    if (loadError || !data) throw new Error(`Intervention run reload failed: ${loadError?.message ?? 'missing run'}`);
    return this.mapRun(data);
  }

  async failRun(runId: string, message: string): Promise<void> {
    const { error } = await this.client.from('intervention_generation_runs').update({
      status: 'FAILED', error_message: message, completed_at: new Date().toISOString(),
    }).eq('id', runId).in('status', ['PENDING', 'RUNNING']);
    if (error) throw new Error(`Intervention run failure persistence failed: ${error.message}`);
  }

  private mapRun(row: RunRow): InterventionRun {
    return {
      id: row.id, projectId: row.project_id, diagnosisRunId: row.diagnosis_run_id,
      businessUnderstandingRunId: row.business_understanding_run_id, buyerQuestionSetId: row.buyer_question_set_id,
      observationRunId: row.observation_run_id, status: row.status as InterventionRun['status'], inputHash: row.input_hash,
      resultHash: row.result_hash, idempotencyKey: row.idempotency_key, engineVersion: row.engine_version,
      schemaVersion: row.schema_version, promptVersion: row.prompt_version, generationVersion: row.generation_version,
      priorityVersion: row.priority_version, model: row.model, modelVersion: row.model_version,
      generationParameters: row.generation_parameters as Readonly<Record<string, string | number | boolean>>,
      businessUnderstandingVersion: row.business_understanding_version, businessUnderstandingHash: row.business_understanding_hash,
      buyerQuestionSetVersion: row.buyer_question_set_version, buyerQuestionSetHash: row.buyer_question_set_hash,
      observationVersion: row.observation_version, observationHash: row.observation_hash,
      diagnosisVersion: row.diagnosis_version, diagnosisHash: row.diagnosis_hash,
      eligibleGapCount: row.eligible_gap_count, interventionCount: row.intervention_count,
      rejectedCandidateCount: row.rejected_candidate_count, llmCallCount: row.llm_call_count,
      inputTokens: row.input_tokens, outputTokens: row.output_tokens, costUsd: Number(row.cost_usd),
      errorMessage: row.error_message, startedAt: row.started_at, completedAt: row.completed_at, createdAt: row.created_at,
    };
  }

  private async loadInterventions(runId: string): Promise<GeneratedIntervention[]> {
    const { data: items, error } = await this.client.from('generated_interventions').select('*')
      .eq('run_id', runId).order('priority_score', { ascending: false });
    if (error) throw new Error(`Intervention listing failed: ${error.message}`);
    if (!items?.length) return [];
    const ids = items.map((item) => item.id);
    const [questions, diagnoses, evidence, inputs, criteria, dependencies, measurements, provenance, briefs, schemas] = await Promise.all([
      this.client.from('intervention_question_links').select('*').in('intervention_id', ids),
      this.client.from('intervention_diagnosis_links').select('*').in('intervention_id', ids),
      this.client.from('intervention_evidence_links').select('*').in('intervention_id', ids),
      this.client.from('intervention_inputs').select('*').in('intervention_id', ids),
      this.client.from('intervention_acceptance_criteria').select('*').in('intervention_id', ids),
      this.client.from('intervention_dependencies').select('*').in('intervention_id', ids),
      this.client.from('intervention_measurements').select('*').in('intervention_id', ids),
      this.client.from('intervention_provenance').select('*').in('intervention_id', ids),
      this.client.from('intervention_content_briefs').select('*').in('intervention_id', ids),
      this.client.from('intervention_structured_data').select('*').in('intervention_id', ids),
    ]);
    const failed = [questions, diagnoses, evidence, inputs, criteria, dependencies, measurements, provenance, briefs, schemas].find((result) => result.error);
    if (failed?.error) throw new Error(`Intervention detail load failed: ${failed.error.message}`);
    const keyByPhysicalId = new Map(items.map((item) => [item.id, item.intervention_key]));
    return items.map((item) => {
      const itemQuestions = (questions.data ?? []).filter((row) => row.intervention_id === item.id);
      const itemDiagnoses = (diagnoses.data ?? []).filter((row) => row.intervention_id === item.id);
      const itemEvidence = (evidence.data ?? []).filter((row) => row.intervention_id === item.id);
      const itemCriteria = (criteria.data ?? []).filter((row) => row.intervention_id === item.id).sort((a, b) => a.sort_order - b.sort_order);
      const brief = (briefs.data ?? []).find((row) => row.intervention_id === item.id);
      const schema = (schemas.data ?? []).find((row) => row.intervention_id === item.id);
      const affectedQuestions = itemQuestions.map((row) => ({ id: row.buyer_question_key, exactQuestion: row.exact_question }));
      return {
        id: item.intervention_key, diagnosisId: item.primary_diagnosis_key,
        affectedDiagnosisIds: [...new Set(itemDiagnoses.map((row) => row.diagnosis_key))],
        affectedGapIds: itemDiagnoses.map((row) => row.gap_key), questionId: item.primary_question_key,
        exactBuyerQuestion: item.exact_buyer_question, affectedQuestions,
        interventionType: item.intervention_type as GeneratedIntervention['interventionType'],
        category: item.category as GeneratedIntervention['category'], title: item.title, objective: item.objective,
        problemStatement: item.problem_statement, diagnosedGap: item.diagnosed_gap,
        whyThisAddressesGap: item.why_addresses_gap,
        requiredBusinessInputs: (inputs.data ?? []).filter((row) => row.intervention_id === item.id).map((row) => ({ id: row.input_key, type: row.input_type as GeneratedIntervention['requiredBusinessInputs'][number]['type'], description: row.description, status: row.status as GeneratedIntervention['requiredBusinessInputs'][number]['status'] })),
        evidenceToPreserve: itemEvidence.filter((row) => row.link_kind === 'EVIDENCE_TO_REUSE').map((row) => ({ id: row.link_key, kind: 'EVIDENCE_TO_REUSE' as const, evidenceId: row.source_evidence_key, evidenceType: row.evidence_type as GeneratedIntervention['evidenceToPreserve'][number]['evidenceType'], description: row.description })),
        evidenceToAdd: itemEvidence.filter((row) => row.link_kind === 'EVIDENCE_TO_ADD').map((row) => ({ id: row.link_key, kind: 'EVIDENCE_TO_ADD' as const, evidenceId: null, evidenceType: row.evidence_type as GeneratedIntervention['evidenceToAdd'][number]['evidenceType'], description: row.description })),
        expectedDeliverable: item.expected_deliverable,
        implementationSurface: item.implementation_surface as GeneratedIntervention['implementationSurface'], proposedSurface: true,
        priority: item.priority as GeneratedIntervention['priority'], priorityScore: item.priority_score,
        priorityFactors: item.priority_factors as unknown as GeneratedIntervention['priorityFactors'],
        impact: item.impact as GeneratedIntervention['impact'], effort: item.effort as GeneratedIntervention['effort'],
        confidence: item.confidence as GeneratedIntervention['confidence'],
        dependencyIds: (dependencies.data ?? []).filter((row) => row.intervention_id === item.id).map((row) => keyByPhysicalId.get(row.depends_on_intervention_id)!).filter(Boolean),
        acceptanceCriteria: itemCriteria.map((row) => ({ id: row.criterion_key, criterion: row.criterion })),
        measurementLinkage: (measurements.data ?? []).filter((row) => row.intervention_id === item.id).map((row) => ({ id: row.measurement_key, type: row.measurement_type as GeneratedIntervention['measurementLinkage'][number]['type'], affectedQuestionIds: strings(row.affected_question_keys), evidenceDimensions: strings(row.evidence_dimensions), description: row.description })),
        provenance: (provenance.data ?? []).filter((row) => row.intervention_id === item.id).map((row) => ({ kind: row.provenance_kind as GeneratedIntervention['provenance'][number]['kind'], sourceId: row.source_key, sourceUrl: row.source_url, sourceTitle: row.source_title, sourceType: row.source_type, snippet: row.snippet, timestamp: row.source_timestamp })),
        status: item.status as GeneratedIntervention['status'],
        contentBrief: brief ? { targetBuyerQuestions: strings(brief.target_buyer_questions), discoveryIntent: brief.discovery_intent, objective: brief.objective, verifiedFactEvidenceIds: strings(brief.verified_fact_evidence_keys), requiredSections: strings(brief.required_sections), requiredFactsToClarify: strings(brief.required_facts_to_clarify), prohibitedUnsupportedClaims: strings(brief.prohibited_unsupported_claims), internalEvidenceReferences: strings(brief.internal_evidence_references), acceptanceCriteria: strings(brief.acceptance_criteria) } : null,
        structuredData: schema ? { schemaType: schema.schema_type as NonNullable<GeneratedIntervention['structuredData']>['schemaType'], representedEntity: schema.represented_entity, supportedProperties: strings(schema.supported_properties), inputRequiredProperties: strings(schema.input_required_properties), proposedSurfaces: strings(schema.proposed_surfaces) as GeneratedIntervention['implementationSurface'][], acceptanceCriteria: strings(schema.acceptance_criteria) } : null,
      };
    });
  }
}
