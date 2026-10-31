import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * The one button for the whole site. Primary is the hero blue.
 * Pass `href` to render a link; add `arrow` for the arrow chip the main calls
 * to action use. Hover: a light sweep crosses the button and the arrow loops
 * out and back in. Press: a slight squeeze. Reduced motion: no movement.
 *
 *   <Button href="#audit" size="lg" arrow>Get my free audit</Button>
 *   <Button variant="light" href="#how">See how it works</Button>   // on blue
 */

type Variant = 'primary' | 'light' | 'dark' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'default' | 'lg';

const base =
  'group relative isolate inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold tracking-[-0.01em] no-underline ' +
  'transition-[transform,box-shadow,background-color,color] duration-300 ease-out active:scale-[0.97] ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ' +
  'disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none motion-reduce:active:scale-100';

const variants: Record<Variant, { button: string; chip: string; shine: string }> = {
  primary: {
    button: 'bg-linear-to-b from-brand to-brand-deep text-white! shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_10px_24px_-12px_var(--color-brand-deep)] hover:-translate-y-px hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_16px_30px_-12px_var(--color-brand-deep)]',
    chip: 'bg-white/20 text-white',
    shine: 'via-white/35',
  },
  light: {
    button: 'bg-white text-brand-ink! shadow-[0_10px_24px_-12px_rgb(0_24_66/0.6)] hover:-translate-y-px hover:bg-[#f1f0fe]',
    chip: 'bg-brand text-white',
    shine: 'via-brand/15',
  },
  dark: {
    button: 'bg-[#16151f] text-white! shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_10px_24px_-12px_rgb(11_26_58/0.6)] hover:-translate-y-px',
    chip: 'bg-white/15 text-white',
    shine: 'via-white/20',
  },
  secondary: {
    button: 'border border-rule bg-surface-raised text-content! hover:border-brand/30 hover:bg-surface-overlay',
    chip: 'bg-brand text-white',
    shine: 'via-brand/10',
  },
  ghost: {
    button: 'border border-white/30 bg-white/5 text-white! hover:bg-white/15',
    chip: 'bg-white/15 text-white',
    shine: 'via-white/20',
  },
  destructive: {
    button: 'bg-absence text-white! hover:bg-absence-bright',
    chip: 'bg-white/20 text-white',
    shine: 'via-white/25',
  },
};

const sizes: Record<Size, { button: string; arrowPad: string; chip: string }> = {
  sm: { button: 'h-9 gap-2 px-4 text-[13px]', arrowPad: 'pr-1.5', chip: 'size-6' },
  default: { button: 'h-11 gap-2.5 px-5 text-[14.5px]', arrowPad: 'pr-1.5', chip: 'size-8' },
  lg: { button: 'h-[52px] gap-3 px-6 text-[15.5px]', arrowPad: 'pr-2', chip: 'size-[38px]' },
};

function Inner({ variant, size, arrow, leading, children }: { variant: Variant; size: Size; arrow: boolean; leading?: ReactNode; children: ReactNode }) {
  const v = variants[variant];
  return (
    <>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 -z-10 -translate-x-full bg-linear-to-r from-transparent ${v.shine} to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full motion-reduce:hidden`}
      />
      {leading}
      <span>{children}</span>
      {arrow && (
        <span aria-hidden="true" className={`grid place-items-center rounded-full ${v.chip} ${sizes[size].chip}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-4 group-hover:animate-arrow-loop motion-reduce:animate-none">
            <path d="M5 12h14m-6-6 6 6-6 6" />
          </svg>
        </span>
      )}
    </>
  );
}

type Common = {
  variant?: Variant;
  size?: Size;
  /** Arrow chip on the right, for primary calls to action. */
  arrow?: boolean;
  /** Optional icon before the label. */
  leading?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Button(props: Common & ({ href: string; target?: string; rel?: string } | ({ href?: undefined } & ButtonHTMLAttributes<HTMLButtonElement>))) {
  const { variant = 'primary', size = 'default', arrow = false, leading, children, className = '' } = props;
  const classes = `${base} ${variants[variant].button} ${sizes[size].button} ${arrow ? sizes[size].arrowPad : ''} ${className}`;
  const inner = <Inner variant={variant} size={size} arrow={arrow} leading={leading}>{children}</Inner>;

  if (props.href !== undefined) {
    const { href, target, rel } = props;
    const external = /^(https?:|mailto:)/.test(href);
    return external
      ? <a href={href} target={target} rel={rel ?? (target === '_blank' ? 'noreferrer' : undefined)} className={classes}>{inner}</a>
      : <Link href={href} className={classes}>{inner}</Link>;
  }

  const { variant: _v, size: _s, arrow: _a, leading: _l, children: _c, className: _cn, ...rest } = props;
  return <button className={classes} {...rest}>{inner}</button>;
}
