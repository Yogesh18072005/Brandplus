'use client';

import { markJourney } from '@/lib/client/journey';
import { useEffect, useState } from 'react';
import { InkButton } from '@/components/ui/InkButton';

/**
 * Shown while a client waits for their first report: pick a time for the
 * 15-minute walkthrough. With NEXT_PUBLIC_BOOKING_URL set it opens that
 * calendar; otherwise the chosen slot is sent to us through /api/talk (which
 * emails the founder) and we confirm by email.
 */

const SLOTS = ['10:00', '12:30', '15:00', '17:30'];

function nextWeekdays(count: number) {
  const out: Date[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (out.length < count) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) out.push(new Date(d));
  }
  return out;
}

function bookingUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_BOOKING_URL?.trim();
  return url && /^https:\/\//.test(url) ? url : null;
}

export function BookWalkthrough({ projectId, businessName }: { projectId: string; businessName: string }) {
  // Dates and timezone are the visitor's own, so compute them in the browser only.
  const [days, setDays] = useState<Date[]>([]);
  const [zone, setZone] = useState('');
  useEffect(() => { setDays(nextWeekdays(5)); setZone(Intl.DateTimeFormat().resolvedOptions().timeZone); }, []);
  const [day, setDay] = useState<number | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');
  const booking = bookingUrl();
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

  async function request() {
    if (day === null || slot === null) return;
    setState('sending');
    setError('');
    try {
      const res = await fetch('/api/talk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'fixes', projectId, note: `Walkthrough call request for ${businessName}: ${fmt(days[day]!)} at ${SLOTS[slot]} (${zone}).` }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.redirected || data.ok !== true) throw new Error(typeof data.error === 'string' ? data.error : 'Your session expired. Refresh the page and try again.');
      setState('sent');
      markJourney('walkthrough', projectId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
      setState('idle');
    }
  }

  return (
    <section className="sr-card" aria-label="Book your walkthrough">
      <p className="sr-label">While you wait</p>
      <h2>Book your 15-minute walkthrough</h2>
      <p className="sr-sub">Once your report is ready, we walk you through it and hand you your fix plan. Free, and you keep the plan either way.</p>

      {booking ? (
        <InkButton href={booking} target="_blank" className="mt-2 self-start">Pick a time on the calendar</InkButton>
      ) : state === 'sent' ? (
        <p role="status" className="mt-2 text-[15px] font-medium text-[#17784e]">✓ Requested for {fmt(days[day!]!)} at {SLOTS[slot!]}. We’ll confirm by email within one working day.</p>
      ) : (
        <div className="mt-2 grid gap-3">
          <div role="group" aria-label="Day" className="flex flex-wrap gap-1.5">
            {days.map((d, i) => (
              <button key={d.toISOString()} type="button" aria-pressed={day === i} onClick={() => setDay(i)} className={`rounded-[10px] px-3 py-2 text-[13.5px] font-medium transition-colors ${day === i ? 'bg-[#0e0b19] text-white' : 'bg-[#f3f3f8] text-[#413d58] hover:bg-[#e9e9f2]'}`}>{fmt(d)}</button>
            ))}
          </div>
          <div role="group" aria-label="Time" className="flex flex-wrap gap-1.5">
            {SLOTS.map((t, i) => (
              <button key={t} type="button" disabled={day === null} aria-pressed={slot === i} onClick={() => setSlot(i)} className={`rounded-[10px] px-3 py-2 text-[13.5px] font-medium tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${slot === i ? 'bg-brand text-white' : 'bg-[#f3f3f8] text-[#413d58] hover:bg-[#e9e9f2]'}`}>{t}</button>
            ))}
            <span className="self-center text-[12.5px] text-[#676480]">Your time ({zone})</span>
          </div>
          {error && <p role="alert" className="text-[13.5px] text-[#d93036]">{error}</p>}
          <InkButton type="button" onClick={() => void request()} disabled={day === null || slot === null || state === 'sending'} className="self-start">
            {state === 'sending' ? 'Requesting…' : 'Request this time'}
          </InkButton>
        </div>
      )}
    </section>
  );
}
