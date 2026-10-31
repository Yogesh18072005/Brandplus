import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { canonicalizeSourceUrl, crawlWebsite, deduplicateSourcePages, extractPageContent, isPrivateAddress } from './crawler';
import { BusinessUnderstandingFailureRecordingError, SupabaseBusinessUnderstandingRepository, terminalTimestamp } from '../../lib/business-understanding/repository';
import { businessUnderstandingTestables, GeminiBusinessUnderstandingExtractor } from './extractor';
import { deduplicateEntities } from './normalize';
import { validatePageExtraction, validateSynthesis } from './schema';
import { BusinessUnderstandingService } from './service';
import type { BusinessEntity, BusinessUnderstandingExtractor, BusinessUnderstandingRepository, CanonicalBusinessUnderstanding, CrawledPage, CrawlResult, PageExtraction, SynthesisResult } from './types';

const content = 'We manufacture aluminum blister foil and provide custom printing services for pharmaceutical packaging customers worldwide.';
const page = (over: Partial<CrawledPage> = {}): CrawledPage => ({
  url: 'https://example.com/products', canonicalUrl: 'https://example.com/products', title: 'Products',
  sourceType: 'PRODUCT_SERVICE', status: 'SUCCESS', contentText: content, contentHash: 'page-hash',
  httpStatus: 200, fetchedAt: '2026-09-06T00:00:00.000Z', ...over,
});

const evidence = (text = 'We manufacture aluminum blister foil') => ({ id: 'e1', evidence_text: text, confidence: 'HIGH' as const });
const entity = (over: Partial<BusinessEntity> = {}): BusinessEntity => ({
  id: 'entity-1', type: 'PRODUCT', value: 'aluminum blister foil', description: null, category: null,
  statement_kind: 'FACT', confidence: 'HIGH', evidence_ids: ['e1'], ...over,
});

function extraction(entities: BusinessEntity[], evidenceText = 'We manufacture aluminum blister foil'): PageExtraction {
  return { evidence: [evidence(evidenceText)], entities, unknowns: [] };
}

class FakeExtractor implements BusinessUnderstandingExtractor {
  model = 'fake-model';
  pageCalls = 0;
  constructor(private readonly pageResult: PageExtraction, private readonly synthesisResult?: SynthesisResult, private readonly fail = false) {}
  async extractPage(): Promise<PageExtraction> { this.pageCalls++; if (this.fail) throw new Error('malformed response'); return this.pageResult; }
  async synthesize(input: Parameters<BusinessUnderstandingExtractor['synthesize']>[0]): Promise<SynthesisResult> {
    if (this.fail) throw new Error('malformed response');
    const firstEvidence = input.evidence[0]!.id;
    const entities = (this.synthesisResult?.entities ?? input.entities).map((item) => ({ ...item, evidence_ids: [firstEvidence] }));
    return this.synthesisResult ? { ...this.synthesisResult, entities } : { description: null, business_model: null, entities, conflicts: [], unknowns: [] };
  }
}

class MemoryRepository implements BusinessUnderstandingRepository {
  saved: CanonicalBusinessUnderstanding | null = null;
  saves = 0;
  async findReusable(_projectId: string, hash: string, version: string) { return this.saved?.content_hash === hash && this.saved.version === version ? this.saved : null; }
  async findLatest() { return this.saved; }
  async save(result: CanonicalBusinessUnderstanding) { this.saves++; this.saved = structuredClone(result); return result; }
}

const crawl = (pages: CrawledPage[]): CrawlResult => ({ pages, contentHash: 'crawl-hash', warnings: [] });
const input = { projectId: '11111111-1111-4111-8111-111111111111', businessName: 'Example Co', website: 'https://example.com' };

test('1: extracts a clear product and service only with exact evidence', () => {
  const result = validatePageExtraction({
    evidence: [evidence(), { id: 'e2', evidence_text: 'provide custom printing services', confidence: 'HIGH' }],
    entities: [entity(), entity({ id: 'entity-2', type: 'SERVICE', value: 'custom printing services', evidence_ids: ['e2'] })], unknowns: [],
  }, page());
  assert.deepEqual(result.entities.map((item) => item.type), ['PRODUCT', 'SERVICE']);
});

test('2: preserves multiple separately evidenced products', () => {
  const p = page({ contentText: 'We manufacture blister foil. We manufacture strip foil. More product information is available from our team.' });
  const result = validatePageExtraction({ evidence: [evidence('blister foil'), { ...evidence('strip foil'), id: 'e2' }], entities: [entity({ value: 'blister foil' }), entity({ id: 'e2-product', value: 'strip foil', evidence_ids: ['e2'] })], unknowns: [] }, p);
  assert.equal(result.entities.length, 2);
});

test('3: deterministic normalization merges clear synonyms', () => {
  const merged = deduplicateEntities([
    entity({ id: 'a', type: 'CAPABILITY', value: 'Pharmaceutical packaging', evidence_ids: ['one'] }),
    entity({ id: 'b', type: 'CAPABILITY', value: 'pharma packaging solutions', evidence_ids: ['two'] }),
  ]);
  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0]!.evidence_ids.sort(), ['one', 'two']);
});

test('4 and 5: missing certification and geography become explicit unknowns, not invented facts', async () => {
  const extractor = new FakeExtractor(extraction([entity()]));
  const result = await new BusinessUnderstandingService({ crawler: async () => crawl([page()]), extractor }).understand(input);
  assert.equal(result.certifications.length, 0);
  assert.equal(result.geographies.length, 0);
  assert.ok(result.unknowns.some((item) => item.area === 'CERTIFICATION' && item.reason === 'NOT_EVIDENCED'));
  assert.ok(result.unknowns.some((item) => item.area === 'GEOGRAPHY' && item.reason === 'NOT_EVIDENCED'));
});

test('6: cross-page synthesis preserves geography conflicts as unresolved', async () => {
  const synthesis: SynthesisResult = { description: null, business_model: null, entities: [entity()], conflicts: [{ id: 'geo-conflict', topic: 'geography', conflicting_values: ['worldwide', 'India'], evidence_ids: ['placeholder-one', 'placeholder-two'], resolution: 'UNRESOLVED' }], unknowns: [] };
  const extractor = new FakeExtractor({ evidence: [evidence(), { id: 'e2', evidence_text: 'customers worldwide', confidence: 'HIGH' }], entities: [entity()], unknowns: [] }, synthesis);
  extractor.synthesize = async (stage) => ({ ...synthesis, entities: stage.entities, conflicts: [{ ...synthesis.conflicts[0]!, evidence_ids: stage.evidence.map((item) => item.id) }] });
  const result = await new BusinessUnderstandingService({ crawler: async () => crawl([page()]), extractor }).understand(input);
  assert.equal(result.conflicts[0]?.resolution, 'UNRESOLVED');
});

test('7: marketing superlatives are claims, never objective facts', () => {
  const marketingPage = page({ contentText: "We are India's leading manufacturer of blister foil. Additional information for commercial buyers." });
  assert.throws(() => validatePageExtraction({ evidence: [evidence("India's leading manufacturer")], entities: [entity({ type: 'COMPANY_IDENTITY', value: "India's leading manufacturer", statement_kind: 'FACT' })], unknowns: [] }, marketingPage), /Subjective marketing language/);
  assert.doesNotThrow(() => validatePageExtraction({ evidence: [evidence("India's leading manufacturer")], entities: [entity({ type: 'COMMERCIAL_CLAIM', value: "India's leading manufacturer", statement_kind: 'COMMERCIAL_CLAIM' })], unknowns: [] }, marketingPage));
});

test('8: blocked pages are crawl failures, not evidence that capabilities are absent', async () => {
  const blocked = page({ status: 'BLOCKED', contentText: '', contentHash: null, httpStatus: 403 });
  const result = await new BusinessUnderstandingService({ crawler: async () => crawl([blocked]), extractor: new FakeExtractor(extraction([entity()])) }).understand(input);
  assert.equal(result.status, 'NO_USABLE_EVIDENCE');
  assert.equal(result.unknowns[0]?.reason, 'CRAWL_FAILURE');
});

test('9: navigation and footer boilerplate are removed before extraction', () => {
  const parsed = extractPageContent('<html><head><title>Acme</title></head><body><nav>ISO 9001 Trusted Leader</nav><main>We manufacture blister foil for pharmaceutical packaging buyers with custom sizes.<form><button>Request a quote</button></form></main><footer>Serving 50 countries</footer></body></html>', 'https://example.com');
  assert.match(parsed.text, /manufacture blister foil/);
  assert.match(parsed.text, /Request a quote/);
  assert.doesNotMatch(parsed.text, /Trusted Leader|50 countries/);
});

test('9b: a <main> holding only a widget does not hide the page; nav links are still followed', () => {
  // Real-world shape (citybond.in): <main> wraps a before/after slider, the content sits outside it.
  const html = '<html><head><title>CityBond ACP</title></head><body><nav><a href="/products">Products</a><a href="/about-us">About</a></nav>'
    + '<section>Premium aluminium composite panels for exteriors, manufactured for 24 years and supplied across India to architects and builders.</section>'
    + '<main>Before After</main><footer><a href="/contact">Contact</a> Serving 50 countries</footer></body></html>';
  const parsed = extractPageContent(html, 'https://citybond.in/');
  assert.match(parsed.text, /aluminium composite panels/);
  assert.doesNotMatch(parsed.text, /50 countries/);
  assert.deepEqual(parsed.links.sort(), ['https://citybond.in/about-us', 'https://citybond.in/contact', 'https://citybond.in/products']);
});

test('9c: a run with no readable pages is not reused, so the next attempt crawls again', async () => {
  const repository = new MemoryRepository();
  const extractor = new FakeExtractor(extraction([entity()]));
  let calls = 0;
  // Like the real crawler, a blocked fetch (no page content) fingerprints differently from a readable one.
  const crawler = async () => { calls++; return calls === 1 ? { ...crawl([page({ status: 'BLOCKED', contentText: '', contentHash: null, httpStatus: 403 })]), contentHash: 'empty-hash' } : crawl([page()]); };
  const service = new BusinessUnderstandingService({ crawler, extractor, repository });
  const first = await service.understand(input);
  assert.equal(first.status, 'NO_USABLE_EVIDENCE');
  const second = await service.understand(input);
  assert.equal(calls, 2);
  assert.notEqual(second.status, 'NO_USABLE_EVIDENCE');
  assert.equal(second.extraction.reused, false);
});

test('10: unchanged content reuses the versioned result without duplicate extraction or persistence', async () => {
  const repository = new MemoryRepository();
  const extractor = new FakeExtractor(extraction([entity()]));
  const service = new BusinessUnderstandingService({ crawler: async () => crawl([page()]), extractor, repository });
  await service.understand(input);
  const second = await service.understand(input);
  assert.equal(extractor.pageCalls, 1);
  assert.equal(repository.saves, 1);
  assert.equal(second.extraction.reused, true);
});

test('11: an entity with a nonexistent evidence reference fails validation', () => {
  assert.throws(() => validatePageExtraction({ evidence: [evidence()], entities: [entity({ evidence_ids: ['missing'] })], unknowns: [] }, page()), /missing evidence/);
});

test('12: malformed model output has bounded retry and produces a safe failed result', async () => {
  let attempts = 0;
  await assert.rejects(() => businessUnderstandingTestables.withSchemaRetry(async () => { attempts++; throw new Error('malformed'); }, 2), /malformed/);
  assert.equal(attempts, 2);
  const result = await new BusinessUnderstandingService({ crawler: async () => crawl([page()]), extractor: new FakeExtractor(extraction([entity()]), undefined, true) }).understand(input);
  assert.equal(result.status, 'FAILED');
});

test('13: Engine 01 API binds project lookup to the authenticated tenant', () => {
  const route = readFileSync(path.join(process.cwd(), 'app/api/projects/[id]/business-understanding/route.ts'), 'utf8');
  const migration = readFileSync(path.join(process.cwd(), 'supabase/migrations/019_business_understanding.sql'), 'utf8');
  assert.match(route, /\.eq\('id', id\)\.eq\('user_id', user\.id\)/);
  assert.doesNotMatch(route, /user_id:\s*(body|parsed|request)/);
  const protectedTables = [
    'business_understanding_runs', 'business_profiles', 'business_source_pages',
    'business_evidence', 'business_entities', 'business_entity_evidence',
    'business_conflicts', 'business_conflict_evidence', 'business_unknowns',
  ];
  for (const table of protectedTables) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
  }
  assert.match(migration, /p\.user_id = public\.current_clerk_profile_id\(\)/);
  assert.match(migration, /revoke insert, update, delete[\s\S]+from anon, authenticated;/i);
});

test('14: an empty website returns a valid degraded result without a fabricated profile', async () => {
  const empty = page({ status: 'EMPTY', contentText: '', contentHash: null });
  const result = await new BusinessUnderstandingService({ crawler: async () => crawl([empty]), extractor: new FakeExtractor(extraction([entity()])) }).understand(input);
  assert.equal(result.status, 'NO_USABLE_EVIDENCE');
  assert.equal(result.products.length, 0);
  assert.equal(result.business.description, null);
});

test('adversarial numeric and semantic inventions are rejected while exact capacity is preserved', () => {
  const globe = page({ contentText: 'Serving clients across the globe with packaging products and technical support for commercial buyers.' });
  assert.throws(() => validatePageExtraction({ evidence: [evidence('Serving clients across the globe')], entities: [entity({ type: 'GEOGRAPHY', value: 'Ships to 50 countries' })], unknowns: [] }, globe), /unsupported numeric detail/);
  const iso = page({ contentText: 'Our production uses ISO certified processes and documented quality controls for every manufacturing order.' });
  assert.throws(() => validatePageExtraction({ evidence: [evidence('ISO certified processes')], entities: [entity({ type: 'CERTIFICATION', value: 'ISO 9001 certified' })], unknowns: [] }, iso), /unsupported numeric detail/);
  const industries = page({ contentText: 'Products for pharma, food, cosmetics and other regulated packaging applications are available.' });
  assert.throws(() => validatePageExtraction({ evidence: [evidence('Products for pharma, food, cosmetics')], entities: [entity({ type: 'CAPABILITY', value: 'pharmaceutical industry expertise' })], unknowns: [] }, industries), /not directly stated/);
  const customers = page({ contentText: 'Customers include major pharmaceutical companies in several markets and packaging categories.' });
  assert.throws(() => validatePageExtraction({ evidence: [evidence('Customers include major pharmaceutical companies')], entities: [entity({ type: 'BUYER_TYPE', value: 'Pfizer' })], unknowns: [] }, customers), /not directly stated/);
  const capacity = page({ contentText: 'Manufacturing capacity of 10,000 units/month for aluminum foil conversion and commercial packaging orders.' });
  assert.doesNotThrow(() => validatePageExtraction({ evidence: [evidence('Manufacturing capacity of 10,000 units/month')], entities: [entity({ type: 'CAPABILITY', value: 'Manufacturing capacity of 10,000 units/month' })], unknowns: [] }, capacity));
});

test('adversarial cross-page summaries require multiple sources and cannot invent quantified reach', () => {
  const evidenceSet = [
    { ...evidence('We manufacture blister foil'), id: 'one', source_url: 'https://example.com/products', page_title: 'Products', source_type: 'PRODUCT_SERVICE' as const, extracted_at: '2026-09-06T00:00:00.000Z' },
    { ...evidence('We serve packaging buyers worldwide'), id: 'two', source_url: 'https://example.com/about', page_title: 'About', source_type: 'ABOUT_COMPANY' as const, extracted_at: '2026-09-06T00:00:00.000Z' },
  ];
  const base = { business_model: null, entities: [], conflicts: [], unknowns: [] };
  assert.throws(() => validateSynthesis({ ...base, description: { value: 'Manufacturer', evidence_ids: ['one'] } }, evidenceSet), /at least two evidence records/);
  assert.throws(() => validateSynthesis({ ...base, description: { value: 'Manufacturer serving 50 countries', evidence_ids: ['one', 'two'] } }, evidenceSet), /unsupported numeric detail/);
});

test('SSRF guard rejects IPv4-mapped private IPv6 addresses', () => {
  assert.equal(isPrivateAddress('::ffff:127.0.0.1'), true);
  assert.equal(isPrivateAddress('::ffff:10.0.0.1'), true);
});

type CrawlRoute = { redirect: string } | { body?: string };

const safeHtml = '<html><head><title>Example</title></head><body><main>We manufacture evidence-backed packaging products for commercial buyers with documented capabilities and support.</main></body></html>';

function redirectingFetch(routes: Record<string, CrawlRoute>, visited: string[] = []): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = input instanceof Request ? input.url : input.toString();
    visited.push(url);
    const route = routes[url];
    if (!route) throw new Error(`Unexpected fetch: ${url}`);
    if ('redirect' in route) return new Response(null, { status: 307, headers: { location: route.redirect } });
    return new Response(route.body ?? safeHtml, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
  }) as typeof fetch;
}

const publicResolver = async (hostname: string): Promise<string[]> => {
  if (/^\d+(?:\.\d+){3}$/.test(hostname)) return [hostname];
  return ['8.8.8.8'];
};

async function redirectedCrawl(start: string, routes: Record<string, CrawlRoute>, resolveHost = publicResolver) {
  return crawlWebsite(start, { maxPages: 1, fetchImpl: redirectingFetch(routes), resolveHost });
}

test('slow server: HTML received before the timeout is kept as a PARTIAL page', async () => {
  // citybond.in streams its homepage for ~30s; the timeout used to discard everything.
  const html = '<html><head><title>CityBond</title></head><body><section>Premium aluminium composite panels for exteriors, manufactured for 24 years and supplied across India.</section>';
  const fetchImpl = (async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(encoder.encode(html)); },
      pull(controller) { controller.error(new DOMException('The operation was aborted.', 'AbortError')); },
    });
    return new Response(body, { status: 200, headers: { 'content-type': 'text/html' } });
  }) as typeof fetch;
  const result = await crawlWebsite('https://citybond.in/', { maxPages: 1, fetchImpl, resolveHost: publicResolver });
  assert.equal(result.pages[0]?.status, 'PARTIAL');
  assert.match(result.pages[0]?.contentText ?? '', /aluminium composite panels/);
});

test('redirect security: apex to www is accepted', async () => {
  const result = await redirectedCrawl('https://example.com/', {
    'https://example.com/': { redirect: 'https://www.example.com/' },
    'https://www.example.com/': {},
  });
  assert.equal(result.pages[0]?.status, 'SUCCESS');
  assert.equal(result.pages[0]?.canonicalUrl, 'https://www.example.com/');
});

test('redirect security: www to apex is accepted', async () => {
  const result = await redirectedCrawl('https://www.example.com/', {
    'https://www.example.com/': { redirect: 'https://example.com/' },
    'https://example.com/': {},
  });
  assert.equal(result.pages[0]?.status, 'SUCCESS');
  assert.equal(result.pages[0]?.canonicalUrl, 'https://example.com/');
});

test('redirect security: HTTP to HTTPS is accepted', async () => {
  const result = await redirectedCrawl('http://example.com/', {
    'http://example.com/': { redirect: 'https://example.com/' },
    'https://example.com/': {},
  });
  assert.equal(result.pages[0]?.status, 'SUCCESS');
  assert.equal(result.pages[0]?.canonicalUrl, 'https://example.com/');
});

test('redirect security: same registrable-domain subdomain is accepted', async () => {
  const result = await redirectedCrawl('https://example.co.uk/', {
    'https://example.co.uk/': { redirect: 'https://shop.example.co.uk/' },
    'https://shop.example.co.uk/': {},
  });
  assert.equal(result.pages[0]?.status, 'SUCCESS');
  assert.equal(result.pages[0]?.canonicalUrl, 'https://shop.example.co.uk/');
});

test('redirect security: external domain is rejected after destination validation', async () => {
  const resolved: string[] = [];
  const result = await redirectedCrawl('https://example.com/', {
    'https://example.com/': { redirect: 'https://example.net/' },
  }, async (hostname) => { resolved.push(hostname); return ['8.8.8.8']; });
  assert.equal(result.pages[0]?.status, 'INACCESSIBLE');
  assert.match(result.pages[0]?.warning ?? '', /Cross-origin or unsafe redirect rejected/);
  assert.ok(resolved.includes('example.net'));
});

test('redirect security: localhost and private-IP destinations are rejected', async () => {
  const localhost = await redirectedCrawl('https://example.com/', {
    'https://example.com/': { redirect: 'http://localhost/admin' },
  });
  assert.equal(localhost.pages[0]?.status, 'INACCESSIBLE');
  assert.match(localhost.pages[0]?.warning ?? '', /Private website address rejected/);

  const privateIp = await redirectedCrawl('https://example.com/', {
    'https://example.com/': { redirect: 'http://10.0.0.8/admin' },
  });
  assert.equal(privateIp.pages[0]?.status, 'INACCESSIBLE');
  assert.match(privateIp.pages[0]?.warning ?? '', /Private or unresolved website address rejected/);
});

test('redirect security: a validated multi-hop chain succeeds', async () => {
  const result = await redirectedCrawl('http://example.com/', {
    'http://example.com/': { redirect: 'https://www.example.com/' },
    'https://www.example.com/': { redirect: 'https://shop.example.com/catalog' },
    'https://shop.example.com/catalog': {},
  });
  assert.equal(result.pages[0]?.status, 'SUCCESS');
  assert.equal(result.pages[0]?.canonicalUrl, 'https://shop.example.com/catalog');
});

test('redirect security: the existing five-hop redirect limit is preserved', async () => {
  const result = await redirectedCrawl('https://example.com/', {
    'https://example.com/': { redirect: 'https://a.example.com/' },
    'https://a.example.com/': { redirect: 'https://b.example.com/' },
    'https://b.example.com/': { redirect: 'https://c.example.com/' },
    'https://c.example.com/': { redirect: 'https://d.example.com/' },
    'https://d.example.com/': { redirect: 'https://e.example.com/' },
    'https://e.example.com/': { redirect: 'https://f.example.com/' },
  });
  assert.equal(result.pages[0]?.status, 'INACCESSIBLE');
  assert.match(result.pages[0]?.warning ?? '', /Too many or invalid redirects/);
});

test('redirect security: redirect loops are rejected', async () => {
  const result = await redirectedCrawl('https://example.com/', {
    'https://example.com/': { redirect: 'https://www.example.com/' },
    'https://www.example.com/': { redirect: 'https://example.com/' },
  });
  assert.equal(result.pages[0]?.status, 'INACCESSIBLE');
  assert.match(result.pages[0]?.warning ?? '', /Redirect loop detected/);
});

test('redirect security: DNS-rebinding-style mixed public/private answers are rejected before destination fetch', async () => {
  const visited: string[] = [];
  const fetchImpl = redirectingFetch({
    'https://example.com/': { redirect: 'https://www.example.com/' },
    'https://www.example.com/': {},
  }, visited);
  const result = await crawlWebsite('https://example.com/', {
    maxPages: 1,
    fetchImpl,
    resolveHost: async (hostname) => hostname === 'www.example.com' ? ['8.8.8.8', '127.0.0.1'] : ['8.8.8.8'],
  });
  assert.equal(result.pages[0]?.status, 'INACCESSIBLE');
  assert.match(result.pages[0]?.warning ?? '', /Private or unresolved website address rejected/);
  assert.deepEqual(visited, ['https://example.com/']);
});

test('redirect security: nonstandard ports and HTTPS downgrade are rejected', async () => {
  const port = await redirectedCrawl('https://example.com/', {
    'https://example.com/': { redirect: 'https://www.example.com:8443/' },
  });
  assert.equal(port.pages[0]?.status, 'INACCESSIBLE');
  assert.match(port.pages[0]?.warning ?? '', /Unsupported website URL/);

  const downgrade = await redirectedCrawl('https://example.com/', {
    'https://example.com/': { redirect: 'http://www.example.com/' },
  });
  assert.equal(downgrade.pages[0]?.status, 'INACCESSIBLE');
  assert.match(downgrade.pages[0]?.warning ?? '', /Cross-origin or unsafe redirect rejected/);
});

test('Engine 01 terminal timestamp never precedes the database start time', () => {
  const startedAt = '2026-09-12T04:32:12.435Z';
  const skewedApplicationTime = new Date('2026-09-12T04:32:11.053Z');
  const normalized = terminalTimestamp(startedAt, skewedApplicationTime);
  assert.equal(normalized, startedAt);
  assert.ok(Date.parse(normalized) >= Date.parse(startedAt));

  const laterApplicationTime = new Date('2026-09-12T04:32:15.000Z');
  assert.equal(terminalTimestamp(startedAt, laterApplicationTime), laterApplicationTime.toISOString());
});

test('Gemini Interactions request uses the supported structured JSON text format', async () => {
  const calls: Array<{ responseFormat?: unknown; generationConfig?: unknown }> = [];
  const extractor = new GeminiBusinessUnderstandingExtractor(async (options) => {
    calls.push(options);
    return { output_text: JSON.stringify(extraction([entity()])) };
  });
  const result = await extractor.extractPage(page());
  assert.equal(result.entities[0]?.value, 'aluminum blister foil');
  assert.deepEqual(calls[0]?.responseFormat, {
    type: 'text',
    mime_type: 'application/json',
    schema: businessUnderstandingTestables.PAGE_RESPONSE_SCHEMA,
  });
  assert.deepEqual(calls[0]?.generationConfig, { thinking_level: 'minimal', temperature: 0, max_output_tokens: 6_000 });
});

test('unsupported Gemini response formats and prose-wrapped JSON cannot silently pass extraction', () => {
  assert.throws(
    () => businessUnderstandingTestables.assertSupportedStructuredFormat({ type: 'json_schema', schema: {} }),
    /Unsupported Gemini structured response format/,
  );
  assert.throws(
    () => businessUnderstandingTestables.parseJson('Model output: {"evidence":[],"entities":[],"unknowns":[]}'),
    /Unexpected token|Unexpected non-whitespace character/,
  );
});

test('page extraction retry receives bounded provenance correction feedback', async () => {
  const inputs: string[] = [];
  let attempt = 0;
  const extractor = new GeminiBusinessUnderstandingExtractor(async (options) => {
    inputs.push(String(options.input));
    attempt++;
    return {
      output_text: JSON.stringify(attempt === 1
        ? extraction([entity({ value: 'unsupported normalized label', confidence: 'HIGH' })])
        : extraction([entity()])),
    };
  });

  const result = await extractor.extractPage(page());

  assert.equal(result.entities[0]?.value, 'aluminum blister foil');
  const retryInput = JSON.parse(inputs[1] ?? '{}') as { correction?: { validation_error?: string } };
  assert.match(retryInput.correction?.validation_error ?? '', /not directly stated/);
  assert.ok((retryInput.correction?.validation_error?.length ?? 0) <= 500);
});

test('unsupported subjective language in an optional synthesis summary is omitted without discarding valid Engine 01 evidence', async () => {
  let calls = 0;
  const extractor = new GeminiBusinessUnderstandingExtractor(async () => {
    calls++;
    return {
      output_text: JSON.stringify({
        description: { value: 'A leading manufacturer of aluminum blister foil', evidence_ids: ['e1', 'e2'] },
        business_model: null,
        entities: [],
        conflicts: [],
        unknowns: [],
      }),
    };
  });
  const result = await extractor.synthesize({
    businessName: 'Example Co',
    website: 'https://example.com',
    evidence: [
      { ...evidence('We manufacture aluminum blister foil'), source_url: 'https://example.com/products', page_title: 'Products', source_type: 'PRODUCT_SERVICE', extracted_at: '2026-09-14T00:00:00.000Z' },
      { ...evidence('We provide custom printing services'), id: 'e2', source_url: 'https://example.com/services', page_title: 'Services', source_type: 'PRODUCT_SERVICE', extracted_at: '2026-09-14T00:00:00.000Z' },
    ],
    entities: [],
    unknowns: [],
  });

  assert.equal(result.description, null);
  assert.equal(calls, 1);
});
test('source-page deduplication collapses identical canonical URLs', () => {
  const duplicate = page();
  const result = deduplicateSourcePages([duplicate, { ...duplicate }]);
  assert.equal(result.length, 1);
  assert.equal(result[0]?.status, 'SUCCESS');
});

test('source-page deduplication retains a successful record over a failed duplicate', () => {
  const failed = page({ status: 'INACCESSIBLE', contentText: '', contentHash: null, httpStatus: null, warning: 'fetch failed' });
  const successful = page({ status: 'SUCCESS', contentText: content, contentHash: 'success-hash', httpStatus: 200 });
  const result = deduplicateSourcePages([failed, successful]);
  assert.equal(result.length, 1);
  assert.equal(result[0]?.status, 'SUCCESS');
  assert.equal(result[0]?.contentHash, 'success-hash');
});

test('source-page deduplication treats trailing-slash variants as one URL', () => {
  const result = deduplicateSourcePages([
    page({ canonicalUrl: 'https://example.com/products/' }),
    page({ canonicalUrl: 'https://example.com/products' }),
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0]?.canonicalUrl, 'https://example.com/products');
});

test('source-page deduplication ignores URL fragments', () => {
  const result = deduplicateSourcePages([
    page({ canonicalUrl: 'https://example.com/products#specifications' }),
    page({ canonicalUrl: 'https://example.com/products#pricing' }),
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0]?.canonicalUrl, 'https://example.com/products');
});

test('source-page canonicalization normalizes equivalent representations deterministically', () => {
  assert.equal(
    canonicalizeSourceUrl('HTTPS://EXAMPLE.COM:443/catalog/../products/?b=2&a=1'),
    'https://example.com/products?a=1&b=2',
  );
  const result = deduplicateSourcePages([
    page({ canonicalUrl: 'HTTPS://EXAMPLE.COM:443/catalog/../products/?b=2&a=1' }),
    page({ canonicalUrl: 'https://example.com/products?a=1&b=2' }),
  ]);
  assert.equal(result.length, 1);
});

interface PersistenceClientOptions {
  cleanupError?: string;
  pageError?: string;
  failureUpdateError?: string;
}

function persistenceClient(options: PersistenceClientOptions = {}) {
  const inserted: Record<string, unknown[]> = {};
  const updates: Array<Record<string, unknown>> = [];
  const startedAt = '2026-09-12T05:36:47.343Z';
  const client = {
    from(table: string) {
      return {
        upsert() {
          return { select: () => ({ single: async () => ({ data: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', started_at: startedAt }, error: null }) }) };
        },
        delete() {
          return { eq: async () => ({ error: options.cleanupError && table === 'business_profiles' ? { message: options.cleanupError } : null }) };
        },
        insert(rows: unknown | unknown[]) {
          inserted[table] = Array.isArray(rows) ? rows : [rows];
          const error = options.pageError && table === 'business_source_pages' ? { message: options.pageError } : null;
          const data = table === 'business_source_pages'
            ? (inserted[table] ?? []).map((row, index) => ({ id: `page-${index}`, canonical_url: (row as { canonical_url: string }).canonical_url }))
            : [];
          return Object.assign(Promise.resolve({ error }), { select: async () => ({ data: error ? null : data, error }) });
        },
        update(values: Record<string, unknown>) {
          updates.push(values);
          const failureRecording = values.status === 'FAILED' && String(values.failure_message ?? '').includes('persistence exploded');
          return {
            eq: () => ({
              eq: async () => ({ error: failureRecording && options.failureUpdateError ? { message: options.failureUpdateError } : null }),
            }),
          };
        },
      };
    },
  };
  return { client, inserted, updates, startedAt };
}

async function failedExtractionResult(): Promise<CanonicalBusinessUnderstanding> {
  return new BusinessUnderstandingService({
    crawler: async () => crawl([page()]),
    extractor: new FakeExtractor(extraction([entity()]), undefined, true),
  }).understand(input);
}

test('Gemini extraction failure persists an Engine 01 terminal FAILED result', async () => {
  const repository = new MemoryRepository();
  const result = await new BusinessUnderstandingService({
    crawler: async () => crawl([page()]),
    extractor: new FakeExtractor(extraction([entity()]), undefined, true),
    repository,
  }).understand(input);
  assert.equal(result.status, 'FAILED');
  assert.equal(repository.saved?.status, 'FAILED');
  assert.match(repository.saved?.warnings.at(-1) ?? '', /All page extractions failed validation/);
});

test('page persistence failure records FAILED with ordered terminal timestamps and rethrows the original error', async () => {
  const fake = persistenceClient({ pageError: 'persistence exploded' });
  const repository = new SupabaseBusinessUnderstandingRepository(fake.client as never);
  const result = await failedExtractionResult();
  await assert.rejects(() => repository.save(result, [page()]), /Business source persistence failed: persistence exploded/);
  const terminal = fake.updates.at(-1)!;
  assert.equal(terminal.status, 'FAILED');
  assert.equal(terminal.failure_message, 'Business source persistence failed: persistence exploded');
  assert.ok(Date.parse(String(terminal.completed_at)) >= Date.parse(fake.startedAt));
});

test('repository inserts only the most useful record for each canonical source URL', async () => {
  const fake = persistenceClient();
  const repository = new SupabaseBusinessUnderstandingRepository(fake.client as never);
  const result = await failedExtractionResult();
  const failed = page({ canonicalUrl: 'https://example.com/products/#failed', status: 'INACCESSIBLE', contentText: '', contentHash: null, httpStatus: null });
  const successful = page({ canonicalUrl: 'HTTPS://EXAMPLE.COM:443/products', status: 'SUCCESS', contentHash: 'retained-hash' });
  await repository.save(result, [failed, successful]);
  assert.equal(fake.inserted.business_source_pages?.length, 1);
  assert.deepEqual(fake.inserted.business_source_pages?.[0], {
    run_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    project_id: input.projectId,
    source_url: successful.url,
    canonical_url: 'https://example.com/products',
    page_title: successful.title,
    source_type: successful.sourceType,
    crawl_status: 'SUCCESS',
    content_hash: 'retained-hash',
    http_status: successful.httpStatus,
    fetched_at: successful.fetchedAt,
    warning: null,
  });
});

test('unexpected repository persistence exceptions are terminal and remain observable', async () => {
  const fake = persistenceClient({ cleanupError: 'unexpected cleanup failure' });
  const repository = new SupabaseBusinessUnderstandingRepository(fake.client as never);
  const result = await failedExtractionResult();
  await assert.rejects(() => repository.save(result, [page()]), /Business understanding retry cleanup failed: unexpected cleanup failure/);
  assert.equal(fake.updates.at(-1)?.status, 'FAILED');
  assert.ok(fake.updates.at(-1)?.completed_at);
});

test('failure-recording errors expose both the original persistence failure and recording failure', async () => {
  const fake = persistenceClient({ pageError: 'persistence exploded', failureUpdateError: 'terminal update failed' });
  const repository = new SupabaseBusinessUnderstandingRepository(fake.client as never);
  const result = await failedExtractionResult();
  await assert.rejects(
    () => repository.save(result, [page()]),
    (error: unknown) => error instanceof BusinessUnderstandingFailureRecordingError
      && error.message.includes('persistence exploded')
      && error.message.includes('terminal update failed'),
  );
});

test('a misquoted snippet drops only itself, not the whole page', () => {
  const p = page({ contentText: 'We manufacture blister foil. We manufacture strip foil. More product information is available from our team.' });
  const result = validatePageExtraction({
    evidence: [evidence('blister foil'), { ...evidence('strip foils for every pharma brand'), id: 'e2' }],
    entities: [entity({ value: 'blister foil' }), entity({ id: 'e2-product', value: 'strip foil', evidence_ids: ['e2'] })],
    unknowns: [],
  }, p);
  assert.deepEqual(result.evidence.map((item) => item.id), ['e1']);
  assert.deepEqual(result.entities.map((item) => item.value), ['blister foil']);
  // A page with no exact snippet at all still fails.
  assert.throws(() => validatePageExtraction({ evidence: [{ ...evidence('not on the page at all'), id: 'e9' }], entities: [], unknowns: [] }, p), /not an exact snippet/);
});

test('synthesis citations to rejected evidence are pruned instead of failing the run', () => {
  const evidenceSet = [
    { ...evidence('We manufacture blister foil'), id: 'one', source_url: 'https://example.com/products', page_title: 'Products', source_type: 'PRODUCT_SERVICE' as const, extracted_at: '2026-09-06T00:00:00.000Z' },
    { ...evidence('We serve packaging buyers worldwide'), id: 'two', source_url: 'https://example.com/about', page_title: 'About', source_type: 'ABOUT_COMPANY' as const, extracted_at: '2026-09-06T00:00:00.000Z' },
  ];
  const result = validateSynthesis({
    business_model: null,
    description: { value: 'Blister foil manufacturer', evidence_ids: ['one', 'two', 'from-rejected-homepage'] },
    entities: [
      entity({ id: 'kept', value: 'blister foil', evidence_ids: ['one', 'from-rejected-homepage'] }),
      entity({ id: 'dropped', value: 'strip foil', evidence_ids: ['from-rejected-homepage'] }),
    ],
    conflicts: [],
    unknowns: [],
  }, evidenceSet);
  assert.deepEqual(result.entities.map((item) => item.id), ['kept']);
  assert.deepEqual(result.entities[0]?.evidence_ids, ['one']);
  assert.deepEqual(result.description?.evidence_ids, ['one', 'two']);
});
