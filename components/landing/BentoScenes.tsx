'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import { Check, FileCode2, FileText, Map as MapIcon, ScrollText } from 'lucide-react';
import { RingTile } from '@/components/ui/InkButton';
import { AiLogo, SiteLogo, type AiKey } from '@/components/brand/AiLogo';
import { Frost, Stage } from './Scenes';
import { PROOF_QUESTIONS, PROOF_SOURCES } from '@/lib/marketing/proof-case';

/*
 * The "Done for you" bento scenes, rebuilt from a frame-by-frame study of the
 * file's rendered loops (HOMEPAGE-DESIGN.md §5). Every scene layers three
 * things on different clocks: one continuous motion (flow, drift, marquee),
 * one discrete event (swap, cascade, toggle), and one live detail (a counter
 * or label that changes). Ease-in-out tweens, staggered, landing with a small
 * overshoot. Reduced motion: a still, finished frame.
 */

const EASE = [0.65, 0, 0.35, 1] as const;
const MOVE = { duration: 0.75, ease: EASE };
const LAND = { scale: [0.94, 1.04, 1] };
const INK = 'text-[#171425]';
const FAINT = 'text-[#6f6b88]';
const CARD = 'rounded-[18px] bg-white shadow-[0_26px_50px_-26px_rgb(20_70_170/0.65)]';

/** Counts whole periods while the scene is on screen (and not reduced-motion). */
function useClock(periodMs: number) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const reduce = useReducedMotion() ?? false;
  const [n, setN] = useState(0);
  useEffect(() => {
    if (reduce || !inView) return;
    const id = setInterval(() => setN((v) => v + 1), periodMs);
    return () => clearInterval(id);
  }, [inView, reduce, periodMs]);
  return { ref, n, live: inView && !reduce, reduce };
}

function Cursor({ label, tone = 'brand' }: { label: string; tone?: 'brand' | 'pink' }) {
  const bg = tone === 'pink' ? 'bg-[#e8409a]' : 'bg-brand';
  const fill = tone === 'pink' ? 'text-[#e8409a]' : 'text-brand';
  return (
    <span className="flex items-start">
      <svg viewBox="0 0 24 24" className={`size-5 drop-shadow ${fill}`} aria-hidden="true"><path d="M4 3l7 18 2.5-7.5L21 11z" fill="currentColor" stroke="white" strokeWidth="1.5" strokeLinejoin="round" /></svg>
      <span className={`mt-4 -ml-1 rounded-[7px] px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap text-white shadow-md ${bg}`}>{label}</span>
    </span>
  );
}

function Counter({ value, children }: { value: number; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12.5px] font-medium shadow-[0_10px_24px_-12px_rgb(30_90_190/0.6)] ${INK}`}>
      <span className="relative inline-grid h-[1.2em] min-w-[1.2em] overflow-hidden text-center font-semibold text-brand tabular-nums">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={value} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '-100%' }} transition={{ duration: 0.4, ease: EASE }}>{value}</motion.span>
        </AnimatePresence>
      </span>
      {children}
    </span>
  );
}

/* ===== 1. Answer pages: drafts ride an arc, you approve the one in front ===== */

const PAGES = [
  { kind: 'Answer page', title: 'How to choose a privacy-friendly analytics tool' },
  { kind: 'Comparison', title: 'You vs the rival AI names most' },
  { kind: 'FAQ page', title: 'Pricing, setup and data, answered' },
  { kind: 'Use case', title: 'Analytics for agencies with many clients' },
  { kind: 'Guide', title: 'Tracking without a cookie banner' },
];

// Slots along the arc: centre, right, (back), left. Side cards tilt and crop.
const ARC = [
  { left: '50%', top: '16%', rotate: 0, scale: 1, opacity: 1, z: 3 },
  { left: '92%', top: '30%', rotate: 16, scale: 0.86, opacity: 0.95, z: 2 },
  { left: '50%', top: '78%', rotate: 0, scale: 0.7, opacity: 0, z: 0 },
  { left: '8%', top: '30%', rotate: -16, scale: 0.86, opacity: 0.95, z: 2 },
];

export function PagesScene({ className = 'aspect-[16/10]' }: { className?: string }) {
  const PERIOD = 2600;
  const { ref, n, live } = useClock(PERIOD);
  const front = n % PAGES.length;
  return (
    <div ref={ref}>
      <Stage className={className}>
        <div className="absolute top-3 left-1/2 z-20 -translate-x-1/2"><Counter value={4 + n}>pages approved</Counter></div>
        {PAGES.map((p, i) => {
          let d = (i - front + PAGES.length) % PAGES.length; // 0 front, 1 right, …, last = left
          const slot = d === 0 ? ARC[0]! : d === 1 ? ARC[1]! : d === PAGES.length - 1 ? ARC[3]! : ARC[2]!;
          const isFront = d === 0;
          return (
            <motion.div key={p.title} className={`absolute w-[50%] -translate-x-1/2 p-4 ${CARD}`} style={{ zIndex: slot.z, transformOrigin: '50% 140%' }}
              initial={false} animate={{ left: slot.left, top: slot.top, rotate: slot.rotate, scale: slot.scale, opacity: slot.opacity }} transition={MOVE}>
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-[#eeecfe] px-2 py-0.5 text-[11px] font-semibold text-brand-deep">{p.kind}</span>
                <motion.span initial={false} animate={isFront && live ? { opacity: [0, 0, 1], scale: [0.6, 0.6, 1] } : { opacity: isFront ? 1 : 0 }} transition={{ duration: PERIOD / 1000, times: [0, 0.7, 0.8] }}
                  className="rounded-full bg-presence px-2 py-0.5 text-[11px] font-semibold text-white">✓ Approved</motion.span>
              </div>
              <p className={`mt-2.5 text-[15px] leading-snug font-semibold tracking-[-0.01em] ${INK}`}>{p.title}</p>
              <div className="mt-3 space-y-1.5" aria-hidden="true">
                <i className="block h-1.5 rounded-full bg-[#efeef8]" /><i className="block h-1.5 w-5/6 rounded-full bg-[#efeef8]" /><i className="block h-1.5 w-3/5 rounded-full bg-[#efeef8]" />
              </div>
            </motion.div>
          );
        })}
        {live && (
          <motion.div key={`c-${n}`} className="absolute z-30" initial={{ left: '18%', top: '80%' }}
            animate={{ left: ['18%', '40%', '62%', '62%', '74%'], top: ['80%', '66%', '52%', '52%', '70%'], scale: [1, 1, 1, 0.88, 1] }}
            transition={{ duration: PERIOD / 1000, times: [0, 0.35, 0.68, 0.74, 1], ease: 'easeInOut' }}>
            <Cursor label="You" />
          </motion.div>
        )}
      </Stage>
    </div>
  );
}

/* ===== 2. The monthly re-check: the envelope opens, the result rises ===== */

const MONTHS = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];

export function ReportScene({ className = 'aspect-[16/10]' }: { className?: string }) {
  const PERIOD = 5200;
  const { ref, n, live, reduce } = useClock(PERIOD);
  const [beat, setBeat] = useState(reduce ? 4 : 0);
  useEffect(() => {
    if (!live) { if (reduce) setBeat(4); return; }
    setBeat(0);
    const ts = [300, 1100, 1700, 2200].map((t, i) => setTimeout(() => setBeat(i + 1), t));
    return () => ts.forEach(clearTimeout);
  }, [n, live, reduce]);
  const open = beat >= 1;
  return (
    <div ref={ref}>
      <Stage className={className}>
        <div className="absolute bottom-[-8%] left-1/2 h-[62%] w-[72%] -translate-x-1/2 [perspective:900px]">
          <div className="absolute inset-0 rounded-[22px] bg-linear-to-b from-[#f6f5fe] to-[#e2e0fa] shadow-[0_30px_60px_-30px_rgb(30_90_190/0.6)]" />
          <motion.div className="absolute inset-x-0 top-0 h-[62%] origin-top [transform-style:preserve-3d]" initial={false} animate={{ rotateX: open ? 180 : 0 }} transition={{ duration: 0.8, ease: EASE }} style={{ zIndex: open ? 0 : 30 }}>
            <div className="size-full bg-linear-to-b from-white to-[#ecebfb] [clip-path:polygon(0_0,100%_0,50%_100%)]" />
          </motion.div>
          <motion.div className="absolute left-1/2 z-10 -translate-x-1/2" initial={false}
            animate={beat >= 2 ? { top: '-40%', ...LAND } : { top: '30%', scale: 0.86 }} transition={{ duration: 0.8, ease: EASE }}>
            <motion.div animate={live ? { y: [0, -6, 0] } : {}} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}>
              <Frost blue className="size-[116px]"><Check className="size-[56%]" strokeWidth={2.6} /></Frost>
            </motion.div>
          </motion.div>
          <div className="absolute inset-0 z-20 rounded-[22px] bg-linear-to-t from-white to-[#f1f0fc] [clip-path:polygon(0_28%,50%_66%,100%_28%,100%_100%,0_100%)]" />
        </div>
        <div className="absolute top-3 left-3 z-30">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0e0b19] px-3 py-1.5 text-[12px] font-semibold text-white">
            Re-check ·
            <span className="relative inline-grid h-[1.2em] w-[2.2em] overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span key={n} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '-100%' }} transition={{ duration: 0.45, ease: EASE }}>{MONTHS[n % MONTHS.length]}</motion.span>
              </AnimatePresence>
            </span>
          </span>
        </div>
        {[
          { t: <><b className="text-brand">{PROOF_QUESTIONS.length}</b> questions re-asked</>, cls: 'top-[22%] left-[6%]', at: 3 },
          { t: 'Same wording, same way', cls: 'top-[22%] right-[6%]', at: 3 },
          { t: <><span className="text-presence">●</span> What changed, in plain English</>, cls: 'top-[40%] right-[3%]', at: 4 },
        ].map((p, i) => (
          <motion.div key={i} className={`absolute z-30 ${p.cls}`} initial={false} animate={{ opacity: beat >= p.at ? 1 : 0, y: beat >= p.at ? 0 : 10 }} transition={{ ...MOVE, delay: beat >= p.at ? i * 0.1 : 0 }}>
            <span className={`inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12.5px] font-medium whitespace-nowrap shadow-[0_10px_24px_-12px_rgb(30_90_190/0.55)] ${INK}`}>{p.t}</span>
          </motion.div>
        ))}
      </Stage>
    </div>
  );
}

/* ===== 3. Listed where AI reads: a hub wired to sites, the real domains drifting by ===== */

const SITE_TILES: { label: string; face: ReactNode; you?: boolean }[] = [
  { label: 'g2.com', face: <SiteLogo name="g2" className="size-8" /> },
  { label: 'reddit.com', face: <SiteLogo name="reddit" className="size-8" /> },
  { label: 'your site', face: <RingTile className="size-9 rounded-[10px]" ring="size-5" />, you: true },
];

export function SourcesScene({ className = 'aspect-[4/3]' }: { className?: string }) {
  const PERIOD = 4200;
  const { ref, n, live } = useClock(PERIOD);
  const listed = !live || n % 2 === 1;
  const domains = [...PROOF_SOURCES, ...PROOF_SOURCES];
  return (
    <div ref={ref}>
      <Stage className={className}>
        <svg aria-hidden="true" viewBox="0 0 400 300" className="absolute inset-0 size-full">
          {[90, 200, 310].map((x, i) => (
            <g key={x}>
              <path d={`M200 96 C 200 124, ${x} 116, ${x} 140`} pathLength={600} fill="none" stroke="#fff" strokeOpacity={0.8} strokeWidth={1.6} />
              <path d={`M200 96 C 200 124, ${x} 116, ${x} 140`} pathLength={600} fill="none" stroke="#5d50ee" strokeWidth={2.4} strokeLinecap="round" className="zc-flow" style={{ animationDelay: `${i * 0.45}s`, opacity: i === 2 && !listed ? 0.15 : 1 }} />
            </g>
          ))}
        </svg>
        <div className="absolute top-[4%] left-1/2 -translate-x-1/2"><Frost className="size-[86px]"><AiLogo name="gemini" className="size-[56%]" /></Frost></div>
        {SITE_TILES.map((s, i) => {
          const lit = !s.you || listed;
          return (
            <div key={s.label} className="absolute top-[46%] flex -translate-x-1/2 flex-col items-center gap-1.5" style={{ left: `${[22.5, 50, 77.5][i]}%` }}>
              <motion.div key={s.you ? String(lit) : 'x'} initial={s.you && lit ? { scale: 0.94 } : false} animate={s.you && lit ? LAND : {}} transition={{ duration: 0.6, ease: EASE }}
                className={`grid size-[60px] place-items-center rounded-[18px] bg-white shadow-[0_18px_30px_-14px_rgb(30_90_190/0.55)] transition-[filter,opacity] duration-500 ${lit ? '' : 'opacity-55 grayscale'}`}>{s.face}</motion.div>
              {s.you && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors duration-500 ${lit ? 'bg-presence text-white' : 'bg-white/80 text-[#6f6b88]'}`}>{lit ? '✓ Listed' : 'Not listed'}</span>}
            </div>
          );
        })}
        {/* the real domains Gemini read, drifting past */}
        <div className="absolute inset-x-0 bottom-3 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_15%,black_85%,transparent)]">
          <div className={`flex w-max gap-2 ${live ? 'zc-marquee [animation-duration:22s]' : ''}`}>
            {[...domains, ...domains].map((d, i) => (
              <span key={i} className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-[#46418f]">{d.domain}</span>
            ))}
          </div>
        </div>
      </Stage>
    </div>
  );
}

/* ===== 4. Your buyers' real questions: rows cascade out and back, a staircase ===== */

const STAGE_TONE: Record<string, string> = {
  Exploring: 'bg-[#eeecfe] text-brand-deep', Comparing: 'bg-[#f1ecff] text-[#6d4fd8]', 'Checking price': 'bg-[#fff4e0] text-[#b26a00]',
  'Ready to buy': 'bg-[#e3f6ec] text-presence', 'Has a problem': 'bg-[#fdecec] text-[#c2352f]', 'Asking who’s trusted': 'bg-[#eeecfe] text-brand-deep',
  'Checking a feature': 'bg-[#f1ecff] text-[#6d4fd8]', 'Choosing a vendor': 'bg-[#e3f6ec] text-presence',
};
const SHORT: Record<string, string> = {
  Exploring: 'Good privacy-friendly analytics for an agency?', Comparing: 'Plausible vs Fathom: which is lighter?', 'Checking price': 'Is Fathom worth it, or cheaper?',
  'Ready to buy': 'Which tool should I sign up for today?', 'Has a problem': 'Track pageviews without a cookie banner?', 'Asking who’s trusted': 'Which cookieless tools do developers trust?',
  'Checking a feature': 'Best privacy analytics for Next.js events?', 'Choosing a vendor': 'Easiest open-source analytics to self-host?',
};

export function QuestionsScene({ className = 'aspect-[4/3]' }: { className?: string }) {
  const { ref, n } = useClock(3400);
  const group = [0, 1, 2].map((i) => PROOF_QUESTIONS[(n * 3 + i) % PROOF_QUESTIONS.length]!);
  return (
    <div ref={ref}>
      <Stage className={className}>
        <div className="absolute inset-x-[7%] top-[12%] space-y-2.5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={n} className="space-y-2.5">
              {group.map((q, i) => (
                <motion.div key={q.text}
                  initial={{ opacity: 0, y: 46 + i * 10, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, ...LAND }}
                  exit={{ opacity: 0, x: 60 + (2 - i) * 34, transition: { duration: 0.5, ease: EASE, delay: (2 - i) * 0.07 } }}
                  transition={{ duration: 0.7, ease: EASE, delay: 0.1 + i * 0.1 }}
                  className={`flex items-center gap-3 px-3.5 py-3 ${CARD}`}>
                  <AiLogo name={(['chatgpt', 'gemini', 'perplexity'] as AiKey[])[i]!} className="size-6" />
                  <span className={`min-w-0 flex-1 truncate text-[13.5px] font-semibold ${INK}`}>{SHORT[q.stage] ?? q.text}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${STAGE_TONE[q.stage] ?? 'bg-[#efeef8] text-[#5b567a]'}`}>{q.stage}</span>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </Stage>
    </div>
  );
}

/* ===== 5. Technical fixes: a control panel, bots switched on, files drifting behind ===== */

const BOTS: { bot: string; owner: AiKey }[] = [
  { bot: 'GPTBot', owner: 'chatgpt' },
  { bot: 'Google-Extended', owner: 'gemini' },
  { bot: 'PerplexityBot', owner: 'perplexity' },
];
const FILES = [
  { name: 'robots.txt', icon: <ScrollText className="size-5" /> },
  { name: 'llms.txt', icon: <FileText className="size-5" /> },
  { name: 'schema.json', icon: <FileCode2 className="size-5" /> },
  { name: 'sitemap.xml', icon: <MapIcon className="size-5" /> },
];

export function TechScene({ className = 'aspect-[4/3]' }: { className?: string }) {
  const PERIOD = 1300;
  const { ref, n, live } = useClock(PERIOD);
  const step = live ? n % 5 : 4; // 0 all off, 1..3 switch on, 4 hold
  const on = Math.min(step, 3);
  return (
    <div ref={ref}>
      <Stage className={className}>
        {/* files drifting behind the panel */}
        <div className="absolute inset-x-0 top-[38%] overflow-hidden opacity-90">
          <div className={`flex w-max gap-3 ${live ? 'zc-marquee [animation-duration:18s]' : ''}`}>
            {[...FILES, ...FILES, ...FILES, ...FILES].map((f, i) => (
              <span key={i} className="flex size-[64px] flex-col items-center justify-center gap-1 rounded-[18px] bg-white/70 text-[#5d4fe8] shadow-[0_14px_26px_-16px_rgb(30_90_190/0.6)] backdrop-blur">
                {f.icon}<span className="text-[9.5px] font-semibold text-[#46418f]">{f.name}</span>
              </span>
            ))}
          </div>
        </div>
        {/* the control panel */}
        <div className="absolute top-1/2 left-1/2 w-[84%] -translate-x-1/2 -translate-y-1/2 rounded-[20px] bg-white/90 p-3.5 shadow-[0_34px_60px_-28px_rgb(20_70_170/0.7)] ring-1 ring-white backdrop-blur-md">
          <p className={`flex items-center justify-between px-1 text-[11.5px] font-semibold ${FAINT}`}>
            AI crawlers <Counterless value={on} />
          </p>
          <ul className="mt-2 space-y-1.5">
            {BOTS.map((b, i) => {
              const isOn = on > i;
              return (
                <li key={b.bot} className="flex items-center gap-2.5 rounded-[12px] bg-[#f7f7fc] px-2.5 py-2">
                  <AiLogo name={b.owner} className="size-[18px]" />
                  <span className={`flex-1 truncate text-[13px] font-semibold ${INK}`}>{b.bot}</span>
                  <span className={`relative h-5 w-9 rounded-full transition-colors duration-300 ${isOn ? 'bg-presence' : 'bg-[#d6d5e5]'}`}>
                    <motion.span className="absolute top-0.5 size-4 rounded-full bg-white shadow" initial={false} animate={{ left: isOn ? 18 : 2 }} transition={{ duration: 0.35, ease: EASE }} />
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        {live && step >= 1 && step <= 3 && (
          <motion.div key={`k-${n}`} className="absolute z-20" initial={{ left: '58%', top: `${36 + (step - 1) * 12}%` }}
            animate={{ left: ['58%', '76%', '76%'], top: [`${30 + (step - 1) * 12}%`, `${38 + (step - 1) * 12}%`, `${38 + (step - 1) * 12}%`], scale: [1, 1, 0.88] }}
            transition={{ duration: PERIOD / 1000 * 0.8, times: [0, 0.7, 0.85], ease: 'easeInOut' }}>
            <Cursor label="BrandPulse" tone="pink" />
          </motion.div>
        )}
      </Stage>
    </div>
  );
}

function Counterless({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11.5px]">
      <span className="relative inline-grid h-[1.2em] w-[0.7em] overflow-hidden text-center text-presence tabular-nums">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={value} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '-100%' }} transition={{ duration: 0.35, ease: EASE }}>{value}</motion.span>
        </AnimatePresence>
      </span>
      / 3 allowed
    </span>
  );
}
