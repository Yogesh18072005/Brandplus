import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { SupabaseBusinessUnderstandingRepository } from '@/lib/business-understanding/repository';
import { SupabaseBuyerIntentRepository } from '@/lib/buyer-intent/repository';
import { SupabaseObservationRepository } from '@/lib/ai-observation/repository';
import {
  EVIDENCE_DIAGNOSIS_ENGINE_VERSION,
  EVIDENCE_DIAGNOSIS_PROMPT_VERSION,
  EVIDENCE_DIAGNOSIS_SCHEMA_VERSION,
  EVIDENCE_DIAGNOSIS_VERSION,
  EVIDENCE_MATCHING_VERSION,
  type CreateDiagnosisRunResult,
  type DiagnosisExecutionPlan,
  type DiagnosisProvenance,
  type DiagnosisRepository,
  type DiagnosisSourceBundle,
  type EvidenceAssessment,
  type EvidenceDiagnosisRun,
  type EvidenceGap,
  type QuestionDiagnosis,
} from '@/src/evidence-diagnosis/types';

type AdminClient = SupabaseClient<Database>;
type DiagnosisRow = Database['public']['Tables']['evidence_question_diagnoses']['Row'];
type ProvenanceRow = Database['public']['Tables']['diagnosis_provenance']['Row'];

function numeric(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function provenanceKey(kind: string, artifactKey: string): string {
  return `${kind}:${artifactKey}`;
}

function mapProvenance(row: ProvenanceRow): DiagnosisProvenance {
  return {
    kind: row.provenance_kind as DiagnosisProvenance['kind'],
    sourceId: row.source_key,
    sourceUrl: row.source_url,
    sourceTitle: row.source_title,
    sourceType: row.source_type,
    snippet: row.snippet,
    timestamp: row.source_timestamp,
  };
}

export class SupabaseEvidenceDiagnosisRepository implements DiagnosisRepository {
  private readonly businesses: SupabaseBusinessUnderstandingRepository;
  private readonly buyerIntent: SupabaseBuyerIntentRepository;
  private readonly observations: SupabaseObservationRepository;

  constructor(private readonly client: AdminClient) {
    this.businesses = new SupabaseBusinessUnderstandingRepository(client);
    this.buyerIntent = new SupabaseBuyerIntentRepository(client);
    this.observations = new SupabaseObservationRepository(client);
  }

  async loadSourceBundle(projectId: string, observationRunId: string): Promise<DiagnosisSourceBundle | null> {
    const observationRun = await this.observations.getRun(projectId, observationRunId, true);
    if (!observationRun || !observationRun.businessUnderstandingRunId) return null;
    const [understanding, questionSet] = await Promise.all([
      this.businesses.findByRunId(projectId, observationRun.businessUnderstandingRunId),
      this.buyerIntent.findBySetId(projectId, observationRun.buyerQuestionSetId),
    ]);
    if (!understanding || !questionSet) return null;
    return {
      projectId,
      businessUnderstandingRunId: observationRun.businessUnderstandingRunId,
      buyerQuestionSetRecordId: observationRun.buyerQuestionSetId,
      understanding,
      questionSet,
      observationRun: { ...observationRun, observations: observationRun.observations ?? [] },
    };
  }

  async createRun(input: {
    bundle: DiagnosisSourceBundle;
    inputHash: string;
    buyerQuestionSetHash: string;
    observationRunHash: string;
    idempotencyKey: string;
  }): Promise<CreateDiagnosisRunResult> {
    const { data, error } = await this.client.rpc('create_evidence_diagnosis_run', {
      p_project_id: input.bundle.projectId,
      p_observation_run_id: input.bundle.observationRun.id,
      p_input_hash: input.inputHash,
      p_buyer_question_set_hash: input.buyerQuestionSetHash,
      p_observation_run_hash: input.observationRunHash,
      p_idempotency_key: input.idempotencyKey,
      p_engine_version: EVIDENCE_DIAGNOSIS_ENGINE_VERSION,
      p_prompt_version: EVIDENCE_DIAGNOSIS_PROMPT_VERSION,
      p_schema_version: EVIDENCE_DIAGNOSIS_SCHEMA_VERSION,
      p_diagnosis_version: EVIDENCE_DIAGNOSIS_VERSION,
      p_matching_version: EVIDENCE_MATCHING_VERSION,
    });
    if (error || !data?.[0]) throw new Error(`Evidence diagnosis run creation failed: ${error?.message ?? 'missing run'}`);
    const run = await this.getRun(input.bundle.projectId, data[0].run_id);
    if (!run) throw new Error('Evidence diagnosis run creation returned an unreadable run');
    const kind = data[0].outcome;
    if (kind !== 'CREATED' && kind !== 'EXISTING' && kind !== 'REUSED') throw new Error('Evidence diagnosis run returned an invalid outcome');
    return { kind, run };
  }

  async getRun(projectId: string, runId: string, includeDiagnoses = false): Promise<EvidenceDiagnosisRun | null> {
    const { data, error } = await this.client.from('evidence_diagnosis_runs').select('*')
      .eq('id', runId).eq('project_id', projectId).maybeSingle();
    if (error) throw new Error(`Evidence diagnosis run lookup failed: ${error.message}`);
    if (!data) return null;
    const run = this.mapRun(data);
    if (includeDiagnoses) run.diagnoses = await this.loadQuestionDiagnoses(runId);
    return run;
  }

  async listRuns(projectId: string, limit: number, offset: number): Promise<EvidenceDiagnosisRun[]> {
    const { data, error } = await this.client.from('evidence_diagnosis_runs').select('*')
      .eq('project_id', projectId).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (error) throw new Error(`Evidence diagnosis run listing failed: ${error.message}`);
    return (data ?? []).map((row) => this.mapRun(row));
  }

  async loadExecutionPlan(runId: string): Promise<DiagnosisExecutionPlan> {
    const { data: row, error } = await this.client.from('evidence_diagnosis_runs').select('*').eq('id', runId).single();
    if (error || !row) throw new Error(`Evidence diagnosis execution plan failed: ${error?.message ?? 'missing run'}`);
    const [bundle, completed] = await Promise.all([
      this.loadSourceBundle(row.project_id, row.observation_run_id),
      this.client.from('evidence_question_diagnoses').select('buyer_question_key')
        .eq('run_id', runId).in('status', ['COMPLETED', 'INCONCLUSIVE']),
    ]);
    if (!bundle) throw new Error('Evidence diagnosis source bundle is unavailable');
    if (completed.error) throw new Error(`Evidence diagnosis execution plan failed: ${completed.error.message}`);
    return { run: this.mapRun(row), bundle, completedQuestionIds: (completed.data ?? []).map((item) => item.buyer_question_key) };
  }

  async markRunRunning(runId: string): Promise<void> {
    const { error } = await this.client.from('evidence_diagnosis_runs').update({ status: 'RUNNING', started_at: new Date().toISOString() })
      .eq('id', runId).in('status', ['PENDING', 'RUNNING']);
    if (error) throw new Error(`Evidence diagnosis run start failed: ${error.message}`);
  }

  async markQuestionRunning(runId: string, buyerQuestionId: string): Promise<void> {
    const { error } = await this.client.rpc('prepare_evidence_question_diagnosis', {
      p_run_id: runId,
      p_buyer_question_key: buyerQuestionId,
    });
    if (error) throw new Error(`Evidence question diagnosis start failed: ${error.message}`);
  }

  async saveQuestion(runId: string, diagnosis: QuestionDiagnosis): Promise<void> {
    const question = await this.questionRow(runId, diagnosis.buyerQuestionId);
    if (question.question_observation_id !== diagnosis.questionObservationId || question.exact_question !== diagnosis.exactQuestion) {
      throw new Error('Diagnosis persistence rejected mismatched immutable question inputs');
    }
    const projectId = question.project_id;

    const [assessmentResult, gapResult, claimResult, relationshipResult, unknownResult] = await Promise.all([
      diagnosis.assessments.length ? this.client.from('evidence_assessments').insert(diagnosis.assessments.map((item) => ({
        question_diagnosis_id: question.id, project_id: projectId, assessment_key: item.id, origin: item.origin,
        subject_entity_key: item.subjectEntityId, evidence_type: item.evidenceType, evidence_status: item.status,
        relevance: item.relevance, specificity: item.specificity, directness: item.directness, freshness: item.freshness,
        source_reliability: item.sourceReliability, source_hierarchy: item.sourceHierarchy,
        provenance_completeness: item.provenanceCompleteness, confidence: item.confidence,
        evidence_scope: item.scope, statement: item.statement,
      }))).select('id,assessment_key') : Promise.resolve({ data: [], error: null }),
      diagnosis.gaps.length ? this.client.from('evidence_gaps').insert(diagnosis.gaps.map((item) => ({
        question_diagnosis_id: question.id, project_id: projectId, gap_key: item.id, gap_type: item.gapType,
        question_dimension: item.questionDimension, description: item.description,
        target_evidence_present: item.targetEvidencePresent, observed_entity_evidence_present: item.observedEntityEvidencePresent,
        evidence_strength: item.evidenceStrength, confidence: item.confidence, evidence_scope: item.scope,
      }))).select('id,gap_key') : Promise.resolve({ data: [], error: null }),
      diagnosis.claims.length ? this.client.from('diagnosis_claims').insert(diagnosis.claims.map((item) => ({
        question_diagnosis_id: question.id, project_id: projectId, claim_key: item.id,
        classification: item.classification, statement: item.statement, confidence: item.confidence,
      }))) : Promise.resolve({ data: [], error: null }),
      diagnosis.entityRelationships.length ? this.client.from('diagnosed_entity_relationships').insert(diagnosis.entityRelationships.map((item) => ({
        question_diagnosis_id: question.id, project_id: projectId, relationship_key: item.id,
        observed_entity_key: item.observedEntityId, surface_form: item.surfaceForm,
        relationship: item.relationship, confidence: item.confidence, rationale: item.rationale,
      }))) : Promise.resolve({ data: [], error: null }),
      diagnosis.unknowns.length ? this.client.from('diagnosis_unknowns').insert(diagnosis.unknowns.map((item) => ({
        question_diagnosis_id: question.id, project_id: projectId, unknown_key: item.id,
        area: item.area, reason: item.reason, detail: item.detail,
      }))) : Promise.resolve({ data: [], error: null }),
    ]);
    const failed = [assessmentResult, gapResult, claimResult, relationshipResult, unknownResult].find((result) => result.error);
    if (failed?.error) throw new Error(`Evidence diagnosis artifact persistence failed: ${failed.error.message}`);

    const gapIds = new Map((gapResult.data ?? []).map((row) => [row.gap_key, row.id]));
    const gapSupport = diagnosis.gaps.flatMap((gap) => gap.supportingEvidenceIds.map((sourceId) => ({
      gap_id: gapIds.get(gap.id)!, question_diagnosis_id: question.id, source_evidence_key: sourceId,
    }))).filter((item) => item.gap_id);
    if (gapSupport.length) {
      const { error } = await this.client.from('evidence_gap_support').insert(gapSupport);
      if (error) throw new Error(`Evidence gap support persistence failed: ${error.message}`);
    }

    const provenance = this.provenanceRows(question.id, projectId, diagnosis);
    if (provenance.length) {
      const { error } = await this.client.from('diagnosis_provenance').insert(provenance);
      if (error) throw new Error(`Evidence diagnosis provenance persistence failed: ${error.message}`);
    }

    const { data: completed, error } = await this.client.from('evidence_question_diagnoses').update({
      diagnosis_key: diagnosis.id,
      status: diagnosis.status,
      target_mention_status: diagnosis.targetMentionStatus,
      classifications: diagnosis.classifications,
      primary_classification: diagnosis.primaryClassification,
      commercial_implication: diagnosis.commercialImplication,
      confidence: diagnosis.confidence,
      evidence_scope: diagnosis.evidenceScope,
      evidence_comparison: diagnosis.evidenceComparison,
      error_message: null,
      completed_at: new Date().toISOString(),
    }).eq('id', question.id).eq('status', 'RUNNING').select('id').maybeSingle();
    if (error || !completed) throw new Error(`Evidence question diagnosis completion failed: ${error?.message ?? 'diagnosis was not running'}`);
  }

  async failQuestion(runId: string, buyerQuestionId: string, message: string): Promise<void> {
    const question = await this.questionRow(runId, buyerQuestionId);
    const cleanup = [
      this.client.from('diagnosis_provenance').delete().eq('question_diagnosis_id', question.id),
      this.client.from('diagnosis_unknowns').delete().eq('question_diagnosis_id', question.id),
      this.client.from('diagnosed_entity_relationships').delete().eq('question_diagnosis_id', question.id),
      this.client.from('diagnosis_claims').delete().eq('question_diagnosis_id', question.id),
      this.client.from('evidence_gap_support').delete().eq('question_diagnosis_id', question.id),
      this.client.from('evidence_gaps').delete().eq('question_diagnosis_id', question.id),
      this.client.from('evidence_assessments').delete().eq('question_diagnosis_id', question.id),
    ];
    for (const operation of cleanup) {
      const { error } = await operation;
      if (error) throw new Error(`Evidence question diagnosis cleanup failed: ${error.message}`);
    }
    const { data, error } = await this.client.from('evidence_question_diagnoses').update({
      status: 'FAILED', error_message: message, completed_at: new Date().toISOString(),
    }).eq('id', question.id).eq('status', 'RUNNING').select('id').maybeSingle();
    if (error || !data) throw new Error(`Evidence question diagnosis failure persistence failed: ${error?.message ?? 'diagnosis was not running'}`);
  }

  async completeRun(runId: string): Promise<EvidenceDiagnosisRun> {
    const { error } = await this.client.rpc('complete_evidence_diagnosis_run', { p_run_id: runId });
    if (error) throw new Error(`Evidence diagnosis run completion failed: ${error.message}`);
    const { data: row, error: rowError } = await this.client.from('evidence_diagnosis_runs').select('*').eq('id', runId).single();
    if (rowError || !row) throw new Error(`Evidence diagnosis run reload failed: ${rowError?.message ?? 'missing run'}`);
    return this.mapRun(row);
  }

  private async questionRow(runId: string, buyerQuestionId: string): Promise<DiagnosisRow> {
    const { data, error } = await this.client.from('evidence_question_diagnoses').select('*')
      .eq('run_id', runId).eq('buyer_question_key', buyerQuestionId).single();
    if (error || !data) throw new Error(`Evidence question diagnosis lookup failed: ${error?.message ?? 'missing diagnosis'}`);
    return data;
  }

  private provenanceRows(questionDiagnosisId: string, projectId: string, diagnosis: QuestionDiagnosis) {
    const artifacts: Array<{ kind: string; key: string; provenance: DiagnosisProvenance[] }> = [
      ...diagnosis.assessments.map((item) => ({ kind: 'ASSESSMENT', key: item.id, provenance: item.provenance })),
      ...diagnosis.gaps.map((item) => ({ kind: 'GAP', key: item.id, provenance: item.provenance })),
      ...diagnosis.claims.map((item) => ({ kind: 'CLAIM', key: item.id, provenance: item.provenance })),
      ...diagnosis.entityRelationships.map((item) => ({ kind: 'ENTITY_RELATIONSHIP', key: item.id, provenance: item.provenance })),
      ...diagnosis.unknowns.map((item) => ({ kind: 'UNKNOWN', key: item.id, provenance: item.provenance })),
    ];
    const rows = artifacts.flatMap((artifact) => artifact.provenance.map((source) => ({
      question_diagnosis_id: questionDiagnosisId, project_id: projectId, artifact_kind: artifact.kind,
      artifact_key: artifact.key, provenance_kind: source.kind, source_key: source.sourceId,
      source_url: source.sourceUrl, source_title: source.sourceTitle, snippet: source.snippet,
      source_type: source.sourceType,
      source_timestamp: source.timestamp,
    })));
    return [...new Map(rows.map((row) => [
      `${row.artifact_kind}:${row.artifact_key}:${row.provenance_kind}:${row.source_key}`,
      row,
    ])).values()];
  }

  private mapRun(row: Database['public']['Tables']['evidence_diagnosis_runs']['Row']): EvidenceDiagnosisRun {
    return {
      id: row.id, projectId: row.project_id, businessUnderstandingRunId: row.business_understanding_run_id,
      buyerQuestionSetId: row.buyer_question_set_id, observationRunId: row.observation_run_id,
      status: row.status as EvidenceDiagnosisRun['status'], inputHash: row.input_hash, idempotencyKey: row.idempotency_key,
      engineVersion: row.engine_version, promptVersion: row.prompt_version, schemaVersion: row.schema_version,
      diagnosisVersion: row.diagnosis_version, matchingVersion: row.matching_version,
      model: row.model, modelVersion: row.model_version,
      businessUnderstandingVersion: row.business_understanding_version,
      businessUnderstandingContentHash: row.business_understanding_content_hash,
      buyerQuestionSetVersion: row.buyer_question_set_version, buyerQuestionSetHash: row.buyer_question_set_hash,
      observationEngineVersion: row.observation_engine_version, observationRunHash: row.observation_run_hash,
      requestedQuestionCount: row.requested_question_count, completedQuestionCount: row.completed_question_count,
      failedQuestionCount: row.failed_question_count, inconclusiveQuestionCount: row.inconclusive_question_count,
      evidenceCount: row.evidence_count, gapCount: row.gap_count, llmCallCount: row.llm_call_count,
      inputTokens: row.input_tokens, outputTokens: row.output_tokens, costUsd: numeric(row.cost_usd),
      startedAt: row.started_at, completedAt: row.completed_at, createdAt: row.created_at,
    };
  }

  private async loadQuestionDiagnoses(runId: string): Promise<QuestionDiagnosis[]> {
    const { data: questions, error } = await this.client.from('evidence_question_diagnoses').select('*')
      .eq('run_id', runId).order('question_rank');
    if (error) throw new Error(`Question diagnosis listing failed: ${error.message}`);
    if (!questions?.length) return [];
    const ids = questions.map((item) => item.id);
    const [assessments, gaps, gapSupport, claims, relationships, unknowns, provenance] = await Promise.all([
      this.client.from('evidence_assessments').select('*').in('question_diagnosis_id', ids),
      this.client.from('evidence_gaps').select('*').in('question_diagnosis_id', ids),
      this.client.from('evidence_gap_support').select('*').in('question_diagnosis_id', ids),
      this.client.from('diagnosis_claims').select('*').in('question_diagnosis_id', ids),
      this.client.from('diagnosed_entity_relationships').select('*').in('question_diagnosis_id', ids),
      this.client.from('diagnosis_unknowns').select('*').in('question_diagnosis_id', ids),
      this.client.from('diagnosis_provenance').select('*').in('question_diagnosis_id', ids),
    ]);
    const failed = [assessments, gaps, gapSupport, claims, relationships, unknowns, provenance].find((result) => result.error);
    if (failed?.error) throw new Error(`Question diagnosis detail load failed: ${failed.error.message}`);
    const provenanceMap = new Map<string, DiagnosisProvenance[]>();
    for (const row of provenance.data ?? []) {
      const key = `${row.question_diagnosis_id}:${provenanceKey(row.artifact_kind, row.artifact_key)}`;
      provenanceMap.set(key, [...(provenanceMap.get(key) ?? []), mapProvenance(row)]);
    }
    const prov = (questionId: string, kind: string, key: string) => provenanceMap.get(`${questionId}:${provenanceKey(kind, key)}`) ?? [];
    const supportByGap = new Map<string, string[]>();
    for (const row of gapSupport.data ?? []) supportByGap.set(row.gap_id, [...(supportByGap.get(row.gap_id) ?? []), row.source_evidence_key]);

    return questions.map((question) => ({
      id: question.diagnosis_key,
      buyerQuestionId: question.buyer_question_key,
      questionObservationId: question.question_observation_id,
      exactQuestion: question.exact_question,
      status: question.status as QuestionDiagnosis['status'],
      targetMentionStatus: question.target_mention_status as QuestionDiagnosis['targetMentionStatus'],
      classifications: question.classifications as QuestionDiagnosis['classifications'],
      primaryClassification: (question.primary_classification ?? 'INCONCLUSIVE') as QuestionDiagnosis['primaryClassification'],
      commercialImplication: question.commercial_implication as QuestionDiagnosis['commercialImplication'],
      confidence: question.confidence as QuestionDiagnosis['confidence'],
      evidenceScope: question.evidence_scope as QuestionDiagnosis['evidenceScope'],
      evidenceComparison: question.evidence_comparison as QuestionDiagnosis['evidenceComparison'],
      assessments: (assessments.data ?? []).filter((item) => item.question_diagnosis_id === question.id).map((item): EvidenceAssessment => ({
        id: item.assessment_key, origin: item.origin as EvidenceAssessment['origin'], subjectEntityId: item.subject_entity_key,
        evidenceType: item.evidence_type as EvidenceAssessment['evidenceType'], status: item.evidence_status as EvidenceAssessment['status'],
        relevance: item.relevance as EvidenceAssessment['relevance'], specificity: item.specificity as EvidenceAssessment['specificity'],
        directness: item.directness as EvidenceAssessment['directness'], freshness: item.freshness as EvidenceAssessment['freshness'],
        sourceReliability: item.source_reliability as EvidenceAssessment['sourceReliability'], sourceHierarchy: item.source_hierarchy as EvidenceAssessment['sourceHierarchy'],
        provenanceCompleteness: item.provenance_completeness as EvidenceAssessment['provenanceCompleteness'], confidence: item.confidence as EvidenceAssessment['confidence'],
        scope: item.evidence_scope as EvidenceAssessment['scope'], statement: item.statement, provenance: prov(question.id, 'ASSESSMENT', item.assessment_key),
      })),
      gaps: (gaps.data ?? []).filter((item) => item.question_diagnosis_id === question.id).map((item): EvidenceGap => ({
        id: item.gap_key, gapType: item.gap_type as EvidenceGap['gapType'], questionDimension: item.question_dimension,
        description: item.description, targetEvidencePresent: item.target_evidence_present,
        observedEntityEvidencePresent: item.observed_entity_evidence_present,
        evidenceStrength: item.evidence_strength as EvidenceGap['evidenceStrength'], confidence: item.confidence as EvidenceGap['confidence'],
        scope: item.evidence_scope as EvidenceGap['scope'], supportingEvidenceIds: supportByGap.get(item.id) ?? [],
        provenance: prov(question.id, 'GAP', item.gap_key),
      })),
      claims: (claims.data ?? []).filter((item) => item.question_diagnosis_id === question.id).map((item) => ({
        id: item.claim_key, classification: item.classification as QuestionDiagnosis['primaryClassification'], statement: item.statement,
        confidence: item.confidence as QuestionDiagnosis['confidence'], provenance: prov(question.id, 'CLAIM', item.claim_key),
      })),
      entityRelationships: (relationships.data ?? []).filter((item) => item.question_diagnosis_id === question.id).map((item) => ({
        id: item.relationship_key, observedEntityId: item.observed_entity_key, surfaceForm: item.surface_form,
        relationship: item.relationship as QuestionDiagnosis['entityRelationships'][number]['relationship'],
        confidence: item.confidence as QuestionDiagnosis['confidence'], rationale: item.rationale,
        provenance: prov(question.id, 'ENTITY_RELATIONSHIP', item.relationship_key),
      })),
      unknowns: (unknowns.data ?? []).filter((item) => item.question_diagnosis_id === question.id).map((item) => ({
        id: item.unknown_key, area: item.area, reason: item.reason as QuestionDiagnosis['unknowns'][number]['reason'], detail: item.detail,
        provenance: prov(question.id, 'UNKNOWN', item.unknown_key),
      })),
    }));
  }
}
