'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Block, IsoCard, Platform, SceneButton, Slot, prefersReducedMotion } from './Iso';
import { AssistantTile } from './HeroHeadline';
import { PROOF_QUESTIONS, PROOF_RECORDED_ON, PROOF_SOURCES, PROOF_TALLY } from '@/lib/marketing/proof-case';

/*
 * The homepage's bento scenes. Rules (see memory: design-quality-bar):
 *  - Every card plays its own demonstration by itself, in a calm loop, while
 *    it is on screen. Hover pauses it; clicking is an optional extra.
 *  - Every card has its own visual form. The isometric platform is used only
 *    for the two bookends of the story (missing → named).
 *  - Reduced motion: each card shows its finished state, no loop.
 * Data is from the real audit of 9 Oct 2026 unless a card says "example".
 */

const SHORT: Record<string, string> = { 'Plausible Analytics': 'Plausible', 'Fathom Analytics': 'Fathom', Matomo: 'Matomo' };
const BRANDS = ['Plausible Analytics', 'Fathom Analytics', 'Matomo'];
const INK = 'text-[#171425]';
const FAINT = 'text-[#676480]';
export const GLASS = 'rounded-[18px] bg-white/90 ring-1 ring-white shadow-[0_24px_50px_-24px_rgb(40_116_225/0.55),0_2px_6px_-2px_rgb(20_25_37/0.08)] backdrop-blur';
const SURFACE = 'rounded-[14px] border border-[#e7e6ee] bg-white shadow-[0_18px_40px_-30px_rgb(20_25_37/0.5)]';

/** On screen right now (not "once"). Loops only run while this is true. */
export function useVisible<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const io = new IntersectionObserver(([e]) => setVisible(Boolean(e?.isIntersecting)), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, visible] as const;
}

/** Steps 0..n-1 every `ms` while `run`; reduced motion parks on `rest`. */
export function useLoop(n: number, ms: number, run: boolean, rest = n - 1) {
  const [i, setI] = useState(0);
  const reduced = useRef(false);
  useEffect(() => { reduced.current = prefersReducedMotion(); if (reduced.current) setI(rest); }, [rest]);
  useEffect(() => {
    if (!run || reduced.current) return;
    const id = setInterval(() => setI((v) => (v + 1) % n), ms);
    return () => clearInterval(id);
  }, [run, n, ms]);
  return [i, setI] as const;
}

/** Wraps a scene so hovering pauses its loop. */
export function Pause({ onChange, children }: { onChange: (paused: boolean) => void; children: ReactNode }) {
  return <div className="w-full" onMouseEnter={() => onChange(true)} onMouseLeave={() => onChange(false)}>{children}</div>;
}

/* ===== 1. Ask again, still not named (isometric bookend: the empty slot) ===== */

const SPOTS: [number, number][] = [[0.8, 0.8], [4.8, 0.8], [0.8, 3.3], [4.8, 3.3]];

export function AskAgainCard({ bare = false }: { bare?: boolean } = {}) {
  const [ref, visible] = useVisible<HTMLDivElement>();
  const [paused, setPaused] = useState(false);
  const [q, setQ] = useLoop(PROOF_QUESTIONS.length, 3800, visible && !paused, 3);
  const question = PROOF_QUESTIONS[q]!;
  const rot = q % 4;
  const spotOf = (i: number) => SPOTS[(rot + i) % 4]!;
  const order = [...question.named, ...BRANDS.filter((b) => !question.named.includes(b))];
  return (
    <IsoCard
      bare={bare}
      sceneRef={ref}
      title="Ask it any way. Still not named."
      text={`All eight real buyer questions, asked to Gemini on ${PROOF_RECORDED_ON}. The rivals swap places. The startup never shows up.`}
      readout={<span className="line-clamp-2"><b className="font-semibold text-[#171425]">{question.stage}:</b> “{question.text}”</span>}
      controls={<><span className="mr-1 text-[12px] text-[#676480] tabular-nums">Question {q + 1} of 8</span><SceneButton onClick={() => setQ((v) => (v + 1) % 8)}>Next →</SceneButton></>}
    >
      <Pause onChange={setPaused}>
        <div className="grid place-items-center">
          <Platform cols={9} rows={6}>
            {order.map((brand, i) => {
              const [x, y] = spotOf(i);
              const named = question.named.includes(brand);
              return <Block key={brand} x={x} y={y} w={3.4} d={1.9} h={named ? 18 : 1} tone={named ? 'white' : 'ghost'} label={SHORT[brand]} size={11} />;
            })}
            <Slot x={spotOf(3)[0]} y={spotOf(3)[1]} w={3.4} d={1.9} label="the startup" hot />
          </Platform>
        </div>
      </Pause>
    </IsoCard>
  );
}

/* ===== 2. The tally, counted question by question (dot matrix) ===== */

export function ColumnsCard({ bare = false }: { bare?: boolean } = {}) {
  const [ref, visible] = useVisible<HTMLDivElement>();
  const [paused, setPaused] = useState(false);
  // Steps 0..9: 0 = empty, 1..8 = questions counted, 9 = hold on the result.
  const [step] = useLoop(10, 650, visible && !paused, 9);
  const counted = Math.min(step, 8);
  const rows = PROOF_TALLY;
  const namedIn = (name: string) => PROOF_QUESTIONS.slice(0, counted).filter((q) => q.named.includes(name)).length;
  return (
    <IsoCard
      bare={bare}
      dark
      sceneRef={ref}
      title="Named in 0 of 8 answers."
      text="We counted every answer. Three rivals, again and again. The startup we audited: never."
      readout={counted < 8 ? `Counting answer ${Math.max(1, counted)} of 8…` : <span className="text-[#ff8a80]">Final count: the startup was named 0 times.</span>}
    >
      <Pause onChange={setPaused}>
        <div className="mx-auto w-full max-w-[420px] space-y-3.5 px-2">
          {rows.map((r) => {
            const n = r.subject ? 0 : namedIn(r.name);
            return (
              <div key={r.name} className="grid grid-cols-[92px_1fr_28px] items-center gap-3">
                <span className={`truncate text-[13px] ${r.subject ? 'font-semibold text-[#ff8a80]' : 'text-white/80'}`}>{r.subject ? 'The startup' : SHORT[r.name]}</span>
                <div className="grid grid-cols-8 gap-1.5">
                  {PROOF_QUESTIONS.map((q, qi) => {
                    const lit = !r.subject && qi < counted && q.named.includes(r.name);
                    const missedNow = r.subject && qi < counted;
                    return <i key={qi} className={`aspect-square rounded-full transition-[background-color,scale] duration-300 ${lit ? 'scale-100 bg-[#9e97fa]' : missedNow ? 'scale-75 border border-[#ff8a80]/70' : 'scale-75 bg-white/10'}`} />;
                  })}
                </div>
                <span className={`text-right text-[14px] font-semibold tabular-nums ${r.subject ? 'text-[#ff8a80]' : 'text-white'}`}>{n}</span>
              </div>
            );
          })}
        </div>
      </Pause>
    </IsoCard>
  );
}

/* ===== 3. Questions typed into an AI search bar ===== */

export function QuestionStackCard() {
  const [ref, visible] = useVisible<HTMLDivElement>();
  const [paused, setPaused] = useState(false);
  const [c] = useLoop(PROOF_QUESTIONS.length, 2600, visible && !paused, 3);
  const n = PROOF_QUESTIONS.length;
  return (
    <IsoCard sky sceneRef={ref} title="Your buyers’ real questions" text="The exact questions people type before they choose, from first look to ready to buy.">
      <Pause onChange={setPaused}>
        <div className="relative h-[230px] w-full [perspective:900px]">
          {PROOF_QUESTIONS.map((q, k) => {
            let d = k - c;
            if (d > n / 2) d -= n;
            if (d < -n / 2) d += n;
            const far = Math.abs(d) > 2;
            return (
              <div
                key={q.text}
                className={`absolute top-1/2 left-1/2 w-[210px] p-4 transition-[transform,opacity] duration-700 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none ${GLASS}`}
                style={{ transform: `translate(-50%, -50%) translateX(${d * 158}px) rotateY(${d * -24}deg) scale(${d === 0 ? 1 : 0.82})`, opacity: far ? 0 : d === 0 ? 1 : 0.65, zIndex: 10 - Math.abs(d) }}
              >
                <span className="rounded-full bg-[#f2f0fe] px-2 py-0.5 text-[11px] font-semibold text-brand-deep">{q.stage}</span>
                <p className={`mt-2.5 line-clamp-3 text-[13px] leading-snug ${INK}`}>{q.text}</p>
              </div>
            );
          })}
        </div>
      </Pause>
    </IsoCard>
  );
}

/* ===== 4. Sources orbiting Gemini ===== */

const ORBIT = PROOF_SOURCES.slice(0, 6);

export function SourcesCard() {
  const [ref, visible] = useVisible<HTMLDivElement>();
  const [paused, setPaused] = useState(false);
  const [i] = useLoop(ORBIT.length, 1900, visible && !paused, 0);
  const active = ORBIT[i]!;
  const spin = paused ? '[animation-play-state:paused]' : '';
  return (
    <IsoCard
      sky
      sceneRef={ref}
      title="Who AI trusts in your category"
      text="The websites Gemini read before answering. Being on them, or like them, is how a business gets named."
      readout={<><b className="font-semibold text-[#171425]">{active.domain}</b>: read in {active.answers} of 8 answers.</>}
    >
      <Pause onChange={setPaused}>
        <div className="relative mx-auto size-[230px]">
          <svg aria-hidden="true" viewBox="0 0 230 230" className="absolute inset-0"><circle cx="115" cy="115" r="92" fill="none" stroke="#c6c3f3" strokeDasharray="3 6" /></svg>
          <div className={`absolute inset-0 animate-[spin_48s_linear_infinite] motion-reduce:animate-none ${spin}`}>
            {ORBIT.map((s, k) => {
              const angle = (k / ORBIT.length) * Math.PI * 2;
              const on = k === i;
              return (
                <span key={s.domain} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${(50 + Math.cos(angle) * 40).toFixed(2)}%`, top: `${(50 + Math.sin(angle) * 40).toFixed(2)}%` }}>
                  <span className={`block animate-[spin_48s_linear_infinite_reverse] rounded-full px-2.5 py-1 text-[11px] whitespace-nowrap transition-[background-color,color,box-shadow] duration-500 motion-reduce:animate-none ${spin} ${on ? 'bg-brand text-white shadow-[0_10px_24px_-8px_rgb(40_116_225/0.8)]' : 'bg-white/90 text-[#413d58] ring-1 ring-white shadow-[0_8px_18px_-10px_rgb(40_116_225/0.5)]'}`}>{s.domain}</span>
                </span>
              );
            })}
          </div>
          <span className={`absolute top-1/2 left-1/2 grid size-[78px] -translate-x-1/2 -translate-y-1/2 place-items-center ${GLASS} rounded-[24px]`}>
            <AssistantTile name="gemini" className="size-11 rounded-[13px]" />
          </span>
        </div>
      </Pause>
    </IsoCard>
  );
}

/* ===== 5. Fixes that rank themselves ===== */

const FIXES = [
  { what: 'Answer page: analytics without a cookie banner', why: 'A buyer asked exactly this', impact: 92 },
  { what: 'Comparison page vs Plausible', why: 'Named in 8 of 8 answers', impact: 74 },
  { what: 'Get listed on G2', why: 'Gemini read it before answering', impact: 51 },
];
const SHUFFLED = [2, 0, 1];

export function FixRankCard({ bare = false }: { bare?: boolean } = {}) {
  const [ref, visible] = useVisible<HTMLDivElement>();
  const [paused, setPaused] = useState(false);
  const [phase] = useLoop(2, 2600, visible && !paused, 1);
  const order = phase === 1 ? [0, 1, 2] : SHUFFLED;
  return (
    <IsoCard
      bare={bare}
      sceneRef={ref}
      title="Your first fix, ranked"
      text="Every fix ranked by how much it could change the answer. The plan is yours to keep, whether or not you hire us."
      readout={phase === 1 ? 'Ranked by impact. Fix 1 first.' : 'Ranking your fixes…'}
    >
      <Pause onChange={setPaused}>
        <div className="relative mx-auto h-[186px] w-full max-w-[380px] px-3">
          {FIXES.map((f, k) => (
            <div key={f.what} className={`absolute inset-x-3 flex items-center gap-3 p-3 transition-[top,background-color] duration-700 ease-[cubic-bezier(.2,.8,.2,1)] ${SURFACE}`} style={{ top: order.indexOf(k) * 62 }}>
              <span className={`grid size-7 shrink-0 place-items-center rounded-[8px] text-[12.5px] font-bold transition-colors ${phase === 1 && k === 0 ? 'bg-brand text-white' : 'bg-[#efeef6] text-[#413d58]'}`}>{order.indexOf(k) + 1}</span>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-[13px] font-semibold ${INK}`}>{f.what}</p>
                <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-[#efeef6]"><i className="block h-full rounded-full bg-brand/70" style={{ width: `${f.impact}%` }} /></span>
              </div>
            </div>
          ))}
        </div>
      </Pause>
    </IsoCard>
  );
}

/* ===== 6. A comparison table that walks its rows ===== */

const ROWS = [
  { key: 'Setup time', you: '2 min', them: '15 min' },
  { key: 'Free plan', you: 'Yes', them: 'No' },
  { key: 'Cookie banner', you: 'Not needed', them: 'Not needed' },
  { key: 'Self-hosting', you: 'Yes', them: 'Yes' },
];

export function CompareCard({ bare = false }: { bare?: boolean } = {}) {
  const [ref, visible] = useVisible<HTMLDivElement>();
  const [paused, setPaused] = useState(false);
  const [r] = useLoop(ROWS.length, 1700, visible && !paused, 0);
  return (
    <IsoCard
      bare={bare}
      sceneRef={ref}
      title="Comparison pages"
      text="Honest “you vs them” pages for the rivals AI names instead of you. Where they win, the page says so too."
      readout="Example: a comparison page, written to be quoted."
    >
      <Pause onChange={setPaused}>
        <div className={`mx-auto w-full max-w-[440px] overflow-hidden ${SURFACE}`}>
          <div className="flex items-center justify-between border-b border-[#efeef4] px-4 py-2.5">
            <p className={`text-[13.5px] font-semibold ${INK}`}>You vs Plausible Analytics</p>
            <span className={`text-[11.5px] ${FAINT}`}>yoursite.com/vs/plausible</span>
          </div>
          <div className="grid grid-cols-[1.3fr_1fr_1fr] px-4 pt-2 pb-1 text-[11.5px] font-medium text-[#8c8ba3]"><span /><span>You</span><span>Them</span></div>
          {ROWS.map((row, k) => (
            <div key={row.key} className={`grid grid-cols-[1.3fr_1fr_1fr] px-4 py-2 text-[13px] transition-colors duration-300 ${k === r ? 'bg-[#f2f0fe]' : ''}`}>
              <span className={FAINT}>{row.key}</span>
              <span className={`font-semibold ${k === r ? 'text-brand-deep' : INK}`}>{row.you}</span>
              <span className="text-[#524f6d]">{row.them}</span>
            </div>
          ))}
        </div>
      </Pause>
    </IsoCard>
  );
}

/* ===== 7. A cursor approves the page by itself ===== */

const PAGE_TITLE = 'How to track visitors without a cookie banner';

export function ApproveCard() {
  const [ref, visible] = useVisible<HTMLDivElement>();
  const [paused, setPaused] = useState(false);
  // 0 writing, 1 cursor moves, 2 clicked/approved, 3 live (hold)
  const [phase] = useLoop(4, 1500, visible && !paused, 3);
  const approved = phase >= 2;
  return (
    <IsoCard
      sky
      sceneRef={ref}
      title="Answer pages"
      text="Written for the exact questions you were missing from. Nothing goes live until you approve it."
      readout={approved ? <span className="text-[#17784e]">Approved. Live on yoursite.com/guides.</span> : 'Draft ready for your review.'}
    >
      <Pause onChange={setPaused}>
        <div className={`relative mx-auto w-full max-w-[400px] p-4 ${GLASS}`}>
          <p className={`text-[11.5px] ${FAINT}`}>Draft · answer page</p>
          <p className={`mt-1 text-[15px] leading-snug font-semibold ${INK}`}>{PAGE_TITLE}</p>
          <div className="mt-3 space-y-1.5">
            {[100, 90, 96, 72].map((w, k) => (
              <i key={k} className="block h-1.5 origin-left rounded-full bg-[#ededf4] transition-[scale] duration-500" style={{ width: `${w}%`, scale: phase === 0 && k > 1 ? '0.2 1' : '1 1', transitionDelay: `${k * 120}ms` }} />
            ))}
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <span className={`text-[12px] ${FAINT}`}>{approved ? 'Live' : 'Waiting for you'}</span>
            <span className={`rounded-[9px] px-3 py-1.5 text-[12.5px] font-semibold transition-all duration-300 ${approved ? 'scale-100 bg-presence-bright text-white' : phase === 1 ? 'scale-95 bg-[#0e0b19] text-white' : 'bg-[#0e0b19] text-white'}`}>{approved ? '✓ Approved' : 'Approve'}</span>
          </div>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute size-5 drop-shadow transition-all duration-[900ms] ease-[cubic-bezier(.2,.8,.2,1)]" style={{ left: phase >= 1 ? 'calc(100% - 52px)' : '30%', top: phase >= 1 ? 'calc(100% - 30px)' : '40%', opacity: phase === 3 ? 0 : 1 }}>
            <path d="M4 3l14 7-6 2-2 6z" fill="#0e0b19" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </div>
      </Pause>
    </IsoCard>
  );
}

/* ===== 8. Listings moving through statuses ===== */

const SITES = ['G2', 'Capterra', 'Product Hunt'];
const STATUS = ['Drafting', 'Submitted', 'Live'];

export function ListingsCard() {
  const [ref, visible] = useVisible<HTMLDivElement>();
  const [paused, setPaused] = useState(false);
  // Each tick advances one site by one status; 9 ticks fill all three.
  const [tick] = useLoop(10, 700, visible && !paused, 9);
  const stageOf = (k: number) => Math.max(0, Math.min(3, tick - k * 3 + 1));
  const live = SITES.filter((_, k) => stageOf(k) >= 3).length;
  return (
    <IsoCard
      sceneRef={ref}
      title="Listings where AI looks"
      text="The review sites and directories AI reads before answering, filled in properly."
      readout={`${live} of 3 listings live.`}
    >
      <Pause onChange={setPaused}>
        <ul className="mx-auto w-full max-w-[360px] space-y-2 px-3">
          {SITES.map((s, k) => {
            const st = stageOf(k);
            return (
              <li key={s} className={`flex items-center gap-3 p-3 ${SURFACE}`}>
                <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-[#f3f3f8] text-[11px] font-bold text-[#413d58]">{s === 'Product Hunt' ? 'PH' : s.slice(0, 2)}</span>
                <span className={`text-[14px] font-medium ${INK}`}>{s}</span>
                <span className={`ml-auto rounded-full px-2 py-0.5 text-[11.5px] font-semibold transition-colors duration-300 ${st >= 3 ? 'bg-presence/10 text-presence' : st >= 1 ? 'bg-[#f2f0fe] text-brand-deep' : 'bg-[#f3f3f8] text-[#8c8ba3]'}`}>
                  {st >= 3 ? '✓ Live' : st >= 1 ? STATUS[st - 1] : 'To do'}
                </span>
              </li>
            );
          })}
        </ul>
      </Pause>
    </IsoCard>
  );
}

/* ===== 9. robots.txt, fixed in a terminal ===== */

const LINES = [
  { t: '# robots.txt', c: 'text-white/40' },
  { t: 'User-agent: GPTBot', c: 'text-[#9e97fa]' },
];

export function CrawlerCard() {
  const [ref, visible] = useVisible<HTMLDivElement>();
  const [paused, setPaused] = useState(false);
  // 0 blocked, 1 allowed, 2..4 checks pass, 5 hold
  const [step] = useLoop(6, 900, visible && !paused, 5);
  const allowed = step >= 1;
  const checks = ['robots.txt', 'Schema', 'llms.txt'];
  return (
    <IsoCard
      sky
      sceneRef={ref}
      title="Technical fixes"
      text="Crawler access, structured data and llms.txt, so AI can actually read what you sell."
    >
      <Pause onChange={setPaused}>
        <div className="flex flex-col items-center gap-5">
          <span className={`relative grid size-[96px] place-items-center rounded-[28px] transition-[background-color,box-shadow] duration-500 ${allowed ? 'bg-linear-to-b from-[#756df7] to-[#372ad1] shadow-[0_26px_50px_-18px_rgb(40_116_225/0.85),inset_0_1px_0_rgb(255_255_255/0.5)]' : 'bg-linear-to-b from-white to-[#e9e8f7] shadow-[0_20px_40px_-20px_rgb(20_25_37/0.35),inset_0_1px_0_white]'}`}>
            <svg viewBox="0 0 24 24" aria-hidden="true" className={`size-11 transition-colors duration-500 ${allowed ? 'text-white' : 'text-[#9c9ab2]'}`} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="8" width="16" height="11" rx="3" /><path d="M12 8V5M9 13h.01M15 13h.01M9.5 16h5" /><circle cx="12" cy="4" r="1" />
            </svg>
            <span className={`absolute -top-2 -right-3 rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-sm transition-colors duration-300 ${allowed ? 'bg-white text-[#17784e]' : 'bg-white text-[#d93036]'}`}>{allowed ? 'Allowed' : 'Blocked'}</span>
          </span>
          <div className="flex flex-wrap justify-center gap-1.5">
            {checks.map((c, k) => (
              <span key={c} className={`rounded-full px-2.5 py-1 text-[12px] font-medium transition-all duration-300 ${step >= k + 2 ? 'bg-white text-[#17784e] shadow-[0_8px_18px_-10px_rgb(40_116_225/0.5)]' : 'bg-white/50 text-[#9c9ab2]'}`}>{step >= k + 2 ? '✓ ' : ''}{c}</span>
            ))}
          </div>
        </div>
      </Pause>
    </IsoCard>
  );
}

/* ===== 10. Months: the empty slot fills (isometric bookend) ===== */

const MONTHS = [
  { label: 'Month 1', read: 'Month 1: the startup isn’t in the answer.', get: 'Audit, fix plan, first pages drafted' },
  { label: 'Month 2', read: 'Month 2: pages approved and live. AI starts reading them.', get: 'Pages live, crawler access fixed' },
  { label: 'Month 3', read: 'Month 3: named in the answer. (Illustration: real results vary, and we show them either way.)', get: 'Same questions re-asked, change reported' },
];

export function MonthsCard({ footer }: { footer?: ReactNode } = {}) {
  const [ref, visible] = useVisible<HTMLDivElement>();
  const [paused, setPaused] = useState(false);
  const [m, setM] = useLoop(3, 2400, visible && !paused, 2);
  return (
    <IsoCard
      fill
      footer={footer}
      className="h-full"
      sky
      sceneRef={ref}
      title="Same questions, every month"
      text="We re-ask your audit questions the same way and show you what changed."
      readout={MONTHS[m]!.read}
      controls={MONTHS.map((x, i) => <SceneButton key={x.label} active={m === i} onClick={() => setM(i)}>{x.label}</SceneButton>)}
    >
      <Pause onChange={setPaused}>
        <div className="flex flex-col items-center">
          <Platform cols={9} rows={6}>
            <Block x={0.8} y={0.8} w={3.4} d={1.9} h={m === 2 ? 14 : 18} label="Plausible" size={10} />
            <Block x={4.8} y={0.8} w={3.4} d={1.9} h={m === 2 ? 12 : 16} label="Fathom" size={10} />
            <Block x={0.8} y={3.3} w={3.4} d={1.9} h={m === 2 ? 10 : 16} label="Matomo" size={10} />
            {m === 0 && <Slot x={4.8} y={3.3} w={3.4} d={1.9} label="the startup" />}
            {m > 0 && <Block x={4.8} y={3.3} w={3.4} d={1.9} h={m === 2 ? 24 : 4} tone={m === 2 ? 'green' : 'soft'} label={m === 2 ? 'you' : 'drafted'} size={m === 2 ? 13 : 10} />}
          </Platform>
          <ol className="mt-12 hidden w-full max-w-[320px] flex-col gap-2 px-4 lg:flex">
            {MONTHS.map((x, i) => (
              <li key={x.label} className={`flex items-center gap-3 px-3.5 py-3 transition-[opacity,translate] duration-500 ${GLASS} rounded-[14px] ${i <= m ? 'opacity-100' : 'translate-y-1 opacity-45'}`}>
                <span className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold transition-colors duration-500 ${i < m ? 'bg-[#22a06b] text-white' : i === m ? 'bg-brand text-white' : 'bg-[#f2f0fe] text-brand-deep'}`}>{i < m ? '✓' : i + 1}</span>
                <span className="min-w-0">
                  <span className="block text-[11.5px] font-semibold text-[#8d8aa5]">{x.label}</span>
                  <span className={`block text-[13px] leading-snug ${INK}`}>{x.get}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </Pause>
    </IsoCard>
  );
}

/* ===== Proof: the real audit as a case file you can play =====
   Principle borrowed (not the component): show the real work first, details on
   demand. Our "work" is the audit, so it plays as a case file: the answer on a
   platform, and a tracklist of all eight real questions marking who was named. */

const MARKS = ['Plausible Analytics', 'Fathom Analytics', 'Matomo'];

export function EvidencePlayer() {
  const [ref, visible] = useVisible<HTMLDivElement>();
  const [paused, setPaused] = useState(false);
  const [q, setQ] = useLoop(PROOF_QUESTIONS.length, 3600, visible && !paused, 3);
  const question = PROOF_QUESTIONS[q]!;
  const rot = q % 4;
  const spotOf = (i: number) => SPOTS[(rot + i) % 4]!;
  const order = [...question.named, ...BRANDS.filter((b) => !question.named.includes(b))];
  return (
    <div ref={ref} className="grid overflow-hidden rounded-[20px] bg-white lg:grid-cols-[1.15fr_1fr]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="iso-scene relative flex min-h-[380px] flex-col bg-[#f4f4f9]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(#dfe4ec_1px,transparent_1px)] bg-[size:14px_14px]" />
        <div className="relative px-6 pt-5">
          <p className={`text-[12.5px] ${FAINT}`}>Gemini answered · {PROOF_RECORDED_ON}</p>
          <p aria-live="polite" className={`mt-1.5 line-clamp-3 text-[15px] leading-snug ${INK}`}>“{question.text}”</p>
        </div>
        <div className="iso-fit relative grid flex-1 place-items-center py-4">
          <Platform cols={9} rows={6}>
            {order.map((brand, i) => {
              const [x, y] = spotOf(i);
              const named = question.named.includes(brand);
              return <Block key={brand} x={x} y={y} w={3.4} d={1.9} h={named ? 18 : 1} tone={named ? 'white' : 'ghost'} label={SHORT[brand]} size={11} />;
            })}
            <Slot x={spotOf(3)[0]} y={spotOf(3)[1]} w={3.4} d={1.9} label="the startup" hot />
          </Platform>
        </div>
      </div>
      <div className="flex flex-col border-t border-[#efeef4] lg:border-t-0 lg:border-l">
        <div className="grid grid-cols-[1fr_repeat(4,30px)] items-center gap-1 border-b border-[#efeef4] px-5 py-3 text-[11px] font-medium text-[#8c8ba3]">
          <span>8 real buyer questions</span>
          {['Pl', 'Fa', 'Ma'].map((m) => <span key={m} className="text-center">{m}</span>)}
          <span className="text-center text-[#d93036]">You?</span>
        </div>
        <ol className="flex-1">
          {PROOF_QUESTIONS.map((row, k) => (
            <li key={row.text}>
              <button
                type="button"
                aria-pressed={k === q}
                onClick={() => setQ(k)}
                onMouseEnter={() => setQ(k)}
                className={`grid w-full grid-cols-[1fr_repeat(4,30px)] items-center gap-1 px-5 py-2.5 text-left transition-colors ${k === q ? 'bg-[#f2f0fe]' : 'hover:bg-[#f7f7fa]'}`}
              >
                <span className="min-w-0">
                  <span className={`block text-[11.5px] font-semibold ${k === q ? 'text-brand-deep' : FAINT}`}>{row.stage}</span>
                  <span className={`block truncate text-[13px] ${INK}`}>{row.text}</span>
                </span>
                {MARKS.map((m) => (
                  <span key={m} className={`text-center text-[13px] ${row.named.includes(m) ? 'font-bold text-[#17784e]' : 'text-[#c4c3d5]'}`}>{row.named.includes(m) ? '✓' : '·'}</span>
                ))}
                <span className="text-center text-[13px] font-bold text-[#d93036]">✕</span>
              </button>
            </li>
          ))}
        </ol>
        <p className={`border-t border-[#efeef4] px-5 py-3 text-[13px] ${FAINT}`}>Named in all 8: <b className={INK}>Plausible</b> 8 · Fathom 7 · Matomo 6 · <b className="text-[#d93036]">the startup 0</b></p>
      </div>
    </div>
  );
}
