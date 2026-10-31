'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { ArrowUpRight, Check, Copy, Gift, Loader2, Minus, Play, Plus, Search, Terminal, UserRound } from 'lucide-react';
import type { AdminConsoleData } from '@/lib/admin/load-console';
import type { AuditRequestRow } from '@/components/admin/AuditRequests';

/*
 * The founder's console, in the client dashboard's language: a row of numbers,
 * then tabs. The queue is the main job: run each request with the customer's
 * credit (their 1/1 becomes 0/1) or with an admin credit (theirs untouched).
 */

const INK = 'text-[#171425]';
const FAINT = 'text-[#7d7a94]';
const CARD = 'rounded-[24px] bg-white';
const EASE = [0.65, 0, 0.35, 1] as const;
const PILL = 'inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13.5px] font-semibold transition-colors disabled:opacity-50';

const FLAG: Record<string, string> = {
  network_used: 'Network already has an account',
  device_used: 'Device already has an account',
  blocked: 'Free audit blocked',
  pending: 'Account setup not finished',
};

function ago(iso: string | null): string {
  if (!iso) return '—';
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
}
const date = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: n < 100 ? 2 : 0 })}`;

/* ---------- The queue ---------- */

function RunRequest({ r, canRun }: { r: AuditRequestRow; canRun: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<'charge' | 'free' | null>(null);
  const [error, setError] = useState('');
  const [log, setLog] = useState<{ running: boolean; lines: string[] } | null>(null);
  const [copied, setCopied] = useState('');
  const watching = r.state === 'running' || busy !== null || log?.running;

  useEffect(() => {
    if (!canRun || !watching) return;
    let alive = true;
    const tick = async () => {
      const res = await fetch(`/api/admin/requests/${r.id}/log`, { cache: 'no-store' }).catch(() => null);
      const data = res?.ok ? await res.json() : null;
      if (!alive || !data) return;
      setLog(data);
      if (!data.running && data.lines.length) { setBusy(null); router.refresh(); }
    };
    tick();
    const id = setInterval(tick, 4000);
    return () => { alive = false; clearInterval(id); };
  }, [canRun, watching, r.id, router]);

  async function run(mode: 'charge' | 'free') {
    const who = r.requesterEmail ?? 'this customer';
    const msg = mode === 'charge'
      ? `Run ${r.businessName} using ${who}’s credit?\n\nTheir credits go from ${r.credits ?? '?'} to ${Math.max(0, (r.credits ?? 1) - 1)}. Costs real Gemini spend.`
      : `Run ${r.businessName} with an admin credit?\n\nTheir credits stay at ${r.credits ?? '?'}. Costs real Gemini spend.`;
    if (!window.confirm(msg)) return;
    setBusy(mode);
    setError('');
    const res = await fetch(`/api/admin/requests/${r.id}/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(typeof data.error === 'string' ? data.error : 'Couldn’t start the run.'); setBusy(null); return; }
    setLog({ running: true, lines: ['Starting…'] });
  }

  async function copy(mode: 'charge' | 'free') {
    const cmd = `npm run audit:run -- ${r.id} --${mode} --confirm`;
    try { await navigator.clipboard.writeText(cmd); setCopied(mode); setTimeout(() => setCopied(''), 1800); } catch { window.prompt('Copy this command', cmd); }
  }

  const running = r.state === 'running' || Boolean(log?.running);
  const resumeMode = (r.creditMode ?? 'free') as 'charge' | 'free';
  return (
    <li className={`p-5 ${CARD} ${running ? 'ring-2 ring-brand/40' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#121118] text-[15px] font-semibold text-white">{(r.businessName[0] ?? '?').toUpperCase()}</span>
          <div className="min-w-0">
            <p className={`truncate text-[15.5px] font-semibold ${INK}`}>{r.businessName}</p>
            <p className={`truncate text-[12.5px] ${FAINT}`}>{r.website.replace(/^https?:\/\//, '').replace(/\/$/, '')} · {ago(r.requestedAt)}</p>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${running ? 'bg-[#eeecfe] text-brand-deep' : 'bg-[#fff4e0] text-[#b26a00]'}`}>
          {running ? `Running · ${r.creditMode === 'charge' || busy === 'charge' ? 'their credit' : 'admin credit'}` : 'Waiting for you'}
        </span>
      </div>
      <dl className="mt-4 grid gap-3 text-[13px] sm:grid-cols-3">
        <div><dt className={FAINT}>Customer</dt><dd className={`mt-0.5 truncate font-medium ${INK}`}>{r.requesterEmail ? <a href={`mailto:${r.requesterEmail}`} className="text-[#171425]! no-underline hover:underline">{r.requesterEmail}</a> : '—'}</dd></div>
        <div><dt className={FAINT}>Plan · credits</dt><dd className={`mt-0.5 font-medium ${INK}`}>{r.plan} · <b className="tabular-nums">{r.credits ?? '—'}</b> left</dd></div>
        <div><dt className={FAINT}>Flag</dt><dd className={`mt-0.5 font-medium ${r.accountFlag ? 'text-[#c2352f]' : INK}`}>{r.accountFlag ? FLAG[r.accountFlag] ?? r.accountFlag : 'None'}</dd></div>
      </dl>

      {log && log.lines.length > 0 && (
        <pre className="mt-4 max-h-44 overflow-auto rounded-[14px] bg-[#121118] p-4 font-mono text-[11.5px] leading-relaxed text-white/80">{log.lines.join('\n')}</pre>
      )}
      {error && <p className="mt-3 text-[13px] text-[#c2352f]" role="alert">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!running && canRun && (
          <>
            <button type="button" onClick={() => run('charge')} disabled={busy !== null || (r.credits ?? 0) < 1}
              title={(r.credits ?? 0) < 1 ? 'They have no credits left' : undefined}
              className={`${PILL} bg-[#121118] text-white hover:bg-[#282633]`}>
              {busy === 'charge' ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}Run · use their credit <span className="text-white/55 tabular-nums">{r.credits ?? '?'}→{Math.max(0, (r.credits ?? 1) - 1)}</span>
            </button>
            <button type="button" onClick={() => run('free')} disabled={busy !== null}
              className={`${PILL} bg-[#f4f3f7] text-[#171425] hover:bg-[#eae9f0]`}>
              {busy === 'free' ? <Loader2 className="size-4 animate-spin" /> : <Gift className="size-4" />}Run · admin credit
            </button>
          </>
        )}
        {running && canRun && !log?.running && (
          <button type="button" onClick={() => run(resumeMode)} className={`${PILL} bg-[#121118] text-white`}><Play className="size-4" />Resume</button>
        )}
        {!canRun && (
          <>
            <button type="button" onClick={() => copy('charge')} className={`${PILL} bg-[#121118] text-white`}><Terminal className="size-4" />{copied === 'charge' ? 'Copied' : 'Copy: their credit'}</button>
            <button type="button" onClick={() => copy('free')} className={`${PILL} bg-[#f4f3f7] text-[#171425]`}><Copy className="size-4" />{copied === 'free' ? 'Copied' : 'Copy: admin credit'}</button>
            <span className={`text-[12px] ${FAINT}`}>Buttons run audits from localhost only.</span>
          </>
        )}
      </div>
    </li>
  );
}

/* ---------- Customers ---------- */

function Credits({ id, initial }: { id: string; initial: number }) {
  const [n, setN] = useState(initial);
  const [busy, setBusy] = useState(false);
  async function change(delta: 1 | -1) {
    if (delta === -1 && n === 0) return;
    setBusy(true);
    const res = await fetch(`/api/admin/customers/${id}/credits`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delta }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok && typeof data.credits === 'number') setN(data.credits);
    setBusy(false);
  }
  const btn = 'grid size-7 place-items-center rounded-full bg-[#f4f3f7] text-[#171425] hover:bg-[#eae9f0] disabled:opacity-40';
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" aria-label="Take one credit" onClick={() => change(-1)} disabled={busy || n === 0} className={btn}><Minus className="size-3.5" /></button>
      <span className={`w-5 text-center text-[14px] font-semibold tabular-nums ${INK}`}>{n}</span>
      <button type="button" aria-label="Give one credit" onClick={() => change(1)} disabled={busy} className={btn}><Plus className="size-3.5" /></button>
    </span>
  );
}

/* ---------- The page ---------- */

type Tab = 'queue' | 'customers' | 'audits' | 'requests' | 'system';

export function AdminConsole({ data }: { data: AdminConsoleData }) {
  const [tab, setTab] = useState<Tab>(data.requests.length ? 'queue' : 'customers');
  const [q, setQ] = useState('');
  const customers = useMemo(() => data.customers.filter((c) => `${c.email ?? ''} ${c.name ?? ''} ${c.businesses.join(' ')}`.toLowerCase().includes(q.trim().toLowerCase())), [data.customers, q]);
  const t = data.totals;
  const stats: { label: string; value: ReactNode; sub: string; dark?: boolean }[] = [
    { label: 'Customers', value: t.customers, sub: `+${t.newThisWeek} this week`, dark: true },
    { label: 'Businesses', value: t.businesses, sub: 'across all accounts' },
    { label: 'Audits run', value: t.auditsAllTime, sub: `${t.audits30d} in the last 30 days` },
    { label: 'Waiting for you', value: t.waiting, sub: t.running ? `${t.running} running now` : 'in the queue' },
    { label: 'Spend, 30 days', value: inr(t.spendMonthInr), sub: data.spend.ledgerInr !== null ? `${inr(data.spend.ledgerInr)} of ${inr(data.spend.capInr)} cap used` : `cap ${inr(data.spend.capInr)}` },
    { label: 'Admin credits used', value: t.adminCredits, sub: 'audits you ran free' },
  ];
  const tabs: [Tab, string, number | null][] = [
    ['queue', 'Queue', data.requests.length],
    ['customers', 'Customers', data.customers.length],
    ['audits', 'Past audits', data.audits.length],
    ['requests', 'Customer requests', data.talk.length],
    ['system', 'System', null],
  ];

  return (
    <div className="mx-auto w-full max-w-[1300px] space-y-3">
      <header className="px-1 pt-2 pb-4">
        <h1 className={`text-[clamp(30px,3.2vw,44px)] leading-none font-semibold tracking-[-0.04em] ${INK}`}>Admin</h1>
        <p className="mt-3 text-[14.5px] text-[#524f6d]">Customers, the audit queue and spend. {data.canRun ? 'Running on localhost: audits can start from here.' : 'On the live site: copy commands to run audits on your machine.'}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE, delay: i * 0.05 }}
            className={`p-5 ${s.dark ? 'rounded-[24px] bg-[#121118] text-white' : CARD}`}>
            <p className={`text-[12.5px] ${s.dark ? 'text-white/55' : FAINT}`}>{s.label}</p>
            <p className={`mt-2 text-[30px] leading-none font-semibold tracking-[-0.035em] tabular-nums ${s.dark ? 'text-white' : INK}`}>{s.value}</p>
            <p className={`mt-2 truncate text-[12px] ${s.dark ? 'text-white/55' : FAINT}`}>{s.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className={`flex flex-wrap gap-1 p-1.5 ${CARD} w-fit`} role="tablist">
        {tabs.map(([k, label, n]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`h-10 rounded-full px-4 text-[13.5px] font-semibold transition-colors ${tab === k ? 'bg-[#121118] text-white' : 'text-[#413d58] hover:bg-[#f4f3f7]'}`}>
            {label}{n !== null && <span className="ml-1.5 opacity-60 tabular-nums">{n}</span>}
          </button>
        ))}
      </div>

      {tab === 'queue' && (
        data.requestsUnavailable ? <p className="rounded-[20px] bg-[#fdecec] p-5 text-[14px] text-[#c2352f]">{data.requestsUnavailable}</p>
          : data.requests.length === 0 ? <p className={`p-8 text-center text-[14.5px] ${FAINT} ${CARD}`}>No one is waiting. New requests land here and in your inbox.</p>
            : <ul className="grid gap-3 xl:grid-cols-2">{data.requests.map((r) => <RunRequest key={r.id} r={r} canRun={data.canRun} />)}</ul>
      )}

      {tab === 'customers' && (
        <section className={`p-5 sm:p-6 ${CARD}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className={`text-[16px] font-semibold ${INK}`}>All customers</p>
            <label className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#9c9ab2]" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email, name or business" aria-label="Search customers" className="h-10 w-full rounded-full bg-[#f4f3f7] pr-3 pl-10 text-[13.5px] outline-none focus:bg-white focus:ring-2 focus:ring-brand" />
            </label>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-[13.5px]">
              <thead><tr className={`text-[12px] ${FAINT}`}><th className="pb-3 font-medium">Customer</th><th className="pb-3 font-medium">Businesses</th><th className="pb-3 font-medium">Plan</th><th className="pb-3 font-medium">Credits</th><th className="pb-3 font-medium">Joined</th><th className="pb-3 font-medium">Last audit</th></tr></thead>
              <tbody className="divide-y divide-[#efeef4]">
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#f2f1f5] text-[#5b567a]"><UserRound className="size-4" /></span>
                        <div className="min-w-0">
                          <p className={`truncate font-semibold ${INK}`}>{c.name || c.email || '—'}</p>
                          <p className={`truncate text-[12px] ${FAINT}`}>{c.email}{c.flag && <span className="ml-2 text-[#c2352f]">{c.flag}</span>}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`py-3 pr-4 ${INK}`}>{c.businesses.length ? c.businesses.join(', ') : <span className={FAINT}>None yet</span>}</td>
                    <td className={`py-3 pr-4 ${INK}`}>{c.plan}</td>
                    <td className="py-3 pr-4"><Credits id={c.id} initial={c.credits} /></td>
                    <td className={`py-3 pr-4 ${FAINT}`}>{date(c.joinedAt)}</td>
                    <td className={`py-3 ${FAINT}`}>{ago(c.lastAuditAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {customers.length === 0 && <p className={`py-8 text-center text-[14px] ${FAINT}`}>No customers match.</p>}
          </div>
        </section>
      )}

      {tab === 'audits' && (
        <section className={`p-5 sm:p-6 ${CARD}`}>
          <p className={`text-[16px] font-semibold ${INK}`}>Past audits</p>
          <ul className="mt-4 divide-y divide-[#efeef4]">
            {data.audits.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5">
                <span className={`grid size-10 shrink-0 place-items-center rounded-full text-[14px] font-semibold ${a.status === 'completed' ? 'bg-[#121118] text-white' : 'bg-[#f2f1f5] text-[#5b567a]'}`}>{(a.businessName[0] ?? '?').toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-[14.5px] font-semibold ${INK}`}>{a.businessName}</p>
                  <p className={`truncate text-[12.5px] ${FAINT}`}>{a.customer ?? 'No account'} · {date(a.createdAt)}{a.questions ? ` · ${a.questions} questions` : ''}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${a.paidWith === 'admin' ? 'bg-[#f1ecff] text-[#6d4fd8]' : a.paidWith === 'customer' ? 'bg-[#eeecfe] text-brand-deep' : 'bg-[#f2f1f7] text-[#5b567a]'}`}>{a.paidWith === 'admin' ? 'Admin credit' : a.paidWith === 'customer' ? 'Their credit' : 'Outreach / older'}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold capitalize ${a.status === 'completed' ? 'bg-[#e3f6ec] text-presence' : a.status === 'failed' ? 'bg-[#fdecec] text-[#c2352f]' : 'bg-[#fff4e0] text-[#b26a00]'}`}>{a.status}</span>
                <span className={`w-16 text-right text-[13.5px] font-semibold tabular-nums ${INK}`}>{inr(a.costInr)}</span>
                {a.reportId ? <a href={`/r/${a.reportId}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#171425]! no-underline hover:underline">Report <ArrowUpRight className="size-3.5" /></a> : <span className="w-[58px]" />}
              </li>
            ))}
            {data.audits.length === 0 && <li className={`py-8 text-center text-[14px] ${FAINT}`}>No audits yet.</li>}
          </ul>
        </section>
      )}

      {tab === 'requests' && (
        <section className={`p-5 sm:p-6 ${CARD}`}>
          <p className={`text-[16px] font-semibold ${INK}`}>What customers asked for</p>
          <ul className="mt-4 divide-y divide-[#efeef4]">
            {data.talk.map((t2) => (
              <li key={t2.id} className="flex flex-wrap items-start gap-4 py-3.5">
                <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${t2.topic === 'fixes' ? 'bg-[#121118] text-white' : 'bg-[#eeecfe] text-brand-deep'}`}>{t2.topic === 'fixes' ? 'Do the fixes' : 'More audits'}</span>
                <div className="min-w-0 flex-1">
                  <p className={`text-[14px] font-semibold ${INK}`}>{t2.businessName ?? 'No business'} · {t2.email ? <a href={`mailto:${t2.email}`} className="text-[#171425]! no-underline hover:underline">{t2.email}</a> : '—'}</p>
                  {t2.note && <p className={`mt-1 text-[13px] ${FAINT}`}>{t2.note}</p>}
                </div>
                <span className={`text-[12.5px] ${FAINT}`}>{ago(t2.createdAt)}</span>
              </li>
            ))}
            {data.talk.length === 0 && <li className={`py-8 text-center text-[14px] ${FAINT}`}>No requests yet.</li>}
          </ul>
        </section>
      )}

      {tab === 'system' && (
        <div className="grid gap-3 lg:grid-cols-2">
          <section className={`p-6 ${CARD}`}>
            <p className={`text-[16px] font-semibold ${INK}`}>Services</p>
            <ul className="mt-4 space-y-2.5">
              {data.services.map((s) => (
                <li key={s.label} className="flex items-center justify-between text-[14px]">
                  <span className={INK}>{s.label}</span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${s.ready ? 'bg-[#e3f6ec] text-presence' : 'bg-[#fdecec] text-[#c2352f]'}`}>{s.ready ? <><Check className="size-3.5" />Configured</> : 'Missing'}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className={`p-6 ${CARD}`}>
            <p className={`text-[16px] font-semibold ${INK}`}>Health, last 30 days</p>
            <ul className="mt-4 grid grid-cols-3 gap-3">
              {[['Failed jobs', data.health.failedJobs30d], ['Email failures', data.health.emailFailures30d], ['Stuck now', data.health.stuck]].map(([k, v]) => (
                <li key={k as string} className="rounded-[16px] bg-[#f6f6f9] p-4">
                  <p className={`text-[12px] ${FAINT}`}>{k}</p>
                  <p className={`mt-1 text-[24px] font-semibold tabular-nums ${Number(v) > 0 ? 'text-[#c2352f]' : INK}`}>{v}</p>
                </li>
              ))}
            </ul>
            <a href="/dashboard/ops" className="mt-5 inline-flex items-center gap-1 text-[13px] font-semibold text-[#171425]! no-underline hover:underline">Engine console <ArrowUpRight className="size-3.5" /></a>
          </section>
        </div>
      )}
    </div>
  );
}
