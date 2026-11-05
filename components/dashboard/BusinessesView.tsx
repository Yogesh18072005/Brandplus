'use client';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowUpRight, Globe, MapPin, Plus } from 'lucide-react';
import type { DashboardBusiness } from '@/lib/dashboard/load-businesses';
import { RequestAuditButton } from '@/components/report/simple/RequestAuditButton';

/*
 * Businesses, after the references' project cards (iDraft "Last projects"):
 * one card each, its result as a ring, where it stands, and the one action
 * that moves it forward. The first card is dark, like the references.
 */

const EASE = [0.65, 0, 0.35, 1] as const;
const STAGE: Record<DashboardBusiness['stage'], string> = {
  none: 'Audit not requested',
  requested: 'Audit requested',
  running: 'Audit running',
  ready: 'Report ready',
  incomplete: 'Check needs a re-run',
};

function Ring({ named, total, dark }: { named: number; total: number; dark: boolean }) {
  const c = 2 * Math.PI * 22;
  return (
    <span className="relative grid size-14 place-items-center">
      <svg viewBox="0 0 52 52" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="26" cy="26" r="22" fill="none" stroke={dark ? 'rgb(255 255 255 / 0.12)' : '#efeef4'} strokeWidth="5" />
        <motion.circle cx="26" cy="26" r="22" fill="none" stroke="#463eda" strokeWidth="5" strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - named / Math.max(1, total)) }} transition={{ duration: 1, ease: EASE }} />
      </svg>
      <span className={`text-[12.5px] font-bold tabular-nums ${dark ? 'text-white' : 'text-[#171425]'}`}>{named}/{total}</span>
    </span>
  );
}

export function BusinessesView({ businesses }: { businesses: DashboardBusiness[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function deleteBusiness(id: string, name: string) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(id);

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        window.alert(result?.error || 'Unable to delete business.');
        return;
      }

      router.refresh();
    } catch {
      window.alert('Something went wrong. Please try again.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1240px]">
      <header className="flex flex-wrap items-end justify-between gap-4 px-1 pt-2 pb-6">
        <div>
          <h1 className="text-[clamp(30px,3.2vw,44px)] leading-none font-semibold tracking-[-0.04em] text-[#171425]">Businesses</h1>
          <p className="mt-3 text-[14.5px] text-[#524f6d]">Each one keeps its own buyer questions, answers and fixes.</p>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {businesses.map((b, i) => {
          const dark = i === 0;
          const r = b.report;
          const named = r ? r.recommended + r.mentioned : 0;
          return (
            <motion.article key={b.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE, delay: i * 0.06 }}
              className={`flex flex-col rounded-[24px] p-6 ${dark ? 'bg-[#121118] text-white' : 'bg-white'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className={`truncate text-[18px] font-semibold tracking-[-0.015em] ${dark ? 'text-white' : 'text-[#171425]'}`}>{b.name}</p>
                  <p className={`mt-1 flex items-center gap-1.5 text-[12.5px] ${dark ? 'text-white/55' : 'text-[#7d7a94]'}`}>
                    <i className={`size-1.5 rounded-full ${b.stage === 'ready' ? 'bg-presence-bright' : b.stage === 'none' ? 'bg-[#b5b3cb]' : 'bg-[#f5b400]'}`} />{STAGE[b.stage]}
                  </p>
                </div>
                {r ? <Ring named={named} total={r.total} dark={dark} /> : <span className={`grid size-14 place-items-center rounded-full text-[18px] font-semibold ${dark ? 'bg-white/10' : 'bg-[#f2f1f5] text-[#171425]'}`}>{(b.name[0] ?? '?').toUpperCase()}</span>}
              </div>
              <ul className={`mt-5 space-y-1.5 text-[13px] ${dark ? 'text-white/65' : 'text-[#524f6d]'}`}>
                {b.website && <li className="flex items-center gap-2 truncate"><Globe className="size-3.5 shrink-0" />{b.website.replace(/^https?:\/\//, '')}</li>}
                {(b.category || b.city) && <li className="flex items-center gap-2 truncate"><MapPin className="size-3.5 shrink-0" />{[b.category, b.city].filter(Boolean).join(' · ')}</li>}
                {r?.competitors[0] && <li className="truncate">Top rival: <b className={`font-semibold ${dark ? 'text-white' : 'text-[#171425]'}`}>{r.competitors[0].name}</b> · {r.competitors[0].answers}/{r.total}</li>}
              </ul>
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-6">
                <Link href={`/dashboard/projects/${b.id}`}
                  className={`inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[13.5px] font-semibold no-underline ${dark ? 'bg-white text-[#121118]!' : 'bg-[#121118] text-white!'}`}>
                  {b.stage === 'ready' ? 'Open report' : 'Open'} <ArrowUpRight className="size-4" />
                </Link>
                {(b.stage === 'none' || (b.stage === 'ready' && !b.recheckOpen)) && (
                  <RequestAuditButton projectId={b.id} label={b.stage === 'none' ? 'Request audit' : 'Re-check'}
                    buttonClassName={`inline-flex h-10 items-center rounded-full px-4 text-[13.5px] font-semibold ${dark ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-[#f4f3f7] text-[#171425] hover:bg-[#eae9f0]'}`} />
                )}
                {b.recheckOpen && <span className={`text-[12.5px] ${dark ? 'text-white/55' : 'text-[#7d7a94]'}`}>Re-check in progress</span>}
                <button
  type="button"
  onClick={() => deleteBusiness(b.id, b.name)}
  disabled={deletingId === b.id}
  className={`inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold transition-colors disabled:opacity-50 ${
    dark
      ? 'bg-red-500/15 text-red-300 hover:bg-red-500/25'
      : 'bg-red-50 text-red-600 hover:bg-red-100'
  }`}
>
  <Trash2 className="size-4" />
  {deletingId === b.id ? 'Deleting...' : 'Delete'}
</button>
              </div>
            </motion.article>
          );
        })}
        <Link href="/dashboard/projects/new" className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-[24px] border-2 border-dashed border-[#d7d5e3] text-[#171425]! no-underline transition-colors hover:border-[#121118] hover:bg-white">
          <span className="grid size-11 place-items-center rounded-full bg-[#121118] text-white"><Plus className="size-5" /></span>
          <span className="text-[15px] font-semibold">Add a business</span>
        </Link>
      </div>
    </div>
  );
}
