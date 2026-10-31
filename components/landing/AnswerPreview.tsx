'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

const examples = [
  { label: 'Software', question: 'Which project management tool works best for a small design studio?', answer: 'Compare tools by client collaboration, project views, and the way your team manages feedback.', evidence: 'A clear client-collaboration page gives buyers specific details to compare: guest access, feedback, and approvals.', action: 'Make your client workflow easier to evaluate.', deliverable: 'A focused page explaining how client feedback and approvals work, supported by product screenshots.' },
  { label: 'Services', question: 'How do I choose a packaging supplier for a new product?', answer: 'Evaluate material options, minimum order quantities, sampling, and relevant production experience.', evidence: 'Material specifications and sampling information help buyers evaluate a supplier. Claims need supporting sources.', action: 'Bring your product evidence together.', deliverable: 'A buyer-facing capability page with verified materials, sampling steps, and order requirements.' },
  { label: 'Local business', question: 'What should I look for in a local dental practice?', answer: 'Look for clearly described treatments, practitioner credentials, appointment availability, and patient information.', evidence: 'Specific treatment and practitioner information is more useful to a buyer than a general claim about quality.', action: 'Answer the questions people ask before booking.', deliverable: 'A treatment page with verified practitioner details, available services, and the next step to book.' },
];

export function ArrowIcon({ diagonal = false }: { diagonal?: boolean }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{diagonal ? <path d="M6 18 18 6M6 6h12v12"/> : <path d="M4 12h15m-6-6 6 6-6 6"/>}</svg>;
}

export function AnswerPreview({ compact = false }: { compact?: boolean }) {
  const [selected, setSelected] = useState(0);
  const [step, setStep] = useState(0);
  const reduced = useReducedMotion();
  const example = examples[selected]!;
  return <div className={`answer-preview ${compact ? 'answer-preview-compact' : ''}`}>
    <header><span className="answer-preview-brand"><span className="answer-dot"/> Answer explorer</span><span className="answer-example">Illustrative example</span></header>
    {!compact && <div className="answer-sectors" aria-label="Choose an example business">{examples.map((item, index) => <button type="button" aria-pressed={selected === index} onClick={() => { setSelected(index); setStep(0); }} key={item.label}>{item.label}</button>)}</div>}
    <div className="answer-question"><span className="answer-q">Q</span><h3>{example.question}</h3></div>
    <div className="answer-tabs" role="tablist" aria-label="Explore the answer">{['The answer', 'The evidence', 'Your next move'].map((label, index) => <button key={label} type="button" id={`${compact ? 'compact' : 'full'}-answer-tab-${index}`} role="tab" aria-selected={step === index} aria-controls={`${compact ? 'compact' : 'full'}-answer-panel`} onClick={() => setStep(index)} onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); const next = (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3; setStep(next); document.getElementById(`${compact ? 'compact' : 'full'}-answer-tab-${next}`)?.focus(); } }} tabIndex={step === index ? 0 : -1}>{label}</button>)}</div>
    <div className="answer-body" id={`${compact ? 'compact' : 'full'}-answer-panel`} role="tabpanel" aria-labelledby={`${compact ? 'compact' : 'full'}-answer-tab-${step}`}>
      <AnimatePresence mode="wait" initial={false}><motion.div key={`${selected}-${step}`} initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .18 }}>
        {step === 0 ? <><p className="answer-excerpt">{example.answer}</p><div className="answer-observation"><span className="answer-ring"/><div><strong>Is your business part of this answer?</strong><p>A real audit checks for your business and keeps the response for you to inspect.</p></div></div></> : step === 1 ? <><p className="answer-excerpt">{example.evidence}</p><div className="answer-source"><span>What a real report keeps</span><strong>Answer text · citations · source pages</strong><p>Every finding stays connected to its observation.</p></div></> : <><h4>{example.action}</h4><p className="answer-excerpt">{example.deliverable}</p><p className="answer-footnote">Example only. Your recommendations depend on your audit evidence.</p></>}
      </motion.div></AnimatePresence>
    </div>
    <footer><span>Follow the question. See the evidence.</span><button type="button" onClick={() => setStep((step + 1) % 3)}>{step === 2 ? 'Back to answer' : 'Continue'}<ArrowIcon/></button></footer>
  </div>;
}
