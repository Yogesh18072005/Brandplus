// The BrandPulse logo: a pulse line on an indigo tile that ends in a mint dot,
// the moment AI names you.
//
// Colour runs through CSS variables so any dark or brand surface can switch
// to the reversed version without new props:
//   --zc-ring  tile paint   (default: brand indigo gradient)
//   --zc-line  pulse line   (default: white)
//   --zc-dot   dot colour   (default: named mint #1FC58A)
// tone="light" sets them inline for indigo/ink backgrounds.

import { useId, type CSSProperties } from 'react';

type Tone = 'color' | 'light';

const PULSE_PATH = 'M13 34h8.5l5.5-13 9.5 23 5.5-12h4.5';

const LIGHT_VARS = { '--zc-ring': '#ffffff', '--zc-line': '#463EDA', '--zc-dot': '#1FC58A' } as CSSProperties;

function TileGradient({ id }: { id: string }) {
  // Each instance gets its own id: a shared id breaks every logo on the page
  // when the first copy sits inside a hidden element (e.g. a desktop-only sidebar).
  return (
    <defs>
      <linearGradient id={id} x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#7C6CF6" />
        <stop offset=".55" stopColor="#463EDA" />
        <stop offset="1" stopColor="#2A1BB0" />
      </linearGradient>
    </defs>
  );
}

/** The symbol on its own. Size it with className (e.g. "h-5 w-5"). */
export function BrandMark({ className = 'h-5 w-5', tone = 'color', size }: { className?: string; tone?: Tone; size?: number }) {
  const gradientId = `zc-tile-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg viewBox="4 4 56 56" className={className} style={{ ...(size ? { width: size, height: size } : {}), ...(tone === 'light' ? LIGHT_VARS : {}) }} aria-hidden="true" focusable="false">
      <TileGradient id={gradientId} />
      <rect x="4" y="4" width="56" height="56" rx="16" style={{ fill: `var(--zc-ring, url(#${gradientId}))` }} />
      <path d={PULSE_PATH} fill="none" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'var(--zc-line, #fff)', fill: 'none' }} />
      <circle cx="51.5" cy="32" r="4.2" style={{ fill: 'var(--zc-dot, #1FC58A)', stroke: 'none' }} />
    </svg>
  );
}

/**
 * Standard lockup for navigation and headers: symbol + "brandpulse".
 * The text keeps the `text-content` class so existing dark surfaces that
 * recolour it keep working.
 */
export function Wordmark({ tone = 'color', size = 18, className = '' }: { tone?: Tone; size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center ${tone === 'light' ? '' : 'text-content'} ${className}`} style={{ gap: size * 0.45, ...(tone === 'light' ? { ...LIGHT_VARS, color: '#fff' } : {}) }}>
      <BrandMark className="shrink-0" tone={tone} size={Math.round(size * 1.2)} />
      <span style={{ fontFamily: 'var(--font-display, var(--font-inter))', fontSize: size, fontWeight: 650, letterSpacing: '-0.035em', lineHeight: 1 }}>
        brand<span style={{ color: tone === 'light' ? '#C9C2FF' : 'var(--color-brand)' }}>pulse</span>
      </span>
    </span>
  );
}

/** The large lockup for brand moments: a bigger mark beside the two-tone name. */
export function SignatureWordmark({ tone = 'color', className = '', style }: { tone?: Tone; className?: string; style?: CSSProperties }) {
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '.28em', fontWeight: 650, letterSpacing: '-0.045em', lineHeight: 1, whiteSpace: 'nowrap', ...(tone === 'light' ? { ...LIGHT_VARS, color: '#fff' } : {}), ...style }}
      aria-label="brandpulse"
      role="img"
    >
      <BrandMark tone={tone} className="h-[.95em] w-[.95em] shrink-0" />
      <span aria-hidden="true">brand<span style={{ color: tone === 'light' ? '#C9C2FF' : 'var(--color-brand)' }}>pulse</span></span>
    </span>
  );
}
