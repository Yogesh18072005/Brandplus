// M1 CLI — generate and review buyer prompts before any audit uses them.
//
//   npm run prompts -- --category "cosmetic dentistry" --city "Delhi" [--count 40]
//   npm run prompts "cosmetic dentistry" Delhi [40]      # positional form
//   (PowerShell tends to eat the `--` separator, so positional args also work)
//
// Prints the list grouped by intent and saves it to data/prompts-*.json,
// which `npm run audit -- --prompts <file>` can consume.

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { assertApiKey, config } from './config';
import { generatePrompts, INTENTS } from './promptgen';
import { costSummary } from './cost';

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function main() {
  const { values, positionals } = parseArgs({
    options: {
      category: { type: 'string' },
      city: { type: 'string' },
      count: { type: 'string' },
    },
    allowPositionals: true,
  });

  const category = values.category ?? positionals[0];
  const city = values.city ?? positionals[1];
  const countArg = values.count ?? positionals[2];

  if (!category || !city) {
    console.error('Usage: npm run prompts "cosmetic dentistry" "Delhi" [40]');
    process.exit(1);
  }
  assertApiKey();

  const count = countArg ? Number(countArg) : config.promptCount;
  console.log(`Generating ~${count} buyer prompts for "${category}" in ${city} (model: ${config.promptgenModel})…\n`);

  const prompts = await generatePrompts(category, city, count);

  let n = 0;
  for (const intent of INTENTS) {
    const group = prompts.filter((p) => p.intent === intent);
    if (group.length === 0) continue;
    console.log(`── ${intent} (${group.length}) ─────────────────────────`);
    for (const p of group) console.log(`  ${String(++n).padStart(2)}. ${p.text}`);
    console.log('');
  }
  // Anything with an unexpected intent label still gets shown, not dropped.
  const known = new Set<string>(INTENTS);
  const other = prompts.filter((p) => !known.has(p.intent));
  if (other.length) {
    console.log(`── other (${other.length}) ─────────────────────────`);
    for (const p of other) console.log(`  ${String(++n).padStart(2)}. ${p.text} [${p.intent}]`);
    console.log('');
  }

  const outDir = path.resolve('data');
  mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `prompts-${slug(category)}-${slug(city)}.json`);
  writeFileSync(
    file,
    JSON.stringify(
      { category, city, generatedAt: new Date().toISOString(), prompts },
      null,
      2
    ),
    'utf8'
  );

  console.log(`${prompts.length} prompts saved to ${file}`);
  console.log(`Run the audit with them: npm run audit -- --prompts "${file}"`);
  console.log(costSummary());
}

main().catch((err) => {
  console.error('Prompt generation failed:', err);
  process.exit(1);
});
