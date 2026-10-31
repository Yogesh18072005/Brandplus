import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ReportData } from '@/src/scoring';
import { createAdminClient } from '@/lib/supabase/admin';
import { isCanonicalAudit } from '@/lib/reports/canonical-audit-envelope';

/** Load a report by UUID (Supabase) or slug (committed sample / local data file). */
export async function loadLegacyReport(id: string): Promise<ReportData | null> {
  if (!id || id.length > 100) return null;

  // UUID → completed audit in Supabase
  if (/^[0-9a-f-]{36}$/i.test(id)) {
    try {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from('audits')
        .select('report_data')
        .eq('id', id)
        .eq('status', 'completed')
        .single();
      if (data?.report_data && !isCanonicalAudit(data.report_data)) return data.report_data as unknown as ReportData;
    } catch {
      // fall through
    }
  }

  if (!/^[a-z0-9-]+$/.test(id)) return null;

  // Committed illustrative reports deployed with the app.
  try {
    const samplePath = path.join(process.cwd(), 'lib', 'sample-reports', `report-${id}.json`);
    const raw = await readFile(samplePath, 'utf8');
    return JSON.parse(raw) as ReportData;
  } catch {
    // fall through
  }

  // Local dev cache (gitignored)
  try {
    const raw = await readFile(path.join(process.cwd(), 'data', `report-${id}.json`), 'utf8');
    return JSON.parse(raw) as ReportData;
  } catch {
    return null;
  }
}

/** Backward-compatible name for callers that still intentionally load historical audit reports. */
export const loadReport = loadLegacyReport;
