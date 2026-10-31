import { createHash } from 'node:crypto';
import type { BusinessEntity, BusinessEvidence, BusinessUnknown, PageExtraction, CrawledPage } from './types';

export function stableId(prefix: string, value: string): string {
  return `${prefix}_${createHash('sha256').update(value).digest('hex').slice(0, 24)}`;
}

export function normalizeConcept(value: string): string {
  return value.toLowerCase()
    .replace(/\bsolutions?\b/g, ' ')
    .replace(/\bpharma\b/g, 'pharmaceutical')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function materializePageExtraction(page: CrawledPage, extraction: PageExtraction): {
  evidence: BusinessEvidence[];
  entities: BusinessEntity[];
  unknowns: BusinessUnknown[];
} {
  const idMap = new Map<string, string>();
  const evidence = extraction.evidence.map((item) => {
    const id = stableId('evidence', `${page.canonicalUrl}\n${item.evidence_text}`);
    idMap.set(item.id, id);
    return {
      ...item,
      confidence: page.sourceType === 'BLOG_EDITORIAL' ? 'LOW' as const
        : page.sourceType === 'GENERIC_PAGE' ? 'MEDIUM' as const
        : 'HIGH' as const,
      id,
      source_url: page.canonicalUrl,
      page_title: page.title,
      source_type: page.sourceType,
      extracted_at: new Date().toISOString(),
    };
  });
  const entities = extraction.entities.map((item) => ({
    ...item,
    id: stableId('entity', `${item.type}\n${normalizeConcept(item.value)}`),
    evidence_ids: item.evidence_ids.map((id) => idMap.get(id)!).filter(Boolean),
  }));
  const unknowns = extraction.unknowns.map((item) => ({
    ...item,
    id: stableId('unknown', `${item.area}\n${item.reason}\n${item.detail}`),
    evidence_ids: item.evidence_ids.map((id) => idMap.get(id)!).filter(Boolean),
  }));
  return { evidence, entities, unknowns };
}

export function deduplicateEvidence(items: BusinessEvidence[]): BusinessEvidence[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

export function deduplicateEntities(items: BusinessEntity[]): BusinessEntity[] {
  const merged = new Map<string, BusinessEntity>();
  for (const item of items) {
    const key = `${item.type}:${normalizeConcept(item.value)}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...item, evidence_ids: [...new Set(item.evidence_ids)] });
      continue;
    }
    existing.evidence_ids = [...new Set([...existing.evidence_ids, ...item.evidence_ids])];
    if (item.confidence === 'HIGH') existing.confidence = 'HIGH';
  }
  return [...merged.values()];
}
