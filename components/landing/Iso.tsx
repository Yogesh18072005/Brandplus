'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react';

/*
 * The homepage's illustration language: an isometric platform (an AI answer)
 * with raised blocks (the businesses and pieces of work in it). Pure CSS 3D,
 * styled in app/iso.css. Primitives only: each card's scene and interaction
 * lives in IsoScenes.tsx, and no two cards move the same way.
 */

export type Tone = 'white' | 'blue' | 'green' | 'ink' | 'soft' | 'ghost';

const TONES: Record<Tone, { top: string; front: string; left: string; text: string }> = {
  white: { top: '#ffffff', front: '#e9e8f4', left: '#dad9ea', text: '#171425' },
  blue: { top: 'linear-gradient(135deg,#756df7,#463eda)', front: '#372ad1', left: '#2e21b1', text: '#ffffff' },
  green: { top: 'linear-gradient(135deg,#3fd08f,#22a06b)', front: '#1b8a5a', left: '#156c47', text: '#ffffff' },
  ink: { top: '#1e1b30', front: '#131123', left: '#0e0b19', text: '#ffffff' },
  soft: { top: '#f1f0fe', front: '#e0def6', left: '#d2cfee', text: '#2a1bcc' },
  ghost: { top: '#f3f3f8', front: '#e7e6f0', left: '#dcdbe9', text: '#8d8aa5' },
};

export const U = 28;

export interface BlockProps {
  x: number; y: number; w: number; d: number;
  /** Height above the platform, in px. Changing it springs the block. */
  h: number;
  tone?: Tone;
  label?: ReactNode;
  size?: number;
  hot?: boolean;
  dim?: boolean;
  onEnter?: () => void;
  onLeave?: () => void;
  onClick?: () => void;
}

export function Block({ x, y, w, d, h, tone = 'white', label, size = 10, hot, dim, onEnter, onLeave, onClick }: BlockProps) {
  const t = TONES[tone];
  const style = { left: x * U, top: y * U, width: w * U, height: d * U, background: t.top, '--h': `${h}px`, boxShadow: tone === 'white' && !hot ? 'inset 0 0 0 1px #e0dfee' : undefined, cursor: onClick || onEnter ? 'pointer' : undefined } as CSSProperties;
  return (
    <div className={`iso-block ${hot ? 'is-hot' : ''} ${dim ? 'is-dim' : ''}`} style={style} onMouseEnter={onEnter} onMouseLeave={onLeave} onClick={onClick}>
      <span className="iso-face-front" style={{ height: h, backgroundColor: t.front }} />
      <span className="iso-face-left" style={{ width: h, backgroundColor: t.left }} />
      {label !== undefined && <span className="iso-label" style={{ color: t.text, fontSize: size }}>{label}</span>}
    </div>
  );
}

/** An empty dashed place on the platform: where a business should be. */
export function Slot({ x, y, w, d, label, hot, onEnter, onLeave }: { x: number; y: number; w: number; d: number; label?: string; hot?: boolean; onEnter?: () => void; onLeave?: () => void }) {
  return (
    <div className={`iso-slot ${hot ? 'is-hot' : ''}`} style={{ left: x * U, top: y * U, width: w * U, height: d * U, cursor: onEnter ? 'pointer' : undefined }} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {label && <span className="iso-label" style={{ color: '#d93036', fontSize: 10 }}>{label}</span>}
    </div>
  );
}

export function Platform({ cols, rows, children }: { cols: number; rows: number; children?: ReactNode }) {
  return (
    <div className="iso-stage" style={{ width: cols * U, height: rows * U }}>
      <div className="iso-platform">
        <span className="iso-face-front" style={{ height: 10, backgroundColor: '#e4e3f0' }} />
        <span className="iso-face-left" style={{ width: 10, backgroundColor: '#d5d4e6' }} />
      </div>
      {children}
    </div>
  );
}

/** True once the element has scrolled into view (and stays true). */
export function useInView<T extends HTMLElement>(threshold = 0.35) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setInView(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setInView(true); io.disconnect(); } }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, inView] as const;
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** A small pill control that sits on the scene canvas. */
export function SceneButton({ active = false, dark = false, onClick, children, label }: { active?: boolean; dark?: boolean; onClick: () => void; children: ReactNode; label?: string }) {
  const base = 'rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';
  const tone = dark
    ? (active ? 'bg-white text-[#0e0b19]' : 'bg-white/10 text-white/80 hover:bg-white/20')
    : (active ? 'bg-[#0e0b19] text-white' : 'border border-[#e4e3ed] bg-white text-[#413d58] hover:border-[#cac9de]');
  return <button type="button" aria-pressed={active} aria-label={label} onClick={onClick} className={`${base} ${tone}`}>{children}</button>;
}

/**
 * A card: a canvas holding the scene, a live readout line and the scene's own
 * controls, then a title and one sentence.
 */
export function IsoCard({ title, text, dark = false, className = '', sceneRef, readout, controls, bare = false, fill = false, footer, sky = false, children }: {
  title: string; text: ReactNode; dark?: boolean; className?: string;
  sceneRef?: Ref<HTMLDivElement>; readout?: ReactNode; controls?: ReactNode;
  /** Visual only (for the proof gallery, which adds its own hover caption). */
  bare?: boolean;
  /** Let the scene grow to fill a tall card. */
  fill?: boolean;
  /** Extra content under the text (e.g. a button). */
  footer?: ReactNode;
  /** Soft sky-gradient canvas with left-aligned copy (the team bento's look). */
  sky?: boolean;
  children: ReactNode;
}) {
  const canvas = (
      <div ref={sceneRef} className={`iso-scene relative flex flex-col overflow-hidden ${bare ? 'h-full' : 'rounded-[14px]'} ${fill ? 'min-h-[310px] flex-1' : bare ? '' : 'h-[310px]'} ${sky ? 'bg-[radial-gradient(130%_100%_at_50%_0%,#cfe2ff_0%,#e6f0ff_45%,#f5f9ff_100%)]' : dark ? 'bg-[#161426]' : 'bg-[#f4f4f9]'}`}>
        {!sky && <div aria-hidden="true" className={`pointer-events-none absolute inset-0 bg-[size:14px_14px] ${dark ? 'bg-[radial-gradient(rgb(255_255_255/0.07)_1px,transparent_1px)]' : 'bg-[radial-gradient(#dfe4ec_1px,transparent_1px)]'}`} />}
        {readout !== undefined && (
          <p aria-live="polite" className={`relative z-10 min-h-[42px] px-4 pt-3.5 text-[13px] leading-snug ${dark ? 'text-white/75' : 'text-[#413d58]'}`}>{readout}</p>
        )}
        <div className="iso-fit relative grid flex-1 place-items-center">{children}</div>
        {controls && <div className="relative z-10 flex flex-wrap items-center justify-center gap-1.5 px-3 pb-3">{controls}</div>}
      </div>
  );
  if (bare) return canvas;
  return (
    <article className={`flex flex-col rounded-[20px] p-2.5 ${dark ? 'bg-[#0e0b19]' : 'bg-white'} ${className}`}>
      {canvas}
      <div className={`px-4 pt-5 pb-4 ${sky ? 'text-left' : 'text-center'}`}>
        <h3 className={`text-[17px] font-semibold tracking-[-0.015em] ${dark ? 'text-white' : 'text-[#171425]'}`}>{title}</h3>
        <p className={`mt-1.5 max-w-[30em] text-[14.5px] leading-relaxed ${sky ? '' : 'mx-auto'} ${dark ? 'text-white/60' : 'text-[#524f6d]'}`}>{text}</p>
        {footer && <div className={`mt-5 flex ${sky ? '' : 'justify-center'}`}>{footer}</div>}
      </div>
    </article>
  );
}
