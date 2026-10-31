'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { PROOF_HERO, PROOF_RECORDED_ON, PROOF_TALLY } from '@/lib/marketing/proof-case';

/*
 * The hero's one moment: a real buyer, ready to buy, asks Gemini. The real
 * answer streams in, the brands it recommends light up, its sources appear,
 * and then the verdict lands on the business that was left out.
 * Plays once. Reduced motion shows the finished state.
 */

type Phase = 'idle' | 'asking' | 'answering' | 'sources' | 'verdict';
const ORDER: Phase[] = ['idle', 'asking', 'answering', 'sources', 'verdict'];

const NAMES = PROOF_HERO.named;
const NAME_PATTERN = new RegExp(`(${NAMES.join('|')})`, 'g');
const WORDS = PROOF_HERO.quote.split(' ');
const subject = PROOF_TALLY.find((row) => row.subject)!;

function Answer({ words }: { words: number }) {
  const text = WORDS.slice(0, words).join(' ');
  return (
    <>
      {text.split(NAME_PATTERN).map((part, i) => (NAMES.includes(part) ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>))}
      {words >= WORDS.length && <span className="ha-ellipsis">…</span>}
    </>
  );
}

export function HeroAnswer() {
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('idle');
  const [chars, setChars] = useState(0);
  const [words, setWords] = useState(0);
  const at = (p: Phase) => ORDER.indexOf(phase) >= ORDER.indexOf(p);

  useEffect(() => {
    if (reduced) {
      setChars(PROOF_HERO.question.length);
      setWords(WORDS.length);
      setPhase('verdict');
      return;
    }
    let t: ReturnType<typeof setTimeout>;
    if (phase === 'idle') { if (!seen) return; t = setTimeout(() => setPhase('asking'), 400); }
    else if (phase === 'asking') {
      t = chars < PROOF_HERO.question.length
        ? setTimeout(() => setChars((c) => Math.min(PROOF_HERO.question.length, c + 2)), 22)
        : setTimeout(() => setPhase('answering'), 650);
    } else if (phase === 'answering') {
      t = words < WORDS.length ? setTimeout(() => setWords((w) => w + 1), 85) : setTimeout(() => setPhase('sources'), 500);
    } else if (phase === 'sources') t = setTimeout(() => setPhase('verdict'), 1100);
    return () => clearTimeout(t!);
  }, [phase, chars, words, reduced, seen]);

  function replay() {
    setChars(0);
    setWords(0);
    setPhase('asking');
  }

  return (
    <figure ref={ref} className="ha" aria-label="A real Gemini answer, replayed">
      <div className="ha-bar">
        <span className="ha-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="ha-real"><i aria-hidden="true" /> A real AI answer · {PROOF_RECORDED_ON}</span>
      </div>

      <div className="ha-body">
        <p className="ha-who">A buyer, ready to sign up today, asked AI:</p>
        <p className={`ha-q ${at('asking') ? 'is-on' : ''}`}>
          {PROOF_HERO.question.slice(0, chars)}
          {phase === 'asking' && <i className="ha-caret" aria-hidden="true" />}
        </p>

        <div className={`ha-a ${at('answering') ? 'is-on' : ''}`}>
          <span className="ha-avatar" aria-hidden="true">✳</span>
          <p>{phase === 'asking' ? <span className="ha-typing" aria-hidden="true"><i /><i /><i /></span> : <Answer words={words} />}</p>
        </div>

        <div className={`ha-sources ${at('sources') ? 'is-on' : ''}`}>
          <span>Sources it read</span>
          {PROOF_HERO.sources.map((domain, i) => <b key={domain} style={{ transitionDelay: `${i * 90}ms` }}>{domain}</b>)}
        </div>
      </div>

      <div className={`ha-verdict ${at('verdict') ? 'is-on' : ''}`}>
        <div className="ha-verdict-copy">
          <span className="ha-x" aria-hidden="true">×</span>
          <p><strong>A well-built rival wasn’t named.</strong> Not here, and not in any of the 8 buyer questions we asked.</p>
        </div>
        <div className="ha-score"><b>{subject.answers}</b><span>of 8 answers</span></div>
      </div>

      <figcaption className="ha-caption">
        <span>The AI’s words, unedited. We hide the name of the business we audited.</span>
        {phase === 'verdict' && !reduced && <button type="button" onClick={replay}>Replay ↺</button>}
      </figcaption>
      <p className="sr-only">A buyer asked Gemini: “{PROOF_HERO.question}” Gemini answered: “{PROOF_HERO.quote}…” The startup we audited was named in 0 of 8 answers.</p>
    </figure>
  );
}
