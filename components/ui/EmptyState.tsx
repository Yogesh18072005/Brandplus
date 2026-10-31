import type { ReactNode } from 'react';

export function EmptyState({
  heading,
  description,
  action,
}: {
  heading: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-[1.75rem] bg-paper py-16 text-center shadow-[0_2px_12px_rgba(18,16,38,0.04)]">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-overlay">
        <svg
          className="h-6 w-6 text-tertiary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
      </div>
      <h3 className="text-[15px] font-semibold text-content">{heading}</h3>
      <p className="mt-1.5 max-w-sm text-[13px] text-secondary">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
