'use client';

import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { BrandMark } from '@/components/layout/SiteNav';

gsap.registerPlugin(ScrollTrigger, useGSAP);
const EvidenceSculpture = dynamic(() => import('./EvidenceSculpture'), { ssr: false });
export function Arrow({ diagonal = false }: { diagonal?: boolean }) { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">{diagonal ? <path d="M6 18 18 6M6 6h12v12"/> : <path d="M4 12h15m-6-6 6 6-6 6"/>}</svg>; }
export function Tick() { return <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m4 10 4 4 8-8"/></svg>; }
const walkthroughSteps = [
  { label: 'Ask', title: 'Start with your customer’s question.', body: 'Your website and market become questions real buyers might ask. Keep the same set when you check again.' },
  { label: 'See', title: 'See who makes the shortlist.', body: 'Read the recorded answer. Find your business, spot competitors, and see the questions where you are missing.' },
  { label: 'Understand', title: 'Follow the answer to its source.', body: 'Inspect the available citations and the pages behind them. Separate what the evidence says from what it cannot tell you.' },
  { label: 'Improve', title: 'Make your next move a clear one.', body: 'Turn a visibility gap into a focused improvement. Then recheck the same questions to see what changed.' },
];

export function JourneyScene({ step }: { step: number }) {
  const reduced = useReducedMotion();
  return <div className="at-journey-scene"><div className="at-window-top"><span className="at-window-dots"><i/><i/><i/></span><span>Relay / visibility check</span><span>Example</span></div><AnimatePresence mode="wait"><motion.div className="at-journey-content" key={step} initial={reduced ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -8 }} transition={{duration: .22, ease: [0.165,0.84,0.44,1]}}>
    {step === 0 && <><div className="at-domain"><BrandMark className="h-6 w-6"/><span>relay.example</span><span className="at-verified"><Tick/> Context ready</span></div><p className="at-scene-label">One of your buyer questions</p><h3>What’s the best project tool for a small design studio?</h3><div className="at-query-tags"><span>Design teams</span><span>Comparison</span><span>High intent</span></div><div className="at-scene-bottom"><span>Website + market + buyer context</span><Arrow/></div></>}
    {step === 1 && <><p className="at-scene-label">A recorded answer</p><h3>“For a small studio, compare client access, <mark>creative approvals</mark>, and file handoff.”</h3><div className="at-answer-brands"><span><b>N</b> Northstar <Tick/></span><span><b>F</b> Formwork <Tick/></span><span className="at-answer-missing"><BrandMark className="h-4 w-4"/> Relay <small>Not mentioned</small></span></div><div className="at-scene-bottom"><span>Know where the opportunity is.</span><Arrow/></div></>}
    {step === 2 && <><p className="at-scene-label">Available source evidence</p><div className="at-source-document"><span>northstar.example / for-design-teams</span><h3>Client feedback.<br/>In one place.</h3><p>Share a proof, collect comments, and get approval without another email thread.</p><div className="at-citation-stamp"><Tick/> Cited in the answer</div></div><div className="at-scene-bottom"><span>A source to inspect, not a guessed explanation.</span><Arrow/></div></>}
    {step === 3 && <><p className="at-scene-label">Your next move</p><h3>Show how your tool handles creative approvals.</h3><div className="at-deliverable"><span>Suggested deliverable</span><strong>A focused comparison page</strong><p>Explain feedback, client access, and file handoff. Add evidence from a real project.</p></div><div className="at-scene-bottom"><span><Tick/> Improve the page. Recheck the questions.</span><Arrow/></div></>}
  </motion.div></AnimatePresence></div>;
}

export function GuidedJourney({ compact = false }: { compact?: boolean }) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const reduced = useReducedMotion();
  const current = walkthroughSteps[step]!;
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => { if (!document.hidden) setStep(value => (value + 1) % 4); }, 4500);
    return () => clearInterval(timer);
  }, [playing]);
  return <div className={`at-journey ${compact ? 'at-journey-compact' : ''}`}><div className="at-journey-explanation"><div className="at-journey-tabs" role="tablist" aria-label="Product walkthrough">{walkthroughSteps.map((s,i) => <button type="button" role="tab" key={s.label} aria-selected={step === i} id={`${compact ? 'compact' : 'main'}-step-${i}`} aria-controls={`${compact ? 'compact' : 'main'}-scene`} onClick={() => { setStep(i); setPlaying(false); }}><span>{i + 1}</span>{s.label}</button>)}</div><div aria-live={playing ? 'off' : 'polite'}><h3>{current.title}</h3><p>{current.body}</p></div><button type="button" className="at-play-control" onClick={() => { if (step === 3 && !playing) setStep(0); setPlaying(v => !v); }}><svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">{playing ? <path d="M5 4h3v12H5zm7 0h3v12h-3z"/> : <path d="m6 3 10 7-10 7z"/>}</svg>{playing ? 'Pause walkthrough' : 'Play walkthrough'}<span>{step + 1} / 4</span></button>{reduced && <small className="at-reduced-note">Reduced motion is on. Steps remain fully readable.</small>}</div><div role="tabpanel" id={`${compact ? 'compact' : 'main'}-scene`} aria-labelledby={`${compact ? 'compact' : 'main'}-step-${step}`}><JourneyScene step={step}/></div></div>;
}

function KeyboardScene() {
  const [query, setQuery] = useState(0);
  const questions = ['Who should I choose?', 'What are the alternatives?', 'Is it right for my team?'];
  return <div className="at-keyboard-scene"><p key={query}>{questions[query]}</p><div className="at-keyboard" aria-hidden="true">{['Q W E R T Y U I O P','A S D F G H J K L','Z X C V B N M'].map((row,i) => <div key={row} style={{paddingInline: i * 9}}>{row.split(' ').map(letter => <span key={letter}>{letter}</span>)}</div>)}<div><span className="at-space"/><span className="at-return">return</span></div></div><button type="button" onClick={() => setQuery(q => (q + 1) % questions.length)}>Try another buyer question <Arrow/></button></div>;
}

export function AtelierExperience() {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [done, setDone] = useState(false);
  useGSAP(() => {
    if (reduced) return;
    gsap.from('.at-hero-line > span', { yPercent: 108, duration: 1, stagger: .1, ease: 'expo.out' });
    gsap.from('.at-hero-art', { clipPath: 'inset(6% 5% 6% 5% round 16px)', duration: 1.35, ease: 'expo.out' });
    gsap.fromTo('.at-scroll-statement span', { color: '#a7b1ad' }, { color: '#0b0f0e', stagger: .22, scrollTrigger: { trigger: '.at-scroll-statement', start: 'top 83%', end: 'bottom 45%', scrub: .6 } });
  }, { scope: root, dependencies: [reduced] });
  return <div ref={root}>
    <section className="at-hero"><div className="at-hero-copy"><h1><span className="at-hero-line"><span>Be the business</span></span><span className="at-hero-line"><span>AI recommends.</span></span></h1><p>Find out where your business appears in AI answers, who gets mentioned instead, and what to improve next.</p><div className="at-hero-actions"><Link href="#audit" className="at-button">Check my visibility <Arrow/></Link><Link href="#how" className="at-text-link">See how it works <span className="at-play-circle"><svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true"><path d="m3 1 6 4-6 4z"/></svg></span></Link></div><p className="at-free-note">10 buyer questions. Free to try. No account or card.</p><div className="at-hero-foot"><span className="at-live-dot"/><span>AI visibility for real businesses.</span></div></div><div className="at-hero-art"><Image src="/brandpulse-glass-gallery-v2.png" fill priority sizes="(max-width: 760px) 100vw, 52vw" alt="Emerald glass Z in a sunlit architectural gallery"/><div className="at-art-caption"><span>From overlooked<br/>to understood.</span><BrandMark className="h-7 w-8"/></div><div className="at-hero-receipt"><span className="at-receipt-icon"><Tick/></span><div><strong>There’s a question with your name on it.</strong><span>Find the gaps. Build the evidence.</span></div></div></div></section>
    <div className="at-audience"><p>For the business behind the search.</p><div><span>Independent businesses</span><span>Growing SaaS teams</span><span>Agencies & consultants</span></div></div>
    <section className="at-product at-container" id="proof"><div className="at-section-heading"><h2>Your next customer<br/>is asking already.</h2><p>Make the answer your starting point.<br/>Not another number to stare at.</p></div><div className="at-bento">
      <article className="at-tile at-anchor"><div className="at-browser-scene"><div className="at-window-top"><span className="at-window-dots"><i/><i/><i/></span><span>Answer explorer</span></div><div className="at-browser-body"><span className="at-scene-label">A question worth showing up for</span><h3>“Who’s the right fit<br/>for my business?”</h3><div className="at-browser-result"><span className="at-result-avatar">N</span><div><strong>Northstar</strong><span>Mentioned in the answer</span></div><Tick/></div><div className="at-browser-result"><span className="at-result-avatar">F</span><div><strong>Formwork</strong><span>Mentioned in the answer</span></div><Tick/></div><div className="at-browser-gap"><BrandMark className="h-6 w-7"/><span>Your business?<strong>Let’s find out.</strong></span><Arrow diagonal/></div></div><span className="at-scene-example">Illustrative answer, not a live result</span></div><div className="at-tile-copy"><h3>See the whole answer.</h3><p>Your mentions. The competitors. The gaps. Keep the context that a score alone can’t give you.</p><Link href="/demo" className="at-button at-button-light">Explore the workspace <Arrow/></Link></div></article>
      <article className="at-tile at-progress"><div className="at-tile-title"><h3>Less guessing.<br/>A clearer next move.</h3><Arrow diagonal/></div><div className="at-progress-scene"><svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="73" fill="none" stroke="#edf0eb" strokeWidth="31"/><circle cx="100" cy="100" r="73" fill="none" stroke="#b4d4a1" strokeWidth="31" strokeDasharray={done ? '459 459' : '305 459'} transform="rotate(-90 100 100)"/></svg><div className="at-progress-count">{done ? '3' : '2'}<span>/ 3 actions</span></div><button type="button" className={`at-notification ${done ? 'is-done' : ''}`} onClick={() => setDone(v => !v)} aria-pressed={done}><span className="at-notification-top">Example action plan <span>{done ? 'Completed' : 'Try it'}</span></span><strong><span className="at-check-box">{done && <Tick/>}</span>Clarify your comparison page</strong></button></div></article>
      <article className="at-tile at-evidence"><div className="at-tile-title"><h3>Good answers<br/>leave a paper trail.</h3><Arrow diagonal/></div><EvidenceSculpture/><div className="at-evidence-caption"><span className="at-evidence-tag"><Tick/> Source evidence</span><p>Go from an answer<br/>to the pages behind it.</p></div></article>
      <article className="at-tile at-search"><div className="at-tile-title"><h3>Start where buyers start.</h3><Arrow diagonal/></div><KeyboardScene/></article>
      <article className="at-tile at-source"><div className="at-tile-title"><h3>Be easier to understand.</h3><Arrow diagonal/></div><div className="at-source-stack"><div className="at-stacked-page"><span>YOUR WEBSITE / FOR DESIGN TEAMS</span><h4>Built for the way<br/>your studio works.</h4><p>Feedback. Client access. File handoff.</p><div className="at-page-lines"><i/><i/><i/></div></div><div className="at-source-note"><Tick/><span>Clearer page. Stronger evidence.</span></div></div></article>
    </div><div className="at-bento-foot"><span>Original questions. Recorded answers. Practical improvements.</span><Link href="/methodology">Read how we measure <Arrow/></Link></div></section>
    <section className="at-statement at-container"><p className="at-scroll-statement">{'Being found starts with being understood. Make it easier for AI answers to understand what makes your business the right choice.'.split(' ').map((word,i) => <span key={i}>{word} </span>)}</p><p>Better evidence is a starting point. Recommendations are never guaranteed.</p></section>
    <section id="how" className="at-how"><div className="at-container"><div className="at-section-heading"><h2>One question.<br/>A much clearer direction.</h2><p>Take the walkthrough.<br/>See what happens after you add your website.</p></div><GuidedJourney/><div className="at-how-footer"><span>Illustrative walkthrough. Your audit uses your business context.</span><Link href="/demo" className="at-text-link">Open the full workspace <Arrow/></Link></div></div></section>
  </div>;
}
