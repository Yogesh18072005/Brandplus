import { createAdminClient } from '@/lib/supabase/admin';
import { loadIntelligenceReportHistory, loadLatestIntelligenceReports } from '@/lib/reports/load-intelligence-report';
import { simpleReportFor } from '@/lib/reports/load-simple-report';
import type { SimpleReport } from '@/lib/reports/simple-report';

export type BusinessStage = 'none' | 'requested' | 'running' | 'ready' | 'incomplete';

export interface DashboardSourceCoverage {
  status: string;
  pages_analyzed: number;
  pages_successfully_analyzed: number;
  pages_failed: number;
  pages_empty: number;
  pages_blocked: number;
  pages_partial: number;
  pages_duplicate: number;
}

export interface DashboardBusiness {
  id: string;
  name: string;
  website: string;
  category: string;
  city: string;
  stage: BusinessStage;
  reportId: string | null;
  report: SimpleReport | null;
  /** A new check is open after the latest report (a re-check). */
  recheckOpen: boolean;
  /** Every completed check, oldest first: how often AI named the business. */
  history: Array<{ date: string; named: number; total: number }>;
  sourceCoverage: DashboardSourceCoverage | null;
}

interface ProjectRow { id: string; business_name: string; website: string | null; category: string | null; city: string | null }

/**
 * Everything the client dashboard shows for each business: its stage (from the
 * audit and request rows, as the business page decides it), the latest
 * plain-language report, and the history of completed checks for the trend.
 * Callers have already filtered `projects` to the signed-in owner.
 */
export async function loadDashboardBusinesses(projects: ProjectRow[]): Promise<DashboardBusiness[]> {
  const ids = projects.map((p) => p.id);
  if (!ids.length) return [];
  const admin = createAdminClient();
  const [reports, { data: audits }, { data: requests }, { data: understandingRuns }] = await Promise.all([
    loadLatestIntelligenceReports(ids).catch(() => []),
    admin.from('audits').select('project_id, status, created_at').in('project_id', ids).order('created_at', { ascending: false }),
    admin.from('audit_queue').select('project_id, status, requires_approval, approved_at, created_at').in('project_id', ids).eq('job_type', 'AUDIT').order('created_at', { ascending: false }),
    admin.from('business_understanding_runs').select('project_id, status, source_coverage, created_at').in('project_id', ids).neq('status', 'PROCESSING').order('created_at', { ascending: false }),
  ]);

  return Promise.all(projects.map(async (project) => {
    const report = reports.find((r) => r.projectId === project.id) ?? null;
    const audit = audits?.find((a) => a.project_id === project.id) ?? null;
    const request = requests?.find((r) => r.project_id === project.id) ?? null;
    const understandingRun = understandingRuns?.find((run) => run.project_id === project.id) ?? null;
    const rawCoverage = understandingRun?.source_coverage as unknown as Partial<DashboardSourceCoverage> | null;
    const coverageNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    const sourceCoverage: DashboardSourceCoverage | null = understandingRun && rawCoverage ? {
      status: understandingRun.status,
      pages_analyzed: coverageNumber(rawCoverage.pages_analyzed),
      pages_successfully_analyzed: coverageNumber(rawCoverage.pages_successfully_analyzed),
      pages_failed: coverageNumber(rawCoverage.pages_failed),
      pages_empty: coverageNumber(rawCoverage.pages_empty),
      pages_blocked: coverageNumber(rawCoverage.pages_blocked),
      pages_partial: coverageNumber(rawCoverage.pages_partial),
      pages_duplicate: coverageNumber(rawCoverage.pages_duplicate),
    } : null;
    const open = Boolean(audit && ['queued', 'running', 'processing'].includes(audit.status));
    const awaitingApproval = Boolean(request?.requires_approval && !request.approved_at && request.status === 'pending');
    const complete = report?.status === 'COMPLETE' ? report : null;
    let stage: BusinessStage = 'none';
    if (complete) stage = 'ready';
    else if (open) stage = awaitingApproval ? 'requested' : 'running';
    else if (report) stage = 'incomplete';

    const past = complete ? await loadIntelligenceReportHistory(project.id, 12).catch(() => []) : [];
    return {
      id: project.id,
      name: project.business_name,
      website: project.website ?? '',
      category: project.category ?? '',
      city: project.city ?? '',
      stage,
      reportId: report?.id ?? null,
      report: complete ? await simpleReportFor(complete) : null,
      recheckOpen: Boolean(complete && open && audit && new Date(audit.created_at) > new Date(complete.generatedAt)),
      history: past.map((r) => ({ date: r.generatedAt, named: r.summary.meaningfulAppearances, total: r.summary.totalQuestions })),
      sourceCoverage,
    };
  }));
}
