'use client';
import { useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { AnswerWorkbench, DottedField } from './ProductExperience';
export function ShortlistHero() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => { const mm = gsap.matchMedia(); mm.add('(prefers-reduced-motion: no-preference)', () => { gsap.from('.z-title-line', { y: 24, opacity: .35, duration: .8, stagger: .1, ease: 'power3.out' }); }); return () => mm.revert(); }, { scope: root });
  return <section ref={root} className="z-hero"><DottedField/><div className="z-hero-copy"><h1><span className="z-line"><span className="z-title-line">Get your business into</span></span><span className="z-line"><span className="z-title-line">the AI shortlist.</span></span></h1><p>See when AI recommends you, who it picks instead,<br className="hidden sm:block"/> and exactly what to improve next.</p><div className="z-hero-actions"><Link href="#audit" className="z-button">Check my AI visibility <span aria-hidden="true">↗</span></Link><Link href="/demo" className="z-button z-button-quiet"><span className="z-play" aria-hidden="true"/>Explore the workspace</Link></div><div className="z-reassurance">10 buyer questions <span/> Free to try <span/> No account or card</div></div><div className="z-hero-workbench"><AnswerWorkbench/><div className="z-stage-caption"><span>From a buyer’s question to your next move.</span><span>Interactive product example</span></div></div></section>;
}
