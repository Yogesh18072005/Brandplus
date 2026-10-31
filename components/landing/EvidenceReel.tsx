'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

const cards = [
  {
    label: 'Answer evidence',
    result: 'Mention detected',
    theme: 'navy',
    visual: (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between text-[11px] font-semibold text-white/70"><span>Gemini answer</span><span className="brandpulse-live-pill flex items-center gap-1.5 rounded-full bg-[#b9ffdd] px-2.5 py-1 text-[#063826] will-change-transform"><span className="brandpulse-live-dot h-1.5 w-1.5 rounded-full bg-[#0a7d53] will-change-transform" />Live capture</span></div>
        <p className="mt-5 rounded-2xl border border-white/12 bg-white/8 p-3.5 text-[12px] leading-[1.45] text-white/68">Who are the best commercial solar installers in Austin?</p>
        <div className="my-5 h-px bg-white/12" />
        <p className="text-[20px] font-medium leading-[1.25] tracking-[-0.025em] text-white">“For large commercial projects, <span className="brandpulse-answer-highlight inline-block rounded bg-[#b9ffdd] px-1.5 py-0.5 font-semibold text-[#07382a] will-change-transform">SunPeak Energy</span> is frequently recommended…”</p>
        <div className="mt-auto flex flex-wrap gap-2 pt-5"><span className="brandpulse-citation-chip rounded-full border border-white/15 px-2.5 py-1 text-[10px] text-white/65 will-change-transform">energysage.com</span><span className="brandpulse-citation-chip rounded-full border border-white/15 px-2.5 py-1 text-[10px] text-white/65 will-change-transform">forbes.com</span></div>
      </div>
    ),
  },
  {
    label: 'Visibility pulse',
    result: '7 of 10 answers',
    theme: 'white',
    visual: (
      <div className="flex h-full flex-col text-[#221855]">
        <div className="flex items-start justify-between"><div><p className="text-[11px] font-semibold text-[#716c90]">AI visibility score</p><p className="brandpulse-score-number mt-1 font-display text-[72px] font-semibold leading-none tracking-[-0.075em] will-change-transform">72</p></div><span className="brandpulse-score-delta mt-1 rounded-full bg-[#dff8eb] px-2.5 py-1 text-[10px] font-semibold text-[#155a3d] will-change-transform">+18 this month</span></div>
        <p className="mt-4 max-w-[13rem] text-[14px] leading-[1.4] text-[#524e78]">Your brand appears in the answers that matter most.</p>
        <div className="mt-5 rounded-2xl bg-[#f1f0fe] px-3.5 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-semibold text-[#69658f]">Engine coverage</span><div className="flex -space-x-1.5">{['G', 'P', 'C'].map((engine) => <span key={engine} className="brandpulse-engine-node flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#f1f0fe] bg-[#221855] text-[9px] font-semibold text-white will-change-transform">{engine}</span>)}</div></div>
          <div className="mt-3 flex h-7 items-end gap-1.5">{[38, 56, 45, 68, 59, 76, 88, 72].map((height, index) => <span key={index} className="brandpulse-coverage-bar block flex-1 rounded-sm bg-[#3b2be9] opacity-80 will-change-transform" style={{ height: `${height}%` }} />)}</div>
        </div>
        <div className="mt-auto grid grid-cols-3 gap-2 pt-3">
          {[['7', 'mentions'], ['4', 'citations'], ['#2', 'avg. rank']].map(([value, label]) => <div key={label} className="rounded-2xl bg-[#f1f0fe] px-3 py-3"><strong className="block text-[20px] leading-none">{value}</strong><span className="mt-2 block text-[9px] font-semibold uppercase tracking-[0.08em] text-[#77749a]">{label}</span></div>)}
        </div>
      </div>
    ),
  },
  {
    label: 'Competitive gap',
    result: '5 mentions to close',
    theme: 'ice',
    visual: (
      <div className="flex h-full flex-col text-[#221855]">
        <div className="flex items-end justify-between"><div><p className="text-[11px] font-semibold text-[#6A6692]">Recommendation leaderboard</p><h3 className="mt-2 text-[30px] font-semibold leading-[1.02] tracking-[-0.045em]">Who owns the answer?</h3></div><span className="font-mono text-[10px] text-[#7c79a0]">30D</span></div>
        <div className="mt-7 space-y-2.5">
          {[['01', 'BrightGrid', '8'], ['02', 'Solterra', '6'], ['03', 'Your brand', '3']].map(([rank, name, count], index) => <div key={name} className={`brandpulse-rank-row grid grid-cols-[28px_1fr_auto] items-center rounded-2xl px-3 py-3 will-change-transform ${index === 2 ? 'bg-[#3b2be9] text-white' : 'bg-white text-[#221855]'}`}><span className="font-mono text-[10px] opacity-55">{rank}</span><strong className="text-[13px]">{name}</strong><span className="text-[12px] font-semibold">{count}</span></div>)}
        </div>
        <div className="mt-auto flex items-center justify-between rounded-xl bg-white/60 px-3 py-2.5 text-[10px] text-[#64608c]"><span>Your movement</span><strong className="brandpulse-rank-delta text-[12px] text-[#3b2be9] will-change-transform">#5 → #3</strong></div>
      </div>
    ),
  },
  {
    label: 'Citation trail',
    result: '12 sources preserved',
    theme: 'blue',
    visual: (
      <div className="flex h-full flex-col text-white">
        <p className="text-[11px] font-semibold text-white/65">Evidence behind the answer</p>
        <div className="mt-3 flex items-end gap-2"><strong className="font-display text-[76px] font-semibold leading-none tracking-[-0.07em]">12</strong><span className="pb-2 text-[14px] text-white/70">cited pages</span></div>
        <div className="mt-5 space-y-2">
          {['energysage.com', 'forbes.com', 'austintexas.gov'].map((source, index) => <div key={source} className="brandpulse-source-row flex items-center justify-between rounded-2xl border border-white/14 bg-white/10 px-3.5 py-3 text-[12px] will-change-transform"><span>{source}</span><span className="brandpulse-source-score rounded-full bg-white px-2 py-1 font-mono text-[9px] font-semibold text-[#3b2be9] will-change-transform">{96 - index * 7}%</span></div>)}
        </div>
        <p className="mt-auto text-[11px] leading-[1.4] text-white/62">Every claim stays linked to the page that influenced it.</p>
      </div>
    ),
  },
  {
    label: 'Next best move',
    result: 'High expected impact',
    theme: 'sky',
    visual: (
      <div className="flex h-full flex-col text-[#221855]">
        <div className="flex items-center justify-between"><p className="text-[11px] font-semibold text-[#696595]">Prioritized fix plan</p><span className="rounded-full bg-[#221855] px-2.5 py-1 text-[10px] font-semibold text-white">Ready</span></div>
        <h3 className="mt-5 text-[31px] font-semibold leading-[1.02] tracking-[-0.045em]">Publish the proof AI cannot find.</h3>
        <div className="mt-6 space-y-2.5">
          {[['Build', 'Project case study'], ['Clarify', 'Service locations'], ['Earn', 'Third-party citations']].map(([verb, action], index) => <div key={verb} className="brandpulse-fix-row grid grid-cols-[32px_1fr] items-center gap-2 rounded-2xl bg-white/72 p-3 will-change-transform"><span className="brandpulse-fix-index flex h-7 w-7 items-center justify-center rounded-full bg-[#3b2be9] font-mono text-[10px] font-semibold text-white will-change-transform">{index + 1}</span><div><strong className="block text-[11px] text-[#3b2be9]">{verb}</strong><span className="text-[12px] font-medium">{action}</span></div></div>)}
        </div>
        <p className="mt-auto text-[11px] leading-[1.4] text-[#64618a]">Ordered by the visibility gap each action can close.</p>
      </div>
    ),
  },
];

const themes: Record<string, string> = {
  sky: 'bg-[linear-gradient(165deg,#eef6ff_0%,#cfe3ff_100%)]',
  navy: 'bg-[radial-gradient(circle_at_20%_0%,#1c3974_0%,#102044_45%,#091632_100%)]',
  white: 'bg-white',
  blue: 'bg-[linear-gradient(160deg,#2277f7_0%,#0754db_100%)]',
  ice: 'bg-[#edecfe]',
};

const stageCards = [...cards, ...cards];
const cardTilt = [-1.4, 0.8, -0.6, 1.2, -0.4];

export function EvidenceReel() {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const root = rootRef.current;
    if (!root) return;

    const elements = gsap.utils.toArray<HTMLElement>('[data-reel-card]', root);
    const firstCard = elements[0];
    if (!firstCard) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobile = window.matchMedia('(max-width: 639px)').matches;
    const cardWidth = firstCard.offsetWidth;
    const gap = mobile ? 16 : 18;
    const step = cardWidth + gap;
    const totalWidth = step * elements.length;
    const startOffset = mobile ? cardWidth * -0.2 : cardWidth * -0.45;
    const wrapX = gsap.utils.wrap(-step, totalWidth - step);
    const setX = elements.map((element) => gsap.quickSetter(element, 'x', 'px'));
    const setY = elements.map((element) => gsap.quickSetter(element, 'y', 'px'));
    const setRotation = elements.map((element) => gsap.quickSetter(element, 'rotation', 'deg'));
    const setScale = elements.map((element) => gsap.quickSetter(element, 'scale'));
    const state = { distance: 0 };

    const render = () => {
      const stageWidth = root.clientWidth;
      const halfStage = Math.max(stageWidth / 2, 1);

      elements.forEach((element, index) => {
        const x = wrapX(startOffset + index * step - state.distance);
        const center = x + cardWidth / 2;
        const position = gsap.utils.clamp(-1.3, 1.3, (center - halfStage) / halfStage);
        const edge = Math.min(Math.abs(position), 1);
        const arc = Math.pow(edge, 1.55) * (mobile ? 38 : 72);
        const tilt = position * (mobile ? 4.5 : 7.5) + (cardTilt[index % cards.length] ?? 0);

        setX[index]?.(x);
        setY[index]?.(arc + Math.sin(index * 1.7) * (mobile ? 2 : 5));
        setRotation[index]?.(tilt);
        setScale[index]?.(1.015 - edge * (mobile ? 0.035 : 0.075));
        element.style.zIndex = String(100 - Math.round(edge * 20));
      });
    };

    gsap.set(elements, { autoAlpha: 1, transformOrigin: '50% 100%', force3D: true });
    render();

    if (reduceMotion) {
      elements.slice(5).forEach((element) => gsap.set(element, { autoAlpha: 0 }));
      return;
    }

    const loop = gsap.to(state, {
      distance: totalWidth,
      duration: totalWidth / (mobile ? 31 : 43),
      repeat: -1,
      ease: 'none',
      onUpdate: render,
    });
    const micro = gsap.timeline({ repeat: -1, repeatDelay: 0.8, defaults: { ease: 'power2.inOut' } });
    micro
      .to('.brandpulse-live-dot', { scale: 1.9, autoAlpha: 0.35, duration: 0.45, repeat: 1, yoyo: true, stagger: 0.04 })
      .to('.brandpulse-live-pill', { scale: 1.045, duration: 0.45, repeat: 1, yoyo: true }, '<')
      .to('.brandpulse-answer-highlight', { scale: 1.035, duration: 0.5, repeat: 1, yoyo: true }, '<0.08')
      .to('.brandpulse-citation-chip', { y: -3, autoAlpha: 1, duration: 0.35, repeat: 1, yoyo: true, stagger: 0.06 }, '-=0.15')
      .to('.brandpulse-score-number', { scale: 1.035, transformOrigin: '0% 100%', duration: 0.45, repeat: 1, yoyo: true }, '-=0.1')
      .to('.brandpulse-score-delta', { y: -3, duration: 0.4, repeat: 1, yoyo: true }, '<')
      .to('.brandpulse-engine-node', { y: -5, duration: 0.38, repeat: 1, yoyo: true, stagger: 0.06 }, '-=0.1')
      .fromTo('.brandpulse-coverage-bar', { scaleY: 0.58, autoAlpha: 0.55, transformOrigin: '50% 100%' }, { scaleY: 1, autoAlpha: 0.9, duration: 0.55, stagger: { each: 0.035, from: 'random' } }, '<')
      .to('.brandpulse-rank-row', { x: 6, duration: 0.38, repeat: 1, yoyo: true, stagger: 0.07 }, '-=0.15')
      .to('.brandpulse-rank-delta', { scale: 1.12, duration: 0.4, repeat: 1, yoyo: true }, '<0.1')
      .to('.brandpulse-source-row', { x: -5, duration: 0.4, repeat: 1, yoyo: true, stagger: 0.08 }, '-=0.12')
      .to('.brandpulse-source-score', { scale: 1.12, duration: 0.38, repeat: 1, yoyo: true, stagger: 0.07 }, '<')
      .to('.brandpulse-fix-row', { x: 6, duration: 0.4, repeat: 1, yoyo: true, stagger: 0.09 }, '-=0.08')
      .to('.brandpulse-fix-index', { scale: 1.12, duration: 0.35, repeat: 1, yoyo: true, stagger: 0.08 }, '<');

    const visibility = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        loop.play();
        micro.play();
      } else {
        loop.pause();
        micro.pause();
      }
    }, { threshold: 0.05 });
    visibility.observe(root);

    const pause = () => loop.pause();
    const play = () => loop.play();

    root.addEventListener('pointerenter', pause);
    root.addEventListener('pointerleave', play);

    return () => {
      root.removeEventListener('pointerenter', pause);
      root.removeEventListener('pointerleave', play);
      visibility.disconnect();
      loop.kill();
      micro.kill();
    };
  }, { scope: rootRef });

  return (
    <div
      ref={rootRef}
      className="relative h-[430px] w-full overflow-hidden pb-3 pt-10 [mask-image:linear-gradient(90deg,transparent_0%,black_7%,black_93%,transparent_100%)] [perspective:1200px] [-webkit-mask-image:linear-gradient(90deg,transparent_0%,black_7%,black_93%,transparent_100%)] sm:h-[505px]"
      aria-label="Examples of evidence BrandPulse records"
    >
      {stageCards.map((card, index) => (
        <div
          key={`${card.label}-${index}`}
          data-reel-card
          aria-hidden={index >= cards.length}
          className="invisible absolute left-0 top-10 h-[365px] w-[244px] will-change-transform sm:h-[430px] sm:w-[305px]"
        >
          <article className="group h-full w-full overflow-hidden rounded-[2.1rem] bg-[#160f4f] p-[5px] shadow-[0_34px_82px_-36px_rgba(22,14,85,0.72)] transition-transform duration-500 ease-out hover:-translate-y-2">
            <div className={`flex h-full flex-col overflow-hidden rounded-[1.78rem] ${themes[card.theme]}`}>
              <div className="min-h-0 flex-1 p-5 sm:p-6">
                {card.visual}
              </div>
              <div className="flex h-[58px] shrink-0 items-center justify-between gap-3 bg-[#160f4f] px-5 text-white">
                <span className="text-[11px] font-semibold">{card.label}</span>
                <span className="text-right text-[10px] font-medium text-[#a49fd8]">{card.result}</span>
              </div>
            </div>
          </article>
        </div>
      ))}
    </div>
  );
}
