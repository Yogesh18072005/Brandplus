import Link from 'next/link';
import { Wordmark } from '@/components/layout/SiteNav';
import { DecisionReport } from '@/components/report/DecisionReport';
import { buildCanonicalReportViewModel, reportPreview } from '@/lib/reports/report-view-model';
import type { CanonicalIntelligenceReport, IncompleteIntelligenceReport } from '@/lib/reports/intelligence-contract';

function customerStage(value: string): string {
  const normalized = value.toLowerCase();
  if (normalized.includes('business understanding') || normalized.includes('engine 01')) return 'Business context is still being verified.';
  if (normalized.includes('buyer') || normalized.includes('question set') || normalized.includes('engine 02')) return 'Buyer questions are still being prepared.';
  if (normalized.includes('observation') || normalized.includes('engine 03')) return 'AI answer observations are still being captured.';
  if (normalized.includes('diagnosis') || normalized.includes('engine 04')) return 'Evidence review is still being completed.';
  if (normalized.includes('intervention') || normalized.includes('engine 05')) return 'The action plan is still being finalized.';
  return 'A required report record is not ready yet.';
}

export function IncompleteReport({ report }: { report: IncompleteIntelligenceReport }) {
  const waitingFor = [...new Set(report.missingStages.map(customerStage))];
  return (
    <div className="report-v2 report-v2-incomplete">
      <header className="report-v2-appbar">
        <Link href="/" aria-label="BrandPulse home"><Wordmark /></Link>
        <Link className="report-v2-back-link" href="/dashboard">Return to workspace</Link>
      </header>
      <main className="report-v2-incomplete-shell">
        <div>
          <p className="report-v2-state-label">Report processing</p>
          <h1>{report.businessName}&apos;s evidence report is not ready yet.</h1>
          <p>BrandPulse will not replace missing evidence with an old score or a generic recommendation. The report becomes available when the required records are complete and internally consistent.</p>
        </div>
        <section>
          <h2>What is still happening</h2>
          <ol>{waitingFor.map((stage) => <li key={stage}>{stage}</li>)}</ol>
          <p>If this state persists, return to the project workspace and retry the failed step or contact support with the report reference below.</p>
          <details><summary>Technical report reference</summary><code>{report.id}</code></details>
        </section>
        <Link className="report-v2-primary-link" href="/dashboard">Return to workspace</Link>
      </main>
    </div>
  );
}

export function IntelligenceReportView({
  report,
  previousReport = null,
  full,
}: {
  report: CanonicalIntelligenceReport;
  previousReport?: CanonicalIntelligenceReport | null;
  full: boolean;
}) {
  const completeModel = buildCanonicalReportViewModel(report, previousReport);
  return <DecisionReport model={full ? completeModel : reportPreview(completeModel)} full={full} />;
}
