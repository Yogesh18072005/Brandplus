// A3 — build the §5.6 report JSON from any completed audit dump.
//
//   npm run report data/audit-<timestamp>.json
//
// Reads the { input, results } file that run-audit writes, applies the pure
// scoring module, prints the report JSON, and saves it to data/report-*.json.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import type { AuditInput, PromptResult } from './types';
import { buildReport } from './scoring';

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function main() {
  const { values, positionals } = parseArgs({
    options: { audit: { type: 'string' } },
    allowPositionals: true,
  });
  const auditFile = values.audit ?? positionals[0];
  if (!auditFile) {
    console.error('Usage: npm run report data/audit-<timestamp>.json');
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(path.resolve(auditFile), 'utf8')) as {
    input?: AuditInput;
    results?: PromptResult[];
  };
  if (!raw.input || !Array.isArray(raw.results)) {
    console.error(`${auditFile} is not an audit dump (expected { input, results })`);
    process.exit(1);
  }

  const report = buildReport(raw.input, raw.results);

  const outDir = path.resolve('data');
  mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `report-${slug(raw.input.businessName)}.json`);
  writeFileSync(outFile, JSON.stringify(report, null, 2), 'utf8');

  console.log(JSON.stringify(report, null, 2));
  console.error(`\nReport saved to ${outFile}`);
}

main();
