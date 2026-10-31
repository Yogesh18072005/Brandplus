import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import type { CanonicalIntelligenceReport } from '@/lib/reports/intelligence-contract';
import { buildSimpleReport, type SimpleReport } from '@/lib/reports/simple-report';

async function loadTrackedCompetitors(projectId: string): Promise<string[]> {
  const { data: project } = await createAdminClient()
    .from('projects')
    .select('competitors')
    .eq('id', projectId)
    .maybeSingle();
  return Array.isArray(project?.competitors)
    ? (project.competitors as Array<{ name?: unknown }>).map((item) => (typeof item?.name === 'string' ? item.name : '')).filter(Boolean)
    : [];
}

// A shared report link can be opened by many people at once; the competitor
// list changes rarely, so read it once a minute rather than on every view.
const trackedCompetitors = unstable_cache(loadTrackedCompetitors, ['simple-report-competitors'], { revalidate: 60 });

/** The plain-language report for a complete canonical report, with the business's tracked competitors. */
export async function simpleReportFor(report: CanonicalIntelligenceReport): Promise<SimpleReport> {
  return buildSimpleReport(report, await trackedCompetitors(report.projectId));
}
