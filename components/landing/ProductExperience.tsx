'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { InsightChart } from '@/components/dashboard/InsightChart';

gsap.registerPlugin(useGSAP, ScrollTrigger);
const scenes = [
  { category: 'Software', brand: 'Relay', question: 'Which project management tool is best for a small design studio?', rivals: ['Basecamp', 'Notion', 'Asana'], quote: 'For a small design studio, Basecamp keeps client communication in one place. Notion offers a flexible space for briefs and documentation.', source: 'A comparison page', fix: 'Show how your product handles creative approvals.', detail: 'Give buyers a concrete comparison of feedback, file handoff, and client access.' },
  { category: 'Services', brand: 'Northline', question: 'Who should I hire for a brand identity and a new website?', rivals: ['Studio North', 'Made Thought', 'Build in Amsterdam'], quote: 'Look for a studio with published identity systems, relevant website work, and a clear account of the project process.', source: 'A studio portfolio', fix: 'Publish a complete identity-to-website case study.', detail: 'Connect the client problem to the deliverables, timeline, and evidence of the result.' },
  { category: 'Local business', brand: 'Oak Dental', question: 'Which dentist offers clear aligners and evening appointments?', rivals: ['City Dental', 'Smile Studio', 'The Dental Practice'], quote: 'Compare clinics by clear aligner options, appointment availability, practitioner experience, and independent patient reviews.', source: 'A local directory', fix: 'Make treatment and appointment details easy to verify.', detail: 'Add aligner options, practitioner credentials, and evening hours to the treatment page.' },
];
export function DottedField() { return <div className="z-dot-field" aria-hidden="true"><div className="z-dot-glow" /></div>; }

export function AnswerWorkbench({ compact = false }: { compact?: boolean }) {
  const [selected, setSelected] = useState(0);
  const [tab, setTab] = useState(0);
  const reduced = useReducedMotion();
  const scene = scenes[selected] ?? scenes[0]!;
  const prefix = compact ? 'compact' : 'full';
  return <div className={`z-workbench ${compact ? 'z-workbench-compact' : ''}`}>
    <div className="z-workbench-bar"><span className="z-workbench-brand"><span className="z-status-dot" /> Answer explorer</span><span className="z-example-label">Illustrative data</span><div className="z-window-dots" aria-hidden="true"><i/><i/><i/></div></div>
    <div className="z-workbench-body">
      <aside className="z-question-sidebar"><p>Try a buyer’s question</p>{scenes.map((item, i) => <button key={item.category} className={selected === i ? 'is-selected' : ''} onClick={() => { setSelected(i); setTab(0); }} aria-pressed={selected === i}><span className="z-small-square" aria-hidden="true"/>{item.category}<span aria-hidden="true">↗</span></button>)}<div className="z-sidebar-note">Your next customer<br/>is asking already.</div></aside>
      <div className="z-answer-main"><div className="z-question"><span className="z-query-avatar">Q</span><p>{scene.question}</p></div>
        <div className="z-demo-tabs" role="tablist" aria-label="Explore the answer">{['The answer', 'The evidence', 'Your next move'].map((label, i) => <button key={label} id={`answer-${prefix}-${i}`} role="tab" aria-selected={tab === i} aria-controls={`panel-${prefix}`} onClick={() => setTab(i)} onKeyDown={e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const next = (i + (e.key === 'ArrowRight' ? 1 : 2)) % 3; setTab(next); document.getElementById(`answer-${prefix}-${next}`)?.focus(); } }} tabIndex={tab === i ? 0 : -1}>{label}</button>)}</div>
        <AnimatePresence mode="wait" initial={false}><motion.div key={`${selected}-${tab}`} role="tabpanel" id={`panel-${prefix}`} aria-labelledby={`answer-${prefix}-${tab}`} className="z-answer-content" initial={{ opacity: reduced ? 1 : .5, y: reduced ? 0 : 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: reduced ? 1 : .5 }} transition={{ duration: .18 }}>
          {tab === 0 ? <><p className="z-answer-quote">{scene.quote}</p><div className="z-shortlist">{scene.rivals.map((name, i) => <div key={name}><span>0{i+1}</span><strong>{name}</strong><span className="z-mentioned">Mentioned</span></div>)}</div><div className="z-missing"><span className="z-gap-dot"/> {scene.brand} is missing from this answer.<button onClick={() => setTab(2)}>Find the next move <span aria-hidden="true">→</span></button></div></> : tab === 1 ? <><p className="z-answer-quote">Follow the answer back to what supports it.</p><div className="z-source-paper"><span>EXAMPLE SOURCE</span><strong>{scene.source}</strong><p>Clear offer details. Relevant proof. A direct answer to the buyer’s question.</p><div className="z-text-lines"><i/><i/><i/></div></div><p className="z-note">Actual audits preserve the model’s answer and available cited URLs.</p></> : <><div className="z-action-label">PRIORITY 1 <span>Content clarity</span></div><h3 className="z-action-title">{scene.fix}</h3><p className="z-answer-quote">{scene.detail}</p><Link href="/#audit" className="z-inline-link">Find the gaps for my business <span aria-hidden="true">→</span></Link></>}
        </motion.div></AnimatePresence>
      </div>
    </div>
  </div>;
}

function QuestionKeyboard() {
  const [active, setActive] = useState('');
  const [kind, setKind] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const questions = ['Who should I choose?', 'How do the alternatives compare?', 'Which option is right for my team?'];
  function press(key: string) { setActive(key); if (key === 'return') setKind(v => (v + 1) % questions.length); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setActive(''), 170); }
  return <div className="z-keyboard-scene"><div className="z-keyboard-query"><span className="z-status-dot"/>{questions[kind]}<span className="z-type-caret"/></div><div className="z-keyboard" aria-label="Interactive question keyboard">{[['esc','1','2','3','4','5','6','7','8','9','0'],['tab','Q','W','E','R','T','Y','U','I','O','P'],['caps','A','S','D','F','G','H','J','K','L','return'],['shift','Z','X','C','V','B','N','M','shift'],['ctrl','alt','space','cmd']].map((row, r) => <div className="z-key-row" key={r}>{row.map((key, i) => <button key={`${r}-${i}`} tabIndex={key === 'return' ? 0 : -1} className={`${active === key ? 'is-pressed' : ''} ${key.length > 1 ? 'z-key-wide' : ''} ${key === 'space' ? 'z-space' : ''}`} onClick={() => press(key)} aria-label={key === 'return' ? 'Try another buyer question' : `${key} key`}>{key === 'space' ? '' : key}</button>)}</div>)}</div><p className="z-keyboard-hint">Press return to explore another question</p></div>;
}

const trend = [{label:'Jul 7',value:18},{label:'Jul 14',value:24},{label:'Jul 21',value:22},{label:'Jul 28',value:36},{label:'Aug 4',value:41},{label:'Aug 11',value:48}];
export function ProductExperience() {
  const root = useRef<HTMLDivElement>(null);
  const [checked, setChecked] = useState([false, false, false]);
  useGSAP(() => { const mm = gsap.matchMedia(); mm.add('(prefers-reduced-motion: no-preference)', () => { gsap.fromTo('[data-scroll-word]', { color: '#51505f' }, { color: '#f1f1f5', stagger: .15, ease: 'none', scrollTrigger: { trigger: '.z-manifesto', start: 'top 75%', end: 'bottom 55%', scrub: .4 } }); }); return () => mm.revert(); }, { scope: root });
  return <div ref={root}><section id="how" className="z-manifesto z-container"><p className="z-reveal-sentence">{'Your next customer won’t scroll through ten blue links. They’ll ask a question. Make sure your business is part of the answer.'.split(' ').map((word,i) => <span data-scroll-word key={i}>{word} </span>)}</p><p className="z-manifesto-foot">A new way to be discovered. A clearer way to know where you stand.</p></section>
    <section id="proof" className="z-product-section z-container"><div className="z-section-heading"><h2>More than a score.<br/>Your next move.</h2><p>From the questions buyers ask to the work<br className="hidden sm:block"/> that makes your business easier to recommend.</p></div><div className="z-bento">
      <article className="z-bento-cell z-bento-keyboard"><QuestionKeyboard/><div className="z-bento-copy"><h3>Start where buyers start.</h3><p>Discover the questions that decide who gets considered. Built around your business and market.</p></div></article>
      <article className="z-bento-cell z-bento-evidence"><div className="z-evidence-scene"><div className="z-evidence-title">Answer evidence <span>Sample</span></div><p>“Compare options by <mark>proof of relevant work</mark>, support, and the total cost.”</p><div className="z-citation-row"><span>01</span><div><strong>Where the answer came from</strong><small>Recorded answer + available citations</small></div><span aria-hidden="true">↗</span></div><div className="z-citation-row"><span>02</span><div><strong>What your page could clarify</strong><small>A focused comparison for buyers</small></div><span aria-hidden="true">↗</span></div></div><div className="z-bento-copy"><h3>Keep the receipts.</h3><p>Read the actual answer. Inspect cited pages. Understand what’s missing from the picture.</p></div></article>
      <article className="z-bento-cell z-bento-share"><div className="z-share-scene"><span className="z-example-label">Illustrative answer presence</span>{[['Category leader',60],['Closest rival',45],['Your business',28]].map(([name,value]) => <div key={name}><p>{name}<span>{value}%</span></p><div className="z-track"><div style={{ width: `${value}%` }} /></div></div>)}</div><div className="z-bento-copy"><h3>See who gets picked.</h3><p>Compare your presence with the businesses showing up beside you.</p></div></article>
      <article className="z-bento-cell z-bento-actions"><div className="z-action-scene"><div className="z-evidence-title">Your action queue <span>{checked.filter(Boolean).length}/3</span></div>{['Clarify your comparison page','Add evidence to your service page','Recheck the same buyer questions'].map((item,i) => <label key={item} className={checked[i] ? 'is-done' : ''}><input type="checkbox" checked={checked[i]} onChange={() => setChecked(v => v.map((x,j) => j === i ? !x : x))}/><span>{item}</span><small>{i === 2 ? 'Measure' : 'Improve'}</small></label>)}<p className="z-note">Try the checklist. This is a product example.</p></div><div className="z-bento-copy"><h3>Know what to do next.</h3><p>A focused action plan tied to observed gaps. Less guesswork, more useful work.</p></div></article>
      <article className="z-bento-cell z-bento-trend"><div className="z-trend-scene"><div className="z-evidence-title">The next check tells the story.<span>Example data</span></div><InsightChart data={trend} height={190}/></div><div className="z-bento-copy"><h3>Make a change. Measure it.</h3><p>Recheck your question set and see how visibility moves. Every result stays connected to its evidence.</p></div></article>
    </div><div className="z-product-bottom"><p>Explore the complete journey with sample data.</p><Link href="/demo" className="z-inline-link">Take the workspace tour <span aria-hidden="true">→</span></Link></div></section></div>;
}
