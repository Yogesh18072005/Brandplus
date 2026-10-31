import type { CSSProperties, ReactNode } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { mainSiteUrl } from '@/lib/admin/request-host';
import { AdminAuditLauncher } from '@/app/dashboard/ops/AdminAuditLauncher';
import { AdminQueueRunner } from '@/components/admin/AdminQueueRunner';
import { AuditRequests, type AuditRequestRow } from '@/components/admin/AuditRequests';
import { getEffectivePlan } from '@/lib/billing/effective-plan';
import { resolveCredits } from '@/lib/billing/credits';
import { PLANS } from '@/lib/billing/plans';

const RING = 2 * Math.PI * 54;

function configured(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

type Tone = 'recommended' | 'mentioned' | 'not-mentioned' | 'inconclusive';

/** Map queue/run statuses onto the workspace badge colours. */
function statusTone(status: string): Tone {
  const s = status.toLowerCase();
  if (['done', 'completed', 'partial_success'].includes(s)) return 'recommended';
  if (s === 'failed') return 'not-mentioned';
  if (['processing', 'running'].includes(s)) return 'mentioned';
  return 'inconclusive';
}

function Badge({ status }: { status: string }) {
  return <span className={`zw-badge is-${statusTone(status)}`}>{status.replace(/_/g, ' ').toLowerCase()}</span>;
}

function Card({ order, className = '', label, children }: { order: number; className?: string; label: string; children: ReactNode }) {
  return <section className={`zw-card ${className}`} style={{ '--zw-i': order } as CSSProperties} aria-label={label}>{children}</section>;
}

const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });

function Stat({ order, label, value, detail, hero = false, gap = false }: { order: number; label: string; value: ReactNode; detail: string; hero?: boolean; gap?: boolean }) {
  return (
    <Card order={order} className={`zw-stat ${hero ? 'zw-stat-hero' : ''}`} label={label}>
      <div className="zw-stat-top"><span>{label}</span></div>
      <strong className={gap ? 'is-gap' : ''}>{value}</strong>
      <p>{detail}</p>
    </Card>
  );
}

export type AdminClient = ReturnType<typeof createAdminClient>;

/** User requests waiting for the founder, plus approved ones still running. */
export async function loadAuditRequests(admin: AdminClient): Promise<{ rows: AuditRequestRow[]; unavailable: string | null }> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: queue, error } = await admin.from('audit_queue')
    .select('id, project_id, audit_id, status, approved_at, credit_mode, requested_by, created_at')
    .eq('job_type', 'AUDIT').eq('requires_approval', true).gte('created_at', since)
    .order('created_at', { ascending: true }).limit(100);
  if (error) {
    return { rows: [], unavailable: `Requests can’t load (${error.message}). Run supabase/migrations/025_admin_approved_audits_and_account_guard.sql in the Supabase SQL editor.` };
  }
  const items = queue ?? [];
  if (!items.length) return { rows: [], unavailable: null };
  const projectIds = [...new Set(items.map((item) => item.project_id))];
  const auditIds = items.map((item) => item.audit_id).filter((id): id is string => Boolean(id));
  const profileIds = [...new Set(items.map((item) => item.requested_by).filter((id): id is string => Boolean(id)))];
  const [{ data: projects }, { data: audits }, { data: profiles }, { data: claims }] = await Promise.all([
    admin.from('projects').select('id, business_name, website').in('id', projectIds),
    auditIds.length ? admin.from('audits').select('id, status').in('id', auditIds) : Promise.resolve({ data: [] as Array<{ id: string; status: string }> }),
    profileIds.length
      ? admin.from('profiles').select('id, email, plan, plan_expires_at, credits_remaining, credits_reset_at, free_credit_status').in('id', profileIds)
      : Promise.resolve({ data: [] }),
    profileIds.length
      ? admin.from('free_signup_credit_claims').select('profile_id, reason, granted').in('profile_id', profileIds)
      : Promise.resolve({ data: [] }),
  ]);
  const projectById = new Map((projects ?? []).map((project) => [project.id, project]));
  const auditStatus = new Map((audits ?? []).map((audit) => [audit.id, audit.status]));
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const claimById = new Map(((claims ?? []) as Array<{ profile_id: string; reason: string | null; granted: boolean }>).map((claim) => [claim.profile_id, claim]));

  const rows: AuditRequestRow[] = [];
  for (const item of items) {
    const awaiting = item.status === 'pending' && !item.approved_at;
    const stillRunning = Boolean(item.approved_at) && ['queued', 'running'].includes(auditStatus.get(item.audit_id ?? '') ?? '');
    if (!awaiting && !stillRunning) continue;
    const project = projectById.get(item.project_id);
    const profile = item.requested_by ? profileById.get(item.requested_by) : undefined;
    const claim = item.requested_by ? claimById.get(item.requested_by) : undefined;
    const plan = profile ? getEffectivePlan(profile) : 'free';
    rows.push({
      id: item.id,
      businessName: project?.business_name ?? 'Unknown business',
      website: project?.website ?? '',
      requesterEmail: profile?.email ?? null,
      plan: PLANS[plan].name,
      credits: profile ? resolveCredits(profile).creditsRemaining : null,
      accountFlag: claim && !claim.granted ? (claim.reason ?? 'blocked') : profile?.free_credit_status === 'pending' ? 'pending' : null,
      requestedAt: item.created_at,
      state: awaiting ? 'awaiting' : 'running',
      creditMode: item.credit_mode,
    });
  }
  // Running first (they need watching), then oldest waiting request first.
  rows.sort((a, b) => Number(b.state === 'running') - Number(a.state === 'running') || a.requestedAt.localeCompare(b.requestedAt));
  return { rows, unavailable: null };
}

export async function OperationsConsole() {
  const admin = createAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [pending, processing, failed, completedAudits, promptResults, emailFailures, latestScheduler, recentLeads, recentQueue, allProjects, recentIntelligence, talkEvents] = await Promise.all([
    admin.from('audit_queue').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('audit_queue').select('id', { count: 'exact', head: true }).eq('status', 'processing'),
    admin.from('audit_queue').select('id', { count: 'exact', head: true }).eq('status', 'failed').gte('created_at', thirtyDaysAgo),
    admin.from('audits').select('cost_estimate_cents, prompt_count, started_at, completed_at').eq('status', 'completed').gte('created_at', thirtyDaysAgo),
    admin.from('audit_results').select('id, error').gte('created_at', thirtyDaysAgo),
    admin.from('operational_events').select('id', { count: 'exact', head: true }).eq('event_type', 'email_failed').gte('created_at', thirtyDaysAgo),
    admin.from('scheduler_runs').select('job_name, status, queued_count, error, started_at, completed_at').order('started_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', oneDayAgo),
    admin.from('audit_queue').select('id, audit_id, project_id, status, priority, attempts, max_attempts, error, created_at, started_at').order('created_at', { ascending: false }).limit(12),
    admin.from('projects').select('id, user_id, business_name, city').order('created_at', { ascending: false }).limit(200),
    admin.from('intervention_generation_runs').select('id, project_id, status, intervention_count, created_at').order('created_at', { ascending: false }).limit(12),
    admin.from('operational_events').select('id, metadata, created_at').eq('event_type', 'talk_requested').order('created_at', { ascending: false }).limit(8),
  ]);
  const requests = await loadAuditRequests(admin);

  const queueRows = recentQueue.data ?? [];
  const projectIds = [...new Set(queueRows.map((row) => row.project_id))];
  const [{ data: projects }, { data: queueLeads }] = projectIds.length
    ? await Promise.all([
      admin.from('projects').select('id, user_id, business_name').in('id', projectIds),
      admin.from('leads').select('project_id, email').in('project_id', projectIds),
    ])
    : [{ data: [] as Array<{ id: string; user_id: string; business_name: string }> }, { data: [] as Array<{ project_id: string | null; email: string }> }];
  const projectNames = Object.fromEntries([...(allProjects.data ?? []), ...(projects ?? [])].map((project) => [project.id, project.business_name]));
  const ownerIds = [...new Set([...(allProjects.data ?? []), ...(projects ?? [])].map((project) => project.user_id))];
  const { data: owners } = ownerIds.length
    ? await admin.from('profiles').select('id, email').in('id', ownerIds)
    : { data: [] as Array<{ id: string; email: string | null }> };
  const ownerEmails = Object.fromEntries((owners ?? []).map((owner) => [owner.id, owner.email]));
  // Who asked for each queued audit: the free-audit form email, else the account owner.
  const projectOwners = Object.fromEntries([...(allProjects.data ?? []), ...(projects ?? [])].map((project) => [project.id, project.user_id]));
  const leadEmails = Object.fromEntries((queueLeads ?? []).filter((lead) => lead.project_id).map((lead) => [lead.project_id!, lead.email]));
  const requesterFor = (projectId: string) => leadEmails[projectId] ?? (projectOwners[projectId] ? ownerEmails[projectOwners[projectId]] : null) ?? null;
  const launcherProjects = (allProjects.data ?? []).map((project) => ({
    id: project.id,
    businessName: project.business_name,
    city: project.city,
    ownerEmail: ownerEmails[project.user_id] ?? null,
  }));

  const monthlyCostInr = (completedAudits.data ?? []).reduce((sum, audit) => sum + Number(audit.cost_estimate_cents ?? 0), 0) / 100;
  const completedWithTiming = (completedAudits.data ?? []).filter((audit) => audit.started_at && audit.completed_at);
  const averageDurationSeconds = completedWithTiming.length
    ? Math.round(completedWithTiming.reduce((sum, audit) => sum + (new Date(audit.completed_at!).getTime() - new Date(audit.started_at!).getTime()) / 1000, 0) / completedWithTiming.length)
    : 0;
  const averagePromptCount = completedAudits.data?.length
    ? (completedAudits.data.reduce((sum, audit) => sum + Number(audit.prompt_count ?? 0), 0) / completedAudits.data.length).toFixed(1)
    : '0.0';
  const failedPrompts = (promptResults.data ?? []).filter((result) => Boolean(result.error)).length;
  const promptFailureRate = promptResults.data?.length ? ((failedPrompts / promptResults.data.length) * 100).toFixed(1) : '0.0';

  const services = [
    { label: 'Supabase', ready: configured('SUPABASE_URL') && configured('SUPABASE_ANON_KEY') && configured('SUPABASE_SERVICE_ROLE_KEY') },
    { label: 'Gemini', ready: configured('GOOGLE_API_KEY') },
    { label: 'Razorpay', ready: configured('RAZORPAY_KEY_ID') && configured('RAZORPAY_KEY_SECRET') && configured('RAZORPAY_WEBHOOK_SECRET') },
    { label: 'Email', ready: configured('BREVO_API_KEY') && configured('EMAIL_FROM') },
    { label: 'Cron auth', ready: configured('CRON_SECRET') },
    { label: 'Rate limiting', ready: configured('RATE_LIMIT_SALT') },
  ];
  const dataError = [pending, recentQueue, allProjects].find((result) => result.error)?.error?.message;

  return (
    <OperationsView
      pending={pending.count ?? 0}
      processing={processing.count ?? 0}
      failed={failed.count ?? 0}
      monthlyCostInr={monthlyCostInr}
      promptFailureRate={promptFailureRate}
      failedPrompts={failedPrompts}
      averageDurationSeconds={averageDurationSeconds}
      averagePromptCount={averagePromptCount}
      emailFailures={emailFailures.count ?? 0}
      newLeads={recentLeads.count ?? 0}
      scheduler={latestScheduler.data ?? null}
      services={services}
      launcherProjects={launcherProjects}
      reports={(recentIntelligence.data ?? []).map((run) => ({ ...run, businessName: projectNames[run.project_id] ?? 'Unknown business' }))}
      queue={queueRows.map((row) => ({ ...row, businessName: projectNames[row.project_id] ?? 'Unknown business', requester: requesterFor(row.project_id) }))}
      talkRequests={(talkEvents.data ?? []).map((event) => talkRequestRow(event))}
      auditRequests={requests.rows}
      auditRequestsUnavailable={requests.unavailable}
      dataError={dataError ?? null}
    />
  );
}

export interface TalkRequestRow {
  id: string;
  topic: 'fixes' | 'more_audits';
  email: string | null;
  businessName: string | null;
  note: string | null;
  createdAt: string;
}

export function talkRequestRow(event: { id: string; metadata: unknown; created_at: string }): TalkRequestRow {
  const meta = (event.metadata && typeof event.metadata === 'object' ? event.metadata : {}) as Record<string, unknown>;
  const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value : null);
  return {
    id: event.id,
    topic: meta.topic === 'more_audits' ? 'more_audits' : 'fixes',
    email: text(meta.email),
    businessName: text(meta.businessName),
    note: text(meta.note),
    createdAt: event.created_at,
  };
}

export interface OperationsViewProps {
  pending: number;
  processing: number;
  failed: number;
  monthlyCostInr: number;
  promptFailureRate: string;
  failedPrompts: number;
  averageDurationSeconds: number;
  averagePromptCount: string;
  emailFailures: number;
  newLeads: number;
  scheduler: { status: string; error: string | null; started_at: string } | null;
  services: Array<{ label: string; ready: boolean }>;
  launcherProjects: Array<{ id: string; businessName: string; city: string; ownerEmail: string | null }>;
  reports: Array<{ id: string; status: string; intervention_count: number; created_at: string; businessName: string }>;
  queue: Array<{ id: string; audit_id: string | null; status: string; priority: number; attempts: number; max_attempts: number; error: string | null; created_at: string; businessName: string; requester: string | null }>;
  talkRequests?: TalkRequestRow[];
  auditRequests?: AuditRequestRow[];
  auditRequestsUnavailable?: string | null;
  dataError: string | null;
}

/** Presentational console: everything the founder sees, from already-loaded data. */
export function OperationsView(props: OperationsViewProps) {
  const { pending, processing, failed, monthlyCostInr, promptFailureRate, failedPrompts, averageDurationSeconds, averagePromptCount, emailFailures, newLeads, scheduler, services, launcherProjects, reports, queue, talkRequests = [], auditRequests = [], auditRequestsUnavailable = null, dataError } = props;
  const readyCount = services.filter((service) => service.ready).length;
  const readyShare = Math.round((readyCount / services.length) * 100);
  return (
    <div className="zw-home">
      <header className="zw-hello">
        <div>
          <h1>Operations</h1>
          <p>Queue health, spend and launch readiness. Founder only.</p>
          <div className="zw-hello-meta">
            <span>{newLeads} new {newLeads === 1 ? 'lead' : 'leads'} today</span>
            <span>Scheduler: {scheduler ? `${scheduler.status} · ${when(scheduler.started_at)}` : 'no run yet'}</span>
            <span>{readyCount}/{services.length} services ready</span>
          </div>
        </div>
      </header>

      {dataError && (
        <div className="zw-notice zw-notice-error" role="alert"><p><strong>The database didn’t respond.</strong> {dataError}. Check that the Supabase project is running.</p></div>
      )}
      {scheduler?.status === 'failed' && (
        <div className="zw-notice zw-notice-error" role="alert"><p><strong>The last scheduled run failed.</strong> {scheduler.error ?? 'No error message was recorded.'}</p></div>
      )}

      <div className="zw-stats">
        <Stat order={0} hero label="Waiting in queue" value={pending} detail="audits not started yet" />
        <Stat order={1} label="Processing" value={processing} detail="running right now" />
        <Stat order={2} label="Failed · 30 days" value={failed} detail="queue jobs to review" gap={failed > 0} />
        <Stat order={3} label="Engine spend · 30 days" value={`₹${monthlyCostInr.toFixed(0)}`} detail={`₹${monthlyCostInr.toFixed(2)} across completed audits`} />
      </div>
      <div className="zw-stats">
        <Stat order={4} label="Prompt failures · 30 days" value={`${promptFailureRate}%`} detail={`${failedPrompts} failed observations`} gap={Number(promptFailureRate) >= 10} />
        <Stat order={5} label="Avg audit runtime" value={averageDurationSeconds ? `${averageDurationSeconds}s` : '—'} detail={`${averagePromptCount} questions per audit`} />
        <Stat order={6} label="Email failures · 30 days" value={emailFailures} detail="delivery provider events" gap={emailFailures > 0} />
        <Stat order={7} label="New leads · 24 hours" value={newLeads} detail="free audit requests" />
      </div>

      <div className="zw-grid">
        <Card order={8} className="zw-span-3" label="Audit requests">
          <AuditRequests requests={auditRequests} unavailable={auditRequestsUnavailable} />
        </Card>

        <Card order={8} className="zw-span-2" label="Run an audit">
          <AdminAuditLauncher projects={launcherProjects} />
        </Card>
        <Card order={9} className="zw-ink zw-next" label="Queue worker">
          <AdminQueueRunner pendingCount={pending} />
        </Card>

        <Card order={10} className="zw-ring-card" label="Launch services">
          <p className="zw-label">Launch services</p>
          <div className="zw-ring" role="img" aria-label={`${readyCount} of ${services.length} services configured`}>
            <svg viewBox="0 0 128 128" aria-hidden="true">
              <circle cx="64" cy="64" r="54" className="zw-ring-track" />
              <circle cx="64" cy="64" r="54" className="zw-ring-value" strokeDasharray={RING} style={{ '--zw-ring': `${RING * (100 - readyShare) * 0.01}` } as CSSProperties} />
            </svg>
            <div><strong>{readyCount}/{services.length}</strong><span>ready</span></div>
          </div>
          <ul className="zw-services">
            {services.map((service) => (
              <li key={service.label}><i className={`zw-dot ${service.ready ? 'is-recommended' : 'is-not-mentioned'}`} aria-hidden="true" />{service.label}<span>{service.ready ? 'Ready' : 'Missing'}</span></li>
            ))}
          </ul>
          <p className="zw-ring-note">Presence check only. Secret values never reach this page.</p>
        </Card>

        <Card order={11} className="zw-span-2" label="Recent reports">
          <div className="zw-card-head"><div><h2>Recent reports</h2><p>The latest finished intelligence reports, newest first.</p></div></div>
          {reports.length === 0 ? (
            <p className="zw-muted">No reports yet. Queue an audit above and run the worker.</p>
          ) : (
            <ul className="zw-rows">
              {reports.map((run) => (
                <li key={run.id}>
                  <div><strong>{run.businessName}</strong><span>{run.intervention_count} fixes · {when(run.created_at)}</span></div>
                  <Badge status={run.status} />
                  <a href={mainSiteUrl(`/r/${run.id}`)} target="_blank" rel="noreferrer" className="zw-text-link">Open ↗</a>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {talkRequests.length > 0 && (
          <Card order={12} className="zw-span-3" label="Clients asking to talk">
            <div className="zw-card-head"><div><h2>Clients asking to talk</h2><p>Requests from the client dashboard. Each one also landed in your inbox; reply there to reach the client.</p></div></div>
            <ul className="zw-rows">
              {talkRequests.map((request) => (
                <li key={request.id}>
                  <div>
                    <strong>{request.businessName ?? request.email ?? 'Unknown client'}</strong>
                    <span>{request.topic === 'fixes' ? 'Wants us to do the fixes' : 'Wants more audits'} · {when(request.createdAt)}{request.note ? ` · “${request.note.slice(0, 120)}”` : ''}</span>
                  </div>
                  {request.email && <a href={`mailto:${request.email}`} className="zw-text-link">{request.email}</a>}
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card order={13} className="zw-span-3" label="Queue activity">
          <div className="zw-card-head"><div><h2>Queue activity</h2><p>The last 12 jobs across all businesses.</p></div></div>
          {queue.length === 0 ? (
            <p className="zw-muted">The queue is empty.</p>
          ) : (
            <div className="zw-table-wrap">
              <table className="zw-table">
                <thead><tr><th>Business</th><th>Requested by</th><th>Status</th><th>Priority</th><th>Attempts</th><th>Queued</th><th>Report</th><th>Last error</th></tr></thead>
                <tbody>
                  {queue.map((row) => (
                    <tr key={row.id}>
                      <td className="is-strong">{row.businessName}</td>
                      <td>{row.requester ? <a href={`mailto:${row.requester}`} className="zw-text-link">{row.requester}</a> : <span className="zw-faint">—</span>}</td>
                      <td><Badge status={row.status} /></td>
                      <td className="is-num">{row.priority}</td>
                      <td className="is-num">{row.attempts}/{row.max_attempts}</td>
                      <td>{when(row.created_at)}</td>
                      <td>{row.status === 'done' && row.audit_id ? <a href={mainSiteUrl(`/r/${row.audit_id}`)} target="_blank" rel="noreferrer" className="zw-text-link">Open ↗</a> : <span className="zw-faint">—</span>}</td>
                      <td className="is-error" title={row.error ?? ''}>{row.error ?? <span className="zw-faint">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
