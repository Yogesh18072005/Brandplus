'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { SiteNav } from '@/components/layout/SiteNav';
import { Footer } from '@/components/layout/Footer';
import { InkButton, RingTile } from '@/components/ui/InkButton';
import { AuditForm } from './AuditForm';
import { AI, AiLogo, type AiKey } from '@/components/brand/AiLogo';
import { FrostIcon, HeroScene, Stage } from './Scenes';
import { PagesScene, QuestionsScene, ReportScene, SourcesScene, TechScene } from './BentoScenes';
import { motion } from 'motion/react';
import Lenis from 'lenis';
import { FREE_PROMPT_COUNT } from '@/lib/marketing/prompt-counts';
import { PROOF_QUESTIONS, PROOF_RECORDED_ON } from '@/lib/marketing/proof-case';
import { CalendarCheck, CalendarClock, Check, FileText, Inbox, Phone, ShieldCheck, Sparkles, Target, TrendingUp, Users } from 'lucide-react';

/*
 * The homepage. Section order, what each shows and how much: HOMEPAGE-DESIGN.md
 * (distilled from the founder's "New Showcase" Figma). Shared grammar:
 *  - Light, airy page; brand blue is the one accent; sky gradients behind the
 *    hero and the closing panel.
 *  - Every section opens with a centred eyebrow pill, a 2-line title with the
 *    key words in blue, and one short grey line.
 *  - Every visual plays itself in a calm loop while on screen (hover pauses).
 * Numbers and quotes come from the real audit of 9 Oct 2026 or a cited source.
 */

const INK = 'text-[#171425]';
const MUTED = 'text-[#524f6d]';
const FAINT = 'text-[#676480]';
const WRAP = 'mx-auto w-full max-w-[1200px] px-4 sm:px-8';
const SECTION = 'pt-24 sm:pt-36';
const CARD = 'rounded-[22px] bg-white ring-1 ring-[#e9e8f2] shadow-[0_30px_60px_-45px_rgb(20_40_80/0.35)]';

/* ---------- Shared pieces ---------- */

/** True once the element has been on screen. */
function useSeen<T extends HTMLElement>(threshold = 0.3) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, seen] as const;
}

function Accent({ children }: { children: ReactNode }) {
  return <span className="text-brand">{children}</span>;
}

/** Rises 32px into place the first time it scrolls into view; `i` staggers siblings. */
function Reveal({ children, i = 0, className = '' }: { children: ReactNode; i?: number; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '0px 0px -10% 0px' }} transition={{ type: 'spring', stiffness: 120, damping: 22, delay: i * 0.1 }}>
      {children}
    </motion.div>
  );
}

/** Lenis smooth scrolling for the homepage (off under reduced motion). */
function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ duration: 1.1, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), anchors: { offset: -80 } });
    let raf = 0;
    const loop = (time: number) => { lenis.raf(time); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); lenis.destroy(); };
  }, []);
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[12.5px] font-semibold text-brand-deep ring-1 ring-[#e4e2f6] shadow-[0_4px_12px_-6px_rgb(40_116_225/0.4)]">{children}</span>;
}

function SectionHead({ title, sub, action }: { title: ReactNode; sub?: ReactNode; action?: ReactNode }) {
  // The agency template's heading: left-aligned, one line, soft ink, any
  // action on the same line to the right. No eyebrow pill, no subtitle wall.
  const [ref, seen] = useSeen<HTMLDivElement>(0.5);
  return (
    <div ref={ref} className={`flex flex-wrap items-end justify-between gap-x-8 gap-y-4 transition-[opacity,translate] duration-700 ease-out motion-reduce:transition-none ${seen ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}>
      <div>
        <h2 className="text-[clamp(28px,3vw,40px)] leading-[1.12] font-semibold tracking-[-0.03em] text-balance text-[#2c2a3a]">{title}</h2>
        {sub && <p className={`mt-2 text-[15px] ${FAINT}`}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/** A glossy blue tile holding a white icon: the site's "3D object". */
function GlossTile({ children, className = 'size-14 rounded-[16px]' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center bg-linear-to-b from-[#756df7] to-[#372ad1] text-white shadow-[0_18px_34px_-14px_rgb(40_116_225/0.85),inset_0_1px_0_rgb(255_255_255/0.5)] ${className}`}>{children}</span>
  );
}

const icon = (d: ReactNode, cls = 'size-[48%]') => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">{d}</svg>
);

const NAMED_PATTERN = /(Plausible Analytics|Fathom Analytics|Abtz Analytics|Matomo|Plausible|Fathom|OpenPanel)/g;
// Separate non-global copy for testing pieces: a /g regex keeps lastIndex between .test() calls.
const IS_NAMED = /^(Plausible Analytics|Fathom Analytics|Abtz Analytics|Matomo|Plausible|Fathom|OpenPanel)$/;

function Quote({ text, className = 'text-[15.5px] leading-relaxed' }: { text: string; className?: string }) {
  return (
    <p className={className}>
      “{text.replace(/[.\s]+$/, '').split(NAMED_PATTERN).map((part, i) => (IS_NAMED.test(part)
        ? <span key={i} className="rounded-[4px] bg-[#f2f0fe] px-1 py-0.5 font-semibold text-brand-deep">{part}</span>
        : <span key={i}>{part}</span>))}…”
    </p>
  );
}

/* ---------- 1. Hero: the promise, then the answer machine ---------- */

function Hero({ onWebsite }: { onWebsite: (site: string) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const site = String(new FormData(event.currentTarget).get('site') ?? '').trim().slice(0, 120);
    onWebsite(site);
    requestAnimationFrame(() => {
      const field = document.getElementById('field-businessName');
      field?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      field?.focus({ preventScroll: true });
    });
  }
  return (
    <section id="top" className="relative isolate overflow-hidden pt-36 pb-10 sm:pt-44">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(120%_70%_at_50%_0%,#cfe0ff_0%,#e8f0ff_38%,#f6f8fb_72%)]" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-[340px] bg-[radial-gradient(40%_60%_at_20%_100%,white,transparent),radial-gradient(45%_70%_at_75%_100%,white,transparent)] opacity-90" />
      <div className={`${WRAP} text-center`}>
        <span className="inline-flex items-center gap-2.5 rounded-full bg-white/80 py-1 pr-3.5 pl-1.5 text-[13px] text-[#413d58] ring-1 ring-white shadow-[0_8px_20px_-12px_rgb(40_116_225/0.5)] backdrop-blur">
          <span className="flex -space-x-1.5">
            {(['chatgpt', 'gemini', 'perplexity'] as AiKey[]).map((k) => <span key={k} className="grid size-6 place-items-center rounded-full bg-white ring-2 ring-white shadow-sm"><AiLogo name={k} className="size-4" /></span>)}
          </span>
          <b className="font-semibold text-[#171425]">Free audit</b> {FREE_PROMPT_COUNT} real buyer questions
        </span>
        <h1 className={`mx-auto mt-7 max-w-[15em] text-[clamp(40px,6.2vw,80px)] leading-[1.03] font-semibold tracking-[-0.045em] text-balance ${INK}`}>
          AI already recommends someone. Make it{' '}
          <span className="whitespace-nowrap"><RingTile className="mx-[0.04em] inline-grid size-[0.82em] translate-y-[0.08em] rounded-[0.22em] align-baseline" ring="size-[0.5em]" /> you.</span>
        </h1>
        <p className={`mx-auto mt-6 max-w-[34em] text-[18px] leading-relaxed text-pretty ${MUTED}`}>
          Buyers ask ChatGPT and Gemini who to choose, and AI names a few businesses. We show you exactly who it names instead of you, then make it name you.
        </p>
        <form onSubmit={submit} className="mx-auto mt-9 flex max-w-[520px] items-center gap-2 rounded-[16px] bg-white p-1.5 pl-5 ring-1 ring-[#e0dff1] shadow-[0_22px_44px_-26px_rgb(40_116_225/0.6)]">
          <label htmlFor="hero-site" className="sr-only">Your website</label>
          <input id="hero-site" name="site" inputMode="url" autoComplete="url" placeholder="yourwebsite.com" className={`min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-[#9c9ab2] ${INK}`} />
          <InkButton type="submit">Get my free audit</InkButton>
        </form>
        <p className={`mt-4 text-[13.5px] ${FAINT}`}>Free. Real answers, word for word. <Link href="/report/sample" className="font-medium text-brand-deep no-underline hover:underline">See a sample report →</Link></p>
      </div>
      <Reveal className={`mx-auto mt-16 w-full max-w-[1280px] px-4 sm:mt-20 sm:px-8`}>
        <div className="rounded-[28px] bg-white/60 p-2 ring-1 ring-white shadow-[0_50px_100px_-50px_rgb(30_90_190/0.6)] backdrop-blur"><HeroScene /></div>
      </Reveal>
    </section>
  );
}

/* ---------- 3. Proof: a bento, like the template's "Scaling Successful Companies" ---------- */

/** A digit that spins through 0–9 a few times, then settles: the template's rolling counter. */
function RollingDigit({ to, on, spins = 2 }: { to: number; on: boolean; spins?: number }) {
  const strip = Array.from({ length: spins * 10 + to + 1 }, (_, k) => k % 10);
  return (
    <span className="relative inline-block h-[1em] overflow-hidden align-top leading-none">
      <motion.span className="flex flex-col" initial={false} animate={{ y: on ? `-${strip.length - 1}em` : 0 }} transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1] }}>
        {strip.map((d, k) => <span key={k} className="block h-[1em] leading-none">{d}</span>)}
      </motion.span>
    </span>
  );
}

const TILE = 'relative overflow-hidden rounded-[16px] bg-white ring-1 ring-[#e9e8f2]';
const GRID_BG = 'bg-[linear-gradient(#f1f3f7_1px,transparent_1px),linear-gradient(90deg,#f1f3f7_1px,transparent_1px)] bg-[size:52px_52px]';

const RIVALS = [
  { name: 'Plausible Analytics', short: 'P', tone: 'from-[#b179eb] to-[#9558d2]', answers: 8, cell: 5 },
  { name: 'Fathom Analytics', short: 'F', tone: 'from-[#3d3a4b] to-[#16141f]', answers: 7, cell: 10 },
  { name: 'Matomo', short: 'M', tone: 'from-[#6a5ce0] to-[#4535c6]', answers: 6, cell: 13 },
];
const ASSISTANTS: AiKey[] = ['chatgpt', 'gemini', 'aioverviews', 'perplexity', 'claude', 'copilot', 'metaai', 'grok'];

function Proof() {
  const [ref, seen] = useSeen<HTMLDivElement>(0.3);
  const ready = PROOF_QUESTIONS[3]!;
  return (
    <section id="proof" className={`${WRAP} scroll-mt-24 ${SECTION}`}>
      <SectionHead title="Gemini’s own words. Not ours." />
      <div ref={ref} className="mt-10 grid gap-3 lg:grid-cols-12 lg:grid-rows-[auto_auto_auto]">
        {/* Who it recommends: the rivals in the grid, one empty place */}
        <div className={`${TILE} ${GRID_BG} flex min-h-[420px] flex-col justify-between p-6 lg:col-span-4 lg:row-span-3`}>
          <div className="grid grid-cols-4 gap-2.5">
            {Array.from({ length: 16 }, (_, k) => {
              const rival = RIVALS.find((r) => r.cell === k);
              const you = k === 7;
              return (
                <motion.div key={k} initial={{ opacity: 0, scale: 0.9 }} animate={seen ? { opacity: 1, scale: 1 } : {}} transition={{ duration: 0.5, ease: [0.65, 0, 0.35, 1], delay: (rival || you ? 0.3 : 0) + k * 0.03 }}
                  className={`relative aspect-square rounded-[12px] ${rival ? `grid place-items-center bg-linear-to-b ${rival.tone} text-[22px] font-semibold text-white shadow-[0_14px_24px_-14px_rgb(20_25_37/0.7)]` : you ? 'grid place-items-center border-2 border-dashed border-[#f0a19d] bg-[#fff6f5] text-[18px] font-bold text-[#d93036]' : 'bg-white/70 ring-1 ring-[#eeeef5]'}`}>
                  {rival && <>{rival.short}<span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-white text-[10.5px] font-bold text-[#171425] shadow">{rival.answers}</span></>}
                  {you && '?'}
                </motion.div>
              );
            })}
          </div>
          <div className="mt-8">
            <p className={`text-[15px] font-medium ${INK}`}>Who Gemini recommends instead</p>
            <InkButton href="#audit" className="mt-3">See who it names for you</InkButton>
          </div>
        </div>

        {/* One huge number */}
        <div className={`${TILE} ${GRID_BG} flex min-h-[300px] flex-col justify-between p-6 lg:col-span-4 lg:row-span-2`}>
          <div>
            <p className={`flex items-baseline text-[clamp(84px,8vw,112px)] leading-none font-medium tracking-[-0.05em] ${INK}`}>
              <RollingDigit to={0} on={seen} spins={3} /><span className="ml-2 text-[0.42em] text-[#b5b3cb]">/ 8</span>
            </p>
            <p className={`mt-3 text-[15px] ${FAINT}`}>Answers that named the startup we audited</p>
          </div>
          <p className={`max-w-[26em] text-[14px] leading-relaxed ${FAINT}`}>A real audit, {PROOF_RECORDED_ON}: eight buyer questions, from a first look to ready to buy. Name hidden, every word real. <Link href="/report/sample" className="font-medium text-brand-deep no-underline hover:underline">Read the full report →</Link></p>
        </div>

        {/* The names it gave instead */}
        <div className={`${TILE} flex flex-wrap content-center gap-2 p-4 lg:col-span-4`}>
          {RIVALS.map((r) => (
            <span key={r.name} className="flex items-center gap-1.5 rounded-[9px] bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-[#2d2a40] ring-1 ring-[#e9e8f2] shadow-sm">
              <span className={`grid size-4 place-items-center rounded-[5px] bg-linear-to-b ${r.tone} text-[9px] font-bold text-white`}>{r.short}</span>{r.name}<span className="text-[#9c9ab2]">{r.answers}/8</span>
            </span>
          ))}
        </div>

        {/* One quote */}
        <figure className={`${TILE} flex flex-col justify-between bg-[radial-gradient(80%_90%_at_100%_0%,#eeecfe,transparent)] p-6 lg:col-span-4`}>
          <AiLogo name="gemini" className="size-7" />
          <blockquote className={`mt-5 text-[15px] leading-relaxed ${MUTED}`}><Quote text={ready.quote} className="contents" /></blockquote>
          <figcaption className={`mt-5 text-[13px] ${FAINT}`}><b className="font-semibold text-[#141925]">— Gemini</b>, to a buyer ready to sign up today</figcaption>
        </figure>

        {/* The assistants we check, like the template's "Technologies we use" */}
        <div className={`${TILE} flex flex-wrap items-center gap-x-5 gap-y-3 p-5 lg:col-span-8`}>
          <p className={`text-[15px] font-medium ${INK}`}>Where your buyers ask</p>
          <ul className="flex flex-wrap gap-2.5">
            {ASSISTANTS.map((k, i) => (
              <motion.li key={k} title={AI[k].name} initial={{ opacity: 0, y: 8 }} animate={seen ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.45, ease: [0.65, 0, 0.35, 1], delay: 0.4 + i * 0.06 }}
                className="grid size-11 place-items-center rounded-[12px] bg-white ring-1 ring-[#eeeef5] shadow-[0_8px_18px_-12px_rgb(20_25_37/0.5)] transition-transform duration-300 hover:-translate-y-0.5">
                <AiLogo name={k} className="size-6" />
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ---------- 6. Done for you: the services bento ---------- */

function Service({ title, text, scene, i, className = '' }: { title: string; text: string; scene: ReactNode; i: number; className?: string }) {
  return (
    <Reveal i={i} className={`flex ${className}`}>
      <article className={`flex flex-1 flex-col p-2 ${CARD}`}>
        {scene}
        <div className="px-4 pt-5 pb-4">
          <h3 className={`text-[18px] font-semibold tracking-[-0.015em] ${INK}`}>{title}</h3>
          <p className={`mt-1.5 text-[14.5px] leading-relaxed ${MUTED}`}>{text}</p>
        </div>
      </article>
    </Reveal>
  );
}

function Services() {
  return (
    <section id="how" className={`${WRAP} scroll-mt-24 ${SECTION}`}>
      <SectionHead title="Your AI visibility team, without the hire" action={<InkButton href="#audit">Get my free audit</InkButton>} />
      <div className="mt-10 grid gap-3 lg:grid-cols-12">
        <Service i={0} className="lg:col-span-7" title="Answer pages AI can quote" text="Written for the exact questions you’re missing from. You approve every page before it goes live." scene={<PagesScene className="aspect-[16/10] lg:aspect-auto lg:h-[340px]" />} />
        <Service i={1} className="lg:col-span-5" title="A re-check every month" text="Your audit questions, asked the same way every month. You see exactly what changed." scene={<ReportScene className="aspect-[16/10] lg:aspect-auto lg:h-[340px]" />} />
        <Service i={0} className="lg:col-span-4" title="Listed where AI reads" text="The review sites and directories AI trusts in your category." scene={<SourcesScene />} />
        <Service i={1} className="lg:col-span-4" title="Your buyers’ real questions" text="From a first look to ready to buy, tracked every month." scene={<QuestionsScene />} />
        <Service i={2} className="lg:col-span-4" title="Technical fixes" text="Crawler access, schema and llms.txt, so AI can read what you sell." scene={<TechScene />} />
      </div>
    </section>
  );
}

/* ---------- 4. BrandPulse vs a traditional SEO agency, with how it works beneath ---------- */

const VERSUS: { label: string; icon: ReactNode; us: string; them: string }[] = [
  { label: 'Goal', icon: <Target className="size-4" />, us: 'Get you named in AI answers', them: 'Rankings on a search results page' },
  { label: 'Proof', icon: <ShieldCheck className="size-4" />, us: 'The real answers, word for word, before you pay', them: 'Traffic charts after you’ve paid' },
  { label: 'The work', icon: <FileText className="size-4" />, us: 'Pages written to be quoted by AI', them: 'Blog posts written for keywords' },
  { label: 'Measurement', icon: <TrendingUp className="size-4" />, us: 'The same buyer questions, re-asked monthly', them: 'Rank trackers and keyword tools' },
  { label: 'Who you talk to', icon: <Users className="size-4" />, us: 'The people doing the work', them: 'An account manager' },
  { label: 'Commitment', icon: <CalendarClock className="size-4" />, us: 'Month to month', them: '6 to 12 month contracts' },
];

const STEPS: { title: string; text: string; icon: ReactNode }[] = [
  { title: 'Free audit, in a day', text: 'Real answers about your business, and who AI names instead of you.', icon: <Inbox className="size-5" /> },
  { title: 'A 15-minute walkthrough', text: 'What the answers mean, and your fix plan in order. Yours to keep.', icon: <CalendarCheck className="size-5" /> },
  { title: 'We do the work, if you want', text: 'One fixed monthly price. You approve every page.', icon: <Sparkles className="size-5" /> },
];

function Versus() {
  return (
    <section id="steps" className={`${WRAP} scroll-mt-24 ${SECTION}`}>
      <SectionHead title="BrandPulse vs a traditional SEO agency" />
      <Reveal className="mt-10">
        <div className="overflow-x-auto rounded-[18px] bg-white ring-1 ring-[#e9e8f2]">
          <div className="min-w-[680px] p-2">
            <div className="grid grid-cols-[0.8fr_1.2fr_1.2fr] items-center">
              <div className="rounded-t-[12px] bg-[#f6f6f9] py-4" />
              <p className={`flex items-center gap-2 px-6 text-[14.5px] font-semibold ${INK}`}><RingTile className="size-6 rounded-[7px]" ring="size-3.5" />BrandPulse</p>
              <p className={`px-6 text-[14.5px] ${FAINT}`}>Traditional SEO agency</p>
            </div>
            {VERSUS.map((r) => (
              <div key={r.label} className="grid grid-cols-[0.8fr_1.2fr_1.2fr] items-stretch border-t border-[#eeeef5]">
                <p className={`flex items-center gap-2.5 bg-[#f6f6f9] px-5 py-4 text-[14.5px] ${INK}`}><span className="text-[#5b567a]">{r.icon}</span>{r.label}</p>
                <p className={`flex items-center gap-2.5 px-6 py-4 text-[14.5px] font-medium ${INK}`}><span className="grid size-[18px] shrink-0 place-items-center rounded-full bg-presence-bright text-white"><Check className="size-3" strokeWidth={3.5} /></span>{r.us}</p>
                <p className="flex items-center gap-2.5 px-6 py-4 text-[14.5px] text-[#413d58]"><span className="size-[18px] shrink-0 rounded-full bg-[#f5b400]/90 ring-4 ring-[#f5b400]/15" />{r.them}</p>
              </div>
            ))}
            <div className="grid grid-cols-[0.8fr_1.2fr_1.2fr] items-center border-t border-[#eeeef5]">
              <p className={`flex items-center gap-2.5 rounded-b-[12px] bg-[#f6f6f9] px-5 py-5 text-[14.5px] ${INK}`}><span className="text-[#5b567a]"><Phone className="size-4" /></span>Always free</p>
              <div className="px-6 py-3"><InkButton href="#audit">Get my free audit</InkButton></div>
              <p className={`px-6 text-[13.5px] ${FAINT}`}>Paid audit, then a long contract</p>
            </div>
          </div>
        </div>
      </Reveal>
      <ol className="mt-3 grid gap-3 md:grid-cols-3" aria-label="How it works">
        {STEPS.map((s, i) => (
          <Reveal key={s.title} i={i} className="flex">
            <li className="group flex flex-1 flex-col items-center rounded-[16px] bg-white px-6 py-7 text-center ring-1 ring-[#e9e8f2]">
              <span className="text-brand transition-transform duration-500 ease-[cubic-bezier(.65,0,.35,1)] group-hover:-translate-y-0.5 group-hover:rotate-[-8deg]">{s.icon}</span>
              <h3 className={`mt-3 text-[16.5px] font-semibold tracking-[-0.01em] ${INK}`}><span className="mr-1.5 text-[#b5b3cb] tabular-nums">0{i + 1}</span>{s.title}</h3>
              <p className={`mt-1.5 max-w-[24em] text-[14px] leading-relaxed ${FAINT}`}>{s.text}</p>
            </li>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

/* ---------- 12. FAQ ---------- */

const FAQS: [string, string][] = [
  ['What is BrandPulse?', 'An agency for AI visibility. When people ask ChatGPT, Gemini or Perplexity who to choose, we work to make your business part of the answer. It starts with a free audit, and we do the work if you want us to.'],
  ['What if AI already recommends us?', 'Then the audit says so, for free, and shows you the buyer questions where you are still missing. Either way you leave knowing exactly where you stand.'],
  ['Why trust a new agency over an established one?', 'Because you see the proof before you pay: the real answers about your business, word for word. And you work directly with the people doing the work, month to month.'],
  ['What does the free audit include?', `We ask AI ${FREE_PROMPT_COUNT} questions your buyers actually ask, record every answer, and send you a report: where you appear, who gets named instead of you, the sites AI trusts, and the first thing to fix.`],
  ['Which AI assistants do you check?', 'We measure Google Gemini with live Google Search on every audit, and check your key questions in ChatGPT while we work. More assistants as you need them.'],
  ['How much does the done-for-you work cost?', 'Agreed before you start. One fixed monthly price, based on how much your audit shows there is to fix. It is month to month: if the re-checks don’t move, you stop paying.'],
  ['How long until AI starts naming us?', 'Technical fixes and listings can change answers within weeks. Pages and reviews build over three to six months. We re-check the same questions every month, so you see the trend yourself.'],
  ['Can anyone guarantee AI will recommend us?', 'No, and be wary of anyone who does. AI answers vary between runs and people. We guarantee the work, the honesty, and the same measurement every month.'],
];

function Faq() {
  return (
    <section id="faq" className={`${WRAP} scroll-mt-24 ${SECTION}`}>
      <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div>
          <SectionHead title="Frequently asked questions" sub="Something else? Ask on your free 15-minute walkthrough." />
          <div className={`mt-8 p-6 ${CARD}`}>
            <GlossTile className="size-11 rounded-[13px]">{icon(<path d="M4 5h16v11H9l-5 4z" />)}</GlossTile>
            <h3 className={`mt-4 text-[18px] font-semibold tracking-[-0.015em] ${INK}`}>Want to see your own answers?</h3>
            <p className={`mt-1.5 text-[14.5px] leading-relaxed ${MUTED}`}>Send us your website. We ask AI what your buyers ask and show you what it says.</p>
            <InkButton href="#audit" className="mt-5">Get my free audit</InkButton>
          </div>
        </div>
        <div className="space-y-3">
          {FAQS.map(([q, a], i) => (
            <details key={q} className={`group/faq px-6 ${CARD} rounded-[18px]`} open={i === 0}>
              <summary className={`flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[16px] font-medium ${INK} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [&::-webkit-details-marker]:hidden`}>
                {q}
                <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-[#f2f1f9] text-[#413d58] transition-transform duration-200 group-open/faq:rotate-45 motion-reduce:transition-none">+</span>
              </summary>
              <p className={`pr-10 pb-6 text-[15px] leading-relaxed ${MUTED}`}>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- 13. Closing panel: the form ---------- */

const FLOAT: { k: 'chatgpt' | 'gemini' | 'perplexity' | 'claude'; cls: string }[] = [
  { k: 'chatgpt', cls: 'top-[12%] left-[6%]' },
  { k: 'gemini', cls: 'top-[30%] right-[7%] [animation-delay:-1.5s]' },
  { k: 'perplexity', cls: 'bottom-[22%] left-[9%] [animation-delay:-3s]' },
  { k: 'claude', cls: 'top-[10%] right-[22%] [animation-delay:-2s]' },
];

function Closing({ website }: { website: string }) {
  return (
    <section id="audit" className={`${WRAP} scroll-mt-20 ${SECTION}`}>
      <div className="relative isolate overflow-hidden rounded-[34px] bg-[radial-gradient(110%_80%_at_50%_0%,#cfe0ff_0%,#e9f1ff_45%,#f7faff_100%)] px-4 py-16 ring-1 ring-[#e4e2f6] sm:px-10 sm:py-20">
        {FLOAT.map((f) => (
          <span key={f.k} aria-hidden="true" className={`zc-bob absolute hidden lg:block ${f.cls}`}><FrostIcon name={f.k} /></span>
        ))}
        <div className="mx-auto max-w-[720px] text-center">
          <Eyebrow>Free audit</Eyebrow>
          <h2 className={`mt-5 text-[clamp(32px,4vw,54px)] leading-[1.06] font-semibold tracking-[-0.04em] ${INK}`}>See what AI says <Accent>about you.</Accent></h2>
          <p className={`mx-auto mt-4 max-w-[32em] text-[17px] leading-relaxed ${MUTED}`}>{FREE_PROMPT_COUNT} questions your buyers ask, every answer word for word, who gets named instead of you, and your first fix. In your inbox within one working day.</p>
        </div>
        <div className="relative mx-auto mt-10 max-w-[760px] rounded-[24px] bg-white p-6 shadow-[0_40px_80px_-50px_rgb(16_85_197/0.7)] ring-1 ring-[#e9e8f2] sm:p-8">
          <AuditForm website={website} />
        </div>
        <p className={`mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[14px] ${MUTED}`}>
          <Link href="/methodology" className="font-semibold text-brand-deep no-underline hover:text-brand">How we measure →</Link>
          <Link href="/sign-in" className="no-underline hover:underline">Already have an account? Log in</Link>
        </p>
      </div>
    </section>
  );
}

export function SignalLanding() {
  const [website, setWebsite] = useState('');
  useSmoothScroll();
  return (
    <div className="min-h-screen bg-[#f6f6fb] font-sans antialiased">
      <SiteNav />
      <main>
        <Hero onWebsite={setWebsite} />
        <Services />
        <Proof />
        <Versus />
        <Faq />
        <Closing website={website} />
      </main>
      <Footer cta={false} wordmark />
    </div>
  );
}
