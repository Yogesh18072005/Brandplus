'use client';

import { useEffect, useMemo, useState } from 'react';

interface ActionItem {
  id: string;
  title: string;
  problem: string;
  why_it_matters: string;
  evidence: unknown;
  recommended_action: string;
  expected_objective: string;
  implementation_guidance: string;
  priority: 'critical' | 'high' | 'quick_win';
  confidence: string;
  status: 'open' | 'in_progress' | 'implemented' | 'verified';
}

const groups = [
  { key: 'critical', label: 'Critical' },
  { key: 'high', label: 'High impact' },
  { key: 'quick_win', label: 'Quick wins' },
] as const;

export function ActionCenter({ projectId }: { projectId: string }) {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/actions`).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not load actions');
      setActions(data.actions ?? []);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Could not load actions'))
      .finally(() => setLoading(false));
  }, [projectId]);

  const openCount = useMemo(() => actions.filter((item) => item.status === 'open' || item.status === 'in_progress').length, [actions]);

  async function setStatus(actionId: string, status: ActionItem['status']) {
    setError('');
    const response = await fetch(`/api/projects/${projectId}/actions`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actionId, status }),
    });
    const data = await response.json();
    if (!response.ok) { setError(data.error ?? 'Could not update action'); return; }
    setActions((items) => items.map((item) => item.id === actionId ? { ...item, status } : item));
  }

  if (loading) return <p className="text-sm text-secondary">Loading action plan…</p>;
  if (actions.length === 0) return <div className="rounded-2xl border border-dashed border-rule p-10 text-center text-sm text-secondary">Run an audit to create evidence-backed actions.</div>;

  return (
    <div>
      <div className="mb-7 flex items-end justify-between gap-4 border-b border-rule pb-5">
        <div><p className="font-mono text-[11px] uppercase tracking-[0.14em] text-signal">Action center</p><h2 className="mt-2 font-display text-2xl font-semibold text-content">{openCount} actions remain</h2></div>
        <p className="max-w-[34ch] text-right text-xs leading-relaxed text-secondary">Statuses record implementation. BrandPulse only marks improvement after a later audit observes it.</p>
      </div>
      {error && <p className="mb-5 rounded-lg bg-absence/10 px-4 py-3 text-sm text-absence" role="alert">{error}</p>}
      <div className="space-y-10">
        {groups.map((group) => {
          const items = actions.filter((item) => item.priority === group.key);
          if (items.length === 0) return null;
          return <section key={group.key}>
            <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-tertiary">{group.label}</h3>
            <div className="divide-y divide-rule border-y border-rule">
              {items.map((item) => <article key={item.id} className="grid gap-5 py-6 lg:grid-cols-[1fr_220px]">
                <div><div className="flex flex-wrap items-center gap-2"><h4 className="font-display text-lg font-semibold text-content">{item.title}</h4><span className="font-mono text-[10px] text-tertiary">confidence: {item.confidence}</span></div><p className="mt-2 text-sm leading-relaxed text-secondary">{item.problem}</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><div><p className="font-mono text-[10px] uppercase tracking-wider text-tertiary">Recommended action</p><p className="mt-1 text-sm text-content">{item.recommended_action}</p></div><div><p className="font-mono text-[10px] uppercase tracking-wider text-tertiary">Implementation</p><p className="mt-1 text-sm text-content">{item.implementation_guidance}</p></div></div></div>
                <label className="text-xs font-medium text-secondary">Status<select value={item.status} onChange={(event) => setStatus(item.id, event.target.value as ActionItem['status'])} className="mt-2 w-full rounded-lg border border-rule bg-paper px-3 py-2 text-sm text-content"><option value="open">Open</option><option value="in_progress">In progress</option><option value="implemented">Implemented</option><option value="verified">Verified</option></select></label>
              </article>)}
            </div>
          </section>;
        })}
      </div>
    </div>
  );
}
