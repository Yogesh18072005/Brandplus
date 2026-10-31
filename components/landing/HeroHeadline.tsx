'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

/*
 * Hero headline. The assistants sit in the sentence as small bordered chips
 * with their own colour tile. Each chip settles in once on load, then stays.
 * Icons are our own simple glyphs, not the assistants' logos.
 */

const svg = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-[62%]" aria-hidden="true">{d}</svg>
);

export const ASSISTANT_ICONS = {
  chatgpt: { word: 'ChatGPT', tile: 'bg-[#10a37f]', icon: svg(<path d="M4 5h16v11H9l-5 4z" />) },
  gemini: { word: 'Gemini', tile: 'bg-linear-to-br from-[#3b82f6] to-[#8b5cf6]', icon: svg(<path d="M12 3c.6 4.6 3.4 7.4 9 9-5.6 1.6-8.4 4.4-9 9-.6-4.6-3.4-7.4-9-9 5.6-1.6 8.4-4.4 9-9z" fill="currentColor" stroke="none" />) },
  claude: { word: 'Claude', tile: 'bg-[#d97757]', icon: svg(<><circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none" /><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4M5.3 5.3l2.8 2.8M15.9 15.9l2.8 2.8M18.7 5.3l-2.8 2.8M8.1 15.9l-2.8 2.8" /></>) },
  perplexity: { word: 'Perplexity', tile: 'bg-[#1f8f9a]', icon: svg(<path d="M12 3v18M4 7l16 10M20 7 4 17" />) },
  copilot: { word: 'Copilot', tile: 'bg-[#7c5cf6]', icon: svg(<path d="M7 8a4 4 0 0 1 8 0v3a4 4 0 0 0 8 0M1 13a4 4 0 0 0 8 0v-3" />) },
  aimode: { word: 'AI Mode', tile: 'bg-[#f5b400]', icon: svg(<><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 6 6" /></>) },
} as const;

export type AssistantKey = keyof typeof ASSISTANT_ICONS;

export function AssistantTile({ name, className = 'size-[0.78em] rounded-[0.22em]' }: { name: AssistantKey; className?: string }) {
  const a = ASSISTANT_ICONS[name];
  return <span className={`grid shrink-0 place-items-center text-white ${a.tile} ${className}`}>{a.icon}</span>;
}

function Chip({ name, order, dark }: { name: AssistantKey; order: number; dark: boolean }) {
  const reduced = useReducedMotion();
  return (
    <motion.span
      initial={reduced ? false : { opacity: 0, y: '0.25em', filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ type: 'spring', stiffness: 380, damping: 24, delay: 0.2 + order * 0.12 }}
      className={`ml-[0.06em] inline-flex items-center gap-[0.18em] rounded-[0.24em] border py-[0.02em] pr-[0.2em] pl-[0.08em] align-baseline whitespace-nowrap ${
        dark
          ? 'border-white/20 bg-white/[0.08] shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] backdrop-blur-sm'
          : 'border-[#e4e2ee] bg-white shadow-[0_1px_0_rgb(14_21_37/0.04)]'
      }`}
    >
      <AssistantTile name={name} className="size-[0.74em] translate-y-[0.05em] self-center rounded-[0.2em]" />
      {ASSISTANT_ICONS[name].word}
    </motion.span>
  );
}

export function HeroHeadline({ dark = false }: { dark?: boolean }) {
  return (
    <h1 className={`m-0 text-[clamp(34px,5vw,68px)] leading-[1.14] font-semibold tracking-[-0.04em] text-balance ${dark ? 'text-white' : 'text-[#120e25]'}`}>
      {/* Each chip keeps its comma, so punctuation never starts a line. */}
      Make <span className="whitespace-nowrap"><Chip dark={dark} name="chatgpt" order={0} />,</span>{' '}
      <span className="whitespace-nowrap"><Chip dark={dark} name="gemini" order={1} />,</span>{' '}
      <Chip dark={dark} name="claude" order={2} /> and <Chip dark={dark} name="perplexity" order={3} /> recommend your business.
    </h1>
  );
}
