import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isOpsUser } from '@/lib/auth/ops-access';
import { getIntelligenceReport } from '@/lib/reports/cached-intelligence-report';
import { simpleReportFor } from '@/lib/reports/load-simple-report';
import { SimpleReport } from '@/components/report/simple/SimpleReport';
import { FixPlanOffer } from '@/components/report/simple/FixPlanOffer';
import { RequestAuditButton } from '@/components/report/simple/RequestAuditButton';
import { AuditProgress } from '@/components/dashboard/project/AuditProgress';
import { BookWalkthrough } from '@/components/report/simple/BookWalkthrough';
import { ErrorNote } from '@/components/dashboard/project/kit';
import ProjectOverviewClient from './OverviewClient';
import { getEffectivePlan } from '@/lib/billing/effective-plan';
import { getPlanLimits } from '@/lib/billing/plans';

/**
 * A client sees one page: the plain-language report and a way to get the
 * fixes. The engine-by-engine workspace stays founder-only.
 */
export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (isOpsUser(user?.email)) return <ProjectOverviewClient />;
  if (!user) return <ErrorNote message="Sign in to see this business." />;

  const { data: project } = await supabase
    .from('projects')
    .select('id, business_name')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!project) return <ErrorNote message="Business not found" />;

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at')
    .eq('id', user.id)
    .maybeSingle();
  const plan = getEffectivePlan(profile);
  const planLimits = getPlanLimits(plan);
  const scheduledReportLabel = planLimits.dailyTracking
    ? 'Daily'
    : planLimits.weeklyTracking
      ? 'Weekly (every Monday)'
      : 'Not included on the Free plan';

  const admin = createAdminClient();
  const { data: latestCompletedAudit } = await admin
    .from('audits')
    .select('id')
    .eq('project_id', project.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  let report = latestCompletedAudit ? await getIntelligenceReport(latestCompletedAudit.id) : null;

  if (!report || report.status !== 'COMPLETE') {
    const { data: run } = await admin
      .from('intervention_generation_runs')
      .select('id')
      .eq('project_id', project.id)
      .in('status', ['COMPLETED', 'PARTIAL_SUCCESS', 'INCONCLUSIVE'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const legacyReport = run ? await getIntelligenceReport(run.id) : null;
    if (legacyReport?.status === 'COMPLETE') report = legacyReport;
  }

  if (!report || report.status !== 'COMPLETE') {
    const [{ data: audit }, { data: request }] = await Promise.all([
      admin.from('audits').select('id, status').eq('project_id', project.id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('audit_queue').select('status, requires_approval, approved_at').eq('project_id', project.id).eq('job_type', 'AUDIT')
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    const open = Boolean(audit && ['queued', 'running'].includes(audit.status));
    const awaitingApproval = Boolean(request?.requires_approval && !request.approved_at && request.status === 'pending');
    const stage: 'none' | 'requested' | 'running' = !open ? 'none' : awaitingApproval ? 'requested' : 'running';
    return (
      <div className="zw sr">
        <div className="sr-wrap">
          <section className="sr-card sr-pending">
            <p className="sr-label">Your report</p>
            {stage === 'none' ? (
              <>
                <h2>See what AI tells your buyers about {project.business_name}</h2>
                <p className="sr-sub">We ask AI the questions your buyers ask before they choose, record every answer word for word, and email you the report.</p>
                <p className="sr-sub"><strong>Scheduled reports:</strong> {scheduledReportLabel}.</p>
                <RequestAuditButton projectId={project.id} label="Get me a report now" />
              </>
            ) : (
              <>
                <h2>We’re preparing {project.business_name}’s report</h2>
                <p className="sr-sub">This free audit is processing in the background. The progress below updates automatically as each audit engine completes.</p>
                <p className="sr-sub"><strong>Scheduled reports:</strong> {scheduledReportLabel}.</p>
                {audit?.id && <AuditProgress auditId={audit.id} />}
              </>
            )}
          </section>
          {stage !== 'none' && <BookWalkthrough projectId={project.id} businessName={project.business_name} />}
        </div>
      </div>
    );
  }

  const simple = await simpleReportFor(report);
  return (
    <SimpleReport
      model={simple}
      mode="dashboard"
      pdfHref={`/api/reports/${report.id}/pdf`}
      shareHref={`/r/${report.id}`}
      recheck={<div className="flex flex-col items-start gap-2"><p className="sr-sub"><strong>Scheduled reports:</strong> {scheduledReportLabel}.</p><RequestAuditButton projectId={project.id} label="Get me a report now" /></div>}
      cta={<FixPlanOffer projectId={project.id} businessName={simple.businessName} gaps={simple.gaps} total={simple.total} />}
    />
  );
}
