import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { isOutreachSlug, type OutreachReportFile } from '@/src/outreach/model';

/**
 * Outreach reports: published ones ship with the app (lib/outreach-reports,
 * committed); local ones (data/outreach-reports, gitignored) render only in dev.
 */
export async function loadOutreachReport(id: string): Promise<OutreachReportFile | null> {
  if (!isOutreachSlug(id)) return null;
  const dirs = [path.join(process.cwd(), 'lib', 'outreach-reports')];
  if (process.env.NODE_ENV !== 'production') dirs.push(path.join(process.cwd(), 'data', 'outreach-reports'));
  for (const dir of dirs) {
    try {
      const file = JSON.parse(await readFile(path.join(dir, `report-${id}.json`), 'utf8')) as OutreachReportFile;
      if (file?.version === 1 && file.slug === id && file.current?.questions) return file;
    } catch {
      // try the next location
    }
  }
  return null;
}
