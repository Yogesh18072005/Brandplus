import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * The marketing site's action button: a compact, squarish ink button led by a
 * brand-blue tile holding the logo ring (the "zero"). One shape everywhere;
 * three tones for the surface it sits on.
 *
 *   <InkButton href="#audit">Get my free audit</InkButton>          // on light
 *   <InkButton href="#audit" tone="glass">…</InkButton>             // on dark
 *   <InkButton type="submit" tone="paper">…</InkButton>             // high-contrast on dark
 */

type Tone = 'ink' | 'glass' | 'paper';
type Size = 'md' | 'lg';

const tones: Record<Tone, string> = {
  ink: 'bg-[#0e0b19] text-white! shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_10px_24px_-12px_rgb(11_15_25/0.7)] hover:bg-[#201c33]',
  glass: 'border border-white/15 bg-white/[0.07] text-white! shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] hover:bg-white/[0.13]',
  paper: 'bg-white text-[#0e0b19]! shadow-[0_10px_24px_-12px_rgb(0_0_0/0.6)] hover:bg-[#f2f0fe]',
};

const sizes: Record<Size, { button: string; tile: string; ring: string }> = {
  md: { button: 'h-11 gap-3 rounded-[11px] pl-[7px] pr-4 text-[14.5px]', tile: 'size-[30px] rounded-[8px]', ring: 'size-[17px]' },
  lg: { button: 'h-[52px] gap-3.5 rounded-[13px] pl-2 pr-5 text-[15.5px]', tile: 'size-9 rounded-[9px]', ring: 'size-5' },
};

const base =
  'group inline-flex shrink-0 items-center justify-center font-semibold tracking-[-0.01em] no-underline ' +
  'transition-[background-color,transform] duration-200 active:scale-[0.98] ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ' +
  'disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100';

export function RingTile({ className = 'size-[30px] rounded-[8px]', ring = 'size-[17px]' }: { className?: string; ring?: string }) {
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center bg-linear-to-b from-[#7c6cf6] to-[#2a1bb0] shadow-[inset_0_1px_0_rgb(255_255_255/0.35)] ${className}`}>
      <svg viewBox="10 8 48 48" className={`${ring} transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none`} focusable="false">
        <path d="M13 34h8.5l5.5-13 9.5 23 5.5-12h4.5" fill="none" stroke="#fff" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="51.5" cy="32" r="5" fill="#a9ffdf" />
      </svg>
    </span>
  );
}

type Common = { tone?: Tone; size?: Size; children: ReactNode; className?: string };

export function InkButton(props: Common & ({ href: string; target?: string } | ({ href?: undefined } & ButtonHTMLAttributes<HTMLButtonElement>))) {
  const { tone = 'ink', size = 'md', children, className = '' } = props;
  const s = sizes[size];
  const classes = `${base} ${tones[tone]} ${s.button} ${className}`;
  const inner = (<><RingTile className={s.tile} ring={s.ring} /><span>{children}</span></>);

  if (props.href !== undefined) {
    // External links (booking calendars, mail) leave the site; internal ones use client routing.
    if (/^(https?:|mailto:)/.test(props.href)) {
      return <a href={props.href} target={props.target} rel={props.target === '_blank' ? 'noreferrer' : undefined} className={classes}>{inner}</a>;
    }
    return <Link href={props.href} className={classes}>{inner}</Link>;
  }

  const { tone: _t, size: _s, children: _c, className: _cn, ...rest } = props;
  return <button className={classes} {...rest}>{inner}</button>;
}
