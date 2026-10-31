'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { VisibilityChart } from '@/components/dashboard/VisibilityChart';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';
import { Stat } from '@/components/ui/Stat';

interface TrackingEntry {
  id: string;
  reportId: string;
  observationDate: string;
  meaningfulAppearances: number;
  totalQuestions: number;
  mentioned: number;
  recommended: number;
  notMentioned: number;
  inconclusive: number;
  statement: string;
  buyerQuestionSetId: string;
}

interface TrackingSummary {
  appearanceChange: number | null;
  observations: string[];
}

export default function TrackingPage() {
  const { id } = useParams<{ id: string }>();
  const [entries, setEntries] = useState<TrackingEntry[]>([]);
  const [projectName, setProjectName] = useState('');
  const [access, setAccess] = useState<'loading' | 'allowed' | 'upgrade' | 'error'>('loading');
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<TrackingSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/projects/${id}/tracking`)
      .then(async (response) => {
        const data = await response.json();
        if (response.status === 403 && data.code === 'tracking_requires_paid_plan') {
          if (!cancelled) setAccess('upgrade');
          return null;
        }
        if (!response.ok) throw new Error(data.error || 'Failed to load tracking');
        return data as { projectName: string; entries: TrackingEntry[]; summary: TrackingSummary };
      })
      .then((data) => {
        if (!data || cancelled) return;
        setProjectName(data.projectName);
        setEntries(data.entries);
        setSummary(data.summary);
        setAccess('allowed');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load tracking');
        setAccess('error');
      });
    return () => { cancelled = true; };
  }, [id]);

  const chartData = useMemo(() => entries.map((entry) => ({
    label: new Date(entry.observationDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    value: entry.meaningfulAppearances,
    date: `${entry.meaningfulAppearances} of ${entry.totalQuestions} buyer questions`,
  })), [entries]);

  const latest = entries.at(-1);

  return (
    <div>
      <PageHeader title="AI answer tracking" description={projectName || undefined} />

      {access === 'loading' ? (
        <p className="text-[13px] text-secondary">Loading tracking…</p>
      ) : access === 'upgrade' ? (
        <EmptyState heading="Unlock AI answer tracking" description="Tracking and before-and-after observation history are available on Starter and Pro plans." action={<Link href="/dashboard/billing?plan=starter" className="inline-flex h-10 items-center rounded-xl bg-signal px-5 text-sm font-semibold text-white no-underline">View paid plans</Link>} />
      ) : access === 'error' ? (
        <EmptyState heading="Tracking could not be loaded" description={error || 'Try refreshing the page.'} />
      ) : entries.length === 0 ? (
        <EmptyState heading="No canonical tracking data yet" description="Complete more than one Engine 01–05 report to compare actual AI answer observations." />
      ) : (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DashboardStatCard highlight><Stat label="Meaningful appearances" value={latest?.meaningfulAppearances ?? 0} denominator={String(latest?.totalQuestions ?? 0)} trend={summary?.appearanceChange != null ? { direction: summary.appearanceChange > 0 ? 'up' : summary.appearanceChange < 0 ? 'down' : 'flat', label: `${summary.appearanceChange >= 0 ? '+' : ''}${summary.appearanceChange} since previous observation` } : undefined} /></DashboardStatCard>
            <DashboardStatCard><Stat label="Mentioned" value={latest?.mentioned ?? 0} /></DashboardStatCard>
            <DashboardStatCard><Stat label="Recommended" value={latest?.recommended ?? 0} /></DashboardStatCard>
            <DashboardStatCard><Stat label="Inconclusive" value={latest?.inconclusive ?? 0} /></DashboardStatCard>
          </div>

          {summary?.observations.length ? <section className="mb-8 border-y border-rule py-6"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-signal">What changed?</p><div className="mt-4 grid gap-3 md:grid-cols-2">{summary.observations.map((observation) => <p key={observation} className="border-l-2 border-rule pl-4 text-[13px] leading-relaxed text-secondary">{observation}</p>)}</div></section> : null}

          <div className="mb-8 rounded-2xl border border-rule bg-surface-raised p-6"><p className="mb-2 text-[12px] font-medium text-tertiary">Meaningful appearances across canonical reports</p><p className="mb-6 text-[11px] text-muted">Each bar is an observed count from its report’s frozen buyer-question set.</p><VisibilityChart data={chartData} height={200} /></div>

          <div className="overflow-hidden rounded-2xl border border-rule">
            <table className="w-full text-left text-[13px]"><thead><tr className="border-b border-rule bg-surface-overlay/50"><th className="px-5 py-3 font-medium text-tertiary">Observation date</th><th className="px-5 py-3 font-medium text-tertiary">Meaningful appearances</th><th className="hidden px-5 py-3 font-medium text-tertiary sm:table-cell">Result</th><th className="px-5 py-3" /></tr></thead>
              <tbody className="divide-y divide-rule">{[...entries].reverse().map((entry) => <tr key={entry.id} className="group transition-colors hover:bg-surface-raised/50"><td className="px-5 py-4 text-content">{new Date(entry.observationDate).toLocaleDateString('en-IN')}</td><td className="px-5 py-4 font-mono font-semibold tabular-nums text-content">{entry.meaningfulAppearances} of {entry.totalQuestions}</td><td className="hidden max-w-[420px] px-5 py-4 text-secondary sm:table-cell">{entry.statement}</td><td className="px-5 py-4 text-right"><Link href={`/r/${entry.reportId}`} className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-signal no-underline hover:bg-signal/10" target="_blank">Report →</Link></td></tr>)}</tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}