import { createHash } from 'node:crypto';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { isIP, type LookupFunction } from 'node:net';
import { lookup } from 'node:dns/promises';
import { Readable } from 'node:stream';
import * as cheerio from 'cheerio';
import ipaddr from 'ipaddr.js';
import { getDomain } from 'tldts';
import type { CrawlResult, CrawledPage, SourceType } from './types';

export interface CrawlOptions {
  maxPages?: number;
  maxBytesPerPage?: number;
  timeoutMs?: number;
  /** Budget for the whole crawl; pages not started by then are skipped. */
  totalTimeoutMs?: number;
  fetchImpl?: typeof fetch;
  resolveHost?: (hostname: string) => Promise<string[]>;
  now?: () => Date;
}

const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const MAX_REDIRECTS = 5;
const PRIVATE_HOST_SUFFIXES = ['.localhost', '.local', '.internal', '.home', '.lan'] as const;
const SOURCE_PRIORITY: Record<SourceType, number> = {
  PRODUCT_SERVICE: 1, INDUSTRY_USE_CASE: 2, CERTIFICATION_QUALITY: 3, ABOUT_COMPANY: 4,
  CASE_STUDY: 5, CONTACT_LOCATION: 6, BLOG_EDITORIAL: 7, GENERIC_PAGE: 8, USER_PROVIDED: 0,
};

export function canonicalizeSourceUrl(value: string): string {
  const url = new URL(value);
  url.hash = '';
  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase();
  if ((url.protocol === 'http:' && url.port === '80') || (url.protocol === 'https:' && url.port === '443')) {
    url.port = '';
  }
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
  const query = [...url.searchParams.entries()].sort(([leftKey, leftValue], [rightKey, rightValue]) =>
    leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue));
  url.search = '';
  for (const [key, value] of query) url.searchParams.append(key, value);
  return url.toString();
}

const CRAWL_RESULT_QUALITY: Record<CrawledPage['status'], number> = {
  SUCCESS: 7,
  PARTIAL: 6,
  EMPTY: 5,
  DUPLICATE: 4,
  BLOCKED: 3,
  MALFORMED: 2,
  INACCESSIBLE: 1,
};

function isMoreUsefulPage(candidate: CrawledPage, retained: CrawledPage): boolean {
  const quality = CRAWL_RESULT_QUALITY[candidate.status] - CRAWL_RESULT_QUALITY[retained.status];
  if (quality !== 0) return quality > 0;
  const contentLength = candidate.contentText.length - retained.contentText.length;
  if (contentLength !== 0) return contentLength > 0;
  if (Boolean(candidate.contentHash) !== Boolean(retained.contentHash)) return Boolean(candidate.contentHash);
  if (Boolean(candidate.title) !== Boolean(retained.title)) return Boolean(candidate.title);
  return candidate.url.localeCompare(retained.url) < 0;
}

export function deduplicateSourcePages(pages: CrawledPage[]): CrawledPage[] {
  const retained = new Map<string, CrawledPage>();
  for (const page of pages) {
    const canonicalUrl = canonicalizeSourceUrl(page.canonicalUrl);
    const normalized = { ...page, canonicalUrl };
    const existing = retained.get(canonicalUrl);
    if (!existing || isMoreUsefulPage(normalized, existing)) retained.set(canonicalUrl, normalized);
  }
  return [...retained.values()];
}

export function isPrivateAddress(address: string): boolean {
  if (!ipaddr.isValid(address)) return true;
  // process() normalizes IPv4-mapped IPv6 before classification, preventing
  // alternate IPv6 spellings from bypassing IPv4 private-range checks.
  return ipaddr.process(address).range() !== 'unicast';
}

async function defaultResolve(hostname: string): Promise<string[]> {
  if (isIP(hostname)) return [hostname];
  return (await lookup(hostname, { all: true, verbatim: true })).map((entry) => entry.address);
}

interface ResolvedAddress {
  address: string;
  family: 4 | 6;
}

interface ValidatedTarget {
  hostname: string;
  addresses: ResolvedAddress[];
}

function normalizedHostname(url: URL): string {
  return url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
}

function validPort(url: URL): boolean {
  return url.port === '' || (url.protocol === 'http:' && url.port === '80')
    || (url.protocol === 'https:' && url.port === '443');
}

async function validatePublicUrl(url: URL, resolveHost: (hostname: string) => Promise<string[]>): Promise<ValidatedTarget> {
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !validPort(url)) {
    throw new Error('Unsupported website URL');
  }
  const hostname = normalizedHostname(url);
  const isLiteral = isIP(hostname) !== 0;
  if (!hostname || hostname === 'localhost' || PRIVATE_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
    || (!isLiteral && !hostname.includes('.'))) {
    throw new Error('Private website address rejected');
  }
  const addresses = [...new Set(await resolveHost(hostname))].map((address) => ({
    address,
    family: isIP(address),
  })).filter((item): item is ResolvedAddress => item.family === 4 || item.family === 6);
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error('Private or unresolved website address rejected');
  }
  return { hostname, addresses };
}

function sameRegistrableDomain(root: URL, destination: URL): boolean {
  const rootHostname = normalizedHostname(root);
  const destinationHostname = normalizedHostname(destination);
  if (rootHostname === destinationHostname) return true;
  const rootDomain = getDomain(rootHostname, { allowPrivateDomains: false });
  const destinationDomain = getDomain(destinationHostname, { allowPrivateDomains: false });
  return rootDomain !== null && rootDomain === destinationDomain;
}

function validateRedirectRelationship(root: URL, current: URL, destination: URL): void {
  if (current.protocol === 'https:' && destination.protocol !== 'https:') {
    throw new Error('Cross-origin or unsafe redirect rejected');
  }
  if (!sameRegistrableDomain(root, destination)) {
    throw new Error('Cross-origin or unsafe redirect rejected');
  }
}

function pinnedLookup(target: ValidatedTarget): LookupFunction {
  return (hostname, options, callback) => {
    if (hostname.toLowerCase() !== target.hostname) {
      callback(new Error('DNS lookup escaped the validated hostname'), '', 0);
      return;
    }
    const requestedFamily = options.family === 4 || options.family === 6 ? options.family : 0;
    const candidates = target.addresses.filter(({ family }) => requestedFamily === 0 || family === requestedFamily);
    if (candidates.length === 0) {
      callback(new Error('No validated address matches the requested family'), '', 0);
      return;
    }
    if (options.all) {
      callback(null, candidates);
      return;
    }
    callback(null, candidates[0]!.address, candidates[0]!.family);
  };
}

function fetchValidated(url: URL, target: ValidatedTarget, init: RequestInit): Promise<Response> {
  return new Promise((resolve, reject) => {
    const headers = new Headers(init.headers);
    // Request identity encoding so the existing byte limit remains a bound on
    // the exact response bytes read from the pinned socket.
    headers.set('Accept-Encoding', 'identity');
    const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(url, {
      method: init.method ?? 'GET',
      headers: Object.fromEntries(headers.entries()),
      signal: init.signal ?? undefined,
      lookup: pinnedLookup(target),
      agent: false,
    }, (incoming) => {
      const responseHeaders = new Headers();
      for (let index = 0; index < incoming.rawHeaders.length; index += 2) {
        responseHeaders.append(incoming.rawHeaders[index]!, incoming.rawHeaders[index + 1]!);
      }
      const status = incoming.statusCode ?? 500;
      const bodyAllowed = ![101, 204, 205, 304].includes(status);
      const body = bodyAllowed ? Readable.toWeb(incoming) as ReadableStream<Uint8Array> : null;
      resolve(new Response(body, { status, statusText: incoming.statusMessage, headers: responseHeaders }));
    });
    request.once('error', reject);
    request.end();
  });
}

async function readLimitedBody(response: Response, maxBytes: number): Promise<{ text: string; partial: boolean }> {
  if (!response.body) return { text: '', partial: false };
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = '';
  let partial = false;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const remaining = maxBytes - bytes;
      if (remaining <= 0) { partial = true; break; }
      const chunk = value.byteLength > remaining ? value.slice(0, remaining) : value;
      bytes += chunk.byteLength;
      text += decoder.decode(chunk, { stream: true });
      if (chunk.byteLength < value.byteLength) { partial = true; break; }
    }
  } catch (error) {
    // A slow server can still be streaming when the timeout fires (citybond.in
    // takes ~30s to send its homepage). Keep what already arrived; with nothing
    // received there is no page to read, so the failure stands.
    if (!text) throw error;
    partial = true;
  } finally {
    if (partial) await reader.cancel().catch(() => undefined);
  }
  return { text: text + decoder.decode(), partial };
}

function sourceTypeFor(url: URL): SourceType {
  const path = url.pathname.toLowerCase();
  if (/product|service|solution|offering/.test(path)) return 'PRODUCT_SERVICE';
  if (/industr|use-case|application|sector|vertical/.test(path)) return 'INDUSTRY_USE_CASE';
  if (/certif|quality|compliance|accredit/.test(path)) return 'CERTIFICATION_QUALITY';
  if (/case-stud|customer-stor|portfolio|project/.test(path)) return 'CASE_STUDY';
  if (/about|company|who-we-are/.test(path)) return 'ABOUT_COMPANY';
  if (/contact|location|office|branch/.test(path)) return 'CONTACT_LOCATION';
  if (/blog|news|article|insight/.test(path)) return 'BLOG_EDITORIAL';
  return 'GENERIC_PAGE';
}

export function extractPageContent(html: string, pageUrl: string): { title: string; text: string; links: string[]; canonicalUrl: string } {
  const $ = cheerio.load(html);
  // Collect links BEFORE stripping navigation: the main menu is usually the
  // only path to the product, about and contact pages worth reading.
  const hrefs = $('a[href]').map((_, element) => $(element).attr('href') ?? '').get();
  $('script,style,noscript,svg,canvas,iframe,nav,footer,aside,[aria-hidden="true"],.cookie,.cookies,.cookie-banner,.consent,.modal').remove();
  const title = $('title').first().text().replace(/\s+/g, ' ').trim().slice(0, 300);
  const page = new URL(pageUrl);
  const canonicalHref = $('link[rel="canonical"]').attr('href');
  let canonicalUrl = canonicalizeSourceUrl(page.toString());
  if (canonicalHref) {
    try {
      const candidate = new URL(canonicalHref, page);
      if (candidate.origin === page.origin) canonicalUrl = canonicalizeSourceUrl(candidate.toString());
    } catch { /* retain fetched URL */ }
  }
  const links = hrefs.flatMap((href) => {
    try {
      const candidate = new URL(href, page);
      candidate.hash = '';
      return candidate.origin === page.origin && ['http:', 'https:'].includes(candidate.protocol) ? [canonicalizeSourceUrl(candidate.toString())] : [];
    } catch { return []; }
  });
  const clean = (value: string) => value.replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  // Prefer <main>/<article> only when it actually holds the page's content.
  // Many themes wrap a single widget (a slider, a hero) in <main>, and reading
  // only that discards the whole page.
  const bodyText = clean($('body').text());
  const root = $('main,article,[role="main"]').first();
  const rootText = root.length ? clean(root.text()) : '';
  const text = rootText && rootText.length >= bodyText.length * 0.5 ? rootText : bodyText;
  return { title, text, links: [...new Set(links)], canonicalUrl };
}

export interface PublicResource {
  status: number;
  finalUrl: string;
  contentType: string;
  text: string;
}

/**
 * Fetch one public text resource (a page, robots.txt, llms.txt, sitemap.xml)
 * with the same SSRF protections as the crawler: public-IP validation, DNS
 * pinning, same-site redirects only, a byte limit and a timeout.
 */
export async function fetchPublicResource(
  url: string,
  options: Pick<CrawlOptions, 'timeoutMs' | 'resolveHost'> & { maxBytes?: number; accept?: string } = {},
): Promise<PublicResource> {
  const timeoutMs = Math.min(Math.max(options.timeoutMs ?? 15_000, 2_000), 60_000);
  const maxBytes = Math.min(Math.max(options.maxBytes ?? 1_000_000, 10_000), 2_000_000);
  const resolveHost = options.resolveHost ?? defaultResolve;
  const root = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
  root.hash = '';
  let current = root;
  let target = await validatePublicUrl(current, resolveHost);
  const history = new Set([current.toString()]);
  for (let redirects = 0; ; redirects++) {
    const response = await fetchValidated(current, target, {
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'User-Agent': 'BrandPulseSiteCheck/1.0', Accept: options.accept ?? '*/*' },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location || redirects >= MAX_REDIRECTS) throw new Error('Too many or invalid redirects');
      const redirected = new URL(location, current);
      redirected.hash = '';
      const redirectedTarget = await validatePublicUrl(redirected, resolveHost);
      validateRedirectRelationship(root, current, redirected);
      if (history.has(redirected.toString())) throw new Error('Redirect loop detected');
      history.add(redirected.toString());
      current = redirected;
      target = redirectedTarget;
      continue;
    }
    const body = response.ok ? await readLimitedBody(response, maxBytes) : { text: '' };
    if (!response.ok) await response.body?.cancel().catch(() => undefined);
    return {
      status: response.status,
      finalUrl: current.toString(),
      contentType: response.headers.get('content-type')?.toLowerCase() ?? '',
      text: body.text,
    };
  }
}

export async function crawlWebsite(website: string, options: CrawlOptions = {}): Promise<CrawlResult> {
  const maxPages = Math.min(Math.max(options.maxPages ?? 12, 1), 30);
  const maxBytes = Math.min(Math.max(options.maxBytesPerPage ?? 1_000_000, 50_000), 2_000_000);
  const timeoutMs = Math.min(Math.max(options.timeoutMs ?? 30_000, 2_000), 60_000);
  // Whole-crawl budget, so one slow site cannot stall the audit for minutes.
  const deadline = Date.now() + Math.min(Math.max(options.totalTimeoutMs ?? 120_000, timeoutMs), 300_000);
  const fetchImpl = options.fetchImpl ?? fetch;
  const resolveHost = options.resolveHost ?? defaultResolve;
  const now = options.now ?? (() => new Date());
  const root = new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`);
  root.hash = '';
  await validatePublicUrl(root, resolveHost);

  const queue = [root.toString()];
  const seen = new Set<string>();
  const contentHashes = new Set<string>();
  const pages: CrawledPage[] = [];
  const warnings: string[] = [];

  while (queue.length && pages.length < maxPages) {
    // Always read the first page; after that, stop starting fetches past the budget.
    if (pages.length > 0 && Date.now() >= deadline) {
      warnings.push(`Crawl stopped after ${pages.length} page(s): the site responded too slowly to read more.`);
      break;
    }
    const requested = queue.shift()!;
    if (seen.has(requested)) continue;
    seen.add(requested);
    let current = new URL(requested);
    let response: Response | null = null;
    let warning: string | undefined;
    try {
      const redirectHistory = new Set([current.toString()]);
      let target = await validatePublicUrl(current, resolveHost);
      for (let redirects = 0; ; redirects++) {
        const init: RequestInit = {
          redirect: 'manual',
          signal: AbortSignal.timeout(timeoutMs),
          headers: { 'User-Agent': 'BrandPulseBusinessUnderstanding/1.0', Accept: 'text/html,application/xhtml+xml' },
        };
        response = options.fetchImpl
          ? await fetchImpl(current, init)
          : await fetchValidated(current, target, init);
        if (response.status < 300 || response.status >= 400) break;
        const location = response.headers.get('location');
        if (!location) throw new Error('Too many or invalid redirects');
        const redirected = new URL(location, current);
        redirected.hash = '';
        // Validate before checking the site boundary. Every destination gets
        // protocol, port, hostname, DNS and IP checks, including rejected hops.
        const redirectedTarget = await validatePublicUrl(redirected, resolveHost);
        validateRedirectRelationship(root, current, redirected);
        if (redirectHistory.has(redirected.toString())) throw new Error('Redirect loop detected');
        if (redirects >= MAX_REDIRECTS) throw new Error('Too many or invalid redirects');
        redirectHistory.add(redirected.toString());
        current = redirected;
        target = redirectedTarget;
      }
      if (!response) throw new Error('No response');
      const fetchedAt = now().toISOString();
      if ([401, 403, 429].includes(response.status)) {
        pages.push({ url: requested, canonicalUrl: current.toString(), title: '', sourceType: sourceTypeFor(current), status: 'BLOCKED', contentText: '', contentHash: null, httpStatus: response.status, fetchedAt });
        continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
        pages.push({ url: requested, canonicalUrl: current.toString(), title: '', sourceType: sourceTypeFor(current), status: 'MALFORMED', contentText: '', contentHash: null, httpStatus: response.status, fetchedAt, warning: `Unsupported content type: ${contentType || 'unknown'}` });
        continue;
      }
      const body = await readLimitedBody(response, maxBytes);
      const extracted = extractPageContent(body.text, current.toString());
      const contentHash = extracted.text ? sha(extracted.text) : null;
      let status: CrawledPage['status'] = body.partial || response.status === 206 ? 'PARTIAL' : 'SUCCESS';
      if (extracted.text.length < 80) status = 'EMPTY';
      if (contentHash && contentHashes.has(contentHash)) status = 'DUPLICATE';
      if (contentHash) contentHashes.add(contentHash);
      pages.push({ url: requested, canonicalUrl: extracted.canonicalUrl, title: extracted.title, sourceType: sourceTypeFor(current), status, contentText: status === 'DUPLICATE' ? '' : extracted.text, contentHash, httpStatus: response.status, fetchedAt, warning });
      if (status === 'SUCCESS' || status === 'PARTIAL') {
        const candidates = extracted.links.filter((link) => !seen.has(link));
        candidates.sort((a, b) => SOURCE_PRIORITY[sourceTypeFor(new URL(a))] - SOURCE_PRIORITY[sourceTypeFor(new URL(b))] || a.localeCompare(b));
        queue.push(...candidates);
      }
    } catch (error) {
      warning = error instanceof Error ? error.message : String(error);
      warnings.push(`${requested}: ${warning}`);
      pages.push({ url: requested, canonicalUrl: current.toString(), title: '', sourceType: sourceTypeFor(current), status: 'INACCESSIBLE', contentText: '', contentHash: null, httpStatus: response?.status ?? null, fetchedAt: now().toISOString(), warning });
    }
  }
  const contentHash = sha(pages.filter((page) => page.contentHash).map((page) => `${page.canonicalUrl}:${page.contentHash}`).sort().join('\n') || `empty:${root.origin}`);
  return { pages, contentHash, warnings };
}
