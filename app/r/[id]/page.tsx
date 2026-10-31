import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { DecisionReport } from '@/components/report/DecisionReport';
import { IncompleteReport, IntelligenceReportView } from '@/components/report/IntelligenceReport';
import { currentUserCanViewFullReport, currentUserIntelligenceReportDepth } from '@/lib/reports/access';
import { loadIntelligenceReportHistory } from '@/lib/reports/load-intelligence-report';
import { getIntelligenceReport } from '@/lib/reports/cached-intelligence-report';
import { loadLegacyReport } from '@/lib/reports/load-report';
import { loadOutreachReport } from '@/lib/reports/load-outreach-report';
import { buildLegacyReportViewModel, reportPreview } from '@/lib/reports/report-view-model';
import { AuditReport } from '@/components/report/audit/AuditReport';
import { SimpleReport } from '@/components/report/simple/SimpleReport';
import { FixPlanOffer } from '@/components/report/simple/FixPlanOffer';
import { simpleReportFor } from '@/lib/reports/load-simple-report';
import { currentViewerIsOps } from '@/lib/auth/current-ops';

const getOutreachReport = cache(loadOutreachReport);
const getLegacyReport = cache(loadLegacyReport);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const outreach = UUID_PATTERN.test(id) ? null : await getOutreachReport(id);
  if (outreach) {
    return {
      title: `${outreach.report.business.name} - AI visibility audit`,
      description: `How often AI answers name ${outreach.report.business.name} when buyers ask about ${outreach.report.business.category}.`,
      robots: { index: false, follow: false },
    };
  }
  const intelligence = await getIntelligenceReport(id);
  if (intelligence) {
    const businessName = intelligence.status === 'COMPLETE' ? intelligence.business.business.name : intelligence.businessName;
    return {
      title: `${businessName} - BrandPulse AI visibility assessment`,
      description: `Evidence-linked AI visibility assessment for ${businessName}.`,
      robots: { index: false, follow: false },
    };
  }
  const report = await getLegacyReport(id);
  return {
    title: report ? `${report.business.name} - BrandPulse historical visibility assessment` : 'Report not found',
    robots: { index: false, follow: false },
  };
}

export default async function ReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ view?: string }> }) {
  const { id } = await params;
  const { view } = await searchParams;
  const outreach = UUID_PATTERN.test(id) ? null : await getOutreachReport(id);
  if (outreach) return <AuditReport file={outreach} showFixes={await currentViewerIsOps()} />;

  const intelligence = await getIntelligenceReport(id);
  if (intelligence) {
    if (intelligence.status === 'INCOMPLETE') return <IncompleteReport report={intelligence} />;
    const depth = await currentUserIntelligenceReportDepth(intelligence.projectId);
    // Everyone gets the plain-language report. The technical chain lists the
    // fixes, which we sell, so only the founder can open it.
    const founder = await currentViewerIsOps();
    if (view !== 'technical' || !founder) {
      const simple = await simpleReportFor(intelligence);
      return (
        <SimpleReport
          model={simple}
          mode="public"
          pdfHref={`/api/reports/${id}/pdf`}
          technicalHref={founder ? `/r/${id}?view=technical` : null}
          cta={<FixPlanOffer reportId={id} businessName={simple.businessName} gaps={simple.gaps} total={simple.total} />}
        />
      );
    }
    const history = depth === 'full' ? await loadIntelligenceReportHistory(intelligence.projectId, 12) : [];
    const previousReport = history
      .filter((item) => item.chain.interventionRunId !== intelligence.chain.interventionRunId)
      .filter((item) => new Date(item.generatedAt).getTime() < new Date(intelligence.generatedAt).getTime())
      .at(-1) ?? null;
    return <IntelligenceReportView report={intelligence} previousReport={previousReport} full={depth === 'full'} />;
  }

  const report = await getLegacyReport(id);
  if (!report) notFound();

  const sampleReport = !UUID_PATTERN.test(id);
  const full = sampleReport || await currentUserCanViewFullReport(id);
  const model = buildLegacyReportViewModel(id, report);
  return <DecisionReport model={full ? model : reportPreview(model)} full={full} />;
}
