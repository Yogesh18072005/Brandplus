import type { ReactNode } from 'react';

/** Static compatibility wrappers retained for report markup. Evidence should be
 * immediately visible and printable rather than gated by viewport animation. */
export function Reveal({ children, className = '' }: { children: ReactNode; index?: number; className?: string; as?: 'div' | 'li' | 'section' }) {
  return <div className={className}>{children}</div>;
}

export function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  return <span>{to}{suffix}</span>;
}

export function BarTrack({ children, className = '' }: { children: ReactNode; index?: number; className?: string }) {
  return <div className={className}>{children}</div>;
}
