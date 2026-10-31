'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import { RingTile } from '@/components/ui/InkButton';
import { AiLogo } from '@/components/brand/AiLogo';
import { ArrowUp, Check, FileText, Globe, UserRound, X, Zap } from 'lucide-react';
import { PROOF_QUESTIONS, PROOF_RECORDED_ON, PROOF_TALLY } from '@/lib/marketing/proof-case';

/*
 * The homepage's animated scenes, in the visual language of the founder's
 * "New Showcase" Figma (the invette cards are rendered Lottie loops):
 *  - a soft-blue stage, big frosted "app icon" objects that bleed off the edge,
 *    white cards with real shadows, light flowing along connector lines;
 *  - every scene is a short story in beats (things drop in, stack, open,
 *    rise), driven by springs, that holds its end state and loops while on
 *    screen. Reduced motion shows the end state.
 * Data is from the real audit of 9 Oct 2026 unless a scene says "example".
 */

const SPRING = { duration: 0.7, ease: [0.65, 0, 0.35, 1] } as const;
const LAND = [0.94, 1.04, 1];
const INK = 'text-[#171425]';
const FAINT = 'text-[#6f6b88]';

/** Steps 0..beats-1 every `ms` while on screen; reduced motion parks on the last beat. */
export function useStory(beats: number, ms: number) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const reduce = useReducedMotion();
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    if (reduce) { setBeat(beats - 1); return; }
    if (!inView) return;
    const id = setInterval(() => setBeat((b) => (b + 1) % beats), ms);
    return () => clearInterval(id);
  }, [inView, reduce, beats, ms]);
  return [ref, beat] as const;
}

/** The soft-blue canvas every scene sits on. */
export function Stage({ children, className = 'aspect-[4/3]', soft = false }: { children: ReactNode; className?: string; soft?: boolean }) {
  return (
    <div className={`relative isolate overflow-hidden rounded-[18px] ${soft ? 'bg-[linear-gradient(180deg,#e3eeff_0%,#f3f8ff_100%)]' : 'bg-[linear-gradient(180deg,#a6c9ff_0%,#cde1ff_52%,#eaf3ff_100%)]'} ${className}`}>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(55%_45%_at_50%_42%,rgb(255_255_255/0.75),transparent)]" />
      {children}
    </div>
  );
}

/** A big frosted object: thick translucent rim around a white (or glossy blue) face. */
export function Frost({ children, className = 'size-36', blue = false }: { children: ReactNode; className?: string; blue?: boolean }) {
  return (
    <div className={`grid place-items-center rounded-[30%] bg-white/40 p-[9%] ring-1 ring-white/80 shadow-[0_40px_70px_-28px_rgb(30_90_190/0.6),inset_0_1px_1px_rgb(255_255_255/0.9)] backdrop-blur-md ${className}`}>
      <div className={`grid size-full place-items-center rounded-[25%] ${blue ? 'bg-linear-to-b from-[#9893f9] to-[#5d4fe8] text-white shadow-[inset_0_2px_2px_rgb(255_255_255/0.45),inset_0_-6px_14px_rgb(16_60_160/0.35)]' : 'bg-linear-to-b from-white to-[#f3f2fc] shadow-[0_2px_6px_rgb(30_90_190/0.15),inset_0_-4px_10px_rgb(30_90_190/0.08)]'}`}>{children}</div>
    </div>
  );
}

/* ===== Hero: a real Gemini answer, replayed, with the audit card over it ===== */

/** The audit's real questions, shortened to fit a chat bubble. */
const SHORT_Q: Record<string, string> = {
  Exploring: 'Good privacy-friendly analytics for a small agency?',
  Comparing: 'Plausible vs Fathom: features and script size?',
  'Checking price': 'Is Fathom worth it, or is there a cheaper option?',
  'Ready to buy': 'Which privacy analytics tool should I sign up for today?',
  'Has a problem': 'How do I track pageviews without a cookie banner?',
  'Asking who’s trusted': 'Which cookieless analytics tools do developers trust?',
  'Checking a feature': 'Best privacy analytics for Next.js custom events?',
  'Choosing a vendor': 'Easiest open-source analytics to self-host with Docker?',
};

const NAMES = /(Plausible Analytics|Fathom Analytics|Abtz Analytics|Matomo|Plausible|Fathom|OpenPanel)/g;
const IS_NAME = /^(Plausible Analytics|Fathom Analytics|Abtz Analytics|Matomo|Plausible|Fathom|OpenPanel)$/;

/** Counts up every `ms` while on screen. Reduced motion parks on `rest`. */
function useTicker(ms: number, rest: number) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const reduce = useReducedMotion();
  const [t, setT] = useState(0);
  useEffect(() => {
    if (reduce) { setT(rest); return; }
    if (!inView) return;
    const id = setInterval(() => setT((v) => v + 1), ms);
    return () => clearInterval(id);
  }, [inView, reduce, ms, rest]);
  return [ref, t] as const;
}

const PER_Q = 150; // ticks of 60ms: about 9s per question
const HERO_SOURCES = ['plausible.io', 'usefathom.com', 'posthog.com', 'matomo.org'];

function Highlighted({ text }: { text: string }) {
  return <>{text.split(NAMES).map((part, i) => (IS_NAME.test(part) ? <mark key={i} className="rounded-[5px] bg-[#e8e6fe] px-1 font-semibold text-brand-deep">{part}</mark> : <span key={i}>{part}</span>))}</>;
}

export function HeroScene() {
  const [ref, t] = useTicker(60, 3 * PER_Q + 140);
  const qi = Math.floor(t / PER_Q) % PROOF_QUESTIONS.length;
  const k = t % PER_Q;
  const q = PROOF_QUESTIONS[qi]!;
  const question = SHORT_Q[q.stage] ?? q.text;
  const typed = question.slice(0, Math.round(Math.min(1, k / 28) * question.length));
  const searching = k >= 30 && k < 46;
  const words = q.quote.replace(/[.\s]+$/, '').split(' ');
  const streamed = k < 46 ? 0 : Math.min(words.length, Math.round(((k - 46) / 40) * words.length));
  const answered = k >= 88;
  return (
    <div ref={ref}>
      <Stage className="px-3 pt-16 pb-32 sm:px-10 sm:pt-20 sm:pb-20 lg:px-16">
        <div className="relative mx-auto max-w-[860px]">
          {/* The assistant window */}
          <div className="overflow-hidden rounded-[22px] bg-white shadow-[0_50px_90px_-40px_rgb(20_70_170/0.55),0_0_0_1px_rgb(255_255_255/0.8)]">
            <div className="flex items-center gap-2.5 border-b border-[#efeef6] px-5 py-3.5">
              <AiLogo name="gemini" className="size-5" />
              <span className={`text-[15px] font-semibold ${INK}`}>Gemini</span>
              <span className="flex items-center gap-1 rounded-full bg-[#f1f5fb] px-2 py-0.5 text-[11.5px] font-medium text-[#56627a]"><Globe className="size-3" />Google Search</span>
              <span className={`ml-auto hidden text-[12px] sm:block ${FAINT}`}>Recorded {PROOF_RECORDED_ON}</span>
            </div>
            <div className="min-h-[240px] space-y-5 px-5 py-6 sm:px-7">
              <div className="flex justify-end">
                <p className="max-w-[80%] rounded-[18px] rounded-br-[6px] bg-[#f2f1f9] px-4 py-2.5 text-[15px] leading-snug text-[#201d33]">
                  {typed}{k < 28 && <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[3px] animate-pulse bg-[#201d33]" />}
                </p>
              </div>
              {k >= 30 && (
                <div className="flex gap-3">
                  <AiLogo name="gemini" className={`mt-0.5 size-7 ${searching ? 'animate-spin [animation-duration:2.4s]' : ''}`} />
                  <div className="min-w-0 flex-1">
                    {searching ? (
                      <p className="bg-[linear-gradient(90deg,#9c9ab2,#201d33,#9c9ab2)] bg-[length:200%_100%] bg-clip-text text-[14.5px] font-medium text-transparent [animation:zc-shimmer_1.4s_linear_infinite]">Searching the web…</p>
                    ) : (
                      <p className={`text-[15.5px] leading-relaxed ${INK}`}><Highlighted text={words.slice(0, streamed).join(' ')} />{streamed === words.length && '…'}</p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {HERO_SOURCES.map((d, i) => (
                        <motion.span key={d} initial={false} animate={{ opacity: k >= 32 + i * 3 ? 1 : 0, y: k >= 32 + i * 3 ? 0 : 6 }} transition={SPRING}
                          className="flex items-center gap-1.5 rounded-full bg-[#f5f4fa] py-1 pr-2.5 pl-1 text-[12px] text-[#413d58]">
                          <span className="grid size-[18px] place-items-center rounded-full bg-white text-[10px] font-bold text-brand shadow-sm">{d[0]!.toUpperCase()}</span>{d}
                        </motion.span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="mx-5 mb-5 flex items-center gap-3 rounded-full border border-[#e7e6f1] px-5 py-2.5 sm:mx-7">
              <span className={`flex-1 text-[14px] ${FAINT}`}>Ask Gemini</span>
              <span className="grid size-8 place-items-center rounded-full bg-[#f2f1f9] text-[#5b567a]"><ArrowUp className="size-4" /></span>
            </div>
          </div>

          {/* The buyer's stage */}
          <AnimatePresence mode="popLayout">
            <motion.span key={q.stage} initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={SPRING}
              className="absolute -top-11 left-2 flex items-center gap-2 rounded-full bg-[#0e0b19] py-1.5 pr-3.5 pl-1.5 text-[12.5px] font-medium text-white shadow-[0_14px_30px_-12px_rgb(11_15_25/0.6)] sm:left-0">
              <span className="grid size-6 place-items-center rounded-full bg-white/15"><UserRound className="size-3.5" /></span>A buyer, {q.stage.toLowerCase()}
            </motion.span>
          </AnimatePresence>

          {/* The audit card */}
          <motion.div initial={false} animate={{ opacity: answered ? 1 : 0, y: answered ? 0 : 24, scale: answered ? 1 : 0.96 }} transition={SPRING}
            className="absolute right-3 -bottom-28 w-[290px] rounded-[20px] bg-white/90 p-4 shadow-[0_40px_80px_-30px_rgb(20_70_170/0.7)] ring-1 ring-white backdrop-blur-md sm:-right-10 sm:-bottom-12">
            <div className="flex items-center gap-2">
              <RingTile className="size-7 rounded-[8px]" ring="size-4" />
              <span className={`text-[13.5px] font-semibold ${INK}`}>BrandPulse audit</span>
              <span className={`ml-auto text-[11.5px] ${FAINT}`}>Answer {qi + 1} of 8</span>
            </div>
            <ul className="mt-3 space-y-1.5">
              {q.named.map((n) => (
                <li key={n} className={`flex items-center gap-2 text-[13px] ${INK}`}><span className="grid size-4 place-items-center rounded-full bg-brand text-white"><Check className="size-2.5" strokeWidth={3.5} /></span>{n}<span className={`ml-auto text-[11.5px] ${FAINT}`}>named</span></li>
              ))}
              <li className="flex items-center gap-2 rounded-[10px] bg-[#fff1f0] px-2 py-1.5 text-[13px] font-semibold text-[#d93036]"><span className="grid size-4 place-items-center rounded-full bg-[#d93036] text-white"><X className="size-2.5" strokeWidth={3.5} /></span>The startup we audited<span className="ml-auto text-[11.5px]">not named</span></li>
            </ul>
            <div className="mt-3 flex items-center gap-1">
              {PROOF_QUESTIONS.map((_, i) => <i key={i} className={`h-1.5 flex-1 rounded-full ${i <= qi ? 'bg-[#f2a5a1]' : 'bg-[#eae9f6]'}`} />)}
            </div>
            <p className={`mt-1.5 text-[11.5px] ${FAINT}`}>Named in 0 of {qi + 1} answers so far</p>
          </motion.div>
        </div>
      </Stage>
    </div>
  );
}

/* ===== The fix plan: fixes slide in and stack, each with its impact ===== */

const FIXES = [
  { t: 'Answer page', s: 'For your top missing question', badge: 'High impact' },
  { t: 'Comparison page', s: 'You vs the rival AI names most', badge: 'High impact' },
  { t: 'Listings', s: 'On the sites AI reads', badge: 'Medium' },
];

export function FixStackScene({ className = 'aspect-[4/3]' }: { className?: string }) {
  const [ref, beat] = useStory(7, 900);
  const count = Math.min(beat + 1, FIXES.length);
  const ticked = Math.max(0, beat - 3); // after all three land, tick them off one by one
  return (
    <div ref={ref}>
      <Stage className={className}>
        <span className={`absolute top-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-[#0e0b19] px-3 py-1.5 text-[12px] font-semibold text-white`}>Your fix plan · ranked by impact</span>
        <div className="absolute inset-x-[8%] top-[24%] space-y-2.5">
          {FIXES.map((f, i) => {
            const shown = i < count;
            const done = i < ticked;
            return (
              <motion.div key={f.t} initial={false}
                animate={shown ? { opacity: 1, y: 0, x: 0, scale: LAND } : { opacity: 0, y: 40 + i * 12, x: 0, scale: 0.94 }}
                transition={{ ...SPRING, delay: shown ? 0.05 : 0 }}
                className="flex items-center gap-4 rounded-[20px] bg-white/95 px-5 py-3.5 shadow-[0_26px_44px_-24px_rgb(30_90_190/0.7)]">
                <span className={`grid size-10 shrink-0 place-items-center rounded-full transition-colors duration-500 ${done ? 'bg-presence text-white' : 'bg-[#ebe9fe] text-brand'}`}>
                  {done ? <Check className="size-5" strokeWidth={3} /> : i === 2 ? <Globe className="size-5" /> : i === 1 ? <FileText className="size-5" /> : <Zap className="size-5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[15.5px] font-semibold tracking-[-0.01em] ${INK}`}><span className="text-[#9c9ab2]">{i + 1}.</span> {f.t}</span>
                  <span className={`block truncate text-[13px] ${FAINT}`}>{f.s}</span>
                </span>
                <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${f.badge === 'High impact' ? 'bg-[#e3f6ec] text-presence' : 'bg-[#efeef8] text-[#5b567a]'}`}>{f.badge}</span>
              </motion.div>
            );
          })}
        </div>
      </Stage>
    </div>
  );
}

/* ===== The count: every answer tallied, rival by rival ===== */

export function TallyScene({ className = 'aspect-[4/3]' }: { className?: string }) {
  const [ref, beat] = useStory(13, 520);
  const counted = Math.min(beat, 8);
  return (
    <div ref={ref}>
      <Stage className={className}>
        <span className="absolute top-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold shadow-[0_10px_24px_-12px_rgb(30_90_190/0.6)]">
          {counted < 8 ? <>Counting answer <span className="text-brand tabular-nums">{Math.max(1, counted)}</span> of 8</> : <>All 8 answers counted</>}
        </span>
        <motion.span initial={false} animate={counted >= 8 ? { opacity: 1, scale: LAND, rotate: -6 } : { opacity: 0, scale: 1.4, rotate: -6 }} transition={SPRING}
          className="absolute right-[6%] bottom-[7%] z-20 rounded-[10px] border-2 border-[#d93036] bg-white/90 px-3 py-1 text-[15px] font-bold text-[#d93036]">0 of 8</motion.span>
        <div className="absolute inset-x-[7%] top-[52%] -translate-y-1/2 space-y-2.5">
          {PROOF_TALLY.map((r, ri) => {
            const n = r.subject ? 0 : PROOF_QUESTIONS.slice(0, counted).filter((q) => q.named.includes(r.name)).length;
            return (
              <motion.div key={r.name} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ ...SPRING, delay: ri * 0.08 }}
                className={`flex items-center gap-3 rounded-[16px] px-4 py-3 shadow-[0_18px_32px_-20px_rgb(30_90_190/0.6)] ${r.subject ? 'bg-[#fff6f5] ring-1 ring-[#f4c2bf]' : 'bg-white'}`}>
                <span className={`w-[38%] truncate text-[14px] font-semibold ${r.subject ? 'text-[#d93036]' : INK}`}>{r.subject ? 'The startup we audited' : r.name}</span>
                <span className="flex flex-1 gap-1">
                  {PROOF_QUESTIONS.map((q, qi) => {
                    const lit = !r.subject && qi < counted && q.named.includes(r.name);
                    const miss = r.subject && qi < counted;
                    return <i key={qi} className={`h-2.5 flex-1 rounded-full transition-colors duration-300 ${lit ? 'bg-brand' : miss ? 'bg-[#f4c2bf]' : 'bg-[#eae9f6]'}`} />;
                  })}
                </span>
                <span className={`w-6 text-right text-[18px] font-semibold tabular-nums ${r.subject ? 'text-[#d93036]' : INK}`}>{n}</span>
              </motion.div>
            );
          })}
        </div>
      </Stage>
    </div>
  );
}

/** A small assistant icon on a frosted rim, for decoration around panels. */
export function FrostIcon({ name, className = 'size-[76px]' }: { name: 'chatgpt' | 'gemini' | 'perplexity' | 'claude' | 'copilot' | 'aioverviews'; className?: string }) {
  return <Frost className={className}><AiLogo name={name} className="size-[56%]" /></Frost>;
}
