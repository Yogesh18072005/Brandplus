import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/lib/supabase/types';
import {
  AI_OBSERVATION_ENGINE_VERSION,
  AI_OBSERVATION_PARSER_VERSION,
  AI_OBSERVATION_PROMPT_VERSION,
  AI_OBSERVATION_SCHEMA_VERSION,
  type CitationObservation,
  type CreateObservationRunResult,
  type DerivedObservation,
  type ObservationExecutionPlan,
  type ObservationProvider,
  type ObservationProviderResult,
  type ObservationRepository,
  type ObservationRun,
  type ObservedEntity,
  type ObservedProviderError,
  type QuestionObservation,
  type SourceObservation,
} from '@/src/ai-observation/types';

type AdminClient = SupabaseClient<Database>;

function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export class SupabaseObservationRepository implements ObservationRepository {
  constructor(private readonly client: AdminClient) {}

  async createRun(input: {
    projectId: string;
    buyerQuestionSetId: string;
    businessUnderstandingRunId: string | null;
    provider: ObservationProvider;
    idempotencyKey: string;
    generationParameters: Readonly<Record<string, string | number | boolean>>;
  }): Promise<CreateObservationRunResult> {
    const { data, error } = await this.client.rpc('create_ai_observation_run', {
      p_project_id: input.projectId,
      p_buyer_question_set_id: input.buyerQuestionSetId,
      p_business_understanding_run_id: input.businessUnderstandingRunId,
      p_provider: input.provider.name,
      p_model: input.provider.model,
      p_provider_adapter_version: input.provider.adapterVersion,
      p_engine_version: AI_OBSERVATION_ENGINE_VERSION,
      p_prompt_version: AI_OBSERVATION_PROMPT_VERSION,
      p_parser_version: AI_OBSERVATION_PARSER_VERSION,
      p_schema_version: AI_OBSERVATION_SCHEMA_VERSION,
      p_generation_parameters: input.generationParameters as Json,
      p_idempotency_key: input.idempotencyKey,
    });
    if (error || !data?.[0]) throw new Error(`Observation run creation failed: ${error?.message ?? 'missing run'}`);
    const run = await this.getRun(input.projectId, data[0].run_id);
    if (!run) throw new Error('Observation run creation returned an unreadable run');
    return { kind: data[0].created ? 'CREATED' : 'EXISTING', run };
  }

  async getRun(projectId: string, runId: string, includeObservations = false): Promise<ObservationRun | null> {
    const { data, error } = await this.client.from('ai_observation_runs').select('*').eq('id', runId).eq('project_id', projectId).maybeSingle();
    if (error) throw new Error(`Observation run lookup failed: ${error.message}`);
    if (!data) return null;
    const run = this.mapRun(data);
    if (includeObservations) run.observations = await this.loadQuestionObservations(runId);
    return run;
  }

  async listRuns(projectId: string, limit: number, offset: number): Promise<ObservationRun[]> {
    const { data, error } = await this.client.from('ai_observation_runs').select('*')
      .eq('project_id', projectId).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (error) throw new Error(`Observation run listing failed: ${error.message}`);
    return (data ?? []).map((row) => this.mapRun(row));
  }

  async loadExecutionPlan(runId: string): Promise<ObservationExecutionPlan> {
    const { data: run, error: runError } = await this.client.from('ai_observation_runs').select('*').eq('id', runId).single();
    if (runError || !run) throw new Error(`Observation execution plan failed: ${runError?.message ?? 'missing run'}`);
    const [setResult, questionResult, completedResult, profileResult, aliasesResult] = await Promise.all([
      this.client.from('buyer_question_sets').select('id,is_frozen,project_id').eq('id', run.buyer_question_set_id).single(),
      this.client.from('buyer_questions').select('id,question_key,question,rank').eq('question_set_id', run.buyer_question_set_id).order('rank'),
      this.client.from('ai_question_observations').select('buyer_question_key').eq('run_id', runId).eq('status', 'COMPLETED'),
      run.business_understanding_run_id
        ? this.client.from('business_profiles').select('business_name,website').eq('run_id', run.business_understanding_run_id).single()
        : this.client.from('projects').select('business_name,website').eq('id', run.project_id).single(),
      run.business_understanding_run_id
        ? this.client.from('business_entities').select('value').eq('run_id', run.business_understanding_run_id).eq('entity_type', 'COMPANY_IDENTITY')
        : Promise.resolve({ data: [], error: null }),
    ]);
    const failure = [setResult, questionResult, completedResult, profileResult, aliasesResult].find((result) => result.error);
    if (failure?.error) throw new Error(`Observation execution plan failed: ${failure.error.message}`);
    if (!setResult.data?.is_frozen || setResult.data.project_id !== run.project_id) throw new Error('Observation run does not reference a frozen question set in the same project');
    const profile = profileResult.data!;
    return {
      run: this.mapRun(run),
      target: {
        canonicalName: profile.business_name,
        website: profile.website,
        aliases: [...new Set((aliasesResult.data ?? []).map((entity) => entity.value).filter((value) => value !== profile.business_name))],
      },
      questions: (questionResult.data ?? []).map((question) => ({ id: question.question_key, question: question.question, rank: question.rank })),
      completedBuyerQuestionIds: (completedResult.data ?? []).map((item) => item.buyer_question_key),
    };
  }

  async markRunRunning(runId: string): Promise<void> {
    const { error } = await this.client.from('ai_observation_runs').update({ status: 'RUNNING', started_at: new Date().toISOString() })
      .eq('id', runId).in('status', ['PENDING', 'RUNNING']);
    if (error) throw new Error(`Observation run start failed: ${error.message}`);
  }

  async markQuestionRunning(runId: string, buyerQuestionId: string): Promise<void> {
    const { error } = await this.client.rpc('prepare_ai_question_observation', {
      p_run_id: runId,
      p_buyer_question_key: buyerQuestionId,
    });
    if (error) throw new Error(`Question observation start failed: ${error.message}`);
  }

  async saveQuestionSuccess(
    runId: string,
    buyerQuestionId: string,
    provider: ObservationProviderResult,
    derived: DerivedObservation,
  ): Promise<void> {
    const observation = await this.questionRow(runId, buyerQuestionId);
    const { error: rawError } = await this.client.from('ai_raw_responses').insert({
      question_observation_id: observation.id,
      project_id: observation.project_id,
      raw_text: provider.rawResponse,
      provider_response_id: provider.providerResponseId,
      finish_reason: provider.finishReason,
      provider_metadata: provider.metadata as Json,
    });
    if (rawError) throw new Error(`Raw observation persistence failed: ${rawError.message}`);

    const sourceIds = new Map<string, string>();
    if (derived.sources.length) {
      const { data, error } = await this.client.from('ai_observed_sources').insert(derived.sources.map((source) => ({
        question_observation_id: observation.id,
        project_id: observation.project_id,
        source_key: source.id,
        full_url: source.fullUrl,
        normalized_url: source.normalizedUrl,
        domain: source.domain,
        title: source.title,
        target_domain_match: source.targetDomainMatch,
      }))).select('id,source_key');
      if (error) throw new Error(`Observed source persistence failed: ${error.message}`);
      for (const source of data ?? []) sourceIds.set(source.source_key, source.id);
    }

    const entityIds = new Map<string, string>();
    if (derived.entities.length) {
      const { data, error } = await this.client.from('ai_observed_entities').insert(derived.entities.map((entity) => ({
        question_observation_id: observation.id,
        project_id: observation.project_id,
        entity_key: entity.id,
        surface_form: entity.surfaceForm,
        normalized_name: entity.normalizedName,
        entity_type: entity.entityType,
        match_status: entity.matchStatus,
        target_match: entity.targetMatch,
        mention_count: entity.mentionCount,
        first_character_position: entity.firstCharacterPosition,
        first_paragraph_position: entity.firstParagraphPosition,
        recommendation_position: entity.recommendationPosition,
        recommendation_strength: entity.recommendationStrength,
      }))).select('id,entity_key');
      if (error) throw new Error(`Observed entity persistence failed: ${error.message}`);
      for (const entity of data ?? []) entityIds.set(entity.entity_key, entity.id);
      const mentions = derived.entities.flatMap((entity) => entity.mentions.map((mention) => ({
        observed_entity_id: entityIds.get(entity.id)!,
        question_observation_id: observation.id,
        project_id: observation.project_id,
        surface_form: mention.surfaceForm,
        character_position: mention.characterPosition,
        paragraph_position: mention.paragraphPosition,
        context: mention.context,
      })));
      if (mentions.length) {
        const { error } = await this.client.from('ai_entity_mentions').insert(mentions);
        if (error) throw new Error(`Entity mention persistence failed: ${error.message}`);
      }
    }

    if (derived.citations.length) {
      const { error } = await this.client.from('ai_citation_observations').insert(derived.citations.map((citation) => ({
        question_observation_id: observation.id,
        project_id: observation.project_id,
        source_id: citation.sourceId ? sourceIds.get(citation.sourceId) ?? null : null,
        citation_key: citation.id,
        displayed_text: citation.displayedText,
        observed_url: citation.url,
        observed_domain: citation.domain,
        source_title: citation.title,
        provider_citation_id: citation.providerCitationId,
        citation_context: citation.context,
        character_position: citation.characterPosition,
        claim_association: citation.claimAssociation,
        provider_metadata: (citation.metadata ?? {}) as Json,
      })));
      if (error) throw new Error(`Citation observation persistence failed: ${error.message}`);
    }

    const { data: completed, error } = await this.client.from('ai_question_observations').update({
      status: 'COMPLETED',
      provider: provider.provider,
      model: provider.model,
      model_version: provider.modelVersion,
      provider_response_id: provider.providerResponseId,
      response_timestamp: provider.observedAt,
      latency_ms: provider.latencyMs,
      input_tokens: provider.usage.inputTokens,
      output_tokens: provider.usage.outputTokens,
      total_tokens: provider.usage.totalTokens,
      cost_usd: provider.estimatedCostUsd,
      response_completeness: provider.completeness,
      parsing_status: derived.parsingStatus,
      extraction_status: derived.extractionStatus,
      target_entity_status: derived.targetStatus,
      error_code: null,
      error_message: null,
      completed_at: new Date().toISOString(),
    }).eq('id', observation.id).eq('status', 'RUNNING').select('id').maybeSingle();
    if (error || !completed) throw new Error(`Question observation completion failed: ${error?.message ?? 'observation was not running'}`);
  }

  async saveQuestionFailure(runId: string, buyerQuestionId: string, failure: ObservedProviderError): Promise<void> {
    const observation = await this.questionRow(runId, buyerQuestionId);
    const { data, error } = await this.client.from('ai_question_observations').update({
      status: 'FAILED', response_completeness: failure.completeness, parsing_status: 'FAILED', extraction_status: 'INCONCLUSIVE',
      target_entity_status: 'INCONCLUSIVE', error_code: failure.code, error_message: failure.message, completed_at: new Date().toISOString(),
    }).eq('id', observation.id).eq('status', 'RUNNING').select('id').maybeSingle();
    if (error || !data) throw new Error(`Question observation failure persistence failed: ${error?.message ?? 'observation was not running'}`);
  }

  async completeRun(runId: string): Promise<ObservationRun> {
    const { data, error } = await this.client.rpc('complete_ai_observation_run', { p_run_id: runId });
    if (error || !data) throw new Error(`Observation run completion failed: ${error?.message ?? 'missing run'}`);
    const { data: row, error: rowError } = await this.client.from('ai_observation_runs').select('*').eq('id', runId).single();
    if (rowError || !row) throw new Error(`Observation run reload failed: ${rowError?.message ?? 'missing run'}`);
    return this.mapRun(row);
  }

  private async questionRow(runId: string, buyerQuestionId: string) {
    const { data, error } = await this.client.from('ai_question_observations').select('id,project_id')
      .eq('run_id', runId).eq('buyer_question_key', buyerQuestionId).single();
    if (error || !data) throw new Error(`Question observation lookup failed: ${error?.message ?? 'missing observation'}`);
    return data;
  }

  private mapRun(row: Database['public']['Tables']['ai_observation_runs']['Row']): ObservationRun {
    const generationParameters = row.generation_parameters && typeof row.generation_parameters === 'object' && !Array.isArray(row.generation_parameters)
      ? row.generation_parameters as Record<string, string | number | boolean>
      : {};
    return {
      id: row.id, projectId: row.project_id, buyerQuestionSetId: row.buyer_question_set_id,
      businessUnderstandingRunId: row.business_understanding_run_id, provider: row.provider, model: row.model,
      modelVersion: row.model_version, providerAdapterVersion: row.provider_adapter_version,
      engineVersion: row.engine_version, promptVersion: row.prompt_version, parserVersion: row.parser_version,
      schemaVersion: row.schema_version, generationParameters, status: row.status as ObservationRun['status'],
      requestedQuestionCount: row.requested_question_count, completedQuestionCount: row.completed_question_count,
      failedQuestionCount: row.failed_question_count, inputTokens: nullableNumber(row.input_tokens),
      outputTokens: nullableNumber(row.output_tokens), totalTokens: nullableNumber(row.total_tokens), costUsd: nullableNumber(row.cost_usd),
      idempotencyKey: row.idempotency_key, startedAt: row.started_at, completedAt: row.completed_at, createdAt: row.created_at,
    };
  }

  private async loadQuestionObservations(runId: string): Promise<QuestionObservation[]> {
    const { data: questions, error } = await this.client.from('ai_question_observations').select('*').eq('run_id', runId).order('question_rank');
    if (error) throw new Error(`Question observation listing failed: ${error.message}`);
    return Promise.all((questions ?? []).map(async (question) => {
      const [raw, entities, mentions, citations, sources] = await Promise.all([
        this.client.from('ai_raw_responses').select('raw_text').eq('question_observation_id', question.id).maybeSingle(),
        this.client.from('ai_observed_entities').select('*').eq('question_observation_id', question.id).order('first_character_position'),
        this.client.from('ai_entity_mentions').select('*').eq('question_observation_id', question.id).order('character_position'),
        this.client.from('ai_citation_observations').select('*').eq('question_observation_id', question.id).order('character_position'),
        this.client.from('ai_observed_sources').select('*').eq('question_observation_id', question.id),
      ]);
      const failed = [raw, entities, mentions, citations, sources].find((result) => result.error);
      if (failed?.error) throw new Error(`Observation detail load failed: ${failed.error.message}`);
      const mentionsByEntity = new Map<string, Database['public']['Tables']['ai_entity_mentions']['Row'][]>();
      for (const mention of mentions.data ?? []) mentionsByEntity.set(mention.observed_entity_id, [...(mentionsByEntity.get(mention.observed_entity_id) ?? []), mention]);
      return {
        id: question.id, buyerQuestionId: question.buyer_question_key, exactQuestion: question.exact_question,
        status: question.status as QuestionObservation['status'], provider: question.provider, model: question.model,
        rawResponse: raw.data?.raw_text ?? null, responseTimestamp: question.response_timestamp, latencyMs: question.latency_ms,
        usage: { inputTokens: question.input_tokens, outputTokens: question.output_tokens, totalTokens: question.total_tokens },
        costUsd: question.cost_usd, completeness: question.response_completeness as QuestionObservation['completeness'],
        parsingStatus: question.parsing_status as QuestionObservation['parsingStatus'], extractionStatus: question.extraction_status as QuestionObservation['extractionStatus'],
        targetStatus: question.target_entity_status as QuestionObservation['targetStatus'],
        entities: (entities.data ?? []).map((entity) => this.mapEntity(entity, mentionsByEntity.get(entity.id) ?? [])),
        citations: (citations.data ?? []).map((citation) => this.mapCitation(citation)),
        sources: (sources.data ?? []).map((source) => this.mapSource(source)), errorCode: question.error_code, errorMessage: question.error_message,
      };
    }));
  }

  private mapEntity(
    row: Database['public']['Tables']['ai_observed_entities']['Row'],
    mentions: Database['public']['Tables']['ai_entity_mentions']['Row'][],
  ): ObservedEntity {
    return { id: row.entity_key, surfaceForm: row.surface_form, normalizedName: row.normalized_name, entityType: row.entity_type as ObservedEntity['entityType'], matchStatus: row.match_status as ObservedEntity['matchStatus'], targetMatch: row.target_match, mentionCount: row.mention_count, firstCharacterPosition: row.first_character_position, firstParagraphPosition: row.first_paragraph_position, recommendationPosition: row.recommendation_position, recommendationStrength: row.recommendation_strength as ObservedEntity['recommendationStrength'], mentions: mentions.map((mention) => ({ surfaceForm: mention.surface_form, characterPosition: mention.character_position, paragraphPosition: mention.paragraph_position, context: mention.context })) };
  }

  private mapCitation(row: Database['public']['Tables']['ai_citation_observations']['Row']): CitationObservation {
    return { id: row.citation_key, sourceId: row.source_id, displayedText: row.displayed_text, url: row.observed_url, domain: row.observed_domain, title: row.source_title, providerCitationId: row.provider_citation_id, context: row.citation_context, characterPosition: row.character_position, claimAssociation: row.claim_association as CitationObservation['claimAssociation'], metadata: row.provider_metadata as Record<string, unknown> };
  }

  private mapSource(row: Database['public']['Tables']['ai_observed_sources']['Row']): SourceObservation {
    return { id: row.source_key, fullUrl: row.full_url, normalizedUrl: row.normalized_url, domain: row.domain, title: row.title, targetDomainMatch: row.target_domain_match };
  }
}
