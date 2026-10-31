// Deterministic brand/domain matching. Do NOT delegate any of this to the LLM (CLAUDE.md §5.4).

const LEGAL_SUFFIXES =
  /\b(pvt\.?\s*ltd\.?|private\s+limited|ltd\.?|llp|llc|inc\.?|co\.?|corp\.?)\b/gi;

/** Lowercase, strip legal suffixes and punctuation, collapse whitespace. */
export function normalizeName(name: string): string {
  if (typeof name !== 'string' || !name) return ''; // parsers sometimes emit null/undefined names
  return name
    .toLowerCase()
    .replace(/['’‘]/g, '') // apostrophes JOIN, not split: "Batra's" ≡ "Batras"
    .replace(LEGAL_SUFFIXES, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Fuzzy check: does the brand (or any alias) appear in the text? */
export function nameAppearsIn(text: string, name: string, aliases: string[] = []): boolean {
  const haystack = normalizeName(text);
  return [name, ...aliases].some((n) => {
    const needle = normalizeName(n);
    return needle.length > 0 && haystack.includes(needle);
  });
}

/**
 * Sentence boundary that ignores abbreviations, so "Aalpha Information Systems
 * India Pvt. Ltd. builds apps" stays one sentence instead of ending at "Pvt.".
 */
export const SENTENCE_BREAK =
  /(?<!\b(?:Pvt|PVT|pvt|Ltd|LTD|ltd|Inc|Co|Corp|Pty|Dr|Mr|Mrs|Ms|St|Sr|Jr|No|vs|etc|approx|e\.g|i\.e)\.)(?<!\b[A-Z]\.)(?<=[.!?])\s+/;

/**
 * Pull the first real sentence/line from an AI answer that names one of `names`.
 * Used as the deterministic evidence quote when the parser leaves it blank —
 * the quotes are the whole proof of a report, so we never ship an empty one
 * when a competitor was actually named.
 */
export function extractEvidenceSentence(answerText: string, names: string[]): string {
  if (!answerText) return '';
  const needles = names.map((n) => normalizeName(n)).filter((n) => n.length > 1);
  if (needles.length === 0) return '';
  // Split on sentence enders AND list separators (AI answers are often bulleted).
  const chunks = answerText.split(new RegExp(`${SENTENCE_BREAK.source}|\\n+|(?=\\d+\\.\\s)|•|;\\s+`)).map((s) => s.trim());
  for (const chunk of chunks) {
    if (chunk.length < 12) continue;
    const hay = normalizeName(chunk);
    if (needles.some((n) => hay.includes(n))) {
      return chunk.length > 200 ? `${chunk.slice(0, 200).trimEnd()}…` : chunk;
    }
  }
  return '';
}

// Minimal two-level public suffixes we're likely to hit. Enough for v0;
// swap for a real PSL library if domain matching ever misfires.
const TWO_LEVEL_TLDS = new Set([
  'co.in', 'net.in', 'org.in', 'gen.in', 'firm.in', 'ind.in',
  'co.uk', 'org.uk', 'com.au', 'co.nz', 'com.sg', 'com.my',
]);

/** Extract the registrable domain (lowercased) from a URL or bare domain string. */
export function extractDomain(urlOrDomain: string): string {
  if (!urlOrDomain) return '';
  let host = urlOrDomain.trim().toLowerCase();
  try {
    host = new URL(host.includes('://') ? host : `https://${host}`).hostname;
  } catch {
    // fall through with the raw string
  }
  host = host.replace(/^www\./, '');
  const parts = host.split('.');
  if (parts.length <= 2) return host;
  const lastTwo = parts.slice(-2).join('.');
  const keep = TWO_LEVEL_TLDS.has(lastTwo) ? 3 : 2;
  return parts.slice(-keep).join('.');
}

/** True if two URLs/domains resolve to the same registrable domain. */
export function domainMatches(a: string, b: string): boolean {
  const da = extractDomain(a);
  const db = extractDomain(b);
  return da !== '' && da === db;
}
