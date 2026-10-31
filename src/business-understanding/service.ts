import { createHash } from 'node:crypto';
import { BUSINESS_UNDERSTANDING_VERSION, type BusinessEntity, type BusinessEntityType, type BusinessUnderstandingExtractor, type BusinessUnderstandingInput, type BusinessUnderstandingLogger, type BusinessUnderstandingRepository, type CanonicalBusinessUnderstanding, type CrawledPage, type CrawlResult, type SourceCoverage } from './types';
import { crawlWebsite } from './crawler';
import { GeminiBusinessUnderstandingExtractor } from './extractor';
import { assertCanonicalReferences } from './schema';
import { BUSINESS_UNDERSTANDING_PROMPT_VERSION } from './prompts';
import { deduplicateEntities, deduplicateEvidence, materializePageExtraction, stableId } from './normalize';

type CrawlFunction = (website: string, options?: { maxPages?: number }) => Promise<CrawlResult>;

export interface BusinessUnderstandingServiceOptions {
  crawler?: CrawlFunction;
  extractor?: BusinessUnderstandingExtractor;
  repository?: BusinessUnderstandingRepository;
  logger?: BusinessUnderstandingLogger;
  maxPages?: number;
}

const USABLE = new Set<CrawledPage['status']>(['SUCCESS', 'PARTIAL']);
const arrayForType: Record<BusinessEntityType, keyof Pick<CanonicalBusinessUnderstanding,
  'products' | 'services' | 'capabilities' | 'buyer_types' | 'industries' | 'use_cases' |
  'geographies' | 'proof_assets' | 'certifications' | 'commercial_claims' | 'differentiators' |
  'conversion_signals' | 'business_model_signals' | 'company_identity'>> = {
  COMPANY_IDENTITY: 'company_identity', PRODUCT: 'products', SERVICE: 'services', CAPABILITY: 'capabilities',
  BUYER_TYPE: 'buyer_types', INDUSTRY: 'industries', USE_CASE: 'use_cases', GEOGRAPHY: 'geographies',
  COMMERCIAL_CLAIM: 'commercial_claims', DIFFERENTIATOR: 'differentiators', PROOF_ASSET: 'proof_assets',
  CERTIFICATION: 'certifications', BUSINESS_MODEL_SIGNAL: 'business_model_signals', CONVERSION_SIGNAL: 'conversion_signals',
};

export function sourceCoverage(pages: CrawledPage[]): SourceCoverage {
  const count = (status: CrawledPage['status']) => pages.filter((page) => page.status === status).length;
  return {
    pages_analyzed: pages.length,
    pages_successfully_analyzed: pages.filter((page) => USABLE.has(page.status)).length,
    pages_failed: pages.filter((page) => ['BLOCKED', 'MALFORMED', 'INACCESSIBLE'].includes(page.status)).length,
    pages_empty: count('EMPTY'),
    pages_blocked: count('BLOCKED'),
    pages_partial: count('PARTIAL'),
    pages_duplicate: count('DUPLICATE'),
  };
}

function partitionEntities(entities: BusinessEntity[]): Pick<CanonicalBusinessUnderstanding,
  'products' | 'services' | 'capabilities' | 'buyer_types' | 'industries' | 'use_cases' |
  'geographies' | 'proof_assets' | 'certifications' | 'commercial_claims' | 'differentiators' |
  'conversion_signals' | 'business_model_signals' | 'company_identity'> {
  const result = {
    products: [], services: [], capabilities: [], buyer_types: [], industries: [], use_cases: [], geographies: [],
    proof_assets: [], certifications: [], commercial_claims: [], differentiators: [], conversion_signals: [],
    business_model_signals: [], company_identity: [],
  } as ReturnType<typeof partitionEntities>;
  for (const entity of entities) (result[arrayForType[entity.type]] as BusinessEntity[]).push(entity);
  return result;
}

function contextPages(input: BusinessUnderstandingInput, at: Date): CrawledPage[] {
  return (input.userProvidedContext ?? []).filter((text) => text.trim()).map((text, index) => ({
    url: `user-provided://project/${input.projectId}/${index + 1}`,
    canonicalUrl: `user-provided://project/${input.projectId}/${index + 1}`,
    title: `User-provided business context ${index + 1}`,
    sourceType: 'USER_PROVIDED',
    status: 'SUCCESS',
    contentText: text.trim(),
    contentHash: createHash('sha256').update(text.trim()).digest('hex'),
    httpStatus: null,
    fetchedAt: at.toISOString(),
  }));
}

function baseResult(input: BusinessUnderstandingInput, contentHash: string, pages: CrawledPage[], extractor: BusinessUnderstandingExtractor): CanonicalBusinessUnderstanding {
  return {
    version: BUSINESS_UNDERSTANDING_VERSION,
    status: 'NO_USABLE_EVIDENCE',
    project_id: input.projectId,
    content_hash: contentHash,
    generated_at: new Date().toISOString(),
    business: { name: input.businessName, website: input.website, description: null, business_model: null },
    ...partitionEntities([]),
    evidence: [], conflicts: [], unknowns: [], source_coverage: sourceCoverage(pages), warnings: [],
    extraction: { model: extractor.model, schema_version: BUSINESS_UNDERSTANDING_VERSION, prompt_version: BUSINESS_UNDERSTANDING_PROMPT_VERSION, reused: false },
  };
}

function ensureCriticalUnknowns(result: CanonicalBusinessUnderstanding): void {
  const coverageFailure = result.source_coverage.pages_failed > 0 || result.source_coverage.pages_partial > 0;
  const reason = coverageFailure ? 'CRAWL_FAILURE' : 'NOT_EVIDENCED';
  const ensure = (area: string, empty: boolean) => {
    if (!empty || result.unknowns.some((item) => item.area.toUpperCase() === area)) return;
    result.unknowns.push({
      id: stableId('unknown', `${area}:${reason}:${result.content_hash}`),
      area,
      reason,
      detail: coverageFailure
        ? `${area.toLowerCase()} could not be established because source coverage was incomplete.`
        : `${area.toLowerCase()} was not established from the analyzed evidence.`,
      evidence_ids: [],
    });
  };
  ensure('CERTIFICATION', result.certifications.length === 0);
  ensure('GEOGRAPHY', result.geographies.length === 0);
}

export class BusinessUnderstandingService {
  private readonly crawler: CrawlFunction;
  private readonly extractor: BusinessUnderstandingExtractor;
  private readonly repository?: BusinessUnderstandingRepository;
  private readonly logger?: BusinessUnderstandingLogger;
  private readonly maxPages: number;

  constructor(options: BusinessUnderstandingServiceOptions = {}) {
    this.crawler = options.crawler ?? crawlWebsite;
    this.extractor = options.extractor ?? new GeminiBusinessUnderstandingExtractor();
    this.repository = options.repository;
    this.logger = options.logger;
    this.maxPages = Math.min(Math.max(options.maxPages ?? Number(process.env.BUSINESS_UNDERSTANDING_MAX_PAGES ?? 12), 1), 30);
  }

  async understand(input: BusinessUnderstandingInput): Promise<CanonicalBusinessUnderstanding> {
    const started = Date.now();
    await this.logger?.record('business_understanding_started', { projectId: input.projectId, version: BUSINESS_UNDERSTANDING_VERSION });
    let crawled: CrawlResult;
    try {
      crawled = await this.crawler(input.website, { maxPages: this.maxPages });
    } catch (error) {
      const contentHash = createHash('sha256').update(`failed:${input.website}`).digest('hex');
      const failed = baseResult(input, contentHash, [], this.extractor);
      failed.status = 'FAILED';
      failed.warnings.push(`Website ingestion failed: ${error instanceof Error ? error.message : String(error)}`);
      failed.unknowns.push({ id: stableId('unknown', `crawl:${contentHash}`), area: 'BUSINESS_UNDERSTANDING', reason: 'CRAWL_FAILURE', detail: 'Website evidence could not be ingested.', evidence_ids: [] });
      await this.logger?.record('business_understanding_failed', { projectId: input.projectId, durationMs: Date.now() - started });
      return this.repository ? this.repository.save(failed, []) : failed;
    }
    const pages = [...crawled.pages, ...contextPages(input, new Date())];
    const contentHash = createHash('sha256').update([crawled.contentHash, ...pages.filter((page) => page.sourceType === 'USER_PROVIDED').map((page) => page.contentHash)].join(':')).digest('hex');
    await this.logger?.record('business_understanding_pages_selected', {
      projectId: input.projectId,
      selected: pages.filter((page) => USABLE.has(page.status)).length,
      skipped: pages.filter((page) => !USABLE.has(page.status)).length,
    });

    const usablePages = pages.filter((page) => USABLE.has(page.status) && (page.sourceType === 'USER_PROVIDED' ? page.contentText.trim().length > 0 : page.contentText.trim().length >= 80));
    // Reuse only when there was real content to analyse. With no readable pages
    // (a transient block, an empty fetch) retrying costs nothing, and caching
    // that outcome would turn a one-off failure into a permanent one.
    if (usablePages.length > 0) {
      const reusable = await this.repository?.findReusable(input.projectId, contentHash, BUSINESS_UNDERSTANDING_VERSION);
      if (reusable) return { ...reusable, extraction: { ...reusable.extraction, reused: true } };
    }

    const result = baseResult(input, contentHash, pages, this.extractor);
    result.warnings.push(...crawled.warnings);
    if (usablePages.length === 0) {
      result.unknowns.push({ id: stableId('unknown', `website:${contentHash}`), area: 'BUSINESS_UNDERSTANDING', reason: result.source_coverage.pages_failed ? 'CRAWL_FAILURE' : 'NOT_EVIDENCED', detail: 'No usable business evidence was available from the supplied sources.', evidence_ids: [] });
      await this.logger?.record('business_understanding_no_usable_evidence', { projectId: input.projectId, durationMs: Date.now() - started });
      return this.repository ? this.repository.save(result, pages) : result;
    }

    const materialized = [];
    let extractionFailures = 0;
    for (const page of usablePages) {
      const callStarted = Date.now();
      try {
        const extraction = await this.extractor.extractPage(page);
        materialized.push(materializePageExtraction(page, extraction));
        await this.logger?.record('business_understanding_page_extracted', { projectId: input.projectId, durationMs: Date.now() - callStarted, sourceType: page.sourceType });
      } catch (error) {
        extractionFailures++;
        result.warnings.push(`Extraction failed for ${page.canonicalUrl}: ${error instanceof Error ? error.message : String(error)}`);
        await this.logger?.record('business_understanding_schema_failure', { projectId: input.projectId, sourceUrlHash: stableId('url', page.canonicalUrl), durationMs: Date.now() - callStarted });
      }
    }

    const evidence = deduplicateEvidence(materialized.flatMap((item) => item.evidence));
    const pageEntities = deduplicateEntities(materialized.flatMap((item) => item.entities));
    const pageUnknowns = [...new Map(materialized.flatMap((item) => item.unknowns).map((item) => [item.id, item])).values()];
    if (evidence.length === 0 || pageEntities.length === 0) {
      result.status = extractionFailures === usablePages.length ? 'FAILED' : 'NO_USABLE_EVIDENCE';
      result.evidence = evidence;
      result.unknowns = pageUnknowns;
      result.warnings.push(extractionFailures === usablePages.length ? 'All page extractions failed validation.' : 'No material commercial entities were supported by the analyzed evidence.');
      await this.logger?.record('business_understanding_failed', { projectId: input.projectId, extractionFailures, durationMs: Date.now() - started });
      return this.repository ? this.repository.save(result, pages) : result;
    }

    try {
      const synthesis = await this.extractor.synthesize({ businessName: input.businessName, website: input.website, evidence, entities: pageEntities, unknowns: pageUnknowns });
      const entities = deduplicateEntities(synthesis.entities);
      Object.assign(result, partitionEntities(entities));
      result.business.description = synthesis.description;
      result.business.business_model = synthesis.business_model;
      result.evidence = evidence;
      result.conflicts = synthesis.conflicts;
      result.unknowns = [...new Map([...pageUnknowns, ...synthesis.unknowns].map((item) => [item.id, item])).values()];
      result.status = extractionFailures > 0 || result.source_coverage.pages_failed > 0 || result.source_coverage.pages_partial > 0 ? 'PARTIAL_SUCCESS' : 'SUCCESS';
      ensureCriticalUnknowns(result);
      assertCanonicalReferences(result);
      await this.logger?.record('business_understanding_completed', { projectId: input.projectId, status: result.status, evidenceCount: evidence.length, entityCount: entities.length, durationMs: Date.now() - started, model: this.extractor.model });
    } catch (error) {
      result.status = 'FAILED';
      result.evidence = evidence;
      result.unknowns = pageUnknowns;
      result.warnings.push(`Cross-page synthesis failed validation: ${error instanceof Error ? error.message : String(error)}`);
      await this.logger?.record('business_understanding_failed', { projectId: input.projectId, durationMs: Date.now() - started });
    }
    return this.repository ? this.repository.save(result, pages) : result;
  }
}
