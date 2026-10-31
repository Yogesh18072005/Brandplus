'use client';

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { FREE_PROMPT_COUNT, PAID_PROMPT_COUNT } from '@/lib/marketing/prompt-counts';
import { EvidenceReel } from '@/components/landing/EvidenceReel';

gsap.registerPlugin(useGSAP);

export function HeroSection() {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    const motion = gsap.matchMedia();

    motion.add(
      {
        animate: '(prefers-reduced-motion: no-preference)',
        desktop: '(min-width: 768px)',
      },
      (context) => {
        const { animate, desktop } = context.conditions ?? {};
        const reveals = gsap.utils.toArray<HTMLElement>('[data-hero-reveal]');
        const flow = rootRef.current?.querySelector<HTMLElement>('[data-brandpulse-flow]');

        if (!animate) {
          gsap.set([...reveals, flow].filter(Boolean), { clearProps: 'all' });
          return;
        }

        const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
        intro.from(reveals, { autoAlpha: 0, y: desktop ? 28 : 18, duration: 0.85, stagger: 0.09 });
        if (flow) intro.from(flow, { autoAlpha: 0, y: 48, scale: 0.975, duration: 1.05 }, '-=0.5');
        return () => intro.kill();
      },
    );

    return () => motion.revert();
  }, { scope: rootRef });

  return (
    <section ref={rootRef} className="relative min-h-[900px] overflow-hidden bg-[#879bf2] pb-0 pt-32 sm:min-h-[980px] sm:pt-36">
      <Image src="/brandpulse-hero-world-v1.png" alt="" fill priority sizes="100vw" className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(22,19,157,0.05)_0%,rgba(16,8,147,0.03)_42%,rgba(26,14,119,0.16)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[43%] bg-gradient-to-b from-transparent via-[#e0e2fd]/30 to-[#f0f1fe]" />

      <div className="relative mx-auto max-w-[1380px] px-5 sm:px-6">
        <div className="mx-auto max-w-[1100px] text-center text-white [text-shadow:0_2px_26px_rgba(19,9,132,0.2)]">
          <p data-hero-reveal className="text-[13px] font-semibold text-white/90 sm:text-[14px]">
            A free {FREE_PROMPT_COUNT}-question audit of one real business
          </p>
          <h1 data-hero-reveal className="mx-auto mt-6 max-w-[1100px] text-balance font-display text-[clamp(3.25rem,7vw,6.6rem)] font-semibold leading-[0.91] tracking-[-0.065em] text-white [text-shadow:0_5px_34px_rgba(20,9,138,0.24)]">
            See what <span className="text-[#eceffe]">AI says</span> about your business—and why.
          </h1>
          <p data-hero-reveal className="mx-auto mt-7 max-w-[48rem] text-pretty text-[17px] font-medium leading-[1.55] text-white/90 sm:text-[20px]">
            BrandPulse observes the buyer questions that matter, finds the evidence gaps behind the answers, and tells you what to improve next.
          </p>
          <div data-hero-reveal className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="#audit" className="inline-flex h-[54px] items-center rounded-full bg-[#3017da] px-8 text-[15px] font-semibold text-white no-underline shadow-[0_16px_34px_-14px_rgba(23,9,128,0.75)] transition-all hover:-translate-y-1 hover:bg-[#2711b8] active:translate-y-0">
              Test my website
            </Link>
            <Link href="#proof" className="inline-flex h-[54px] items-center rounded-full border border-white/70 bg-white/88 px-7 text-[15px] font-semibold text-[#221855] no-underline shadow-[0_14px_30px_-22px_rgba(34,24,85,0.42)] backdrop-blur-md transition-all hover:-translate-y-1 hover:bg-white active:translate-y-0">
              See a real report
            </Link>
          </div>
          <p data-hero-reveal className="mt-5 text-[12px] font-medium text-white/75">No account or card required · Sign up to unlock the full report · {PAID_PROMPT_COUNT}-question tracking on paid plans</p>
        </div>
        <div data-brandpulse-flow className="-mx-5 mt-2 sm:-mx-6 sm:mt-3"><EvidenceReel /></div>
      </div>
    </section>
  );
}
