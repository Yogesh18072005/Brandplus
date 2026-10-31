// Public tools page — free tools to drive signups.
// QUARANTINED off the launch surface (lib/flags.ts): this route 404s until
// TOOLS_ENABLED is restored.
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { TOOLS_ENABLED } from '@/lib/flags';

export const metadata: Metadata = {
  title: 'Free AI Visibility Tools — Schema Generator, Page Analyzer | BrandPulse',
  description: 'Free tools to check how AI-ready your website is. Generate schema markup, analyze your page for AI visibility, and explore buyer questions.',
};

const tools = [
  {
    name: 'Schema Markup Generator',
    description: 'Generate JSON-LD structured data (FAQPage, Article, LocalBusiness, Organization) from your page content using AI. Copy-paste ready.',
    href: '/sign-up',
    cta: 'Try for free',
    free: true,
  },
  {
    name: 'On-Page AEO Analyzer',
    description: 'Enter any URL and get a 0-100 AI readiness score with specific, actionable recommendations to improve your AI visibility.',
    href: '/sign-up',
    cta: 'Try for free',
    free: true,
  },
  {
    name: 'Prompt Explorer',
    description: 'Discover what real buyers ask AI about your industry. Generate 40+ buyer questions grouped by intent — exportable as CSV.',
    href: '/sign-up',
    cta: 'Try for free',
    free: true,
  },
  {
    name: 'AI Visibility Audit',
    description: 'Full audit: 10 questions on free, 40 on Starter. Measures how often AI mentions your business vs competitors.',
    href: '/sign-up',
    cta: 'Start free audit',
    free: true,
  },
  {
    name: 'AEO Content Writer',
    description: 'Generate full articles structured for AI citation — direct-answer first paragraphs, proper heading hierarchy, embedded FAQ schema.',
    href: '/sign-up',
    cta: 'Upgrade to Starter',
    free: false,
  },
  {
    name: 'llms.txt Generator',
    description: 'Create the llms.txt file that tells AI crawlers what your site is about. Auto-generates from your sitemap.',
    href: '/sign-up',
    cta: 'Try for free',
    free: true,
  },
];

export default function PublicToolsPage() {
  if (!TOOLS_ENABLED) notFound();
  return (
    <main style={{ padding: '60px 24px 80px', background: 'var(--bone)', minHeight: '100vh' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <header style={{ marginBottom: 48, textAlign: 'center' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <p className="mono" style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--signal)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              BrandPulse
            </p>
          </Link>
          <h1 className="display" style={{ fontSize: 'clamp(28px, 5vw, 44px)', margin: '0 0 12px' }}>
            Free AI Visibility Tools
          </h1>
          <p style={{ maxWidth: 560, margin: '0 auto', color: 'var(--ink-soft)', fontSize: 17, lineHeight: 1.6 }}>
            Check how visible your business is to AI answer engines like ChatGPT, Gemini, and Perplexity. No credit card required.
          </p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {tools.map((tool) => (
            <div
              key={tool.name}
              className="card lift"
              style={{ padding: '28px 24px', display: 'grid', gap: 12, gridTemplateRows: 'auto 1fr auto' }}
            >
              <div>
                {tool.free && (
                  <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, color: 'var(--signal)', background: 'rgba(82,53,224,0.08)', padding: '3px 8px', borderRadius: 4, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Free
                  </span>
                )}
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: tool.free ? 0 : '0' }}>{tool.name}</h2>
              </div>
              <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 14.5, lineHeight: 1.55 }}>
                {tool.description}
              </p>
              <Link
                href={tool.href}
                className="btn"
                style={{ textAlign: 'center', marginTop: 4, textDecoration: 'none', display: 'block' }}
              >
                {tool.cta}
              </Link>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 48, textAlign: 'center' }}>
          <p style={{ color: 'var(--ink-soft)', fontSize: 15 }}>
            Already have an account?{' '}
            <Link href="/sign-in" style={{ color: 'var(--signal)', fontWeight: 600, textDecoration: 'none' }}>
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
