'use client';

import type { FormEvent } from 'react';
import { useReducedMotion } from 'motion/react';
import { InkButton } from '@/components/ui/InkButton';
import { NightSky } from '@/components/layout/NightPanel';
import { FREE_PROMPT_COUNT } from '@/lib/marketing/prompt-counts';

/*
 * The homepage hero. One framed night-sky panel inside the light page: the
 * promise on the left, the form on the right, and a blue horizon with the
 * wordmark ghosted beneath it. No product shot: the atmosphere carries the
 * hero and the evidence starts in the next section. Styles: app/hero.css.
 */

/** Grid cells that catch light, as [column offset from centre, row]. */
const LIT: [number, number][] = [[-10, 3], [-9, 4], [7, 2], [8, 3]];

export function HorizonHero({ onWebsite }: { onWebsite: (site: string) => void }) {
  const reduced = useReducedMotion();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const site = String(new FormData(event.currentTarget).get('site') ?? '').trim().slice(0, 120);
    onWebsite(site);
    // Land on the form itself with the cursor in the next empty field.
    requestAnimationFrame(() => {
      const field = document.getElementById('field-businessName');
      field?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      field?.focus({ preventScroll: true });
    });
  }

  return (
    <div className="hz-wrap">
      <section className="hz hz-home" aria-labelledby="hz-title">
        <NightSky cells={LIT} />

        <div className="hz-inner">
          <div>
            <span className="hz-badge"><b>Free audit</b>{FREE_PROMPT_COUNT} real buyer questions</span>
            <h1 id="hz-title" className="hz-title">AI already recommends someone. <span>Make it you.</span></h1>
          </div>
          <div className="hz-side">
            <p className="hz-sub">Right now, buyers are asking ChatGPT and Gemini who to choose in your category, and AI is naming a few businesses. We show you exactly who it names instead of you, then make it name you.</p>
            <form onSubmit={submit} className="hz-form">
              <label htmlFor="hero-site" className="sr-only">Your website</label>
              <input id="hero-site" name="site" inputMode="url" autoComplete="url" placeholder="yourwebsite.com" />
              <InkButton type="submit" tone="paper">Get my free audit</InkButton>
            </form>
            <p className="hz-note">Free. Real answers, word for word. If AI already names you, we’ll tell you that too.</p>
          </div>
        </div>
        <div className="hz-space" />
      </section>
    </div>
  );
}
