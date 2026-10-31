import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { Footer } from '@/components/layout/Footer';
import { SiteNav } from '@/components/layout/SiteNav';
import { PageHeader } from '@/components/layout/NightPanel';
import { getAppUrl } from '@/lib/app-url';
import { docAtPath, KIND_BASE, KIND_LABEL, pathOf } from '@/lib/content/registry';
import type { Block, Doc } from '@/lib/content/types';
import { Inline, plain } from './Inline';

export const ORG_ID = () => `${getAppUrl()}/#organization`;

export function docMetadata(doc: Doc): Metadata {
  const path = pathOf(doc);
  return {
    title: `${doc.title} | BrandPulse`,
    description: doc.description,
    alternates: { canonical: path },
    openGraph: { title: doc.title, description: doc.description, type: 'article', url: path, siteName: 'BrandPulse' },
  };
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function BlockView({ block }: { block: Block }) {
  if ('p' in block) return <p><Inline text={block.p} /></p>;
  if ('ul' in block) return <ul className="list-disc space-y-2 pl-5">{block.ul.map((t) => <li key={t}><Inline text={t} /></li>)}</ul>;
  if ('ol' in block) return <ol className="list-decimal space-y-2 pl-5">{block.ol.map((t) => <li key={t}><Inline text={t} /></li>)}</ol>;
  if ('code' in block) return <pre className="overflow-x-auto rounded-lg bg-[#100f22] px-4 py-3 font-mono text-[13px] leading-relaxed text-[#dfdef6]"><code>{block.code}</code></pre>;
  if ('note' in block) return <p className="rounded-[14px] border border-rule bg-white px-4 py-3 text-[14px]"><Inline text={block.note} /></p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-left text-[14px]">
        <thead><tr>{block.table.head.map((h) => <th key={h} className="border-b border-content/20 px-3 py-2 font-semibold text-content">{h}</th>)}</tr></thead>
        <tbody>{block.table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="border-b border-rule px-3 py-2 align-top"><Inline text={c} /></td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function jsonLd(doc: Doc) {
  const base = getAppUrl();
  const url = `${base}${pathOf(doc)}`;
  const crumbs = [
    { name: 'Home', item: `${base}/` },
    { name: 'Resources', item: `${base}/resources` },
    { name: KIND_LABEL[doc.kind], item: `${base}${KIND_BASE[doc.kind]}` },
    { name: doc.h1, item: url },
  ];
  const page =
    doc.kind === 'glossary'
      ? {
          '@type': 'DefinedTerm',
          name: doc.h1.replace(/^What is (an? )?/i, '').replace(/\?$/, ''),
          description: plain(doc.answer),
          url,
          inDefinedTermSet: `${base}/glossary`,
        }
      : doc.kind === 'service'
        ? { '@type': 'Service', name: doc.h1, description: plain(doc.answer), url, provider: { '@id': ORG_ID() }, areaServed: 'Worldwide' }
        : {
            '@type': 'Article',
            headline: doc.h1,
            description: doc.description,
            url,
            datePublished: doc.published,
            dateModified: doc.updated,
            author: { '@type': 'Organization', '@id': ORG_ID(), name: 'BrandPulse' },
            publisher: { '@id': ORG_ID() },
            mainEntityOfPage: url,
          };
  return {
    '@context': 'https://schema.org',
    '@graph': [
      page,
      { '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.item })) },
    ],
  };
}

export async function DocPage({ doc }: { doc: Doc }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const related = (doc.related ?? []).map((p) => ({ path: p, doc: docAtPath(p) })).filter((r) => r.doc);
  const showToc = doc.sections.length >= 4;

  return (
    <>
      <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(doc)) }} />
      <SiteNav />
      <PageHeader
        eyebrow={
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <li><Link href="/" className="text-[#676480] no-underline hover:text-[#171425]">Home</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/resources" className="text-[#676480] no-underline hover:text-[#171425]">Resources</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href={KIND_BASE[doc.kind]} className="text-[#676480] no-underline hover:text-[#171425]">{KIND_LABEL[doc.kind]}</Link></li>
            </ol>
          </nav>
        }
        title={doc.h1}
        meta={<>By the BrandPulse team · Updated <time dateTime={doc.updated}>{formatDate(doc.updated)}</time></>}
      />
      <main className="mx-auto max-w-[760px] px-5 pt-16">
        <article>
          <p className="rounded-[18px] border border-rule bg-white p-6 text-[18px] leading-[1.7] text-content shadow-[0_18px_40px_-34px_rgb(20_25_37/0.45)]"><Inline text={doc.answer} /></p>

          {doc.takeaways?.length ? (
            <aside className="mt-4 rounded-[18px] border border-rule bg-white p-6">
              <p className="text-[14px] font-semibold text-brand-deep">Key takeaways</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-[1.65] text-secondary">
                {doc.takeaways.map((t) => <li key={t}><Inline text={t} /></li>)}
              </ul>
            </aside>
          ) : null}

          {showToc ? (
            <nav aria-label="On this page" className="mt-10">
              <p className="text-[14px] font-semibold text-content">On this page</p>
              <ol className="mt-3 space-y-1.5 text-[14px]">
                {doc.sections.map((s) => <li key={s.heading}><a href={`#${slugify(s.heading)}`} className="text-secondary hover:text-content">{s.heading}</a></li>)}
              </ol>
            </nav>
          ) : null}

          <div className="mt-6">
            {doc.sections.map((s) => (
              <section key={s.heading} id={slugify(s.heading)} className="scroll-mt-24 border-t border-rule pt-8 mt-10">
                <h2 className="font-display text-[clamp(1.35rem,3vw,1.7rem)] font-semibold leading-tight tracking-[-0.03em] text-content">{s.heading}</h2>
                <div className="mt-4 space-y-4 text-[16px] leading-[1.75] text-secondary">
                  {s.answer ? <p className="text-content"><Inline text={s.answer} /></p> : null}
                  {s.body?.map((b, i) => <BlockView key={i} block={b} />)}
                </div>
              </section>
            ))}
          </div>

          {doc.faqs?.length ? (
            <section id="faq" className="mt-14 border-t border-rule pt-8">
              <h2 className="font-display text-[clamp(1.35rem,3vw,1.7rem)] font-semibold tracking-[-0.03em] text-content">Frequently asked questions</h2>
              <div className="mt-4 divide-y divide-rule">
                {doc.faqs.map(([q, a]) => (
                  <details key={q} className="group py-4">
                    <summary className="cursor-pointer list-none font-semibold text-content marker:hidden">{q}</summary>
                    <p className="mt-3 text-[15px] leading-[1.7] text-secondary"><Inline text={a} /></p>
                  </details>
                ))}
              </div>
            </section>
          ) : null}

          {doc.sources?.length ? (
            <section className="mt-12 border-t border-rule pt-6">
              <h2 className="text-[14px] font-semibold text-content">Sources</h2>
              <ul className="mt-3 space-y-1.5 text-[13px] text-secondary">
                {doc.sources.map((s) => <li key={s.url}><a href={s.url} rel="noopener" className="underline decoration-rule underline-offset-2 hover:text-content">{s.label}</a></li>)}
              </ul>
            </section>
          ) : null}
        </article>

        {related.length ? (
          <nav aria-label="Related" className="mt-14 border-t border-rule pt-8">
            <p className="text-[14px] font-semibold text-content">Related</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {related.map((r) => (
                <li key={r.path}>
                  <Link href={r.path} className="block rounded-[18px] border border-rule bg-white p-5 text-[15px] font-semibold text-content no-underline transition-shadow hover:shadow-[0_18px_40px_-28px_rgb(20_25_37/0.45)]">
                    {r.doc!.h1}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

      </main>
      <Footer />
    </>
  );
}
