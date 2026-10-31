import type { Doc, DocKind } from './types';
import { guides } from './guides';
import { glossary } from './glossary';
import { comparisons } from './compare';
import { segments } from './segments';
import { services } from './services';

export const KIND_BASE: Record<DocKind, string> = {
  guide: '/guides',
  glossary: '/glossary',
  compare: '/compare',
  segment: '/for',
  service: '/services',
};

export const KIND_LABEL: Record<DocKind, string> = {
  guide: 'Guides',
  glossary: 'Glossary',
  compare: 'Comparisons',
  segment: 'Who it is for',
  service: 'Services',
};

const byKind: Record<DocKind, Doc[]> = {
  guide: guides,
  glossary: [...glossary].sort((a, b) => a.slug.localeCompare(b.slug)),
  compare: comparisons,
  segment: segments,
  service: services,
};

export function docsOf(kind: DocKind): Doc[] {
  return byKind[kind];
}

export function allDocs(): Doc[] {
  return Object.values(byKind).flat();
}

export function getDoc(kind: DocKind, slug: string): Doc | undefined {
  return byKind[kind].find((d) => d.slug === slug);
}

export function pathOf(doc: Pick<Doc, 'kind' | 'slug'>): string {
  return `${KIND_BASE[doc.kind]}/${doc.slug}`;
}

/** Finds a doc by its public path, for related-link titles. */
export function docAtPath(path: string): Doc | undefined {
  return allDocs().find((d) => pathOf(d) === path);
}
