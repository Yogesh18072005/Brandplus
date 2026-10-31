import type { ReactNode } from 'react';

export function DashboardStatCard({
  children,
  highlight = false,
  className = '',
}: {
  children: ReactNode;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border bg-paper p-6 ${highlight ? 'border-signal/30' : 'border-rule'} ${className}`}
    >
      {children}
    </div>
  );
}
