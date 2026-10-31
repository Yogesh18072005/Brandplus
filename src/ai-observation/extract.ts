import type {
  CitationObservation,
  DerivedObservation,
  EntityMatchStatus,
  EntityMention,
  EntityType,
  ObservationProviderResult,
  ObservedEntity,
  ProviderCitation,
  RecommendationStrength,
  SourceObservation,
  TargetIdentity,
} from './types';
import {
  hostnameBelongsToDomain,
  normalizeEntityName,
  normalizeHostname,
  normalizeSourceUrl,
  observationId,
  paragraphPosition,
  surroundingContext,
} from './normalize';

const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>{}\[\]"']+|\b[a-z0-9](?:[a-z0-9-]{0,62}\.)+[a-z]{2,}(?:\/[^\s<>{}\[\]"']*)?/giu;
const CORPORATE_SUFFIX = /\b(?:pvt\.?\s*ltd\.?|private\s+limited|limited|ltd\.?|inc\.?|llc|llp|corp(?:oration)?\.?|company|co\.?|industries|solutions|technologies|group|labs?)\b/i;
const ORDERED_LINE = /^\s*(\d{1,3})[.)]\s+(.+?)\s*$/gm;
const BULLET_LINE = /^\s*[-*•]\s+(.+?)\s*$/gm;
const MARKDOWN_BOLD_LABEL = /^\s*[-*•]\s+\*\*([^*\n]{2,120}?):\*\*/gm;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cleanEntityCandidate(value: string): string | null {
  const cleaned = value
    .replace(/\[[^\]]+\]/g, '')
    .split(/\s+[–—:-]\s+|[.;!?](?:\s|$)/, 1)[0]!
    .replace(/^\*+|\*+$/g, '')
    .trim();
  if (cleaned.length < 2 || cleaned.length > 120) return null;
  if (/^(sources?|references?|note|disclaimer|conclusion|overview)$/i.test(cleaned)) return null;
  if (!/[\p{L}\p{N}]/u.test(cleaned)) return null;
  return cleaned;
}

const GEOGRAPHIC_LOCATIONS = new Set([
  'india', 'mumbai', 'delhi', 'bengaluru', 'bangalore', 'gujarat', 'maharashtra',
  'tamil nadu', 'karnataka', 'punjab', 'haryana', 'telangana', 'kerala', 'rajasthan',
  'uttar pradesh', 'west bengal', 'hyderabad', 'chennai', 'kolkata', 'ahmedabad',
  'pune', 'surat', 'jaipur', 'china', 'usa', 'us', 'united states', 'europe', 'asia',
  'north america', 'south america', 'africa', 'australia', 'vietnam', 'germany',
  'japan', 'united kingdom', 'uk', 'canada', 'singapore', 'uae', 'united arab emirates',
  'dubai', 'saudi arabia', 'mexico', 'taiwan', 'south korea', 'brazil', 'turkey',
  'italy', 'france', 'spain', 'netherlands', 'thailand', 'malaysia', 'indonesia',
  'noida', 'gurugram', 'gurgaon', 'coimbatore', 'ludhiana', 'tirupur', 'vadodara',
]);

function isGeographicLocation(value: string): boolean {
  return GEOGRAPHIC_LOCATIONS.has(value.trim().toLowerCase());
}

const PROCESS_LABEL_PATTERN = /^(?:quality control|export logistics|sample development|production management|brand authorization|minimum order|custom packaging|supply chain|order procurement|technical requirement|compliance standard|product engineering|quality assurance|logistics & shipping|material sourcing|oem manufacturing|odm services|contract manufacturing|turnkey solutions|manufacturing process|testing & inspection|certification & compliance|packaging & labeling)\b/i;

function isProcessOrCapabilityLabel(value: string): boolean {
  return PROCESS_LABEL_PATTERN.test(value.trim());
}

export function genericMarkdownLabel(value: string): boolean {
  return /^(?:what|why|how|when|where|who|key|prominent|recommended|important|note|step|option|category|type|company registration|brand authorization|authorized dealer|minimum order|quality control|sample development|production management|export logistics|overview|summary|features|specifications|capabilities|requirements|details|advantages|benefits|services|products|applications|industries)\b/i.test(value.trim()) || isProcessOrCapabilityLabel(value);
}

export function inferEntityType(value: string): EntityType {
  if (CORPORATE_SUFFIX.test(value)) return 'COMPANY';
  if (isGeographicLocation(value) || isProcessOrCapabilityLabel(value)) return 'OTHER';
  return 'ORGANIZATION';
}

function classifyStrength(context: string): RecommendationStrength {
  if (/\b(?:not necessarily|do not|don't|cannot|can't|wouldn't)\s+(?:strongly\s+|highly\s+)?recommend\b/i.test(context)) return 'MENTION';
  if (/\b(?:strongly|highly|wholeheartedly)\s+recommend(?:ed|s)?\b/i.test(context)) return 'STRONGLY_RECOMMENDED';
  if (/\b(?:i|we)\s+recommend\b|\brecommended\s+(?:choice|option|provider|supplier|manufacturer)\b/i.test(context)) return 'RECOMMENDED';
  if (/\b(?:i|we)\s+suggest\b|\bconsider\s+(?:using|choosing|contacting|buying from)\b/i.test(context)) return 'SUGGESTED';
  return 'MENTION';
}

function targetMatch(candidate: string, target: TargetIdentity): EntityMatchStatus {
  const normalized = normalizeEntityName(candidate);
  const exactNames = [target.canonicalName, ...target.aliases].map(normalizeEntityName).filter(Boolean);
  if (exactNames.includes(normalized)) return 'MATCHED';
  const withoutSuffix = (value: string) => value.replace(/\b(?:private|pvt|limited|ltd|inc|llc|llp|corp|corporation|company|co)\b/g, '').replace(/\s+/g, ' ').trim();
  if (normalized.length >= 5 && exactNames.some((name) => withoutSuffix(name) === withoutSuffix(normalized))) return 'AMBIGUOUS';
  return 'UNMATCHED';
}

function allLiteralMentions(text: string, surface: string): EntityMention[] {
  const matches: EntityMention[] = [];
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(surface)}(?![\\p{L}\\p{N}])`, 'giu');
  for (const match of text.matchAll(pattern)) {
    const at = match.index ?? 0;
    matches.push({
      surfaceForm: match[0],
      characterPosition: at,
      paragraphPosition: paragraphPosition(text, at),
      context: surroundingContext(text, at, match[0].length),
    });
  }
  return matches;
}

function orderedCandidates(text: string): Map<string, number> {
  const positions = new Map<string, number>();
  for (const match of text.matchAll(ORDERED_LINE)) {
    const candidate = cleanEntityCandidate(match[2] ?? '');
    const position = Number(match[1]);
    if (candidate && Number.isInteger(position) && position > 0) positions.set(candidate, position);
  }
  return positions;
}

function candidateSurfaces(text: string, target: TargetIdentity): Set<string> {
  const candidates = new Set<string>();
  for (const name of [target.canonicalName, ...target.aliases]) {
    if (name && allLiteralMentions(text, name).length) candidates.add(name);
  }
  const targetWithoutSuffix = target.canonicalName
    .replace(/\b(?:private|pvt\.?|limited|ltd\.?|inc\.?|llc|llp|corp(?:oration)?\.?|company|co\.?)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (targetWithoutSuffix.length >= 5 && allLiteralMentions(text, targetWithoutSuffix).length) candidates.add(targetWithoutSuffix);
  for (const match of text.matchAll(ORDERED_LINE)) {
    const candidate = cleanEntityCandidate(match[2] ?? '');
    if (candidate) candidates.add(candidate);
  }
  for (const match of text.matchAll(BULLET_LINE)) {
    const bullet = match[1] ?? '';
    if (/^\*\*[^*]+:\*\*/.test(bullet)) continue;
    const candidate = cleanEntityCandidate(bullet);
    if (candidate && (CORPORATE_SUFFIX.test(candidate) || /^[A-Z][\p{L}\p{N}&.'-]+(?:\s+[A-Z][\p{L}\p{N}&.'-]+){0,5}$/u.test(candidate))) candidates.add(candidate);
  }
  for (const match of text.matchAll(MARKDOWN_BOLD_LABEL)) {
    const candidate = cleanEntityCandidate(match[1] ?? '');
    if (candidate && !genericMarkdownLabel(candidate)) {
      candidates.add(candidate);
    }
  }
  const corporatePattern = /\b[A-Z][\p{L}\p{N}&.'-]*(?:\s+[A-Z][\p{L}\p{N}&.'-]*){0,6}\s+(?:Pvt\.?\s+Ltd\.?|Private\s+Limited|Limited|Ltd\.?|Inc\.?|LLC|LLP|Corporation|Corp\.?|Industries|Solutions|Technologies|Group|Labs?)\b/gu;
  for (const match of text.matchAll(corporatePattern)) candidates.add(match[0]);
  return candidates;
}

export function extractEntities(text: string, target: TargetIdentity): ObservedEntity[] {
  const ordered = orderedCandidates(text);
  const byName = new Map<string, ObservedEntity>();
  for (const surface of candidateSurfaces(text, target)) {
    const mentions = allLiteralMentions(text, surface);
    if (!mentions.length) continue;
    const normalizedName = normalizeEntityName(surface);
    const existing = byName.get(normalizedName);
    if (existing) {
      existing.mentions.push(...mentions);
      existing.mentions.sort((a, b) => a.characterPosition - b.characterPosition);
      existing.mentionCount = existing.mentions.length;
      existing.firstCharacterPosition = existing.mentions[0]!.characterPosition;
      existing.firstParagraphPosition = existing.mentions[0]!.paragraphPosition;
      continue;
    }
    const matchStatus = targetMatch(surface, target);
    const first = mentions[0]!;
    byName.set(normalizedName, {
      id: observationId('entity', normalizedName),
      surfaceForm: surface,
      normalizedName,
      entityType: inferEntityType(surface),
      matchStatus,
      targetMatch: matchStatus === 'MATCHED',
      mentionCount: mentions.length,
      firstCharacterPosition: first.characterPosition,
      firstParagraphPosition: first.paragraphPosition,
      recommendationPosition: ordered.get(surface) ?? null,
      recommendationStrength: classifyStrength(first.context),
      mentions,
    });
  }
  return [...byName.values()].sort((a, b) => a.firstCharacterPosition - b.firstCharacterPosition);
}

function explicitCitations(text: string): ProviderCitation[] {
  const citations: ProviderCitation[] = [];
  for (const match of text.matchAll(URL_PATTERN)) {
    const displayed = match[0].replace(/[),.;!?]+$/, '');
    const normalized = normalizeSourceUrl(displayed);
    if (!normalized) continue;
    const at = match.index ?? 0;
    citations.push({
      displayedText: displayed,
      url: displayed,
      domain: normalized.domain,
      title: null,
      providerCitationId: null,
      context: surroundingContext(text, at, displayed.length),
      characterPosition: at,
      claimAssociation: 'UNASSOCIATED',
    });
  }
  return citations;
}

function citationSourceUrl(citation: ProviderCitation): string | null {
  const linked = citation.url ? normalizeSourceUrl(citation.url) : null;
  if (linked?.domain !== 'vertexaisearch.cloud.google.com') return citation.url ?? null;
  for (const label of [citation.title, citation.displayedText]) {
    if (!label) continue;
    const normalized = normalizeSourceUrl(label);
    if (normalized?.domain && normalized.domain !== 'vertexaisearch.cloud.google.com') return label;
  }
  return citation.url ?? null;
}

export function extractCitationsAndSources(
  text: string,
  providerCitations: ProviderCitation[],
  targetWebsite: string,
): { citations: CitationObservation[]; sources: SourceObservation[] } {
  const all = [...providerCitations, ...explicitCitations(text)];
  const sources: SourceObservation[] = [];
  const sourceByKey = new Map<string, SourceObservation>();
  const citations: CitationObservation[] = [];
  const seenCitation = new Set<string>();
  for (const citation of all) {
    const sourceUrl = citationSourceUrl(citation);
    const normalized = sourceUrl ? normalizeSourceUrl(sourceUrl) : null;
    const domain = normalized?.domain ?? normalizeHostname(citation.domain ?? '');
    const sourceKey = normalized?.normalizedUrl ?? (domain ? `domain:${domain}` : null);
    let source: SourceObservation | null = null;
    if (sourceKey) {
      source = sourceByKey.get(sourceKey) ?? {
        id: observationId('source', sourceKey),
        fullUrl: normalized?.fullUrl ?? null,
        normalizedUrl: normalized?.normalizedUrl ?? null,
        domain,
        title: citation.title,
        targetDomainMatch: hostnameBelongsToDomain(domain, targetWebsite),
      };
      if (!sourceByKey.has(sourceKey)) {
        sourceByKey.set(sourceKey, source);
        sources.push(source);
      }
    }
    const citationKey = [citation.providerCitationId, citation.displayedText, citation.url, citation.characterPosition, citation.context].join('|');
    if (seenCitation.has(citationKey)) continue;
    seenCitation.add(citationKey);
    citations.push({ ...citation, id: observationId('citation', `${citationKey}:${citations.length}`), sourceId: source?.id ?? null, domain });
  }
  return { citations, sources };
}

export function deriveObservation(provider: ObservationProviderResult, target: TargetIdentity): DerivedObservation {
  if (!['COMPLETE', 'PARTIAL'].includes(provider.completeness) || !provider.rawResponse) {
    return {
      targetStatus: 'INCONCLUSIVE',
      parsingStatus: provider.completeness === 'EMPTY' ? 'INCONCLUSIVE' : 'FAILED',
      extractionStatus: 'INCONCLUSIVE',
      entities: [],
      citations: [],
      sources: [],
    };
  }
  if (/^\s*(?:i(?:'m| am) (?:sorry[,;:]?\s*)?)?(?:i\s+)?(?:cannot|can't|am unable to)\s+(?:answer|help|provide|assist)\b/i.test(provider.rawResponse)) {
    const { citations, sources } = extractCitationsAndSources(provider.rawResponse, provider.citations, target.website);
    return {
      targetStatus: 'INCONCLUSIVE',
      parsingStatus: 'SUCCESS',
      extractionStatus: 'INCONCLUSIVE',
      entities: extractEntities(provider.rawResponse, target),
      citations,
      sources,
    };
  }
  const entities = extractEntities(provider.rawResponse, target);
  const { citations, sources } = extractCitationsAndSources(provider.rawResponse, provider.citations, target.website);
  const exactTarget = entities.some((entity) => entity.matchStatus === 'MATCHED');
  const ambiguousTarget = entities.some((entity) => entity.matchStatus === 'AMBIGUOUS');
  return {
    targetStatus: provider.completeness === 'PARTIAL' ? 'INCONCLUSIVE' : exactTarget ? 'MENTIONED' : ambiguousTarget ? 'INCONCLUSIVE' : 'NOT_MENTIONED',
    parsingStatus: provider.completeness === 'PARTIAL' ? 'PARTIAL' : 'SUCCESS',
    extractionStatus: provider.completeness === 'PARTIAL' ? 'PARTIAL' : 'SUCCESS',
    entities,
    citations,
    sources,
  };
}
