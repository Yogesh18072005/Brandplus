import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8');

test('report route selects canonical intelligence before the historical legacy loader', () => {
  const page = source('app/r/[id]/page.tsx');
  // The page reads through request/viewer-cached wrappers of the two loaders;
  // the canonical one is shared with the dashboard and the PDF route.
  assert.match(page, /from '@\/lib\/reports\/cached-intelligence-report'/);
  assert.match(source('lib/reports/cached-intelligence-report.ts'), /getIntelligenceReport = cache\(unstable_cache\(loadIntelligenceReportOnce/);
  assert.match(page, /getLegacyReport = cache\(loadLegacyReport\)/);
  const render = page.slice(page.indexOf('export default async function ReportPage'));
  assert.ok(render.indexOf('getIntelligenceReport(id)') > -1);
  assert.ok(render.indexOf('getIntelligenceReport(id)') < render.indexOf('getLegacyReport(id)'));
  assert.match(page, /IntelligenceReportView/);
  assert.match(page, /currentUserIntelligenceReportDepth/);
  assert.match(page, /buildLegacyReportViewModel/);
});

test('canonical loader reconstructs and validates one Engine 01-06 lineage internally', () => {
  const loader = source('lib/reports/load-intelligence-report.ts');
  assert.match(loader, /intervention_generation_runs/);
  assert.match(loader, /buyer_question_sets/);
  assert.match(loader, /loadSourceBundle/);
  assert.match(loader, /validateIntelligenceChain/);
  assert.match(loader, /run\.interventionRunId === row\.id/);
});

test('customer decision report uses customer language and no score vocabulary', () => {
  const report = source('components/report/DecisionReport.tsx');
  for (const heading of ['Evidence behind the result', 'Prioritized action plan', 'Implementation and recheck', 'Measurement scope']) assert.match(report, new RegExp(heading));
  assert.doesNotMatch(report, /Engine 0[1-6]|observed visibility|Top competitor|visibilityScore|brandpulseScore/i);
  assert.match(report, /PrintButton reportId/);
  const incomplete = source('components/report/IntelligenceReport.tsx');
  assert.match(incomplete, /customerStage/);
  assert.match(incomplete, /Business context is still being verified/);
});

test('report view model centralizes question, observation, diagnosis, action, source, and comparison linkage', () => {
  const model = source('lib/reports/report-view-model.ts');
  assert.match(model, /buildCanonicalEvidence/);
  assert.match(model, /diagnosisFor/);
  assert.match(model, /actionIds/);
  assert.match(model, /sourcesFromEvidence/);
  assert.match(model, /comparisonFor/);
  assert.match(model, /needsValidation/);
  assert.doesNotMatch(model, /Hatti|Krishnavi/i);
});

test('PDF download is controlled server-side and browser printing is no longer the product action', () => {
  const button = source('components/PrintButton.tsx');
  const route = source('app/api/reports/[id]/pdf/route.ts');
  const document = source('components/report/ReportPdfDocument.tsx');
  assert.match(button, /api\/reports/);
  assert.doesNotMatch(button, /window\.print/);
  assert.match(route, /renderToBuffer/);
  assert.match(route, /Content-Disposition/);
  assert.match(route, /currentUserIntelligenceReportDepth/);
  assert.match(document, /Confidential - observed/);
  assert.match(document, /footerLeft: \{ position: 'absolute'/);
});

test('report print styles hide browser-only controls and keep atomic evidence and actions together', () => {
  const css = source('app/report.css');
  assert.match(css, /\.skip-link/);
  assert.match(css, /break-inside:\s*avoid/);
  assert.match(css, /\.report-v2-evidence-card/);
  assert.match(css, /\.report-v2-action/);
  assert.match(css, /color:\s*#121026\s*!important/);
});

test('dashboard consumes canonical report snapshots and never calculates a legacy score', () => {
  const page = source('app/dashboard/page.tsx');
  const workspace = source('components/dashboard/VisibilityWorkspace.tsx');
  assert.match(page, /loadLatestIntelligenceReports/);
  assert.match(page, /toDashboardSnapshot/);
  assert.doesNotMatch(page, /visibilityScore|brandpulseScore|topCompetitor/);
  assert.match(page, /isCanonicalAudit\(audit\.report_data\)/);
  assert.doesNotMatch(workspace, /\/ 100|Score \/ 100|Top competitor/);
  assert.match(workspace, /historical.*Open activity/s);
});

test('every supported new audit trigger marks the row as NEW_INTELLIGENCE', () => {
  for (const file of [
    'app/api/audits/route.ts',
    'app/api/admin/audits/route.ts',
    'app/api/cron/scheduled-audits/route.ts',
    'lib/onboarding/queue-free-audit.ts',
  ]) {
    assert.match(source(file), /report_data:\s*canonicalAuditJson\(\)/, file);
  }
});

test('canonical audit orchestration reuses Engines 01-05 and the existing queue', () => {
  const orchestration = source('lib/reports/canonical-audit-orchestration.ts');
  const worker = source('lib/queue/process-next-job.ts');
  assert.match(orchestration, /BusinessUnderstandingService/);
  assert.match(orchestration, /BuyerIntentService/);
  assert.match(orchestration, /ObservationService/);
  assert.match(orchestration, /EvidenceDiagnosisService/);
  assert.match(orchestration, /InterventionGenerationService/);
  assert.doesNotMatch(orchestration, /runAuditPipeline|Engine 07/);
  assert.match(worker, /processCanonicalAuditBootstrap/);
  assert.ok(worker.indexOf('parseCanonicalAuditEnvelope(audit.report_data)') < worker.indexOf('runAuditPipeline(auditInput'));
});

test('canonical audit IDs resolve through the Engine report loader without becoming legacy data', () => {
  const loader = source('lib/reports/load-intelligence-report.ts');
  const legacy = source('lib/reports/load-report.ts');
  assert.match(loader, /parseCanonicalAuditEnvelope/);
  assert.match(loader, /envelope\.chain\.interventionRunId/);
  assert.match(legacy, /!isCanonicalAudit\(data\.report_data\)/);
});

test('Engine 02 API results expose the physical frozen-set UUID required by Engine 03', () => {
  const repository = source('lib/buyer-intent/repository.ts');
  assert.match(repository, /return \{ \.\.\.result, id: set\.id \}/);
  assert.match(repository, /id: set\.id/);
  assert.doesNotMatch(repository, /id: set\.set_key/);
});

test('paid tracking uses canonical observation counts and contains no score denominator', () => {
  const route = source('app/api/projects/[id]/tracking/route.ts');
  const page = source('app/dashboard/projects/[id]/tracking/page.tsx');
  const chart = source('components/dashboard/VisibilityChart.tsx');
  assert.match(route, /loadIntelligenceReportHistory/);
  assert.match(route, /meaningfulAppearances/);
  assert.doesNotMatch(`${route}\n${page}\n${chart}`, /visibility_score|brandpulse_score|\/100|topCompetitor/i);
});
