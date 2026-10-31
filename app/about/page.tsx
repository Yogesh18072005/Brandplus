import type { Metadata } from 'next';
import Link from 'next/link';
import { Footer } from '@/components/layout/Footer';
import { SiteNav } from '@/components/layout/SiteNav';
import { PageHeader } from '@/components/layout/NightPanel';
import { InkButton } from '@/components/ui/InkButton';
import { bookingHref } from '@/lib/marketing/contact';

export const metadata: Metadata = {
  title: 'About BrandPulse',
  description: 'BrandPulse shows businesses who AI recommends instead of them, quoted word for word, then writes and publishes what changes the answer.',
  alternates: { canonical: '/about' },
};

// Facts AI and press can quote. Keep identical to llms.txt, the homepage and profiles.
const facts = [
  ['What it is', 'An AI visibility service: a free audit of how AI answers buyer questions, then done-for-you pages, listings and monthly re-checks.'],
  ['Who it is for', 'Businesses whose buyers ask AI assistants which product or provider to choose, starting with SaaS startups.'],
  ['What we measure', 'Google Gemini answers grounded with live Google Search, re-run on the same questions each month. Key questions are also checked in ChatGPT.'],
  ['What we deliver', 'Answer pages, comparison and alternatives pages, directory and review profiles, video scripts, technical fixes and a monthly re-check report.'],
  ['What we never do', 'Guarantee rankings, create fake reviews or accounts, or publish without client approval.'],
  ['Website', 'zerociate.com'],
] as const;

export default function AboutPage() {
  const contact = bookingHref('Hello from the BrandPulse site');
  return (
    <>
      <SiteNav />
      <PageHeader
        eyebrow="About"
        title="AI already recommends someone. We help it be you."
        lede="BrandPulse is an AI visibility service. We ask the questions your buyers ask AI assistants, record who gets named word for word, and then write and publish the pages, comparisons and listings that change the answer. Every month we re-check the same questions so you can see what moved."
      />
      <main className="mx-auto max-w-[880px] px-4 sm:px-6">

        <section className="mt-14">
          <h2 className="text-[clamp(24px,2.6vw,32px)] font-semibold tracking-[-0.03em] text-content">Why we exist</h2>
          <div className="mt-4 space-y-4 text-[16px] leading-[1.75] text-secondary">
            <p>Buyers increasingly ask ChatGPT, Gemini and Google&apos;s AI answers which tool, clinic or agency to choose. Those answers name a few businesses and skip the rest, often without the skipped business ever knowing.</p>
            <p>Most of what decides those answers is knowable: whether AI can read your site, whether you have a page for the question, and whether the sources AI trusts talk about you. We make that visible with real evidence, then do the work to fix it.</p>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-[clamp(24px,2.6vw,32px)] font-semibold tracking-[-0.03em] text-content">BrandPulse at a glance</h2>
          <dl className="mt-6 divide-y divide-rule overflow-hidden rounded-[18px] border border-rule bg-white">
            {facts.map(([k, v]) => (
              <div key={k} className="grid gap-2 px-6 py-4 sm:grid-cols-[200px_1fr]">
                <dt className="font-semibold text-content">{k}</dt>
                <dd className="text-[15px] leading-[1.7] text-secondary">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-14">
          <h2 className="text-[clamp(24px,2.6vw,32px)] font-semibold tracking-[-0.03em] text-content">How we work</h2>
          <p className="mt-4 text-[16px] leading-[1.75] text-secondary">
            Evidence first. We show the actual answers, not an invented score, and we are open about what we cannot know about private AI systems. Read the <Link href="/methodology" className="text-brand-deep underline underline-offset-2">methodology</Link>, browse the <Link href="/resources" className="text-brand-deep underline underline-offset-2">resources</Link>, or see the <Link href="/sprint" className="text-brand-deep underline underline-offset-2">done-for-you service</Link>.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <InkButton href="/#audit">Get the free audit</InkButton>
            {contact ? <a href={contact} className="inline-flex h-11 items-center rounded-[11px] border border-rule bg-white px-4 text-[14.5px] font-semibold text-content no-underline hover:bg-[#f7f7fa]">Contact us</a> : null}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
