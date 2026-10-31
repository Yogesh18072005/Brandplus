'use client';

import { useEffect, useState } from 'react';
import { PLANS, type PlanId } from '@/lib/billing/plans';
import { getEffectivePlan, planExpiryLabel } from '@/lib/billing/effective-plan';
import type { ReactNode } from 'react';
import { Check, Plus, Wrench } from 'lucide-react';

interface PaymentRow {
  id: string;
  plan_id: string;
  amount_paise: number;
  currency: string;
  status: string;
  paid_at: string | null;
  created_at: string;
}

interface Summary {
  plan: PlanId;
  planExpiresAt: string | null;
  projectCount: number;
  payments: PaymentRow[];
}

/**
 * Plan & audits. No public price list: more audits and done-for-you fixes are
 * scoped per business, so both routes go to a person.
 */
export default function BillingPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/billing/payments')
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) { setError(data.error ?? 'Could not load your plan'); return; }
        setSummary({
          plan: (data.plan as PlanId) ?? 'free',
          planExpiresAt: data.planExpiresAt ?? null,
          projectCount: data.projectCount ?? 0,
          payments: data.payments ?? [],
        });
      })
      .catch(() => { if (!cancelled) setError('Could not load your plan'); });
    return () => { cancelled = true; };
  }, []);

  const effectivePlan = summary ? getEffectivePlan({ plan: summary.plan, plan_expires_at: summary.planExpiresAt }) : 'free';
  const plan = PLANS[effectivePlan];
  const limits = plan.limits;
  const expiry = planExpiryLabel(summary?.planExpiresAt ?? null);
  const active = effectivePlan !== 'free' && summary?.planExpiresAt && new Date(summary.planExpiresAt).getTime() > Date.now();

  const used = summary?.projectCount ?? 0;
  const cap = limits.maxProjects === -1 ? Math.max(used, 1) : limits.maxProjects;
  const arc = Math.PI * 70;

  return (
    <div className="mx-auto w-full max-w-[1240px]">
      <header className="px-1 pt-2 pb-6">
        <h1 className="text-[clamp(30px,3.2vw,44px)] leading-none font-semibold tracking-[-0.04em] text-[#171425]">Plan</h1>
        <p className="mt-3 text-[14.5px] text-[#524f6d]">What your account includes. Need more, or want us to do the fixes? Ask below and a person replies.</p>
      </header>

      {error && <p className="mb-3 rounded-[16px] bg-[#fdecec] px-5 py-3 text-[14px] text-[#c2352f]" role="alert">{error}</p>}

      <div className="grid gap-3 lg:grid-cols-12">
        <section className="relative overflow-hidden rounded-[24px] bg-[#121118] p-7 text-white lg:col-span-5">
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(70%_60%_at_100%_0%,rgb(40_116_225/0.4),transparent)]" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-white/55">Your plan</p>
              <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${effectivePlan === 'free' ? 'bg-white/10 text-white/80' : active ? 'bg-presence text-white' : 'bg-[#fdecec] text-[#c2352f]'}`}>{effectivePlan === 'free' ? 'Free' : active ? 'Active' : 'Ended'}</span>
            </div>
            <p className="mt-3 text-[34px] leading-none font-semibold tracking-[-0.035em]">{summary ? plan.name : '…'}</p>
            <p className="mt-3 max-w-[28em] text-[14px] leading-relaxed text-white/65">
              {effectivePlan === 'free' ? 'Your free audit covers one business: every answer word for word, and your fix plan.' : active ? `Active until ${expiry}.` : expiry ? `Ended on ${expiry}. Ask us below to continue.` : ''}
            </p>
            <div className="mt-7 flex items-end gap-6">
              <div className="relative h-[92px] w-[170px]">
                <svg viewBox="0 0 170 92" className="absolute inset-0 h-full w-full" aria-hidden="true">
                  <path d="M15 85 A70 70 0 0 1 155 85" fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth="14" strokeLinecap="round" />
                  <path d="M15 85 A70 70 0 0 1 155 85" fill="none" stroke="#463eda" strokeWidth="14" strokeLinecap="round" strokeDasharray={arc} strokeDashoffset={arc * (1 - Math.min(1, used / cap))} style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.65,0,.35,1)' }} />
                </svg>
                <p className="absolute inset-x-0 bottom-0 text-center text-[26px] leading-none font-semibold tabular-nums">{used}<span className="text-[15px] text-white/45">/{limits.maxProjects === -1 ? '∞' : limits.maxProjects}</span></p>
              </div>
              <p className="pb-1 text-[13px] text-white/60">businesses<br />on this account</p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:col-span-7">
          {[
            { k: 'Audits per month', v: limits.auditsPerMonth === -1 ? 'Unlimited' : String(limits.auditsPerMonth) },
            { k: 'Buyer questions per audit', v: String(limits.promptsPerAudit) },
            { k: 'Weekly tracking', v: limits.weeklyTracking ? 'Included' : 'Not included' },
            { k: 'Answers recorded', v: 'Word for word' },
          ].map((f) => (
            <div key={f.k} className="rounded-[24px] bg-white p-6">
              <p className="text-[13px] text-[#7d7a94]">{f.k}</p>
              <p className="mt-2 text-[24px] font-semibold tracking-[-0.02em] text-[#171425]">{f.v}</p>
            </div>
          ))}
        </section>

        <RequestCard topic="more_audits" icon={<Plus className="size-5" />} title="More audits" text="Deeper audits, more businesses, or a re-check after your changes go live." cta="Ask for more audits" />
        <RequestCard topic="fixes" icon={<Wrench className="size-5" />} title="Done for you" text="We write and publish the pages your audit says are missing, then re-check." cta="Ask us to do the fixes" dark />

        <section className="rounded-[24px] bg-white p-6 lg:col-span-12">
          <p className="text-[15px] font-semibold text-[#171425]">Payment history</p>
          {summary && summary.payments.length > 0 ? (
            <ul className="mt-4 divide-y divide-[#efeef4]">
              {summary.payments.map((payment) => (
                <li key={payment.id} className="flex items-center gap-4 py-3.5">
                  <span className="grid size-10 place-items-center rounded-full bg-[#f2f1f5] text-[13px] font-bold text-[#171425] uppercase">{payment.plan_id[0]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-semibold text-[#171425] capitalize">{payment.plan_id} plan</p>
                    <p className="text-[12.5px] text-[#7d7a94]">{new Date(payment.paid_at ?? payment.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold capitalize ${payment.status === 'paid' || payment.status === 'captured' ? 'bg-[#e3f6ec] text-presence' : 'bg-[#f2f1f7] text-[#5b567a]'}`}>{payment.status}</span>
                  <span className="w-24 text-right text-[15px] font-semibold text-[#171425] tabular-nums">₹{(payment.amount_paise / 100).toLocaleString('en-IN')}</span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-[14px] text-[#7d7a94]">No payments yet. The free audit doesn’t need a card.</p>}
        </section>
      </div>
    </div>
  );
}

/** One-tap request to a person; no form. The reply goes to the account email. */
function RequestCard({ topic, icon, title, text, cta, dark = false }: { topic: 'more_audits' | 'fixes'; icon: ReactNode; title: string; text: string; cta: string; dark?: boolean }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');
  async function send() {
    setState('sending');
    setError('');
    try {
      const res = await fetch('/api/talk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok !== true) throw new Error(typeof data.error === 'string' ? data.error : 'Couldn’t send. Try again.');
      setState('sent');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t send. Try again.');
      setState('idle');
    }
  }
  return (
    <section className={`flex flex-col rounded-[24px] p-6 lg:col-span-6 ${dark ? 'bg-[#121118] text-white' : 'bg-white'}`}>
      <span className={`grid size-10 place-items-center rounded-full ${dark ? 'bg-white/10 text-white' : 'bg-[#f2f1f5] text-[#171425]'}`}>{icon}</span>
      <p className={`mt-4 text-[17px] font-semibold tracking-[-0.015em] ${dark ? 'text-white' : 'text-[#171425]'}`}>{title}</p>
      <p className={`mt-1.5 max-w-[30em] text-[14px] leading-relaxed ${dark ? 'text-white/65' : 'text-[#524f6d]'}`}>{text}</p>
      <div className="mt-auto pt-6">
        {state === 'sent' ? (
          <p className={`inline-flex items-center gap-2 text-[14px] font-semibold ${dark ? 'text-[#7ee2b0]' : 'text-presence'}`}><Check className="size-4" />Sent. A person replies within one working day.</p>
        ) : (
          <button type="button" onClick={send} disabled={state === 'sending'}
            className={`inline-flex h-10 items-center rounded-full px-4 text-[13.5px] font-semibold disabled:opacity-60 ${dark ? 'bg-white text-[#121118]' : 'bg-[#121118] text-white'}`}>
            {state === 'sending' ? 'Sending…' : cta}
          </button>
        )}
        {error && <p className="mt-2 text-[13px] text-[#e5534b]" role="alert">{error}</p>}
      </div>
    </section>
  );
}
