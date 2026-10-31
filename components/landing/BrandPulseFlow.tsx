const stages = [
  { label: 'Buyer question', detail: '“Which supplier should we choose?”' },
  { label: 'Retrieval', detail: 'The engine searches available evidence' },
  { label: 'Sources', detail: 'Company pages, directories, third parties' },
  { label: 'Evaluation', detail: 'Entities, claims, relevance, and context' },
  { label: 'Answer', detail: 'A shortlist is assembled' },
  { label: 'Your brand', detail: 'Mentioned, recommended, cited, or absent' },
];

export function BrandPulseFlow() {
  return (
    <figure className="overflow-hidden rounded-[1.35rem] border border-white/60 bg-white/84 shadow-[0_36px_90px_-42px_rgba(50,12,11,0.68)] backdrop-blur-xl">
      <figcaption className="flex items-center justify-between border-b border-black/8 bg-white/58 px-5 py-3.5 sm:px-6">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-secondary">Observed answer chain</span>
        <span className="font-mono text-[10px] text-signal">BrandPulse / SAMPLE</span>
      </figcaption>

      <div className="p-3 sm:p-5">
        <ol className="grid gap-px overflow-hidden rounded-xl bg-rule sm:grid-cols-2 lg:grid-cols-3">
          {stages.map((stage, index) => (
            <li data-brandpulse-stage key={stage.label} className={`min-h-[108px] bg-white/88 p-4 sm:p-5 ${index === stages.length - 1 ? 'shadow-[inset_3px_0_0_var(--color-signal)]' : ''}`}>
              <div className="flex items-start gap-3">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-mono text-[9px] ${index === stages.length - 1 ? 'bg-signal text-white' : 'border border-rule bg-bone text-tertiary'}`}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-content">{stage.label}</p>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-secondary sm:text-[12px]">{stage.detail}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-3 grid gap-px overflow-hidden rounded-xl bg-rule grid-cols-2 sm:grid-cols-4">
          {[
            ['Mentioned', '72%'],
            ['Recommended', '48%'],
            ['Cited', '39%'],
            ['Competitive share', '24%'],
          ].map(([label, value]) => (
            <div key={label} className="bg-white/82 p-3.5 sm:p-4">
              <p className="font-mono text-[8px] uppercase tracking-wider text-tertiary">{label}</p>
              <p className="mt-1 font-display text-xl font-semibold tabular-nums text-content">{value}</p>
            </div>
          ))}
        </div>

        <p className="px-1 pb-1 pt-3 text-[10px] leading-relaxed text-muted">Illustrative interface. Customer reports use stored engine responses and source evidence.</p>
      </div>
    </figure>
  );
}
