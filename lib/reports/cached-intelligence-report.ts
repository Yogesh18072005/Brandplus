import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { loadIntelligenceReport } from '@/lib/reports/load-intelligence-report';

// Rebuilding a report walks the Engine 01–05 chain in sequential Supabase
// round trips (~6s), and both generateMetadata and the page need it. Load it
// once per request and share it across viewers for a minute: the chain is
// frozen once complete, and access depth is still decided per viewer.
// Concurrent misses (a cold cache, or the minute expiring under traffic) share
// one rebuild per instance; a load test at 50 concurrent viewers otherwise
// fired ~1,000 queries at once and stalled the database.
const inflightReports = new Map<string, ReturnType<typeof loadIntelligenceReport>>();
function loadIntelligenceReportOnce(id: string): ReturnType<typeof loadIntelligenceReport> {
  const pending = inflightReports.get(id);
  if (pending) return pending;
  const load = loadIntelligenceReport(id).finally(() => inflightReports.delete(id));
  inflightReports.set(id, load);
  return load;
}

export const getIntelligenceReport = cache(unstable_cache(loadIntelligenceReportOnce, ['intelligence-report'], { revalidate: 60, tags: ['intelligence-report'] }));
