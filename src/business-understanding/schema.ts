import { z } from 'zod';
import type { BusinessEvidence, CanonicalBusinessUnderstanding, CrawledPage, PageExtraction, SynthesisResult } from './types';

export const confidenceSchema = z.enum(['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN']);
export const sourceTypeSchema = z.enum([
  'PRODUCT_SERVICE', 'INDUSTRY_USE_CASE', 'CERTIFICATION_QUALITY', 'ABOUT_COMPANY',
  'CASE_STUDY', 'CONTACT_LOCATION', 'BLOG_EDITORIAL', 'GENERIC_PAGE', 'USER_PROVIDED',
]);
export const entityTypeSchema = z.enum([
  'COMPANY_IDENTITY', 'PRODUCT', 'SERVICE', 'CAPABILITY', 'BUYER_TYPE', 'INDUSTRY',
  'USE_CASE', 'GEOGRAPHY', 'COMMERCIAL_CLAIM', 'DIFFERENTIATOR', 'PROOF_ASSET',
  'CERTIFICATION', 'BUSINESS_MODEL_SIGNAL', 'CONVERSION_SIGNAL',
]);
const boundedText = z.string().trim().min(1).max(2_000);

export const evidenceSchema = z.object({
  id: z.string().trim().min(1).max(120),
  evidence_text: z.string().trim().min(1).max(1_200),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
}).strict();

export const entitySchema = z.object({
  id: z.string().trim().min(1).max(120),
  type: entityTypeSchema,
  value: z.string().trim().min(1).max(300),
  description: z.string().trim().min(1).max(1_000).nullable(),
  category: z.string().trim().min(1).max(200).nullable(),
  statement_kind: z.enum(['FACT', 'INTERPRETATION', 'COMMERCIAL_CLAIM']),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  evidence_ids: z.array(z.string().trim().min(1).max(120)).min(1).max(20),
}).strict();

export const unknownSchema = z.object({
  id: z.string().trim().min(1).max(120),
  area: z.string().trim().min(1).max(160),
  reason: z.enum(['NOT_EVIDENCED', 'CRAWL_FAILURE', 'AMBIGUOUS', 'CONFLICT']),
  detail: boundedText,
  evidence_ids: z.array(z.string().trim().min(1).max(120)).max(20),
}).strict();

export const conflictSchema = z.object({
  id: z.string().trim().min(1).max(120),
  topic: z.string().trim().min(1).max(160),
  conflicting_values: z.array(z.string().trim().min(1).max(500)).min(2).max(10),
  evidence_ids: z.array(z.string().trim().min(1).max(120)).min(2).max(20),
  resolution: z.literal('UNRESOLVED'),
}).strict();

export const pageExtractionSchema = z.object({
  evidence: z.array(evidenceSchema).max(100),
  entities: z.array(entitySchema).max(150),
  unknowns: z.array(unknownSchema).max(40),
}).strict();

const evidencedValueSchema = z.object({
  value: z.string().trim().min(1).max(1_000),
  evidence_ids: z.array(z.string().trim().min(1).max(120)).min(1).max(20),
}).strict();

export const synthesisSchema = z.object({
  description: evidencedValueSchema.nullable(),
  business_model: evidencedValueSchema.nullable(),
  entities: z.array(entitySchema).max(300),
  conflicts: z.array(conflictSchema).max(50),
  unknowns: z.array(unknownSchema).max(80),
}).strict();

const SUBJECTIVE = /\b(leading|best|top|trusted|premium|major|established|market leader)\b/i;
const numberTokens = (value: string): string[] => value.match(/\b\d[\d,.:%/-]*\b/g) ?? [];
const normalize = (value: string): string => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

function validateEntitySupport(entity: z.infer<typeof entitySchema>, evidence: Array<{ id: string; evidence_text: string }>): void {
  if (entity.type === 'COMMERCIAL_CLAIM' && entity.statement_kind !== 'COMMERCIAL_CLAIM') {
    throw new Error(`Commercial claim ${entity.id} must retain COMMERCIAL_CLAIM statement kind`);
  }
  if (SUBJECTIVE.test(entity.value) && entity.statement_kind !== 'COMMERCIAL_CLAIM') {
    throw new Error(`Subjective marketing language cannot be stored as fact: ${entity.value}`);
  }
  if (entity.statement_kind === 'INTERPRETATION' && entity.confidence === 'HIGH' && entity.evidence_ids.length < 2) {
    throw new Error(`Interpretation ${entity.id} requires multiple evidence records for HIGH confidence`);
  }
  const support = evidence.filter((item) => entity.evidence_ids.includes(item.id)).map((item) => item.evidence_text).join(' ');
  for (const token of numberTokens(`${entity.value} ${entity.description ?? ''}`)) {
    if (!support.includes(token)) throw new Error(`Entity ${entity.id} introduces unsupported numeric detail ${token}`);
  }
  if ((entity.confidence === 'HIGH' || entity.statement_kind === 'COMMERCIAL_CLAIM') && !normalize(support).includes(normalize(entity.value))) {
    throw new Error(`High-confidence entity ${entity.id} is not directly stated by its evidence`);
  }
}

function validateEvidencedSummary(
  label: string,
  item: z.infer<typeof evidencedValueSchema> | null,
  evidence: BusinessEvidence[],
): void {
  if (!item) return;
  if (new Set(item.evidence_ids).size < 2) {
    throw new Error(`${label} requires at least two evidence records`);
  }
  const support = evidence.filter((candidate) => item.evidence_ids.includes(candidate.id)).map((candidate) => candidate.evidence_text).join(' ');
  for (const token of numberTokens(item.value)) {
    if (!support.includes(token)) throw new Error(`${label} introduces unsupported numeric detail ${token}`);
  }
  if (SUBJECTIVE.test(item.value) && !normalize(support).includes(normalize(item.value))) {
    throw new Error(`${label} introduces unsupported subjective language`);
  }
}

export function validatePageExtraction(raw: unknown, page: CrawledPage): PageExtraction {
  const parsed = pageExtractionSchema.parse(raw);
  const ids = new Set<string>();
  // A snippet the model paraphrased instead of copying is dropped, along with
  // anything that rested only on it. One misquote no longer costs the whole
  // page (often the homepage); unverifiable text still never gets through.
  const misquoted = new Set<string>();
  for (const evidence of parsed.evidence) {
    if (ids.has(evidence.id)) throw new Error(`Duplicate evidence id: ${evidence.id}`);
    ids.add(evidence.id);
    if (!page.contentText.includes(evidence.evidence_text)) misquoted.add(evidence.id);
  }
  if (parsed.evidence.length > 0 && misquoted.size === parsed.evidence.length) {
    throw new Error(`Evidence ${[...misquoted][0]} is not an exact snippet from ${page.url}`);
  }
  const evidence = parsed.evidence.filter((item) => !misquoted.has(item.id));
  const entityIds = new Set<string>();
  const entities: PageExtraction['entities'] = [];
  for (const entity of parsed.entities) {
    if (entityIds.has(entity.id)) throw new Error(`Duplicate entity id: ${entity.id}`);
    entityIds.add(entity.id);
    for (const id of entity.evidence_ids) {
      if (!ids.has(id)) throw new Error(`Entity ${entity.id} references missing evidence ${id}`);
    }
    const supported = { ...entity, evidence_ids: entity.evidence_ids.filter((id) => !misquoted.has(id)) };
    if (supported.evidence_ids.length === 0) continue;
    validateEntitySupport(supported, evidence);
    entities.push(supported);
  }
  const unknowns = parsed.unknowns.map((item) => ({ ...item, evidence_ids: item.evidence_ids.filter((id) => !misquoted.has(id)) }));
  return { ...parsed, evidence, entities, unknowns };
}

export function validateSynthesis(raw: unknown, evidence: BusinessEvidence[]): SynthesisResult {
  const schemaChecked = synthesisSchema.parse(raw);
  const evidenceIds = new Set(evidence.map((item) => item.id));
  // The synthesis sometimes cites evidence from a page whose extraction was
  // rejected. Those citations are removed, and anything left with too little
  // verified support is dropped, instead of failing the whole understanding.
  const known = (ids: string[]) => ids.filter((id) => evidenceIds.has(id));
  const summary = (item: SynthesisResult['description']) => {
    if (!item) return item;
    const ids = known(item.evidence_ids);
    // Nothing removed: leave it to the normal two-source check below.
    if (ids.length === item.evidence_ids.length) return item;
    return new Set(ids).size >= 2 ? { ...item, evidence_ids: ids } : null;
  };
  const parsed: SynthesisResult = {
    ...schemaChecked,
    entities: schemaChecked.entities.map((item) => ({ ...item, evidence_ids: known(item.evidence_ids) })).filter((item) => item.evidence_ids.length > 0),
    conflicts: schemaChecked.conflicts.map((item) => ({ ...item, evidence_ids: known(item.evidence_ids) })).filter((item) => item.evidence_ids.length >= 2),
    unknowns: schemaChecked.unknowns.map((item) => ({ ...item, evidence_ids: known(item.evidence_ids) })),
    description: summary(schemaChecked.description),
    business_model: summary(schemaChecked.business_model),
  };
  for (const group of [parsed.entities, parsed.conflicts, parsed.unknowns]) {
    const ids = new Set<string>();
    for (const item of group) {
      if (ids.has(item.id)) throw new Error(`Synthesis contains duplicate id ${item.id}`);
      ids.add(item.id);
    }
  }
  validateEvidencedSummary('Business description', parsed.description, evidence);
  validateEvidencedSummary('Business model', parsed.business_model, evidence);
  for (const entity of parsed.entities) validateEntitySupport(entity, evidence);
  return parsed;
}

export function assertCanonicalReferences(result: CanonicalBusinessUnderstanding): void {
  const ids = new Set(result.evidence.map((item) => item.id));
  const entities = [
    ...result.products, ...result.services, ...result.capabilities, ...result.buyer_types,
    ...result.industries, ...result.use_cases, ...result.geographies, ...result.proof_assets,
    ...result.certifications, ...result.commercial_claims, ...result.differentiators,
    ...result.conversion_signals, ...result.business_model_signals, ...result.company_identity,
  ];
  for (const entity of entities) {
    if (entity.evidence_ids.length === 0) throw new Error(`Entity ${entity.id} has no evidence`);
    for (const id of entity.evidence_ids) if (!ids.has(id)) throw new Error(`Entity ${entity.id} references missing evidence ${id}`);
  }
  const referenced = [
    ...(result.business.description?.evidence_ids ?? []),
    ...(result.business.business_model?.evidence_ids ?? []),
    ...result.conflicts.flatMap((item) => item.evidence_ids),
    ...result.unknowns.flatMap((item) => item.evidence_ids),
  ];
  for (const id of referenced) if (!ids.has(id)) throw new Error(`Canonical result references missing evidence ${id}`);
}
