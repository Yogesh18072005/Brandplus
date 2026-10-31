import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { BadgeCheck, Ban, Code2, FileText, Film, GitCompare, ListChecks, RefreshCcw } from 'lucide-react';
import { SiteNav } from '@/components/layout/SiteNav';
import { Footer } from '@/components/layout/Footer';
import { InkButton } from '@/components/ui/InkButton';
import { PagesScene } from '@/components/landing/BentoScenes';
import { bookingHref } from '@/lib/marketing/contact';

export const metadata: Metadata = {
  title: 'Done-for-you AI visibility - BrandPulse',
  description: 'We find the buyer questions where AI names your competitors instead of you, then write, publish and re-check the pages that change the answer.',
};

/*
 * The services page, in the homepage's system (HOMEPAGE-DESIGN.md §7): light
 * page, left-aligned one-line headings with the action beside them, quiet
 * white cards, one visual, the dark CTA footer.
 */

const INK = 'text-[#171425]';
const MUTED = 'text-[#524f6d]';
const FAINT = 'text-[#676480]';
const WRAP = 'mx-auto w-full max-w-[1200px] px-4 sm:px-8';
const CARD = 'rounded-[16px] bg-white ring-1 ring-[#e9e8f2]';

const work: { title: string; body: string; icon: ReactNode }[] = [
  { title: 'Answer pages', body: 'Pages built around the exact questions you were missing from, written so AI can quote them.', icon: <FileText className="size-5" /> },
  { title: 'Comparison pages', body: 'Honest “you vs them” pages for the competitors AI named instead of you.', icon: <GitCompare className="size-5" /> },
  { title: 'Listings and reviews', body: 'Your profiles on the sites AI cited, completed, plus a plan to collect real reviews.', icon: <BadgeCheck className="size-5" /> },
  { title: 'Video scripts', body: 'Short explainers that answer buyer questions. AI reads the transcripts. You record, we script.', icon: <Film className="size-5" /> },
  { title: 'Technical fixes', body: 'Structured data, FAQ schema, llms.txt and crawler access, so AI can read your site.', icon: <Code2 className="size-5" /> },
  { title: 'Monthly re-check', body: 'The same questions, every month, in a report you can share with your team.', icon: <RefreshCcw className="size-5" /> },
];

const steps = [
  ['Free audit', 'We ask what your buyers ask AI and record who gets named, word for word.'],
  ['A scope for you', 'On a short call we agree what to fix first. One fixed monthly price follows.'],
  ['We write, you approve', 'Every page, comparison and listing drafted for you. Nothing goes live without your approval.'],
  ['Monthly re-checks', 'The exact questions from your first audit, re-run every month.'],
] as const;

const never = [
  ['Fake reviews or fake accounts', 'It gets threads deleted and brands called out, and it breaks consumer law. Everything we publish is accurate and openly yours.'],
  ['Guaranteed rankings', 'AI answers vary. Anyone promising a guaranteed spot is guessing.'],
  ['Keyword stuffing or AI spam', 'Every piece is written for a real buyer, then approved by you.'],
] as const;

const faqs = [
  ['How much does it cost?', 'It depends on how many buyer questions you are missing, which your audit shows. You get one fixed monthly price on the call, before you commit. Month to month: if the re-checks don’t show progress, you stop. The audit and the call are free.'],
  ['How long until AI starts naming us?', 'Technical fixes and listings can move answers within weeks. Pages and reviews compound over three to six months, which is why we re-check the same questions every month instead of promising a date.'],
  ['How much of our time does it take?', 'About two hours a month: a kickoff call, approving pages, and recording videos if you choose to.'],
  ['Which AI assistants do you measure?', 'Every audit records Google Gemini with live Google Search, which can be re-run exactly. We also check your most important questions in ChatGPT.'],
  ['Who writes the content?', 'Experienced writers working from your audit and your input. You approve every piece, and it is published under your name.'],
] as const;

function Head({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <h2 className="text-[clamp(28px,3vw,40px)] leading-[1.12] font-semibold tracking-[-0.03em] text-[#2c2a3a]">{title}</h2>
      {action}
    </div>
  );
}

export default function DoneForYouPage() {
  const booking = bookingHref('Done-for-you AI visibility');
  return (
    <div className="min-h-screen bg-[#f6f6fb] font-sans antialiased">
      <SiteNav />
      <main>
        <section className="relative isolate overflow-hidden pt-36 sm:pt-40">
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(110%_60%_at_50%_0%,#d6e5ff_0%,#edf3ff_40%,#f6f8fb_75%)]" />
          <div className={`${WRAP} grid items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16`}>
            <div>
              <p className="text-[13.5px] font-semibold text-brand-deep">Done for you</p>
              <h1 className={`mt-4 text-[clamp(38px,4.6vw,60px)] leading-[1.05] font-semibold tracking-[-0.04em] text-balance ${INK}`}>When buyers ask AI who to choose, get named.</h1>
              <p className={`mt-5 max-w-[32em] text-[17.5px] leading-relaxed ${MUTED}`}>We find the questions where AI recommends your competitors instead of you. Then we write, publish and re-check the pages that change the answer.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <InkButton href="/#audit">Start with a free audit</InkButton>
                {booking && <a href={booking} className="inline-flex h-11 items-center rounded-[11px] bg-white px-4 text-[14.5px] font-semibold text-[#171425] no-underline ring-1 ring-[#e4e3f0] hover:bg-[#f2f1f9]">Book a call</a>}
              </div>
            </div>
            <div className={`p-2 ${CARD} shadow-[0_40px_80px_-50px_rgb(20_70_170/0.6)]`}><PagesScene className="aspect-[16/11]" /></div>
          </div>
        </section>

        <section className={`${WRAP} pt-24 sm:pt-32`}>
          <Head title="Everything AI reads about you" />
          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {work.map((w) => (
              <li key={w.title} className={`group p-7 ${CARD}`}>
                <span className="grid size-11 place-items-center rounded-[13px] bg-[#f1f0fe] text-brand transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:rotate-[-6deg]">{w.icon}</span>
                <h3 className={`mt-6 text-[18px] font-semibold tracking-[-0.015em] ${INK}`}>{w.title}</h3>
                <p className={`mt-1.5 text-[15px] leading-relaxed ${MUTED}`}>{w.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className={`${WRAP} pt-24 sm:pt-32`}>
          <Head title="How it works" action={<InkButton href="/#audit">Get my free audit</InkButton>} />
          <ol className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {steps.map(([title, body], i) => (
              <li key={title} className={`p-6 ${CARD}`}>
                <span className="text-[13px] font-semibold text-[#b5b3cb] tabular-nums">0{i + 1}</span>
                <h3 className={`mt-6 text-[17px] font-semibold tracking-[-0.015em] ${INK}`}>{title}</h3>
                <p className={`mt-1.5 text-[14.5px] leading-relaxed ${MUTED}`}>{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={`${WRAP} pt-24 sm:pt-32`}>
          <Head title="What we never do" />
          <ul className={`mt-10 divide-y divide-[#eeeef5] ${CARD}`}>
            {never.map(([title, body]) => (
              <li key={title} className="grid gap-2 px-6 py-5 sm:grid-cols-[0.8fr_1.6fr] sm:items-center">
                <p className={`flex items-center gap-3 text-[15.5px] font-semibold ${INK}`}><span className="grid size-6 place-items-center rounded-full bg-[#fdecec] text-[#d93036]"><Ban className="size-3.5" /></span>{title}</p>
                <p className={`text-[15px] leading-relaxed ${MUTED}`}>{body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className={`${WRAP} pt-24 sm:pt-32`}>
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            <div>
              <h2 className="text-[clamp(28px,3vw,40px)] leading-[1.12] font-semibold tracking-[-0.03em] text-[#2c2a3a]">Before you book</h2>
              <p className={`mt-2 text-[15px] ${FAINT}`}>Something else? Ask on the call.</p>
              <div className={`mt-8 p-6 ${CARD}`}>
                <span className="grid size-11 place-items-center rounded-[13px] bg-[#f1f0fe] text-brand"><ListChecks className="size-5" /></span>
                <h3 className={`mt-4 text-[18px] font-semibold tracking-[-0.015em] ${INK}`}>See where you stand first</h3>
                <p className={`mt-1.5 text-[14.5px] leading-relaxed ${MUTED}`}>The audit shows which questions name your competitors, the exact answers, and what to fix first.</p>
                <InkButton href="/#audit" className="mt-5">Get my free audit</InkButton>
              </div>
            </div>
            <div className="space-y-3">
              {faqs.map(([q, a], i) => (
                <details key={q} className={`group/faq px-6 ${CARD} rounded-[16px]`} open={i === 0}>
                  <summary className={`flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[16px] font-medium ${INK} [&::-webkit-details-marker]:hidden`}>
                    {q}
                    <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-[#f2f1f9] text-[#413d58] transition-transform duration-200 group-open/faq:rotate-45">+</span>
                  </summary>
                  <p className={`pr-10 pb-6 text-[15px] leading-relaxed ${MUTED}`}>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
