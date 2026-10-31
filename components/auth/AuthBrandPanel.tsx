import Link from 'next/link';
import { Wordmark } from '@/components/layout/SiteNav';
import { SAMPLE_AUDIT } from '@/lib/marketing/sample-audit';

export function AuthBrandPanel() {
  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden bg-ink p-10 text-white lg:flex">

      <Link href="/" className="relative no-underline [&_span]:text-white [&_svg]:text-white/90" aria-label="BrandPulse — home">
        <Wordmark />
      </Link>

      <div className="relative max-w-[420px]">
        <div className="border-l border-white/20 pl-6">
          <p className="text-[13px] font-medium text-white/50">Answer evidence · your workspace</p>
          <p className="mt-4 font-mono text-[12px] text-white/70">› {SAMPLE_AUDIT.heroQuestion}</p>
          <p className="mt-4 text-[15px] leading-relaxed text-white/85">
            &ldquo;{SAMPLE_AUDIT.sampleQuotes[0]?.excerpt}&rdquo;
          </p>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-absence/15 px-3 py-1.5 text-[12px] font-medium text-absence-bright">
            Gap detected · action ready
          </p>
        </div>
        <p className="mt-8 text-[17px] leading-[1.6] text-white/60">
          Track your visibility, compare competitors, and turn missed questions into a focused action plan.
        </p>
      </div>

      <p className="relative text-[13px] text-white/40">Your brand data stays inside your workspace.</p>
    </aside>
  );
}
