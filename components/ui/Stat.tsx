'use client';

import { useRef, useEffect, useState } from 'react';

export function Stat({
  label,
  value,
  denominator,
  trend,
  className = '',
}: {
  label: string;
  value: string | number;
  denominator?: string;
  trend?: { direction: 'up' | 'down' | 'flat'; label: string };
  className?: string;
}) {
  const numericValue = typeof value === 'number' ? value : null;
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!numericValue) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => { if (entries.some(e => e.isIntersecting)) { setStarted(true); io.disconnect(); } },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [numericValue]);

  useEffect(() => {
    if (!started || !numericValue) return;
    const dur = 800;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min((t - t0) / dur, 1);
      setCount(Math.round(numericValue * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, numericValue]);

  return (
    <div ref={ref} className={className}>
      <p className="text-[12px] font-medium text-tertiary">{label}</p>
      <p className="mt-2 flex items-baseline tabular-nums">
        <span className="font-display text-[32px] font-bold leading-none text-content">
          {numericValue != null ? count : value}
        </span>
        {denominator && (
          <span className="ml-0.5 text-[14px] text-muted">/{denominator}</span>
        )}
      </p>
      {trend && (
        <p className={`mt-2 flex items-center gap-1 text-[12px] font-semibold ${
          trend.direction === 'up' ? 'text-presence' :
          trend.direction === 'down' ? 'text-absence' : 'text-tertiary'
        }`}>
          <svg viewBox="0 0 12 12" className={`h-3 w-3 ${trend.direction === 'down' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2">
            {trend.direction === 'flat' ? <path d="M2 6h8" strokeLinecap="round" /> : <path d="M6 9V3M3 5l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />}
          </svg>
          {trend.label}
        </p>
      )}
    </div>
  );
}
