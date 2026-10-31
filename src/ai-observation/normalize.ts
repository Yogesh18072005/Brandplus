import { createHash } from 'node:crypto';

const TRACKING_KEYS = new Set(['fbclid', 'gclid', 'mc_cid', 'mc_eid']);

export function observationId(prefix: string, value: string): string {
  return `${prefix}_${createHash('sha256').update(value).digest('hex').slice(0, 24)}`;
}

export function normalizeEntityName(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en')
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizeHostname(value: string): string | null {
  const candidate = value.trim();
  if (!candidate) return null;
  try {
    const url = new URL(candidate.includes('://') ? candidate : `https://${candidate}`);
    return url.hostname.toLocaleLowerCase('en').replace(/^www\./, '').replace(/\.$/, '');
  } catch {
    return null;
  }
}

export function hostnameBelongsToDomain(hostname: string | null, targetWebsite: string): boolean {
  const candidate = normalizeHostname(hostname ?? '');
  const target = normalizeHostname(targetWebsite);
  if (!candidate || !target) return false;
  return candidate === target || candidate.endsWith(`.${target}`);
}

export interface NormalizedSourceUrl {
  fullUrl: string;
  normalizedUrl: string;
  domain: string;
}

export function normalizeSourceUrl(value: string): NormalizedSourceUrl | null {
  const displayed = value.trim().replace(/^[<(\[]+|[>)\].,;:!?]+$/g, '');
  if (!displayed) return null;
  try {
    const parsed = new URL(displayed.includes('://') ? displayed : `https://${displayed}`);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    parsed.hostname = parsed.hostname.toLocaleLowerCase('en');
    parsed.hash = '';
    for (const key of [...parsed.searchParams.keys()]) {
      if (key.toLocaleLowerCase('en').startsWith('utm_') || TRACKING_KEYS.has(key.toLocaleLowerCase('en'))) {
        parsed.searchParams.delete(key);
      }
    }
    if (parsed.pathname !== '/') parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    const domain = normalizeHostname(parsed.hostname);
    if (!domain || !domain.includes('.')) return null;
    return { fullUrl: displayed, normalizedUrl: parsed.toString(), domain };
  } catch {
    return null;
  }
}

export function paragraphPosition(text: string, characterPosition: number): number {
  return text.slice(0, Math.max(0, characterPosition)).split(/\n\s*\n/).length;
}

export function surroundingContext(text: string, start: number, length: number): string {
  const paragraphStart = Math.max(text.lastIndexOf('\n', start - 1) + 1, 0);
  const nextBreak = text.indexOf('\n', start + length);
  return text.slice(paragraphStart, nextBreak < 0 ? text.length : nextBreak).trim().slice(0, 1_000);
}
