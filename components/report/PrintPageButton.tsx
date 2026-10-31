'use client';

export function PrintPageButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-rule bg-surface-raised px-3 text-[13px] font-medium text-content hover:border-signal/40 print:hidden"
    >
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4" aria-hidden="true">
        <path d="M10 2v10m0 0 4-4m-4 4L6 8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 13v3.5A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V13" strokeLinecap="round" />
      </svg>
      Save as PDF
    </button>
  );
}
