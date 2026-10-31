import type { ReactNode } from 'react';

export function highlightNames(text: string, names: string[]): ReactNode[] {
  if (typeof text !== 'string' || text === '') return [text ?? ''];
  if (names.length === 0) return [text];
  const escaped = names
    .filter((n) => typeof n === 'string' && n.trim() !== '')
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (escaped.length === 0) return [text];
  const re = new RegExp(`(${escaped.join('|')})`, 'gi');
  return text.split(re).map((part, i) =>
    re.test(part) && names.some((n) => n.toLowerCase() === part.toLowerCase()) ? (
      <mark
        className="rounded-md bg-presence/15 px-1 font-semibold text-presence"
        style={{ textDecoration: 'none' }}
        key={i}
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export function AnswerCard({
  question,
  evidence,
  competitors,
  businessName,
  engine = 'Gemini',
}: {
  question: string;
  evidence: string;
  competitors: string[];
  businessName: string;
  engine?: string;
}) {
  return (
    <div className="group rounded-2xl border border-rule bg-surface-raised p-5 transition-all duration-200 hover:border-signal/20">
      {/* Question */}
      <p className="font-mono text-[12px] text-secondary">
        <span aria-hidden="true" className="select-none text-muted">› </span>
        {question}
      </p>

      {/* AI answer */}
      <div className="mt-4 border-l-2 border-signal/30 pl-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-4 w-4 items-center justify-center rounded-md bg-signal/10">
            <span className="text-[8px] text-signal">✦</span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-tertiary">{engine}</span>
        </div>
        {evidence ? (
          <p className="text-[14px] leading-[1.8] text-content/80">
            &ldquo;{highlightNames(evidence, competitors)}&hellip;&rdquo;
          </p>
        ) : (
          <p className="text-[14px] text-secondary">
            Named {competitors.join(', ')} — full answer in the audit data.
          </p>
        )}
      </div>

      {/* Verdict */}
      <div className="mt-4 flex items-center gap-2 rounded-xl bg-absence/5 border border-absence/10 px-4 py-2.5">
        <svg className="h-3.5 w-3.5 shrink-0 text-absence" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <path d="m15 9-6 6M9 9l6 6" />
        </svg>
        <span className="text-[12px] font-semibold text-absence">{businessName} — not mentioned</span>
      </div>
    </div>
  );
}
