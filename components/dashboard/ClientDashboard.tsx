'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, ArrowUpRight, Check, Download, Link2, Search } from 'lucide-react';
import type { SimpleReport, SimpleVerdict } from '@/lib/reports/simple-report';
import type { DashboardBusiness } from '@/lib/dashboard/load-businesses';
import { RequestAuditButton } from '@/components/report/simple/RequestAuditButton';
import { hasJourney, markJourney } from '@/lib/client/journey';
import { AiLogo } from '@/components/brand/AiLogo';

export type { BusinessStage, DashboardBusiness } from '@/lib/dashboard/load-businesses';

/*
 * The client's overview, after the dashboard references (Fenco, iDraft,
 * Salesforce invoices). It answers the customer's questions in order:
 *   How am I doing?          → the dark headline card
 *   Is it getting better?    → the trend across checks
 *   Who is beating me?       → share of answers + competitors list
 *   What should I do next?   → the next-step checklist
 *   What exactly did AI say? → the missed questions, and every question in a
 *                              list/detail view
 * Built on the plain-language report, so nothing here is invented.
 */

const INK = 'text-[#171425]';
const MUTED = 'text-[#524f6d]';
const FAINT = 'text-[#7d7a94]';
const CARD = 'rounded-[24px] bg-white';
const DARK = 'rounded-[24px] bg-[#121118] text-white';
const PILL = 'inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13.5px] font-semibold no-underline transition-colors';
const PILL_INK = `${PILL} bg-[#121118] text-white! hover:bg-[#282633]`;
const PILL_SOFT = `${PILL} bg-white text-[#171425]! ring-1 ring-[#e4e3ec] hover:bg-[#f6f6f9]`;
const EASE = [0.65, 0, 0.35, 1] as const;

const VERDICT: Record<SimpleVerdict, { label: string; pill: string; dot: string }> = {
  recommended: { label: 'Recommended', pill: 'bg-[#e3f6ec] text-presence', dot: 'bg-presence-bright' },
  mentioned: { label: 'Mentioned', pill: 'bg-[#eeecfe] text-brand-deep', dot: 'bg-brand' },
  missed: { label: 'Not mentioned', pill: 'bg-[#fdecec] text-[#c2352f]', dot: 'bg-[#e5534b]' },
  unclear: { label: 'Unclear', pill: 'bg-[#f2f1f7] text-[#5b567a]', dot: 'bg-[#b5b3cb]' },
};

const fmt = (iso: string | null, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', opts);
};
const initial = (name: string) => (name.trim()[0] ?? '?').toUpperCase();

function Rise({ i = 0, className = '', children }: { i?: number; className?: string; children: ReactNode }) {
  return <motion.div className={className} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: EASE, delay: i * 0.06 }}>{children}</motion.div>;
}

/* ---------- How am I doing? ---------- */

function Headline({ report, name }: { report: SimpleReport; name: string }) {
  const named = report.recommended + report.mentioned;
  const tiles = [
    { n: report.recommended, label: 'Recommended' },
    { n: report.mentioned, label: 'Mentioned' },
    { n: report.missed, label: 'Not mentioned' },
  ];
  return (
    <div className={`flex h-full flex-col justify-between p-6 ${DARK}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[15px] font-semibold">How AI talks about you</p>
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11.5px] text-white/70">{fmt(report.observedOn)}</span>
      </div>
      <div className="mt-6 flex items-end gap-4">
        <p className="text-[64px] leading-[0.85] font-semibold tracking-[-0.05em] tabular-nums">{named}<span className="text-[28px] text-white/35">/{report.total}</span></p>
        <p className="pb-1 text-[13px] leading-snug text-white/60">answers name<br />{name}</p>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-[16px] bg-white/[0.06] px-3 py-3 ring-1 ring-white/10">
            <p className="text-[24px] leading-none font-semibold tabular-nums">{t.n}</p>
            <p className="mt-1.5 text-[11.5px] text-white/55">{t.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Is it getting better? ---------- */

function Trend({ business }: { business: DashboardBusiness }) {
  const points = business.history.length ? business.history : business.report ? [{ date: business.report.observedOn ?? '', named: business.report.recommended + business.report.mentioned, total: business.report.total }] : [];
  const W = 320, H = 120, pad = 10;
  const xs = points.map((_, i) => (points.length === 1 ? W / 2 : pad + (i * (W - pad * 2)) / (points.length - 1)));
  const ys = points.map((p) => H - pad - (p.total ? (p.named / p.total) * (H - pad * 2) : 0));
  const line = xs.map((x, i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${ys[i]!.toFixed(1)}`).join(' ');
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const delta = last && prev ? last.named - prev.named : null;
  return (
    <div className={`flex h-full flex-col p-6 ${CARD}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-[15px] font-semibold ${INK}`}>Over time</p>
          <p className={`mt-0.5 text-[12.5px] ${FAINT}`}>Answers naming you, per check</p>
        </div>
        {delta !== null && <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${delta > 0 ? 'bg-[#e3f6ec] text-presence' : delta < 0 ? 'bg-[#fdecec] text-[#c2352f]' : 'bg-[#f2f1f7] text-[#5b567a]'}`}>{delta > 0 ? `+${delta}` : delta} since last</span>}
      </div>
      {points.length > 1 ? (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full flex-1" role="img" aria-label="Answers naming you over time">
            {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={0} x2={W} y1={pad + f * (H - pad * 2)} y2={pad + f * (H - pad * 2)} stroke="#efeef4" strokeDasharray="3 5" />)}
            <motion.path d={`${line} L${xs[xs.length - 1]} ${H} L${xs[0]} ${H} Z`} fill="url(#trend-fill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} />
            <motion.path d={line} fill="none" stroke="#121118" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: EASE }} />
            <defs><linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#463eda" stopOpacity="0.16" /><stop offset="1" stopColor="#463eda" stopOpacity="0" /></linearGradient></defs>
            {xs.map((x, i) => <circle key={i} cx={x} cy={ys[i]} r={i === xs.length - 1 ? 5 : 3} fill={i === xs.length - 1 ? '#463eda' : '#121118'} stroke="white" strokeWidth={2} />)}
          </svg>
          <div className="mt-2 flex justify-between text-[11.5px] text-[#9c9ab2]">{points.map((p, i) => <span key={i}>{fmt(p.date, { day: 'numeric', month: 'short' })}</span>)}</div>
        </>
      ) : (
        <div className="mt-auto pt-6">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-[13px] font-bold text-white tabular-nums">{last?.named ?? 0}/{last?.total ?? 0}</span>
            <span className="h-px flex-1 border-t-2 border-dashed border-[#d7d5e3]" />
            <span className="grid size-11 shrink-0 place-items-center rounded-full border-2 border-dashed border-[#d7d5e3] text-[12px] font-semibold text-[#9c9ab2]">next</span>
          </div>
          <div className="mt-2 flex justify-between text-[12px] text-[#7d7a94]"><span>{fmt(last?.date ?? null, { day: 'numeric', month: 'short' })}</span><span>After your fixes</span></div>
          <p className={`mt-4 text-[13px] leading-snug ${MUTED}`}>Your first check. Re-check after fixes and the trend line appears here.</p>
        </div>
      )}
    </div>
  );
}

/* ---------- Who is beating me? ---------- */

function YourSite({ report, website }: { report: SimpleReport; website: string }) {
  const you = report.sources.find((s) => s.isYou);
  return (
    <div className={`flex h-full flex-col p-6 ${CARD}`}>
      <p className={`text-[15px] font-semibold ${INK}`}>Your website</p>
      <p className={`mt-0.5 truncate text-[12.5px] ${FAINT}`}>{website.replace(/^https?:\/\//, '').replace(/\/$/, '') || 'Your site'}</p>
      <div className="mt-auto pt-6">
        <span className={`grid size-12 place-items-center rounded-full ${you ? 'bg-[#e3f6ec] text-presence' : 'bg-[#fdecec] text-[#c2352f]'}`}>{you ? <Check className="size-6" strokeWidth={2.6} /> : <span className="text-[20px] font-bold">!</span>}</span>
        <p className={`mt-4 text-[20px] leading-tight font-semibold tracking-[-0.02em] ${INK}`}>{you ? `Read in ${you.answers} of ${report.total}` : 'Not read by AI'}</p>
        <p className={`mt-1 text-[13px] ${FAINT}`}>{you ? 'answers cited your site' : `AI read ${report.sources.length} other sites instead`}</p>
      </div>
    </div>
  );
}

function Competitors({ report, name }: { report: SimpleReport; name: string }) {
  // Rendered only when AI named at least one tracked rival.
  const named = report.recommended + report.mentioned;
  const rows = [{ name, value: named, you: true }, ...report.competitors.map((c) => ({ name: c.name, value: c.answers, you: false }))];
  return (
    <div className={`h-full p-6 ${CARD}`}>
      <div className="flex items-center justify-between">
        <p className={`text-[15px] font-semibold ${INK}`}>Who AI names</p>
        <span className={`text-[12.5px] ${FAINT}`}>of {report.total} answers</span>
      </div>
      <ul className="mt-4 space-y-1">
        {rows.map((r, i) => (
          <li key={r.name} className={`flex items-center gap-3 rounded-[14px] px-2 py-2.5 ${r.you ? 'bg-[#f6f4fe]' : ''}`}>
            <span className={`grid size-10 shrink-0 place-items-center rounded-full text-[14px] font-semibold ${r.you ? 'bg-brand text-white' : 'bg-[#f2f1f5] text-[#171425]'}`}>{initial(r.name)}</span>
            <div className="min-w-0 flex-1">
              <p className={`truncate text-[14px] font-semibold ${INK}`}>{r.name}{r.you && <span className="ml-1.5 text-[12px] font-medium text-brand-deep">you</span>}</p>
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-[#efeef4]">
                <motion.span className={`block h-full rounded-full ${r.you ? 'bg-brand' : 'bg-[#121118]'}`} initial={{ width: 0 }} animate={{ width: `${Math.max(2, (r.value / Math.max(1, report.total)) * 100)}%` }} transition={{ duration: 0.9, ease: EASE, delay: i * 0.07 }} />
              </span>
            </div>
            <span className={`w-12 text-right text-[15px] font-semibold tabular-nums ${INK}`}>{r.value}<span className="text-[#b5b3cb]">/{report.total}</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- What should I do next? ---------- */

interface Step { title: string; done: boolean; action?: ReactNode; note?: string }

function useSteps(business: DashboardBusiness, demo: boolean): Step[] {
  const [read, setRead] = useState(false);
  const [walk, setWalk] = useState(false);
  useEffect(() => {
    setRead(business.reportId ? hasJourney('read', business.reportId) : false);
    setWalk(hasJourney('walkthrough', business.id));
  }, [business.id, business.reportId]);
  const ready = business.stage === 'ready';
  const href = demo ? '/report/sample' : `/dashboard/projects/${business.id}`;
  return [
    { title: 'Create your business', done: true },
    { title: 'Request your free audit', done: business.stage !== 'none', action: demo ? undefined : <RequestAuditButton projectId={business.id} buttonClassName={PILL_INK} /> },
    { title: 'We run your audit', done: ready, note: business.stage === 'requested' ? 'In our queue, usually within one working day.' : business.stage === 'running' ? 'Asking AI your buyers’ questions now.' : undefined },
    { title: 'Read your report', done: ready && read, action: ready ? <Link href={href} onClick={() => business.reportId && markJourney('read', business.reportId)} className={PILL_INK}>Open my report <ArrowRight className="size-4" /></Link> : undefined },
    { title: 'Book your free walkthrough', done: walk, action: ready ? <Link href={`${href}#sr-fix`} className={PILL_INK}>Book a time <ArrowRight className="size-4" /></Link> : undefined },
    { title: 'Fix it, then re-check', done: business.recheckOpen, action: ready && !demo ? <RequestAuditButton projectId={business.id} label="Request a re-check" buttonClassName={PILL_INK} /> : undefined },
  ];
}

function NextSteps({ business, demo }: { business: DashboardBusiness; demo: boolean }) {
  const steps = useSteps(business, demo);
  const done = steps.filter((s) => s.done).length;
  const ci = steps.findIndex((s) => !s.done);
  const current = ci === -1 ? null : steps[ci]!;
  return (
    <div className={`flex h-full flex-col p-6 ${CARD}`}>
      <div className="flex items-center justify-between">
        <p className={`text-[15px] font-semibold ${INK}`}>Your next steps</p>
        <span className={`text-[13px] font-semibold tabular-nums ${FAINT}`}>{done} of {steps.length}</span>
      </div>
      <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-[#efeef4]"><motion.span className="block h-full rounded-full bg-[#121118]" initial={{ width: 0 }} animate={{ width: `${(done / steps.length) * 100}%` }} transition={{ duration: 0.9, ease: EASE }} /></span>
      <ol className="mt-5 space-y-2.5">
        {steps.map((s, i) => (
          <li key={s.title} className="flex items-center gap-3">
            <span className={`grid size-5 shrink-0 place-items-center rounded-[6px] ring-1 ${s.done ? 'bg-[#121118] text-white ring-[#121118]' : i === ci ? 'ring-brand' : 'ring-[#d7d5e3]'}`}>{s.done && <Check className="size-3.5" strokeWidth={3} />}</span>
            <span className={`text-[14px] ${s.done ? 'text-[#9c9ab2] line-through' : i === ci ? `font-semibold ${INK}` : MUTED}`}>{s.title}</span>
          </li>
        ))}
      </ol>
      {current && (
        <div className="mt-auto pt-5">
          {current.action ?? <p className={`flex items-center gap-2 text-[13px] ${FAINT}`}><span className="size-2 animate-pulse rounded-full bg-[#f5b400]" />{current.note ?? 'Nothing for you to do. We’ll email you.'}</p>}
        </div>
      )}
    </div>
  );
}

/* ---------- What exactly did AI say? ---------- */

function QuestionCards({ business, demo }: { business: DashboardBusiness; demo: boolean }) {
  const report = business.report!;
  const missed = report.questions.filter((q) => q.verdict === 'missed');
  const pick = (missed.length ? missed : report.questions).slice(0, missed.length ? 2 : 3);
  const href = demo ? '/report/sample' : `/dashboard/projects/${business.id}`;
  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between px-1">
        <p className={`text-[15px] font-semibold ${INK}`}>{missed.length ? <>Questions you’re missing <span className={FAINT}>({missed.length})</span></> : 'Questions buyers ask'}</p>
        <a href="#all-questions" className="text-[13px] font-semibold text-[#171425]! no-underline hover:underline">All questions →</a>
      </div>
      <div className="grid flex-1 gap-3 sm:grid-cols-3">
        {pick.map((q, i) => (
          <Rise key={q.id} i={i} className="flex">
            <div className={`flex flex-1 flex-col p-5 ${CARD}`}>
              <span className={`w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold ${VERDICT[q.verdict].pill}`}>{VERDICT[q.verdict].label}</span>
              <p className={`mt-3 line-clamp-4 text-[14.5px] leading-snug font-semibold ${INK}`}>{q.question}</p>
              <p className={`mt-auto pt-4 line-clamp-2 text-[12px] ${FAINT}`}>{q.competitorsNamed.length ? `Named instead: ${q.competitorsNamed.slice(0, 2).join(', ')}` : q.quote ? `“${q.quote.slice(0, 80)}${q.quote.length > 80 ? '…' : ''}”` : 'No rival named'}</p>
            </div>
          </Rise>
        ))}
        {missed.length > 0 && (
          <Link href={`${href}#sr-fix`} className="flex flex-col items-center justify-center gap-2 rounded-[24px] border-2 border-dashed border-[#d7d5e3] p-5 text-center text-[#171425]! no-underline transition-colors hover:border-[#121118] hover:bg-white">
            <span className="grid size-10 place-items-center rounded-full bg-[#121118] text-white"><ArrowUpRight className="size-5" /></span>
            <span className="text-[14px] font-semibold">Fix these</span>
            <span className={`text-[12px] ${FAINT}`}>Free 15-min walkthrough</span>
          </Link>
        )}
      </div>
    </div>
  );
}

type Filter = 'all' | SimpleVerdict;

function AllQuestions({ business, demo }: { business: DashboardBusiness; demo: boolean }) {
  const report = business.report!;
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(report.questions[0]?.id ?? '');
  const [copied, setCopied] = useState(false);
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: report.questions.length, recommended: 0, mentioned: 0, missed: 0, unclear: 0 };
    report.questions.forEach((q) => { c[q.verdict] += 1; });
    return c;
  }, [report]);
  const shown = report.questions.filter((q) => (filter === 'all' || q.verdict === filter) && q.question.toLowerCase().includes(query.trim().toLowerCase()));
  const q = report.questions.find((x) => x.id === selected) ?? shown[0];
  const href = demo ? '/report/sample' : `/dashboard/projects/${business.id}`;

  async function copyLink() {
    if (!business.reportId) return;
    const url = new URL(`/r/${business.reportId}`, window.location.origin).toString();
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { window.prompt('Copy this link', url); }
  }

  return (
    <section id="all-questions" className={`scroll-mt-6 p-5 sm:p-6 ${CARD}`} aria-label="Every question">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={`text-[18px] font-semibold tracking-[-0.015em] ${INK}`}>Every question, every answer</p>
          <p className={`mt-0.5 text-[12.5px] ${FAINT}`}>{report.engineLabel} · {fmt(report.observedOn)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!demo && business.reportId && <a href={`/api/reports/${business.reportId}/pdf`} className={PILL_SOFT}><Download className="size-4" />PDF</a>}
          {!demo && business.reportId && <button type="button" onClick={copyLink} className={PILL_SOFT}><Link2 className="size-4" />{copied ? 'Copied' : 'Share'}</button>}
          <Link href={href} onClick={() => business.reportId && markJourney('read', business.reportId)} className={PILL_INK}>Full report <ArrowUpRight className="size-4" /></Link>
        </div>
      </div>

      {report.questions.length > 2 && <div className="mt-5 flex flex-wrap items-center gap-2">
        {(['all', 'missed', 'mentioned', 'recommended', 'unclear'] as Filter[]).filter((f) => f === 'all' || counts[f] > 0).map((f) => (
          <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}
            className={`h-9 rounded-full px-3.5 text-[13px] font-semibold transition-colors ${filter === f ? 'bg-[#121118] text-white' : 'bg-[#f4f3f7] text-[#413d58] hover:bg-[#eae9f0]'}`}>
            {f === 'all' ? 'All' : VERDICT[f].label} <span className="opacity-60">{counts[f]}</span>
          </button>
        ))}
        <label className="relative ml-auto w-full sm:w-60">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#9c9ab2]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search questions" aria-label="Search questions"
            className="h-9 w-full rounded-full bg-[#f4f3f7] pr-3 pl-10 text-[13.5px] outline-none focus:bg-white focus:ring-2 focus:ring-brand" />
        </label>
      </div>}

      {report.questions.length <= 2 ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {report.questions.map((x) => (
            <div key={x.id} className={`p-6 ${DARK}`}>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${VERDICT[x.verdict].pill}`}><i className={`size-1.5 rounded-full ${VERDICT[x.verdict].dot}`} />{VERDICT[x.verdict].label}</span>
              <p className="mt-4 text-[17px] leading-snug font-semibold tracking-[-0.01em]">“{x.question}”</p>
              <div className="mt-5 rounded-[16px] bg-white/[0.06] p-4 ring-1 ring-white/10">
                <p className="flex items-center gap-2 text-[12px] font-semibold text-white/55"><AiLogo name="gemini" className="size-3.5" />AI answered</p>
                <p className="mt-2 text-[14.5px] leading-relaxed text-white/85">{x.quote ?? 'No answer text was kept for this question.'}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
      <div className="mt-4 grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
        <ul className="max-h-[440px] space-y-1 overflow-y-auto pr-1">
          {shown.length === 0 && <li className={`px-3 py-8 text-center text-[14px] ${FAINT}`}>No questions match.</li>}
          {shown.map((x, i) => {
            const on = q?.id === x.id;
            return (
              <li key={x.id}>
                <button type="button" onClick={() => setSelected(x.id)} aria-pressed={on}
                  className={`flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left transition-colors ${on ? 'bg-[#121118] text-white' : 'hover:bg-[#f5f5f8]'}`}>
                  <span className={`grid size-9 shrink-0 place-items-center rounded-full text-[12px] font-bold tabular-nums ${on ? 'bg-white/10' : 'bg-[#f2f1f5] text-[#5b567a]'}`}>{String(i + 1).padStart(2, '0')}</span>
                  <span className={`min-w-0 flex-1 truncate text-[14px] font-medium ${on ? 'text-white' : INK}`}>{x.question}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${on ? 'bg-white/10 text-white' : VERDICT[x.verdict].pill}`}>{VERDICT[x.verdict].label}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className={`min-h-[300px] p-6 ${DARK}`}>
          <AnimatePresence mode="wait">
            {q && (
              <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3, ease: EASE }}>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${VERDICT[q.verdict].pill}`}><i className={`size-1.5 rounded-full ${VERDICT[q.verdict].dot}`} />{VERDICT[q.verdict].label}</span>
                <p className="mt-4 text-[17px] leading-snug font-semibold tracking-[-0.01em]">“{q.question}”</p>
                <div className="mt-5 rounded-[16px] bg-white/[0.06] p-4 ring-1 ring-white/10">
                  <p className="flex items-center gap-2 text-[12px] font-semibold text-white/55"><AiLogo name="gemini" className="size-3.5" />AI answered</p>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-white/85">{q.quote ?? 'No answer text was kept for this question.'}</p>
                </div>
                {q.competitorsNamed.length > 0 && (
                  <div className="mt-5">
                    <p className="text-[12px] font-semibold text-white/55">Named instead</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {q.competitorsNamed.map((c) => <span key={c} className="flex items-center gap-2 rounded-full bg-white/[0.08] py-1 pr-3 pl-1 text-[13px]"><span className="grid size-6 place-items-center rounded-full bg-white text-[11px] font-bold text-[#121118]">{initial(c)}</span>{c}</span>)}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      )}
    </section>
  );
}

/* ---------- The page ---------- */

export function ClientDashboard({ greeting, name, planLine, businesses, demo = false }: { greeting: string; name?: string; planLine?: string; businesses: DashboardBusiness[]; demo?: boolean }) {
  const [id, setId] = useState(businesses[0]?.id ?? '');
  const business = businesses.find((b) => b.id === id) ?? businesses[0];
  const report = business?.stage === 'ready' ? business.report : null;

  return (
    <div className="mx-auto w-full max-w-[1240px] space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-4 px-1 pt-2 pb-4">
        <div>
          <h1 className={`text-[clamp(30px,3.2vw,44px)] leading-none font-semibold tracking-[-0.04em] ${INK}`}>
            {greeting}{name && <>, <span className="text-[#847dc4]">{name}</span></>}
          </h1>
          <p className={`mt-3 text-[14.5px] ${MUTED}`}>{business ? (report ? `Here’s what AI tells buyers about ${business.name}.` : `We’re getting ${business.name}’s audit ready.`) : 'Add your business to start.'}{planLine && <span className={FAINT}> · {planLine}</span>}</p>
        </div>
        {businesses.length > 1 && (
          <select value={id} onChange={(e) => setId(e.target.value)} aria-label="Choose business"
            className="h-11 rounded-full bg-white px-4 text-[14px] font-semibold text-[#171425] ring-1 ring-[#e4e3ec] outline-none focus:ring-2 focus:ring-brand">
            {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
      </header>

      {!business ? (
        <div className={`p-10 text-center ${CARD}`}>
          <p className={`text-[20px] font-semibold ${INK}`}>Add your business to start</p>
          <Link href="/dashboard/onboarding" className={`mt-5 ${PILL_INK}`}>Set up my business <ArrowRight className="size-4" /></Link>
        </div>
      ) : report ? (
        <>
          <div className="grid gap-3 lg:auto-rows-[minmax(280px,auto)] lg:grid-cols-12">
            <Rise i={0} className="lg:col-span-5"><Headline report={report} name={business.name} /></Rise>
            <Rise i={1} className="lg:col-span-4"><Trend business={business} /></Rise>
            <Rise i={2} className="lg:col-span-3"><YourSite report={report} website={business.website} /></Rise>
            <Rise i={3} className="lg:col-span-4"><NextSteps business={business} demo={demo} /></Rise>
            <Rise i={4} className="lg:col-span-8"><QuestionCards business={business} demo={demo} /></Rise>
            {report.competitors.length > 0 && <Rise i={5} className="lg:col-span-5"><Competitors report={report} name={business.name} /></Rise>}
            <Rise i={6} className={report.competitors.length > 0 ? 'lg:col-span-7' : 'lg:col-span-12'}>
              <div className={`h-full p-6 ${CARD}`}>
                <div className="flex items-center justify-between">
                  <p className={`text-[15px] font-semibold ${INK}`}>Sites AI reads</p>
                  <span className={`text-[12.5px] ${FAINT}`}>be on these to get named</span>
                </div>
                <ul className={`mt-4 grid gap-x-8 gap-y-3 ${report.competitors.length > 0 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
                  {report.sources.slice(0, 9).map((s, i) => (
                    <li key={s.domain} className="flex items-center gap-3">
                      <span className={`grid size-9 shrink-0 place-items-center rounded-[11px] text-[12px] font-bold ${s.isYou ? 'bg-brand text-white' : 'bg-[#f2f1f5] text-[#5b567a]'}`}>{initial(s.domain)}</span>
                      <span className={`min-w-0 flex-1 truncate text-[13.5px] font-medium ${INK}`}>{s.domain}{s.isYou ? <span className="ml-1.5 text-[12px] text-brand-deep">your site</span> : ''}</span>
                      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-[#efeef4]"><motion.i className="block h-full rounded-full bg-[#121118]" initial={{ width: 0 }} animate={{ width: `${(s.answers / Math.max(1, report.sources[0]!.answers)) * 100}%` }} transition={{ duration: 0.8, ease: EASE, delay: i * 0.05 }} /></span>
                      <span className={`w-5 text-right text-[13px] font-semibold tabular-nums ${INK}`}>{s.answers}</span>
                    </li>
                  ))}
                  {report.sources.length === 0 && <li className={`text-[13.5px] ${FAINT}`}>AI didn’t cite specific websites.</li>}
                </ul>
              </div>
            </Rise>
          </div>
          <Rise i={7}><AllQuestions business={business} demo={demo} /></Rise>
        </>
      ) : (
        <div className="grid gap-3 lg:grid-cols-12">
          <Rise i={0} className="lg:col-span-7">
            <div className={`flex h-full min-h-[320px] flex-col justify-between p-8 ${DARK}`}>
              <div>
                <p className="text-[13px] font-semibold text-white/55">{business.stage === 'incomplete' ? 'Needs a re-run' : business.stage === 'none' ? 'Not started' : 'In progress'}</p>
                <h2 className="mt-3 max-w-[16em] text-[30px] leading-tight font-semibold tracking-[-0.03em]">
                  {business.stage === 'none' ? 'Request your free audit to see what AI says.' : business.stage === 'incomplete' ? 'Your last check didn’t finish. We’ll re-run it.' : 'Your audit is on its way.'}
                </h2>
                <p className="mt-3 max-w-[30em] text-[15px] leading-relaxed text-white/65">Every buyer question, what AI said word for word, who it named instead, and the sites it trusts. Usually within one working day.</p>
              </div>
              <Link href="/report/sample" className="mt-6 inline-flex h-10 w-fit items-center gap-2 rounded-full bg-white px-4 text-[13.5px] font-semibold text-[#121118]! no-underline">See a sample report <ArrowRight className="size-4" /></Link>
            </div>
          </Rise>
          <Rise i={1} className="lg:col-span-5"><NextSteps business={business} demo={demo} /></Rise>
        </div>
      )}
    </div>
  );
}
