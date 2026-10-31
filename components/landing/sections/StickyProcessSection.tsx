'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { DitherShader } from '@/src/components/ui/dither-shader';

gsap.registerPlugin(useGSAP);

const sourceRows = [
  { domain: 'forbes.com', role: 'Third-party proof', score: '92%' },
  { domain: 'g2.com', role: 'Category authority', score: '87%' },
  { domain: 'yourbrand.com', role: 'Product evidence', score: '74%' },
];

const actionRows = [
  { action: 'Add the missing proof', detail: 'Service page', impact: '+12' },
  { action: 'Publish a comparison', detail: 'Content brief ready', impact: '+8' },
  { action: 'Earn one citation', detail: 'Outreach target found', impact: '+5' },
];

export function StickyProcessSection() {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const reveal = gsap.from('[data-why-reveal]', {
      autoAlpha: 0,
      y: 28,
      duration: 0.8,
      stagger: 0.09,
      ease: 'power3.out',
      paused: true,
    });

    const scan = gsap.fromTo('[data-answer-scan]',
      { yPercent: -80, autoAlpha: 0 },
      { yPercent: 930, autoAlpha: 0.7, duration: 3.4, repeat: -1, repeatDelay: 0.8, ease: 'none' },
    );
    const mention = gsap.to('[data-brand-mention]', {
      boxShadow: '0 0 0 5px rgba(59, 43, 233, 0.09)',
      duration: 1.35,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
    const evidence = gsap.timeline({ repeat: -1, repeatDelay: 1.2 })
      .fromTo('[data-source-row]', { x: -8, opacity: 0.66 }, { x: 0, opacity: 1, duration: 0.45, stagger: 0.18, ease: 'power2.out' })
      .fromTo('[data-source-line]', { scaleY: 0 }, { scaleY: 1, duration: 0.7, transformOrigin: 'top', ease: 'power2.inOut' }, '<0.05')
      .fromTo('[data-recommendation]', { scale: 0.96 }, { scale: 1, duration: 0.45, ease: 'back.out(2)' }, '-=0.15');
    const queue = gsap.timeline({ repeat: -1, repeatDelay: 1.5 })
      .fromTo('[data-action-row]', { x: 12, opacity: 0.7 }, { x: 0, opacity: 1, duration: 0.4, stagger: 0.16, ease: 'power2.out' })
      .fromTo('[data-action-progress]', { scaleX: 0 }, { scaleX: 1, duration: 0.9, stagger: 0.14, transformOrigin: 'left', ease: 'power2.inOut' }, '<0.05')
      .fromTo('[data-ready-pill]', { scale: 0.9, opacity: 0.5 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2)' });

    const loops = [scan, mention, evidence, queue];
    let hasRevealed = false;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      if (entry.isIntersecting && !hasRevealed) {
        hasRevealed = true;
        reveal.play();
      }
      loops.forEach((animation) => entry.isIntersecting ? animation.resume() : animation.pause());
    }, { threshold: 0.08 });
    observer.observe(root);
    return () => observer.disconnect();
  }, { scope: rootRef });

  return (
    <section ref={rootRef} id="how" className="relative scroll-mt-28 overflow-hidden border-y border-[#e0dff4] bg-white py-24 lg:py-32">
      <div className="pointer-events-none absolute left-[34%] top-32 h-80 w-80 rounded-full bg-[#dde1fd]/70 blur-[110px]" />
      <div className="relative mx-auto max-w-[1320px] px-5 sm:px-7">
        <div className="grid items-start gap-8 lg:grid-cols-[0.95fr_0.75fr] lg:gap-24">
          <div data-why-reveal>
            <p className="mb-5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3b2be9]">Why BrandPulse</p>
            <h2 className="max-w-[690px] text-balance font-display text-[clamp(2.9rem,4.6vw,4.9rem)] font-semibold leading-[0.95] tracking-[-0.06em] text-[#221855]">Every AI answer, fully auditable.</h2>
          </div>
          <p data-why-reveal className="max-w-[520px] pt-1 text-[17px] leading-[1.65] text-[#605e84] lg:justify-self-end lg:pt-10">BrandPulse records what buyers ask, which brands appear, and the pages that shaped the answer. You see the evidence first, then the clearest next move.</p>
        </div>

        <div className="mt-16 grid gap-4 lg:grid-cols-12 lg:items-stretch">
          <article data-why-reveal className="group flex min-h-[570px] flex-col overflow-hidden rounded-[1.8rem] border border-[#d4d4ef] bg-white shadow-[0_28px_80px_-52px_rgba(34,24,85,0.38)] lg:col-span-5">
            <div className="relative h-[344px] overflow-hidden bg-[#e0e0fd] p-5 sm:p-6">
              <div className="absolute inset-0 opacity-20">
                <DitherShader src="/sample-report-answer.png" gridSize={7} ditherMode="noise" colorMode="duotone" primaryColor="#221855" secondaryColor="#d3d2fd" contrast={1.1} threshold={0.58} animated animationSpeed={0.003} />
              </div>
              <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,.92),rgba(229,229,254,.78))]" />
              <div data-answer-scan className="pointer-events-none absolute inset-x-0 top-4 z-20 h-px bg-[#3b2be9] shadow-[0_0_18px_4px_rgba(59,43,233,.28)]" />

              <div className="relative z-10 flex h-full flex-col rounded-[1.25rem] border border-white/90 bg-white/82 p-5 shadow-[0_18px_50px_-34px_rgba(34,24,85,.5)] backdrop-blur-sm">
                <div className="flex items-center justify-between border-b border-[#e0e0f4] pb-4">
                  <div>
                    <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-[#75739a]">Live answer</p>
                    <p className="mt-1 text-[12px] font-semibold text-[#221855]">Buyer question 18 of 40</p>
                  </div>
                  <span className="rounded-full border border-[#d3e1f0] bg-[#f6f9fd] px-3 py-1.5 text-[10px] font-semibold text-[#53647b]">Gemini</span>
                </div>
                <p className="mt-5 max-w-[35ch] text-[15px] font-semibold leading-[1.35] tracking-[-0.02em] text-[#221855]">Who is the best analytics partner for a growing retail team?</p>
                <div className="mt-4 rounded-xl bg-[#f5f5fd] p-4 text-[12px] leading-[1.6] text-[#55537b]">
                  For teams that need clear attribution and fast reporting, <span data-brand-mention className="rounded-md bg-[#e2e0fd] px-1.5 py-0.5 font-semibold text-[#2413e1]">Northstar Analytics</span> is frequently recommended for its transparent reporting.
                </div>
                <div className="mt-auto flex items-center gap-2 pt-4">
                  <span className="rounded-full bg-[#221855] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-white">Mention found</span>
                  <span className="text-[10px] font-medium text-[#737198]">3 citations preserved</span>
                </div>
              </div>
            </div>
            <div className="flex flex-1 flex-col p-7 sm:p-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#7e7da0]">01 / Observe</p>
              <h3 className="mt-5 text-[25px] font-semibold tracking-[-0.04em] text-[#221855]">Inspect the exact answer</h3>
              <p className="mt-3 max-w-[42ch] text-[15px] leading-[1.65] text-[#67658a]">See the question, response, citations, and brand mention that produced the score.</p>
            </div>
          </article>

          <article data-why-reveal className="group flex min-h-[570px] flex-col overflow-hidden rounded-[1.8rem] border border-[#d4d4ef] bg-white shadow-[0_28px_80px_-52px_rgba(34,24,85,0.38)] lg:col-span-3">
            <div className="relative h-[344px] overflow-hidden bg-[#efeffe] px-5 py-6">
              <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(#d6e7f8_1px,transparent_1px),linear-gradient(90deg,#d6e7f8_1px,transparent_1px)] [background-size:22px_22px]" />
              <div className="relative z-10 flex h-full flex-col">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-[#67658b]">Evidence path</p>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-semibold text-[#3b2be9] shadow-sm">3 sources</span>
                </div>
                <div className="relative mt-6 space-y-2.5">
                  <div data-source-line className="absolute bottom-[-43px] left-[17px] top-3 w-px bg-[#9f9cec]" />
                  {sourceRows.map((source, index) => (
                    <div data-source-row key={source.domain} className="relative flex items-center gap-3 rounded-xl border border-[#d8d8f0] bg-white/95 px-3 py-2.5 shadow-[0_10px_22px_-18px_rgba(34,24,85,.5)]">
                      <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e9e8fe] font-mono text-[9px] font-semibold text-[#3b2be9]">{index + 1}</span>
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-semibold text-[#262454]">{source.domain}</p>
                        <p className="truncate text-[8px] text-[#7b7a9c]">{source.role}</p>
                      </div>
                      <span className="ml-auto font-mono text-[9px] font-semibold text-[#4d4b92]">{source.score}</span>
                    </div>
                  ))}
                </div>
                <div data-recommendation className="relative mt-auto rounded-[1rem] bg-[#221855] px-4 py-3.5 text-white shadow-[0_18px_32px_-20px_rgba(34,24,85,.7)]">
                  <p className="text-[9px] uppercase tracking-[0.13em] text-white/50">Recommendation</p>
                  <div className="mt-1.5 flex items-end justify-between gap-3">
                    <p className="text-[14px] font-semibold leading-tight">Your brand appears</p>
                    <span className="rounded-full bg-[#dff8e9] px-2 py-1 text-[8px] font-bold uppercase tracking-[0.08em] text-[#167044]">Verified</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-1 flex-col p-7 sm:p-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#7e7da0]">02 / Sources</p>
              <h3 className="mt-5 text-[25px] font-semibold tracking-[-0.04em] text-[#221855]">Know what shaped it</h3>
              <p className="mt-3 text-[15px] leading-[1.65] text-[#67658a]">Connect each recommendation back to the source pages AI relied on.</p>
            </div>
          </article>

          <article data-why-reveal className="group flex min-h-[570px] flex-col overflow-hidden rounded-[1.8rem] border border-[#2413e1] bg-white shadow-[0_28px_80px_-48px_rgba(59,43,233,0.42)] lg:col-span-4">
            <div className="relative h-[344px] overflow-hidden bg-[#3b2be9] p-5 text-white sm:p-6">
              <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#7982f8]/45 blur-3xl" />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-white/58">Priority queue</p>
                  <p className="mt-2 text-[28px] font-semibold tracking-[-0.05em]">Close the gap.</p>
                </div>
                <span data-ready-pill className="rounded-full border border-white/20 bg-white/12 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white">Ready</span>
              </div>

              <div className="relative mt-7 space-y-2.5">
                {actionRows.map((row, index) => (
                  <div data-action-row key={row.action} className="overflow-hidden rounded-xl border border-white/12 bg-white/10 px-3.5 py-3 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[10px] font-bold text-[#3b2be9]">0{index + 1}</span>
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-semibold">{row.action}</p>
                        <p className="mt-0.5 truncate text-[8px] text-white/55">{row.detail}</p>
                      </div>
                      <span className="ml-auto rounded-full bg-white/12 px-2 py-1 font-mono text-[9px] font-semibold text-white/80">{row.impact} pts</span>
                    </div>
                    <div className="mt-2.5 h-px bg-white/12"><span data-action-progress className="block h-full bg-white/75" /></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-1 flex-col p-7 sm:p-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#7e7da0]">03 / Improve</p>
              <h3 className="mt-5 text-[25px] font-semibold tracking-[-0.04em] text-[#221855]">Fix the next gap</h3>
              <p className="mt-3 max-w-[38ch] text-[15px] leading-[1.65] text-[#67658a]">Turn missed answers into a prioritized list your team can actually complete.</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
