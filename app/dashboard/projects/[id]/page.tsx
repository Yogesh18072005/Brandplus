import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isOpsUser } from '@/lib/auth/ops-access';
import { getIntelligenceReport } from '@/lib/reports/cached-intelligence-report';
import { simpleReportFor } from '@/lib/reports/load-simple-report';
import { SimpleReport } from '@/components/report/simple/SimpleReport';
import { FixPlanOffer } from '@/components/report/simple/FixPlanOffer';
import { RequestAuditButton } from '@/components/report/simple/RequestAuditButton';
import { BookWalkthrough } from '@/components/report/simple/BookWalkthrough';
import { ErrorNote } from '@/components/dashboard/project/kit';
import ProjectOverviewClient from './OverviewClient';

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

  // Ownership is checked above; run rows are read with the service client.
  const { data: run } = await createAdminClient()
    .from('intervention_generation_runs')
    .select('id')
    .eq('project_id', project.id)
    .in('status', ['COMPLETED', 'PARTIAL_SUCCESS'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const report = run ? await getIntelligenceReport(run.id) : null;

  if (!report || report.status !== 'COMPLETE') {
    const admin = createAdminClient();
    const [{ data: audit }, { data: request }] = await Promise.all([
      admin.from('audits').select('status').eq('project_id', project.id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('audit_queue').select('status, requires_approval, approved_at').eq('project_id', project.id).eq('job_type', 'AUDIT')
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    // The audit row stays queued/running through every engine stage; the
    // request row says whether we have approved it yet.
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
                <RequestAuditButton projectId={project.id} />
              </>
            ) : (
              <>
                <h2>We’re preparing {project.business_name}’s report</h2>
                <p className="sr-sub">We’ll email you the moment it’s ready, usually within one working day. Nothing for you to do.</p>
                <ol className="sr-steps">
                  <li className="is-done">Audit requested</li>
                  <li className={stage === 'running' ? 'is-now' : ''}>Ask AI your buyers’ questions</li>
                  <li>Email you the report</li>
                  <li>15-minute walkthrough and your fix plan</li>
                </ol>
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
      recheck={<RequestAuditButton projectId={project.id} label="Request a re-check" />}
      cta={<FixPlanOffer projectId={project.id} businessName={simple.businessName} gaps={simple.gaps} total={simple.total} />}
    />
  );
}
