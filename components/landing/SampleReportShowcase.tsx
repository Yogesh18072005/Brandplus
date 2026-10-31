import { SAMPLE_AUDIT } from '@/lib/marketing/sample-audit';

export function SampleReportShowcase() {
  const competitor = SAMPLE_AUDIT.competitors[0];
  return (
    <figure className="mx-auto w-full max-w-[520px] border border-rule bg-paper shadow-[0_24px_64px_-18px_rgba(18,16,38,0.16)]">
      <figcaption className="flex items-center justify-between border-b border-rule px-5 py-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-secondary">Illustrative report</span>
        <span className="font-mono text-[10px] text-signal">BrandPulse / SAMPLE</span>
      </figcaption>
      <div className="p-6 sm:p-8">
        <p className="font-mono text-[10px] uppercase tracking-wider text-tertiary">Observed answer presence</p>
        <div className="mt-4 flex items-end justify-between gap-5 border-b border-rule pb-6">
          <div><p className="font-display text-[54px] font-semibold leading-none text-content">{Math.round(SAMPLE_AUDIT.presenceRate * 100)}%</p><p className="mt-2 text-[12px] text-secondary">Your business</p></div>
          <div className="text-right"><p className="font-display text-[28px] font-semibold text-absence">{competitor ? `${Math.round(competitor.presenceRate * 100)}%` : '—'}</p><p className="mt-1 text-[11px] text-secondary">Top tracked competitor</p></div>
        </div>
        <div className="mt-6">
          <p className="font-mono text-[10px] uppercase tracking-wider text-absence">Important missed question</p>
          <blockquote className="mt-3 border-l-2 border-signal pl-4 text-[14px] font-medium leading-relaxed text-content">“{SAMPLE_AUDIT.missedPrompts[0]?.prompt}”</blockquote>
          <p className="mt-3 text-[11px] text-secondary">Your brand was absent; a tracked competitor appeared in the recorded answer.</p>
        </div>
      </div>
    </figure>
  );
}
