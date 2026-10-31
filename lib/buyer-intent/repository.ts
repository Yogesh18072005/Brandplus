import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/lib/supabase/types';
import { BuyerIntentRunInProgressError } from '@/src/buyer-intent/service';
import type {
  BeginBuyerIntentRunResult,
  BuyerIntentDimension,
  BuyerIntentRepository,
  BuyerIntentRunIdentity,
  BuyerQuestion,
  BuyerQuestionSet,
  BuyerStage,
  BuyerIntentCategory,
  BuyerQuestionConfidence,
} from '@/src/buyer-intent/types';

type AdminClient = SupabaseClient<Database>;
// Serverless runs are hard-killed at 5 minutes (maxDuration 300), leaving the
// run RUNNING. Treat it as abandoned shortly after, so a retry isn't blocked.
const STALE_RUN_MS = 6 * 60 * 1000;
const strings = (value: Json): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

export class SupabaseBuyerIntentRepository implements BuyerIntentRepository {
  constructor(private readonly client: AdminClient) {}

  async findReusable(identity: BuyerIntentRunIdentity): Promise<BuyerQuestionSet | null> {
    const { data, error } = await this.client.from('buyer_intent_runs').select('id')
      .eq('project_id', identity.projectId)
      .eq('business_understanding_run_id', identity.businessUnderstandingRunId)
      .eq('engine_version', identity.engineVersion)
      .eq('prompt_version', identity.promptVersion)
      .eq('schema_version', identity.schemaVersion)
      .eq('generation_version', identity.generationVersion)
      .eq('ranking_version', identity.rankingVersion)
      .eq('requested_question_count', identity.requestedQuestionCount)
      .in('status', ['COMPLETED', 'PARTIAL_SUCCESS'])
      .maybeSingle();
    if (error) throw new Error(`Buyer intent lookup failed: ${error.message}`);
    return data ? this.load(data.id) : null;
  }

  async findLatest(projectId: string): Promise<BuyerQuestionSet | null> {
    const { data, error } = await this.client.from('buyer_intent_runs').select('id')
      .eq('project_id', projectId)
      .in('status', ['COMPLETED', 'PARTIAL_SUCCESS'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`Buyer intent lookup failed: ${error.message}`);
    return data ? this.load(data.id) : null;
  }

  async findBySetId(projectId: string, setId: string): Promise<BuyerQuestionSet | null> {
    const { data, error } = await this.client.from('buyer_question_sets').select('run_id')
      .eq('id', setId).eq('project_id', projectId).maybeSingle();
    if (error) throw new Error(`Buyer question set lookup failed: ${error.message}`);
    return data ? this.load(data.run_id) : null;
  }

  async begin(identity: BuyerIntentRunIdentity): Promise<BeginBuyerIntentRunResult> {
    const payload = {
      project_id: identity.projectId,
      business_understanding_run_id: identity.businessUnderstandingRunId,
      status: 'RUNNING',
      requested_question_count: identity.requestedQuestionCount,
      engine_version: identity.engineVersion,
      prompt_version: identity.promptVersion,
      schema_version: identity.schemaVersion,
      generation_version: identity.generationVersion,
      ranking_version: identity.rankingVersion,
      business_understanding_version: identity.businessUnderstandingVersion,
      business_understanding_content_hash: identity.businessUnderstandingContentHash,
      model: identity.model,
      started_at: new Date().toISOString(),
    };
    const inserted = await this.client.from('buyer_intent_runs').insert(payload).select('id').single();
    if (!inserted.error && inserted.data) return { kind: 'STARTED', runId: inserted.data.id };
    if (inserted.error?.code !== '23505') throw new Error(`Buyer intent run creation failed: ${inserted.error?.message ?? 'missing run'}`);

    const { data: existing, error } = await this.client.from('buyer_intent_runs').select('*')
      .eq('project_id', identity.projectId)
      .eq('business_understanding_run_id', identity.businessUnderstandingRunId)
      .eq('engine_version', identity.engineVersion)
      .eq('prompt_version', identity.promptVersion)
      .eq('schema_version', identity.schemaVersion)
      .eq('generation_version', identity.generationVersion)
      .eq('ranking_version', identity.rankingVersion)
      .eq('requested_question_count', identity.requestedQuestionCount)
      .single();
    if (error || !existing) throw new Error(`Buyer intent concurrent-run lookup failed: ${error?.message ?? 'missing run'}`);
    if (existing.status === 'COMPLETED' || existing.status === 'PARTIAL_SUCCESS') {
      return { kind: 'REUSED', runId: existing.id, result: await this.load(existing.id) };
    }

    const { data: existingSet, error: setError } = await this.client.from('buyer_question_sets').select('id,is_frozen,question_count')
      .eq('run_id', existing.id).maybeSingle();
    if (setError) throw new Error(`Buyer intent recovery lookup failed: ${setError.message}`);
    if (existingSet?.is_frozen) {
      const repairedStatus = existingSet.question_count >= existing.requested_question_count ? 'COMPLETED' : 'PARTIAL_SUCCESS';
      const { error: repairError } = await this.client.from('buyer_intent_runs').update({ status: repairedStatus, selected_question_count: existingSet.question_count, completed_at: new Date().toISOString() }).eq('id', existing.id);
      if (repairError) throw new Error(`Buyer intent recovery failed: ${repairError.message}`);
      return { kind: 'REUSED', runId: existing.id, result: await this.load(existing.id) };
    }

    const stale = new Date(existing.started_at).getTime() < Date.now() - STALE_RUN_MS;
    if (existing.status === 'RUNNING' && !stale) throw new BuyerIntentRunInProgressError('Buyer intent generation is already running');
    if (existingSet) {
      const { error: cleanupError } = await this.client.from('buyer_question_sets').delete().eq('id', existingSet.id).eq('is_frozen', false);
      if (cleanupError) throw new Error(`Buyer intent retry cleanup failed: ${cleanupError.message}`);
    }
    const { data: resumed, error: resumeError } = await this.client.from('buyer_intent_runs').update({
      status: 'RUNNING',
      prompt_version: identity.promptVersion,
      schema_version: identity.schemaVersion,
      generation_version: identity.generationVersion,
      ranking_version: identity.rankingVersion,
      business_understanding_version: identity.businessUnderstandingVersion,
      business_understanding_content_hash: identity.businessUnderstandingContentHash,
      model: identity.model,
      started_at: new Date().toISOString(),
      candidate_count: 0,
      selected_question_count: 0,
      rejected_candidate_count: 0,
      warnings: [] as Json,
      failure_message: null,
      completed_at: null,
    }).eq('id', existing.id).eq('started_at', existing.started_at).in('status', ['PENDING', 'FAILED', 'RUNNING']).select('id').maybeSingle();
    if (resumeError || !resumed) throw new BuyerIntentRunInProgressError('Buyer intent generation could not acquire the existing run');
    return { kind: 'STARTED', runId: resumed.id };
  }

  async finalize(runId: string, result: BuyerQuestionSet): Promise<BuyerQuestionSet> {
    if (!result.frozen || !result.finalized_at || !result.questions.length || result.status === 'FAILED') {
      throw new Error('Only a non-empty finalized buyer-question set can be persisted');
    }
    const { data: set, error: setError } = await this.client.from('buyer_question_sets').insert({
      run_id: runId,
      project_id: result.project_id,
      business_understanding_run_id: result.business_understanding_run_id,
      set_key: result.id,
      is_frozen: false,
      question_count: result.questions.length,
      finalized_at: null,
    }).select('id').single();
    if (setError || !set) throw new Error(`Buyer question set persistence failed: ${setError?.message ?? 'missing set'}`);

    const { error: questionsError } = await this.client.from('buyer_questions').insert(result.questions.map((question) => ({
      question_set_id: set.id,
      project_id: result.project_id,
      question_key: question.id,
      question: question.question,
      normalized_question: question.normalized_question,
      intent: question.intent,
      buyer_stage: question.buyer_stage,
      commercial_relevance: question.commercial_relevance,
      business_relevance: question.business_relevance,
      specificity: question.specificity,
      dimensions: question.dimensions as Json,
      rationale: question.rationale,
      supporting_business_evidence_keys: question.supporting_business_evidence_ids as Json,
      supporting_business_entity_keys: question.supporting_business_entity_ids as Json,
      confidence: question.confidence,
      priority_score: question.priority_score,
      rank: question.rank,
    })));
    if (questionsError) throw new Error(`Buyer question persistence failed: ${questionsError.message}`);

    const { data: frozen, error: freezeError } = await this.client.from('buyer_question_sets').update({
      is_frozen: true,
      finalized_at: result.finalized_at,
    }).eq('id', set.id).eq('is_frozen', false).select('id').maybeSingle();
    if (freezeError || !frozen) throw new Error(`Buyer question set finalization failed: ${freezeError?.message ?? 'set was not mutable'}`);

    const { data: completed, error: completionError } = await this.client.from('buyer_intent_runs').update({
      status: result.status,
      candidate_count: result.candidate_count,
      selected_question_count: result.questions.length,
      rejected_candidate_count: result.rejected_candidate_count,
      warnings: result.warnings as Json,
      failure_message: null,
      completed_at: result.finalized_at,
    }).eq('id', runId).eq('status', 'RUNNING').select('id').maybeSingle();
    if (completionError || !completed) throw new Error(`Buyer intent run completion failed: ${completionError?.message ?? 'run was not active'}`);
    // API and downstream Engine 03 consumers need the physical frozen-set UUID.
    // The deterministic set key remains persisted separately for idempotency.
    return { ...result, id: set.id };
  }

  async fail(runId: string, result: BuyerQuestionSet, message: string): Promise<BuyerQuestionSet> {
    const completedAt = new Date().toISOString();
    const { error } = await this.client.from('buyer_intent_runs').update({
      status: 'FAILED',
      candidate_count: result.candidate_count,
      selected_question_count: 0,
      rejected_candidate_count: result.rejected_candidate_count,
      warnings: result.warnings as Json,
      failure_message: message.slice(0, 2_000),
      completed_at: completedAt,
    }).eq('id', runId).eq('status', 'RUNNING');
    if (error) throw new Error(`Buyer intent failure persistence failed: ${error.message}`);
    return { ...result, status: 'FAILED', frozen: false, finalized_at: null, questions: [] };
  }

  private async load(runId: string): Promise<BuyerQuestionSet> {
    const [runResult, setResult] = await Promise.all([
      this.client.from('buyer_intent_runs').select('*').eq('id', runId).single(),
      this.client.from('buyer_question_sets').select('*').eq('run_id', runId).single(),
    ]);
    if (runResult.error || !runResult.data) throw new Error(`Buyer intent load failed: ${runResult.error?.message ?? 'missing run'}`);
    if (setResult.error || !setResult.data) throw new Error(`Buyer intent load failed: ${setResult.error?.message ?? 'missing question set'}`);
    const { data: questionRows, error: questionError } = await this.client.from('buyer_questions').select('*')
      .eq('question_set_id', setResult.data.id).order('rank', { ascending: true });
    if (questionError) throw new Error(`Buyer intent questions load failed: ${questionError.message}`);
    const run = runResult.data;
    const set = setResult.data;
    const questions: BuyerQuestion[] = (questionRows ?? []).map((row) => ({
      id: row.question_key,
      question: row.question,
      normalized_question: row.normalized_question,
      intent: row.intent as BuyerIntentCategory,
      buyer_stage: row.buyer_stage as BuyerStage,
      commercial_relevance: row.commercial_relevance,
      business_relevance: row.business_relevance,
      specificity: row.specificity,
      dimensions: strings(row.dimensions) as BuyerIntentDimension[],
      rationale: row.rationale,
      supporting_business_evidence_ids: strings(row.supporting_business_evidence_keys),
      supporting_business_entity_ids: strings(row.supporting_business_entity_keys),
      confidence: row.confidence as BuyerQuestionConfidence,
      priority_score: row.priority_score,
      rank: row.rank,
    }));
    return {
      id: set.id,
      version: run.engine_version,
      project_id: run.project_id,
      business_understanding_run_id: run.business_understanding_run_id,
      business_understanding_version: run.business_understanding_version,
      business_understanding_content_hash: run.business_understanding_content_hash,
      status: run.status as 'COMPLETED' | 'PARTIAL_SUCCESS',
      generated_at: run.created_at,
      finalized_at: set.finalized_at,
      frozen: set.is_frozen,
      requested_question_count: run.requested_question_count,
      candidate_count: run.candidate_count,
      rejected_candidate_count: run.rejected_candidate_count,
      questions,
      warnings: strings(run.warnings),
      generation: {
        model: run.model,
        prompt_version: run.prompt_version,
        schema_version: run.schema_version,
        generation_version: run.generation_version,
        ranking_version: run.ranking_version,
        reused: false,
      },
    };
  }
}
