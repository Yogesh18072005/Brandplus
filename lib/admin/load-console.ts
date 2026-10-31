import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createAdminClient } from '@/lib/supabase/admin';
import { getEffectivePlan } from '@/lib/billing/effective-plan';
import { PLANS } from '@/lib/billing/plans';
import { resolveCredits } from '@/lib/billing/credits';
import { loadAuditRequests, talkRequestRow, type TalkRequestRow } from '@/components/admin/OperationsConsole';
import type { AuditRequestRow } from '@/components/admin/AuditRequests';
import { canRunLocally } from '@/lib/admin/require-ops';

export interface AdminCustomer {
  id: string;
  email: string | null;
  name: string | null;
  plan: string;
  credits: number;
  flag: string | null;
  businesses: string[];
  joinedAt: string;
  lastAuditAt: string | null;
}

export interface AdminAudit {
  id: string;
  businessName: string;
  customer: string | null;
  createdAt: string;
  status: string;
  questions: number | null;
  costInr: number;
  paidWith: 'customer' | 'admin' | null;
  reportId: string | null;
}

export interface AdminConsoleData {
  totals: { customers: number; newThisWeek: number; businesses: number; auditsAllTime: number; audits30d: number; waiting: number; running: number; adminCredits: number; spendMonthInr: number };
  spend: { ledgerInr: number | null; capInr: number };
  requests: AuditRequestRow[];
  requestsUnavailable: string | null;
  customers: AdminCustomer[];
  audits: AdminAudit[];
  talk: TalkRequestRow[];
  services: Array<{ label: string; ready: boolean }>;
  health: { failedJobs30d: number; emailFailures30d: number; stuck: number };
  canRun: boolean;
}

const configured = (name: string) => Boolean(process.env[name]?.trim());

function readLedgerInr(): number | null {
  try {
    const file = path.join(process.cwd(), '.spend', 'ledger.json');
    if (!existsSync(file)) return null;
    const usd = Number((JSON.parse(readFileSync(file, 'utf8')) as { cumulativeUsd?: number }).cumulativeUsd) || 0;
    return usd * Number(process.env.USD_INR || 90);
  } catch {
    return null;
  }
}

/** Everything the admin console shows, loaded with the service client (ops-only page). */
export async function loadAdminConsole(): Promise<AdminConsoleData> {
  const admin = createAdminClient();
  const now = Date.now();
  const weekAgo = new Date(now - 7 * 864e5).toISOString();
  const monthAgo = new Date(now - 30 * 864e5).toISOString();

  const [profilesRes, customerCount, newCount, projectsRes, auditsRes, auditsAll, audits30, queueRes, runsRes, talkRes, failedJobs, emailFailures, stuck] = await Promise.all([
    admin.from('profiles').select('id, email, full_name, plan, plan_expires_at, credits_remaining, credits_reset_at, free_credit_status, created_at').order('created_at', { ascending: false }).limit(500),
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
    admin.from('projects').select('id, user_id, business_name, created_at').order('created_at', { ascending: false }).limit(1000),
    admin.from('audits').select('id, project_id, status, created_at, completed_at, cost_estimate_cents, prompt_count').order('created_at', { ascending: false }).limit(150),
    admin.from('audits').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    admin.from('audits').select('id', { count: 'exact', head: true }).eq('status', 'completed').gte('created_at', monthAgo),
    admin.from('audit_queue').select('audit_id, credit_mode, approved_at').eq('job_type', 'AUDIT').eq('requires_approval', true).not('approved_at', 'is', null),
    admin.from('intervention_generation_runs').select('id, project_id, created_at').in('status', ['COMPLETED', 'PARTIAL_SUCCESS']).order('created_at', { ascending: false }).limit(500),
    admin.from('operational_events').select('id, metadata, created_at').eq('event_type', 'talk_requested').order('created_at', { ascending: false }).limit(30),
    admin.from('audit_queue').select('id', { count: 'exact', head: true }).eq('status', 'failed').gte('created_at', monthAgo),
    admin.from('operational_events').select('id', { count: 'exact', head: true }).eq('event_type', 'email_failed').gte('created_at', monthAgo),
    admin.from('audit_queue').select('id', { count: 'exact', head: true }).eq('status', 'processing').lt('started_at', new Date(now - 15 * 60e3).toISOString()),
  ]);
  const requests = await loadAuditRequests(admin);

  const projects = projectsRes.data ?? [];
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const profiles = profilesRes.data ?? [];
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const modeByAudit = new Map((queueRes.data ?? []).filter((q) => q.audit_id).map((q) => [q.audit_id!, q.credit_mode as 'charge' | 'free' | null]));
  const reportByProject = new Map<string, string>();
  for (const run of runsRes.data ?? []) if (!reportByProject.has(run.project_id)) reportByProject.set(run.project_id, run.id);

  const audits: AdminAudit[] = (auditsRes.data ?? []).map((a) => {
    const project = projectById.get(a.project_id);
    const owner = project ? profileById.get(project.user_id) : undefined;
    const mode = modeByAudit.get(a.id) ?? null;
    return {
      id: a.id,
      businessName: project?.business_name ?? 'Unknown business',
      customer: owner?.email ?? null,
      createdAt: a.created_at,
      status: a.status,
      questions: a.prompt_count ?? null,
      costInr: Number(a.cost_estimate_cents ?? 0) / 100,
      paidWith: mode === 'charge' ? 'customer' : mode === 'free' ? 'admin' : null,
      reportId: a.status === 'completed' ? reportByProject.get(a.project_id) ?? null : null,
    };
  });

  const lastAuditByOwner = new Map<string, string>();
  for (const a of auditsRes.data ?? []) {
    const owner = projectById.get(a.project_id)?.user_id;
    if (owner && !lastAuditByOwner.has(owner)) lastAuditByOwner.set(owner, a.created_at);
  }
  const customers: AdminCustomer[] = profiles.map((p) => ({
    id: p.id,
    email: p.email ?? null,
    name: p.full_name ?? null,
    plan: PLANS[getEffectivePlan(p)].name,
    credits: resolveCredits(p).creditsRemaining,
    flag: p.free_credit_status === 'blocked' ? 'Free audit blocked' : p.free_credit_status === 'pending' ? 'Setup not finished' : null,
    businesses: projects.filter((pr) => pr.user_id === p.id).map((pr) => pr.business_name),
    joinedAt: p.created_at,
    lastAuditAt: lastAuditByOwner.get(p.id) ?? null,
  }));

  const spendMonthInr = (auditsRes.data ?? []).filter((a) => a.created_at >= monthAgo).reduce((sum, a) => sum + Number(a.cost_estimate_cents ?? 0) / 100, 0);
  return {
    totals: {
      customers: customerCount.count ?? profiles.length,
      newThisWeek: newCount.count ?? 0,
      businesses: projects.length,
      auditsAllTime: auditsAll.count ?? 0,
      audits30d: audits30.count ?? 0,
      waiting: requests.rows.filter((r) => r.state === 'awaiting').length,
      running: requests.rows.filter((r) => r.state === 'running').length,
      adminCredits: (queueRes.data ?? []).filter((q) => q.credit_mode === 'free').length,
      spendMonthInr,
    },
    spend: { ledgerInr: readLedgerInr(), capInr: Number(process.env.MAX_TOTAL_SPEND_INR || 1000) },
    requests: requests.rows,
    requestsUnavailable: requests.unavailable,
    customers,
    audits,
    talk: (talkRes.data ?? []).map((e) => talkRequestRow(e)),
    services: [
      { label: 'Supabase', ready: configured('SUPABASE_SERVICE_ROLE_KEY') },
      { label: 'Gemini', ready: configured('GOOGLE_API_KEY') },
      { label: 'Email', ready: configured('BREVO_API_KEY') && configured('EMAIL_FROM') },
      { label: 'Razorpay', ready: configured('RAZORPAY_KEY_ID') && configured('RAZORPAY_KEY_SECRET') },
      { label: 'Cron auth', ready: configured('CRON_SECRET') },
    ],
    health: { failedJobs30d: failedJobs.count ?? 0, emailFailures30d: emailFailures.count ?? 0, stuck: stuck.count ?? 0 },
    canRun: canRunLocally(),
  };
}
