import type { MetadataRoute } from 'next';
import { getAppUrl } from '@/lib/app-url';
import { allDocs, pathOf } from '@/lib/content/registry';

// Public, indexable pages only. Auth pages are noindexed and stay out of here.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getAppUrl();
  const pages: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/sprint`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/methodology`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/about`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/resources`, changeFrequency: 'weekly', priority: 0.7 },
    ...['/guides', '/compare', '/services', '/for', '/glossary'].map((p) => ({ url: `${base}${p}`, changeFrequency: 'weekly' as const, priority: 0.6 })),
    { url: `${base}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/terms`, changeFrequency: 'yearly', priority: 0.2 },
  ];
  const docs: MetadataRoute.Sitemap = allDocs().map((d) => ({
    url: `${base}${pathOf(d)}`,
    lastModified: d.updated,
    changeFrequency: 'monthly',
    priority: d.kind === 'service' || d.kind === 'segment' ? 0.8 : d.kind === 'glossary' ? 0.4 : 0.6,
  }));
  return [...pages, ...docs];
}
