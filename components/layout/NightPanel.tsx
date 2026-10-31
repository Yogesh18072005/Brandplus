import type { CSSProperties, ReactNode } from 'react';

/*
 * The site's night sky: the framed dark panel from the homepage hero, reusable
 * for page headers, the sign-in panel and the report cover. Styles live in
 * app/hero.css (`.hz`); `rim` is how far the glowing horizon sits above the
 * panel's bottom edge.
 */

/** Grid cells that catch light, as [column offset from centre, row]. */
const DEFAULT_CELLS: [number, number][] = [[-10, 3], [-9, 4], [7, 2], [8, 3]];

export function NightSky({ mark = true, cells = DEFAULT_CELLS }: { mark?: boolean; cells?: [number, number][] }) {
  return (
    <div aria-hidden="true">
      <div className="hz-stars" />
      <div className="hz-grid" />
      {cells.map(([col, row]) => <div key={`${col}-${row}`} className="hz-cell" style={{ left: `calc(50% + ${36 + col * 72}px)`, top: row * 72 }} />)}
      <div className="hz-glow" />
      <div className="hz-planet" />
      {mark && <p className="hz-mark">brandpulse</p>}
    </div>
  );
}

export function NightPanel({ children, className = '', rim, mark = true, cells, as: Tag = 'section', ...rest }: {
  children: ReactNode;
  className?: string;
  /** Horizon height above the bottom edge, e.g. 120 for a short page header. */
  rim?: number;
  mark?: boolean;
  cells?: [number, number][];
  as?: 'section' | 'div' | 'header' | 'aside';
  'aria-labelledby'?: string;
}) {
  const style = rim ? ({ '--rim': `${rim}px` } as CSSProperties) : undefined;
  return (
    <Tag className={`hz ${className}`} style={style} {...rest}>
      <NightSky mark={mark} cells={cells} />
      {children}
    </Tag>
  );
}

/**
 * The header for every inner page, in the homepage's system: a light sky
 * header with an eyebrow (or breadcrumb), a big ink title, a lede and optional
 * actions. Pair it with the default (light) `<SiteNav />`.
 */
export function PageHeader({ eyebrow, title, lede, children, meta }: { eyebrow?: ReactNode; title: ReactNode; lede?: ReactNode; children?: ReactNode; meta?: ReactNode }) {
  return (
    <header className="relative isolate overflow-hidden px-4 pt-36 pb-14 sm:px-8 sm:pt-44 sm:pb-20" aria-labelledby="page-title">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(110%_70%_at_50%_0%,#d6e5ff_0%,#edf3ff_42%,#f6f8fb_80%)]" />
      <div className="mx-auto w-full max-w-[1200px]">
        {eyebrow && <div className="text-[13.5px] font-semibold text-brand-deep">{eyebrow}</div>}
        <h1 id="page-title" className="mt-4 max-w-[17em] text-[clamp(36px,4.8vw,64px)] leading-[1.04] font-semibold tracking-[-0.04em] text-balance text-[#171425]">{title}</h1>
        {lede && <p className="mt-5 max-w-[38em] text-[17.5px] leading-relaxed text-pretty text-[#524f6d]">{lede}</p>}
        {meta && <div className="mt-5 text-[13.5px] text-[#676480]">{meta}</div>}
        {children && <div className="mt-8 flex flex-wrap items-center gap-3">{children}</div>}
      </div>
    </header>
  );
}
