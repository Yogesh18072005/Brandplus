'use client';

import { markJourney } from '@/lib/client/journey';
import { useState, type FormEvent, type ReactNode } from 'react';
import { InkButton } from '@/components/ui/InkButton';

type Topic = 'fixes' | 'more_audits';

interface TalkToUsProps {
  topic: Topic;
  projectId?: string;
  eyebrow: string;
  title: string;
  body: ReactNode;
  points?: string[];
  cta: string;
  className?: string;
  /** Shared-report mode: the reader isn't signed in, so ask for an email and tie the request to this report. */
  reportId?: string;
  /** When a booking link exists, lead with it: a call converts better than a form. */
  bookingFirst?: string;
}

const NOTE_PLACEHOLDER: Record<Topic, string> = {
  fixes: 'Anything we should know? e.g. “We’re launching a new product line in March.”',
  more_audits: 'How many audits, and for which businesses or markets?',
};

function bookingUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_BOOKING_URL?.trim();
  return url && /^https:\/\//.test(url) ? url : null;
}

/**
 * The client's one path to a person: ask us to do the fixes, or for more audits.
 * Posts to /api/talk, which emails the founder (replies go straight to the
 * client) and confirms receipt to the client.
 */
export function TalkToUs({ topic, projectId, eyebrow, title, body, points, cta, className = '', reportId, bookingFirst }: TalkToUsProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [sentTo, setSentTo] = useState('');
  const [error, setError] = useState('');
  const booking = bookingUrl();
  // Same button as the marketing site: white on the dark card, ink on the light variant.
  const tone = className.includes('zw-talk-light') ? 'ink' : 'paper';

  async function submit(event: FormEvent) {
    event.preventDefault();
    setState('sending');
    setError('');
    try {
      const optional = {
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      };
      const res = await fetch(reportId ? '/api/fix-plan-request' : '/api/talk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportId
          ? { reportId, email: email.trim(), ...optional }
          : { topic, ...(projectId ? { projectId } : {}), ...optional }),
      });
      const data = await res.json().catch(() => ({}));
      // A lapsed session is redirected to the sign-in page (HTML, 200), so only
      // the route's own confirmation counts as sent.
      if (res.redirected || data.ok !== true) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Your session expired. Refresh the page, sign in, and try again.');
      }
      setSentTo(typeof data.email === 'string' ? data.email : '');
      setState('sent');
      if (projectId) markJourney('walkthrough', projectId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      setState('idle');
    }
  }

  return (
    <section className={`zw-card zw-talk ${className}`} aria-label={title}>
      <div className="zw-talk-copy">
        <p className="zw-label zw-label-mint"><i aria-hidden="true" />{eyebrow}</p>
        <h2>{title}</h2>
        <div className="zw-talk-body">{body}</div>
        {points && points.length > 0 && (
          <ul className="zw-talk-points">
            {points.map((point) => <li key={point}>{point}</li>)}
          </ul>
        )}
      </div>

      <div className="zw-talk-action">
        {state === 'sent' ? (
          <div className="zw-talk-done" role="status">
            <span className="zw-talk-check" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
            </span>
            <strong>Request sent</strong>
            <p>A real person will reply{sentTo ? <> to <b>{sentTo}</b></> : null} within one working day.{reportId ? null : <> We sent you a copy.</>}</p>
          </div>
        ) : open ? (
          <form className="zw-talk-form" onSubmit={submit}>
            {reportId && (
              <label>
                <span>Your work email</span>
                <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" maxLength={254} />
              </label>
            )}
            <label>
              <span>Phone or WhatsApp <em>optional</em></span>
              <input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98xxx xxxxx" maxLength={40} />
            </label>
            <label>
              <span>Note <em>optional</em></span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={NOTE_PLACEHOLDER[topic]} rows={3} maxLength={1000} />
            </label>
            {error && <p className="zw-talk-error" role="alert">{error}</p>}
            <div className="zw-talk-buttons">
              <InkButton type="submit" tone={tone} disabled={state === 'sending'}>
                {state === 'sending' ? 'Sending…' : 'Send request'}
              </InkButton>
              <button type="button" className="zw-talk-cancel" onClick={() => setOpen(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          bookingFirst && booking ? (
            <>
              <InkButton href={booking} target="_blank" tone={tone} className="self-start">
                {bookingFirst}
              </InkButton>
              <button type="button" className="zw-talk-alt" onClick={() => setOpen(true)}>Rather not talk? Get it by email →</button>
              <p className="zw-talk-fine">Free. No obligation. Keep the plan either way.</p>
            </>
          ) : (
            <>
              <InkButton type="button" tone={tone} className="self-start" onClick={() => setOpen(true)}>
                {cta}
              </InkButton>
              {booking && <a href={booking} target="_blank" rel="noreferrer" className="zw-talk-alt">Or pick a time on the calendar →</a>}
              <p className="zw-talk-fine">No obligation. We reply within one working day.</p>
            </>
          )
        )}
      </div>
    </section>
  );
}
