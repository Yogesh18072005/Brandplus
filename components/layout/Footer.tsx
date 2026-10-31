import Link from 'next/link';
import { Wordmark } from '@/components/brand/Logo';
import { InkButton } from '@/components/ui/InkButton';
import { bookingHref } from '@/lib/marketing/contact';

/*
 * The site's closing block: a dark panel that holds the last call to action
 * (with the wordmark ghosted under it) and the footer. Same on every public
 * page. The resources layer is linked here, not in the top nav: crawlable,
 * out of the buyer's way.
 */

const GROUPS: [string, [string, string][]][] = [
  ['Product', [['The proof', '/#proof'], ['How it works', '/#how'], ['Done for you', '/sprint'], ['Methodology', '/methodology'], ['FAQ', '/#faq']]],
  ['Resources', [['Resources', '/resources'], ['Guides', '/guides'], ['Comparisons', '/compare'], ['Services', '/services'], ['Glossary', '/glossary']]],
  ['Company', [['About', '/about'], ['Privacy', '/privacy'], ['Terms', '/terms']]],
  ['Account', [['Log in', '/sign-in'], ['Create account', '/sign-up'], ['Free audit', '/#audit']]],
];

export function Footer({ cta = true, wordmark = false }: { cta?: boolean; wordmark?: boolean }) {
  const contact = bookingHref('Hello from the BrandPulse site');
  return (
    <div className="px-2 pt-28 pb-2 sm:pt-36 print:hidden">
      <footer className="relative isolate overflow-hidden rounded-[28px] bg-[#06040c] text-white">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(70%_50%_at_50%_0%,rgb(40_116_225/0.22),transparent)]" />
        <div className="mx-auto w-full max-w-[1360px] px-4 pt-6 sm:px-8 sm:pt-8">
          {cta && (
            <div className="relative isolate mt-2 overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.03] px-6 pt-10 pb-28 sm:px-12 sm:pt-14 sm:pb-40">
              <p aria-hidden="true" className="pointer-events-none absolute -bottom-[0.26em] left-6 -z-10 bg-linear-to-b from-white/[0.12] to-white/[0.01] bg-clip-text text-[clamp(110px,17vw,250px)] leading-none font-semibold tracking-[-0.07em] text-transparent select-none">brandpulse</p>
              <div className="flex flex-wrap items-end justify-between gap-8">
                <div>
                  <p className="text-[15px] font-medium text-white/65">A buyer is asking AI about your category right now.</p>
                  <p className="mt-3 max-w-[13em] text-[clamp(34px,4.4vw,60px)] leading-[1.04] font-semibold tracking-[-0.04em] text-balance">Find out who it names.</p>
                </div>
                <InkButton href="/#audit" tone="paper" size="lg">Get my free audit</InkButton>
              </div>
            </div>
          )}

          <div className="grid gap-10 py-14 md:grid-cols-[1.1fr_2fr]">
            <div>
              <Wordmark size={19} tone="light" />
              <p className="mt-4 max-w-[22em] text-[14px] leading-relaxed text-white/60">We show you who AI recommends instead of you, quoted word for word. Then we write what changes the answer.</p>
              {contact && <a href={contact} className="mt-5 inline-block text-[14px] font-medium text-white/80 no-underline hover:text-white">Contact us →</a>}
            </div>
            <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
              {GROUPS.map(([group, links]) => (
                <div key={group}>
                  <p className="text-[13px] font-semibold text-white/55">{group}</p>
                  <ul className="mt-4 space-y-2.5">
                    {links.map(([label, href]) => <li key={href}><Link href={href} className="text-[14px] text-white/80 no-underline hover:text-white">{label}</Link></li>)}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
          <div className="flex flex-wrap justify-between gap-4 border-t border-white/10 py-6 text-[13px] text-white/55">
            <span>© {new Date().getFullYear()} BrandPulse</span>
            <span>No platform can guarantee a future AI mention. We measure what AI actually says.</span>
          </div>
        </div>
        {wordmark && (
          <p aria-hidden="true" className="pointer-events-none -mb-[0.22em] text-center bg-linear-to-b from-white/[0.22] via-brand/30 to-transparent bg-clip-text text-[clamp(110px,22vw,330px)] leading-none font-semibold tracking-[-0.07em] text-transparent select-none">brandpulse</p>
        )}
      </footer>
    </div>
  );
}
