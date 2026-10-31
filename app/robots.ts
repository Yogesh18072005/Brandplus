import type { MetadataRoute } from 'next';
import { getAppUrl } from '@/lib/app-url';

// One rule for every crawler: search and AI crawlers (Googlebot, Bingbot, OAI-SearchBot,
// PerplexityBot, Claude-SearchBot...) are all allowed, private areas are not.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/dashboard/', '/admin/'] }, sitemap: `${getAppUrl()}/sitemap.xml` };
}
