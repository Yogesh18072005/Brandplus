'use client';

import { useId, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ArrowIcon } from './AnswerPreview';

gsap.registerPlugin(useGSAP);
export interface EvidenceDocument { label: string; title: string; detail: string }
const exampleDocuments: EvidenceDocument[] = [
  { label: '01 / Question', title: 'Where do buyers look?', detail: 'Which project tool is best for a small design studio?' },
  { label: '02 / Observation', title: 'Keep the actual answer.', detail: 'An answer excerpt, the brands it mentions, and the sources it cites.' },
  { label: '03 / Next move', title: 'Turn evidence into action.', detail: 'Make creative approvals and client handoff easier for a buyer to compare.' },
];

/** An original folder interaction, inspired by the physical metaphor in the reference. */
export function EvidenceFolder({ documents = exampleDocuments, label = 'Open the evidence', caption = 'Illustrative evidence file' }: { documents?: EvidenceDocument[]; label?: string; caption?: string }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const id = useId();
  const reduced = useReducedMotion();
  const active = documents[selected] ?? documents[0];
  return <div className={`evidence-folder ${open ? 'is-open' : ''}`}>
    <button type="button" className="folder-trigger" aria-expanded={open} aria-controls={id} onClick={() => setOpen(v => !v)}>
      <span className="folder-back"/>
      {documents.slice(0,3).map((doc,i) => <span key={doc.label} className={`folder-document folder-document-${i}`}><span>{doc.label}</span><strong>{doc.title}</strong><i/><i/><i/></span>)}
      <span className="folder-front"><span className="folder-stamp">Z / EVIDENCE</span><strong>Every answer.<br/>A paper trail.</strong><span className="folder-bottom">{caption}<span className="folder-plus">{open ? '−' : '+'}</span></span></span>
      <span className="folder-trigger-label">{open ? 'Close evidence' : label} <ArrowIcon diagonal/></span>
    </button>
    <div id={id} hidden={!open} className="folder-inspector">
      <div className="folder-tabs" role="group" aria-label="Evidence documents">{documents.map((doc,i) => <button key={doc.label} type="button" aria-pressed={selected === i} onClick={() => setSelected(i)}>{doc.label}</button>)}</div>
      <AnimatePresence mode="wait"><motion.div key={selected} initial={reduced ? false : {opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:.2}}><strong>{active?.title}</strong><p>{active?.detail}</p></motion.div></AnimatePresence>
    </div>
  </div>;
}

const pipelineStages = [
  ['A buyer asks.', 'Which tool is right for my design studio?', 'A question with real buying intent.'],
  ['AI answers.', 'Northstar and Formwork are worth comparing.', 'The full answer, saved for inspection.'],
  ['You find the gap.', 'Your client approval workflow is missing.', 'An observed gap becomes a useful next step.'],
];
export function AnswerPipeline() {
  const [stage,setStage] = useState(0);
  const reduced=useReducedMotion();
  const ref=useRef<HTMLDivElement>(null);
  useGSAP(()=>{
    if(reduced)return;
    gsap.fromTo('.pipeline-line-fill',{scaleX:0},{scaleX:1,duration:.55,ease:'power3.out'});
  },{scope:ref,dependencies:[stage,reduced],revertOnUpdate:true});
  return <div className="answer-pipeline" ref={ref}>
    <div className="pipeline-stations" role="group" aria-label="Explore the audit sequence">{['Question','Answer','Opportunity'].map((label,i)=><button type="button" key={label} aria-pressed={stage===i} onClick={()=>setStage(i)}><span>{i===0?'Q':i===1?'A':'↗'}</span>{label}</button>)}<div className="pipeline-line"><i className="pipeline-line-fill"/></div></div>
    <AnimatePresence mode="wait"><motion.div className="pipeline-result" key={stage} initial={reduced?false:{opacity:0,y:16,rotateX:-8}} animate={{opacity:1,y:0,rotateX:0}} exit={{opacity:0,y:-8}} transition={{duration:.28}}><span>0{stage+1} / {pipelineStages[stage]![0]}</span><strong>{pipelineStages[stage]![1]}</strong><p>{pipelineStages[stage]![2]}</p></motion.div></AnimatePresence>
    <button type="button" className="pipeline-next" onClick={()=>setStage((stage+1)%3)}>Follow the signal <ArrowIcon/></button>
  </div>;
}

export function ComparisonLens() {
  const [after,setAfter]=useState(false);
  const values=after?[72,58,44]:[38,58,44];
  return <div className="comparison-lens"><div className="lens-switch" role="group" aria-label="Example measurement"><button type="button" aria-pressed={!after} onClick={()=>setAfter(false)}>Baseline</button><button type="button" aria-pressed={after} onClick={()=>setAfter(true)}>After a recheck</button></div><div className="lens-chart">{values.map((value,i)=><div key={i}><span>{['Your business','Northstar','Formwork'][i]}</span><div><i style={{transform:`scaleX(${value/100})`} as CSSProperties}/></div><strong>{value}</strong></div>)}</div><p>Illustrative scores / 100 · Results can rise or fall.</p></div>;
}

export function ActionStack() {
  const [checked,setChecked]=useState(false);
  return <div className={`action-stack ${checked?'is-checked':''}`}><div className="action-underlay"/><div className="action-ticket"><header><span>YOUR NEXT MOVE</span><span>01</span></header><h4>Make your expertise<br/>easier to discover.</h4><p>Connected to buyer question #03</p><button type="button" aria-pressed={checked} onClick={()=>setChecked(v=>!v)}><span className="action-checkbox">{checked?'✓':''}</span>{checked?'Added to your example plan':'Add to example plan'}<ArrowIcon/></button></div><span className="action-receipt">{checked?'NEXT: MAKE THE CHANGE, THEN RECHECK':'FINDING → EVIDENCE → ACTION'}</span></div>;
}

