'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowIcon } from '@/components/landing/AnswerPreview';

const steps = [
  { title: 'Choose your business.', text: 'Use the business selector to switch projects. Each project keeps its own questions, reports, and evidence.' },
  { title: 'Follow a buyer question.', text: 'Choose a missed question to inspect the answer and the related action. Open the full report for the complete evidence.' },
  { title: 'Make a change you can measure.', text: 'Review the action in your project, keep its source evidence, and recheck the same questions when you are ready.' },
];

export function WorkspaceTour({ storageKey = 'brandpulse-tour-v3' }: { storageKey?: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [seen, setSeen] = useState(true);
  const reduced = useReducedMotion();
  useEffect(() => { try { setSeen(localStorage.getItem(storageKey) === 'done'); } catch { setSeen(false); } }, [storageKey]);
  function close() { setOpen(false); setSeen(true); try { localStorage.setItem(storageKey, 'done'); } catch {} }
  return <section className="workspace-tour" aria-label="Workspace guide"><div className="workspace-tour-bar"><span>{seen ? 'A little guidance, whenever you need it.' : 'New here? Get to know your workspace.'}</span><button type="button" onClick={() => { if (open) close(); else { setStep(0); setOpen(true); } }} aria-expanded={open} aria-controls="workspace-guide">{open ? 'Close guide' : 'Show me around'}<ArrowIcon/></button></div>
    {open && <div className="workspace-guide" id="workspace-guide"><div className="guide-progress" aria-label={`Step ${step + 1} of ${steps.length}`}>{steps.map((item, index) => <button type="button" key={item.title} onClick={() => setStep(index)} aria-label={`Step ${index + 1}: ${item.title}`} aria-current={step === index ? 'step' : undefined}>{index + 1}</button>)}</div><AnimatePresence mode="wait" initial={false}><motion.div key={step} initial={reduced ? false : { opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: .16 }}><h2>{steps[step]!.title}</h2><p>{steps[step]!.text}</p></motion.div></AnimatePresence><button type="button" className="workspace-button" onClick={() => step === steps.length - 1 ? close() : setStep(step + 1)}>{step === steps.length - 1 ? 'Got it' : 'Next'}<ArrowIcon/></button></div>}
  </section>;
}
