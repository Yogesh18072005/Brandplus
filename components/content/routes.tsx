import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Footer } from '@/components/layout/Footer';
import { SiteNav } from '@/components/layout/SiteNav';
import { PageHeader } from '@/components/layout/NightPanel';
import { docsOf, getDoc, pathOf } from '@/lib/content/registry';
import type { DocKind } from '@/lib/content/types';
import { DocPage, docMetadata } from './DocPage';

type Params = { params: Promise<{ slug: string }> };

/** Shared page exports for a [slug] route of one content kind. */
export function docRoute(kind: DocKind) {
  return {
    generateStaticParams: () => docsOf(kind).map((d) => ({ slug: d.slug })),
    async generateMetadata({ params }: Params): Promise<Metadata> {
      const doc = getDoc(kind, (await params).slug);
      return doc ? docMetadata(doc) : {};
    },
    async Page({ params }: Params) {
      const doc = getDoc(kind, (await params).slug);
      if (!doc) notFound();
      return <DocPage doc={doc} />;
    },
  };
}

export function HubPage({ eyebrow, title, intro, kinds }: { eyebrow: string; title: string; intro: string; kinds: { kind: DocKind; heading?: string }[] }) {
  return (
    <>
      <SiteNav />
      <PageHeader eyebrow={eyebrow} title={title} lede={intro} />
      <main className="mx-auto max-w-[1200px] px-4 sm:px-6">
        {kinds.map(({ kind, heading }) => (
          <section key={kind} className="mt-16">
            {heading ? <h2 className="text-[clamp(24px,2.6vw,32px)] font-semibold tracking-[-0.03em] text-content">{heading}</h2> : null}
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {docsOf(kind).map((d) => (
                <li key={d.slug}>
                  <Link href={pathOf(d)} className="group flex h-full flex-col rounded-[18px] border border-rule bg-white p-6 no-underline transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-28px_rgb(20_25_37/0.45)] motion-reduce:transition-none">
                    <span className="block text-[16.5px] leading-snug font-semibold text-content">{d.h1}</span>
                    <span className="mt-2 block text-[14px] leading-relaxed text-secondary">{d.description}</span>
                    <span className="mt-auto pt-5 text-[14px] font-semibold text-brand-deep">Read →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
      <Footer />
    </>
  );
}
