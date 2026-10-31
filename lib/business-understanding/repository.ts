import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/lib/supabase/types';
import type { BusinessEntity, BusinessEntityType, BusinessUnderstandingRepository, CanonicalBusinessUnderstanding, CrawledPage, EvidenceConfidence, ProcessingStatus, SourceCoverage, SourceType, StatementKind } from '@/src/business-understanding/types';
import { canonicalizeSourceUrl, deduplicateSourcePages } from '@/src/business-understanding/crawler';
import { normalizeConcept } from '@/src/business-understanding/normalize';

type AdminClient = SupabaseClient<Database>;

const entityField: Record<BusinessEntityType, keyof CanonicalBusinessUnderstanding> = {
  COMPANY_IDENTITY: 'company_identity', PRODUCT: 'products', SERVICE: 'services', CAPABILITY: 'capabilities', BUYER_TYPE: 'buyer_types', INDUSTRY: 'industries', USE_CASE: 'use_cases', GEOGRAPHY: 'geographies', COMMERCIAL_CLAIM: 'commercial_claims', DIFFERENTIATOR: 'differentiators', PROOF_ASSET: 'proof_assets', CERTIFICATION: 'certifications', BUSINESS_MODEL_SIGNAL: 'business_model_signals', CONVERSION_SIGNAL: 'conversion_signals',
};

const strings = (value: Json): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

export function terminalTimestamp(startedAt: string, completedAt = new Date()): string {
  const startedAtMs = Date.parse(startedAt);
  if (!Number.isFinite(startedAtMs)) throw new Error('Business understanding run has an invalid database start time');
  return new Date(Math.max(startedAtMs, completedAt.getTime())).toISOString();
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  return String(error);
}

export class BusinessUnderstandingFailureRecordingError extends AggregateError {
  constructor(original: unknown, recordingFailure: unknown) {
    super(
      [original, recordingFailure],
      `Business understanding failed: ${errorMessage(original)}; terminal failure recording also failed: ${errorMessage(recordingFailure)}`,
    );
    this.name = 'BusinessUnderstandingFailureRecordingError';
  }
}

export class SupabaseBusinessUnderstandingRepository implements BusinessUnderstandingRepository {
  constructor(private readonly client: AdminClient) {}

  async findReusable(projectId: string, contentHash: string, version: string): Promise<CanonicalBusinessUnderstanding | null> {
    const { data, error } = await this.client.from('business_understanding_runs').select('*').eq('project_id', projectId).eq('content_hash', contentHash).eq('extraction_version', version).in('status', ['SUCCESS', 'PARTIAL_SUCCESS', 'NO_USABLE_EVIDENCE']).maybeSingle();
    if (error) throw new Error(`Business understanding lookup failed: ${error.message}`);
    return data ? this.load(data.id) : null;
  }

  async findLatest(projectId: string): Promise<CanonicalBusinessUnderstanding | null> {
    const record = await this.findLatestRecord(projectId);
    return record?.understanding ?? null;
  }

  async findLatestRecord(projectId: string): Promise<{ runId: string; understanding: CanonicalBusinessUnderstanding } | null> {
    const { data, error } = await this.client.from('business_understanding_runs').select('id').eq('project_id', projectId).neq('status', 'PROCESSING').order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error(`Business understanding lookup failed: ${error.message}`);
    return data ? { runId: data.id, understanding: await this.load(data.id) } : null;
  }

  async findByRunId(projectId: string, runId: string): Promise<CanonicalBusinessUnderstanding | null> {
    const { data, error } = await this.client.from('business_understanding_runs').select('id')
      .eq('id', runId).eq('project_id', projectId).maybeSingle();
    if (error) throw new Error(`Business understanding lookup failed: ${error.message}`);
    return data ? this.load(data.id) : null;
  }

  private async load(runId: string): Promise<CanonicalBusinessUnderstanding> {
    const [runResult, profileResult, pagesResult, evidenceResult, entitiesResult, conflictsResult, unknownsResult] = await Promise.all([
      this.client.from('business_understanding_runs').select('*').eq('id', runId).single(),
      this.client.from('business_profiles').select('*').eq('run_id', runId).single(),
      this.client.from('business_source_pages').select('*').eq('run_id', runId),
      this.client.from('business_evidence').select('*').eq('run_id', runId),
      this.client.from('business_entities').select('*').eq('run_id', runId),
      this.client.from('business_conflicts').select('*').eq('run_id', runId),
      this.client.from('business_unknowns').select('*').eq('run_id', runId),
    ]);
    const entityIds = (entitiesResult.data ?? []).map((row) => row.id);
    const conflictIds = (conflictsResult.data ?? []).map((row) => row.id);
    const [entityLinksResult, conflictLinksResult] = await Promise.all([
      entityIds.length ? this.client.from('business_entity_evidence').select('*').in('entity_id', entityIds) : Promise.resolve({ data: [], error: null }),
      conflictIds.length ? this.client.from('business_conflict_evidence').select('*').in('conflict_id', conflictIds) : Promise.resolve({ data: [], error: null }),
    ]);
    const failed = [runResult, profileResult, pagesResult, evidenceResult, entitiesResult, entityLinksResult, conflictsResult, conflictLinksResult, unknownsResult].find((result) => result.error);
    if (failed?.error) throw new Error(`Business understanding load failed: ${failed.error.message}`);
    const run = runResult.data!;
    const profile = profileResult.data!;
    const pageById = new Map((pagesResult.data ?? []).map((page) => [page.id, page]));
    const evidenceKeyById = new Map((evidenceResult.data ?? []).map((item) => [item.id, item.evidence_key]));
    const entityEvidence = new Map<string, string[]>();
    for (const link of entityLinksResult.data ?? []) entityEvidence.set(link.entity_id, [...(entityEvidence.get(link.entity_id) ?? []), evidenceKeyById.get(link.evidence_id)!].filter(Boolean));
    const conflictEvidence = new Map<string, string[]>();
    for (const link of conflictLinksResult.data ?? []) conflictEvidence.set(link.conflict_id, [...(conflictEvidence.get(link.conflict_id) ?? []), evidenceKeyById.get(link.evidence_id)!].filter(Boolean));
    const result = {
      version: run.extraction_version,
      status: run.status as ProcessingStatus,
      project_id: run.project_id,
      content_hash: run.content_hash,
      generated_at: run.completed_at ?? run.created_at,
      business: {
        name: profile.business_name,
        website: profile.website,
        description: profile.description ? { value: profile.description, evidence_ids: strings(profile.description_evidence_keys) } : null,
        business_model: profile.business_model ? { value: profile.business_model, evidence_ids: strings(profile.business_model_evidence_keys) } : null,
      },
      products: [], services: [], capabilities: [], buyer_types: [], industries: [], use_cases: [], geographies: [], proof_assets: [], certifications: [], commercial_claims: [], differentiators: [], conversion_signals: [], business_model_signals: [], company_identity: [],
      evidence: (evidenceResult.data ?? []).map((item) => {
        const page = item.source_page_id ? pageById.get(item.source_page_id) : undefined;
        return { id: item.evidence_key, source_url: page?.canonical_url ?? profile.website, page_title: page?.page_title ?? '', source_type: (page?.source_type ?? 'GENERIC_PAGE') as SourceType, evidence_text: item.evidence_text, extracted_at: item.extracted_at, confidence: item.confidence as EvidenceConfidence };
      }),
      conflicts: (conflictsResult.data ?? []).map((item) => ({ id: item.conflict_key, topic: item.topic, conflicting_values: strings(item.conflicting_values), evidence_ids: conflictEvidence.get(item.id) ?? [], resolution: 'UNRESOLVED' as const })),
      unknowns: (unknownsResult.data ?? []).map((item) => ({ id: item.unknown_key, area: item.area, reason: item.reason as 'NOT_EVIDENCED' | 'CRAWL_FAILURE' | 'AMBIGUOUS' | 'CONFLICT', detail: item.detail, evidence_ids: strings(item.evidence_keys) })),
      source_coverage: run.source_coverage as unknown as SourceCoverage,
      warnings: strings(run.warnings),
      extraction: { model: run.model, schema_version: run.schema_version, prompt_version: run.prompt_version, reused: false },
    } satisfies CanonicalBusinessUnderstanding;
    for (const row of entitiesResult.data ?? []) {
      const entity: BusinessEntity = { id: row.entity_key, type: row.entity_type as BusinessEntityType, value: row.value, description: row.description, category: row.category, statement_kind: row.statement_kind as StatementKind, confidence: row.confidence as 'HIGH' | 'MEDIUM' | 'LOW', evidence_ids: entityEvidence.get(row.id) ?? [] };
      (result[entityField[entity.type]] as BusinessEntity[]).push(entity);
    }
    return result;
  }

  async save(result: CanonicalBusinessUnderstanding, pages: CrawledPage[]): Promise<CanonicalBusinessUnderstanding> {
    const { data: run, error: runError } = await this.client.from('business_understanding_runs').upsert({ project_id: result.project_id, status: 'PROCESSING', website: result.business.website, content_hash: result.content_hash, extraction_version: result.version, prompt_version: result.extraction.prompt_version, schema_version: result.extraction.schema_version, model: result.extraction.model, source_coverage: result.source_coverage as unknown as Json, warnings: result.warnings as Json, failure_message: null, completed_at: null }, { onConflict: 'project_id,content_hash,extraction_version' }).select('id,started_at').single();
    if (runError || !run) throw new Error(`Business understanding run persistence failed: ${runError?.message ?? 'missing run'}`);
    const runId = run.id;
    try {
    for (const cleanup of [
      this.client.from('business_profiles').delete().eq('run_id', runId),
      this.client.from('business_unknowns').delete().eq('run_id', runId),
      this.client.from('business_conflicts').delete().eq('run_id', runId),
      this.client.from('business_entities').delete().eq('run_id', runId),
      this.client.from('business_evidence').delete().eq('run_id', runId),
      this.client.from('business_source_pages').delete().eq('run_id', runId),
    ]) {
      const { error } = await cleanup;
      if (error) throw new Error(`Business understanding retry cleanup failed: ${error.message}`);
    }
    const { error: profileError } = await this.client.from('business_profiles').insert({ run_id: runId, project_id: result.project_id, business_name: result.business.name, website: result.business.website, description: result.business.description?.value ?? null, description_evidence_keys: (result.business.description?.evidence_ids ?? []) as Json, business_model: result.business.business_model?.value ?? null, business_model_evidence_keys: (result.business.business_model?.evidence_ids ?? []) as Json });
    if (profileError) throw new Error(`Business profile persistence failed: ${profileError.message}`);
    const uniquePages = deduplicateSourcePages(pages);
    const { data: savedPages, error: pageError } = uniquePages.length
      ? await this.client.from('business_source_pages').insert(uniquePages.map((page) => ({ run_id: runId, project_id: result.project_id, source_url: page.url, canonical_url: page.canonicalUrl, page_title: page.title, source_type: page.sourceType, crawl_status: page.status, content_hash: page.contentHash, http_status: page.httpStatus, fetched_at: page.fetchedAt, warning: page.warning ?? null }))).select('id,canonical_url')
      : { data: [], error: null };
    if (pageError) throw new Error(`Business source persistence failed: ${pageError.message}`);
    const pageIds = new Map((savedPages ?? []).map((page) => [page.canonical_url, page.id]));
    const { data: savedEvidence, error: evidenceError } = result.evidence.length ? await this.client.from('business_evidence').insert(result.evidence.map((item) => ({ run_id: runId, project_id: result.project_id, source_page_id: pageIds.get(canonicalizeSourceUrl(item.source_url)) ?? null, evidence_key: item.id, evidence_text: item.evidence_text, confidence: item.confidence, extracted_at: item.extracted_at }))).select('id,evidence_key') : { data: [], error: null };
    if (evidenceError) throw new Error(`Business evidence persistence failed: ${evidenceError.message}`);
    const evidenceIds = new Map((savedEvidence ?? []).map((item) => [item.evidence_key, item.id]));
    const allEntities = (Object.values(entityField) as Array<keyof CanonicalBusinessUnderstanding>).flatMap((field) => result[field] as BusinessEntity[]);
    const { data: savedEntities, error: entityError } = allEntities.length ? await this.client.from('business_entities').insert(allEntities.map((item) => ({ run_id: runId, project_id: result.project_id, entity_key: item.id, entity_type: item.type, value: item.value, normalized_value: normalizeConcept(item.value), description: item.description, category: item.category, statement_kind: item.statement_kind, confidence: item.confidence }))).select('id,entity_key') : { data: [], error: null };
    if (entityError) throw new Error(`Business entity persistence failed: ${entityError.message}`);
    const entityIds = new Map((savedEntities ?? []).map((item) => [item.entity_key, item.id]));
    const entityLinks = allEntities.flatMap((entity) => entity.evidence_ids.map((evidenceKey) => ({ entity_id: entityIds.get(entity.id)!, evidence_id: evidenceIds.get(evidenceKey)! })).filter((link) => link.entity_id && link.evidence_id));
    if (entityLinks.length) { const { error } = await this.client.from('business_entity_evidence').insert(entityLinks); if (error) throw new Error(`Entity evidence persistence failed: ${error.message}`); }
    const { data: savedConflicts, error: conflictError } = result.conflicts.length ? await this.client.from('business_conflicts').insert(result.conflicts.map((item) => ({ run_id: runId, project_id: result.project_id, conflict_key: item.id, topic: item.topic, conflicting_values: item.conflicting_values as Json, resolution: item.resolution }))).select('id,conflict_key') : { data: [], error: null };
    if (conflictError) throw new Error(`Business conflict persistence failed: ${conflictError.message}`);
    const conflictIds = new Map((savedConflicts ?? []).map((item) => [item.conflict_key, item.id]));
    const conflictLinks = result.conflicts.flatMap((conflict) => conflict.evidence_ids.map((evidenceKey) => ({ conflict_id: conflictIds.get(conflict.id)!, evidence_id: evidenceIds.get(evidenceKey)! })).filter((link) => link.conflict_id && link.evidence_id));
    if (conflictLinks.length) { const { error } = await this.client.from('business_conflict_evidence').insert(conflictLinks); if (error) throw new Error(`Conflict evidence persistence failed: ${error.message}`); }
    if (result.unknowns.length) { const { error } = await this.client.from('business_unknowns').insert(result.unknowns.map((item) => ({ run_id: runId, project_id: result.project_id, unknown_key: item.id, area: item.area, reason: item.reason, detail: item.detail, evidence_keys: item.evidence_ids as Json }))); if (error) throw new Error(`Business unknown persistence failed: ${error.message}`); }
    const completedAt = terminalTimestamp(run.started_at);
    const { error: completionError } = await this.client.from('business_understanding_runs').update({ status: result.status, source_coverage: result.source_coverage as unknown as Json, warnings: result.warnings as Json, failure_message: result.status === 'FAILED' ? result.warnings.at(-1) ?? 'Extraction failed' : null, completed_at: completedAt }).eq('id', runId).eq('status', 'PROCESSING');
    if (completionError) throw new Error(`Business understanding completion failed: ${completionError.message}`);
    return result;
    } catch (error) {
      const failure = errorMessage(error);
      const failureWarning = `Persistence failed: ${failure}`;
      const warnings = result.warnings.includes(failureWarning) ? result.warnings : [...result.warnings, failureWarning];
      const completedAt = terminalTimestamp(run.started_at);
      const { error: failureError } = await this.client.from('business_understanding_runs').update({
        status: 'FAILED',
        source_coverage: result.source_coverage as unknown as Json,
        warnings: warnings as Json,
        failure_message: failure,
        completed_at: completedAt,
      }).eq('id', runId).eq('status', 'PROCESSING');
      if (failureError) throw new BusinessUnderstandingFailureRecordingError(error, failureError);
      throw error;
    }
  }
}
