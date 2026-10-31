'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { PlanId } from '@/lib/billing/plans';
import { CopyCommand } from '@/components/admin/CopyCommand';

interface ProjectOption {
  id: string;
  businessName: string;
  city: string;
  ownerEmail: string | null;
}

const auditDepths: Array<{ id: PlanId; label: string; detail: string }> = [
  { id: 'free', label: 'Snapshot', detail: '10 buyer questions' },
  { id: 'starter', label: 'Full audit', detail: '40 buyer questions' },
  { id: 'pro', label: 'Priority', detail: '40 questions, runs first' },
];

/** Admin-only: queue an audit at any depth for any business. Rendered inside a workspace card. */
export function AdminAuditLauncher({ projects }: { projects: ProjectOption[] }) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const [planId, setPlanId] = useState<PlanId>('free');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [command, setCommand] = useState('');
  const [error, setError] = useState('');

  async function queueAudit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || submitting) return;
    setSubmitting(true);
    setMessage('');
    setCommand('');
    setError('');
    try {
      const response = await fetch('/api/admin/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, planId }),
      });
      const body = await response.json().catch(() => ({})) as { message?: string; error?: string; command?: string };
      if (!response.ok) throw new Error(body.error ?? 'Audit could not be queued');
      setMessage(body.message ?? 'Audit queued.');
      setCommand(typeof body.command === 'string' ? body.command : '');
      router.refresh();
    } catch (queueError) {
      setError(queueError instanceof Error ? queueError.message : 'Audit could not be queued');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="zw-card-head">
        <div>
          <span className="zw-label">Privileged action</span>
          <h2 style={{ marginTop: 8 }}>Run an audit for any business</h2>
          <p>Admin runs don’t use the customer’s credits.</p>
        </div>
      </div>

      {projects.length === 0 ? (
        <p className="zw-muted">No businesses yet. They appear here as soon as a customer adds one.</p>
      ) : (
        <form onSubmit={queueAudit} className="zw-launch">
          <label className="zw-field">
            <span>Business</span>
            <span className="zw-picker">
              <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.businessName} · {project.city}{project.ownerEmail ? ` · ${project.ownerEmail}` : ''}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <fieldset className="zw-field">
            <legend>Depth</legend>
            <div className="zw-depths">
              {auditDepths.map((depth) => (
                <label key={depth.id} className={planId === depth.id ? 'is-on' : ''}>
                  <input type="radio" name="admin-audit-depth" value={depth.id} checked={planId === depth.id} onChange={() => setPlanId(depth.id)} />
                  <strong>{depth.label}</strong>
                  <span>{depth.detail}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <button type="submit" className="zw-btn zw-btn-primary" disabled={!projectId || submitting}>
            {submitting ? 'Queueing…' : 'Queue audit'}
          </button>
        </form>
      )}

      <div aria-live="polite" className="zw-feedback">
        {message && <p className="is-ok">{message}</p>}
        {command && <CopyCommand label="Run free" command={command} />}
        {error && <p className="is-error" role="alert">{error}</p>}
      </div>
    </>
  );
}
