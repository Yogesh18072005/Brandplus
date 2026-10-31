// Audit-first outreach: run a short audit on each prospect BEFORE contacting
// them, save a shareable report, and draft a hand-sent message from the real
// numbers. Nothing is ever sent automatically.
//
//   npm run outreach -- --draft-questions prospects.csv --confirm   # 1. draft + review questions (~₹3–6 each)
//   npm run outreach -- --approve-questions data/outreach/questions/acme-pm.json   # 2. founder approves (after editing)
//   npm run outreach -- prospects.csv                    # 3. dry run: cost estimate only
//   npm run outreach -- prospects.csv --confirm          #    run audits on APPROVED questions only (spends money)
//   npm run outreach -- --publish acme-pm-k7q2zx9a       # copy a report into the deployed set
//   npm run outreach -- --recheck acme-pm-k7q2zx9a --confirm   # day-30 like-for-like re-check
//   npm run outreach -- --enrich acme-pm-k7q2zx9a --confirm    # add site + AI footprint checks to an existing report
//   npm run outreach -- --rerun acme-pm-k7q2zx9a --confirm     # re-audit on newly approved questions, same link
//
// CSV columns (header row required): name,website,category,audience,region,competitors,contact,first_name,type
//   competitors: optional, separated by ";" — when empty, discovered from the answers
//   type: "software" (default) or "local"
//
// Reports land in data/outreach-reports/ (gitignored, local only). Nothing about a
// prospect becomes public until you --publish it into lib/outreach-reports/.

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { assertApiKey, config } from '../src/config';
import { estimateCallUsd, costCheckpoint, currentUsdSince } from '../src/cost';
import { generatePrompts } from '../src/promptgen';
import { runAuditPipeline } from '../src/pipeline';
import { buildReport } from '../src/scoring';
import { appendRunHistory, cumulativeInr, remainingInr, isOverGlobalCap } from '../src/spend-ledger';
import type { AuditInput, BuyerPrompt, PromptResult } from '../src/types';
import { runSiteChecks } from '../src/footprint/site-checks';
import { runAiFootprint } from '../src/footprint/ai-footprint';
import { cacheGet } from '../src/cache';
import { approve, assertApproved, draftQuestions, toBuyerPrompts, type QuestionFile } from '../src/outreach/question-gate';
import { buildScorecard } from '../src/outreach/scorecard';
import { buildQuote, formatMoney, validateRateCard } from '../src/outreach/quote';
import {
  buildSnapshot,
  discoverCompetitors,
  draftMessage,
  headline,
  isOutreachSlug,
  makeOutreachSlug,
  snapshotTotals,
  type OutreachReportFile,
} from '../src/outreach/model';

const LOCAL_DIR = path.resolve('data', 'outreach-reports');
const PUBLISHED_DIR = path.resolve('lib', 'outreach-reports');
const WORK_DIR = path.resolve('data', 'outreach');
const QUESTIONS_DIR = path.join(WORK_DIR, 'questions');

const fileSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const questionFileFor = (p: { name: string }) => path.join(QUESTIONS_DIR, `${fileSlug(p.name)}.json`);

/** The prospect's approved questions, or the reason they can't be audited yet. */
function approvedQuestions(p: { name: string }): { prompts: BuyerPrompt[] } | { problem: string } {
  const file = questionFileFor(p);
  if (!existsSync(file)) return { problem: `no questions yet: npm run outreach -- --draft-questions <csv> --confirm` };
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as QuestionFile;
    assertApproved(parsed);
    return { prompts: toBuyerPrompts(parsed) };
  } catch (err) {
    return { problem: `${err instanceof Error ? err.message : String(err)}: npm run outreach -- --approve-questions ${path.relative(process.cwd(), file)}` };
  }
}

// Grounded answers on 2.5-flash cost ~4x less than 3.5-flash and include free
// daily Google Search grounding. Override with --engine-model.
const DEFAULT_OUTREACH_ENGINE = 'gemini-2.5-flash';

interface Prospect {
  name: string;
  website: string;
  category: string;
  audience: string;
  region: string;
  competitors: string[];
  contact: string;
  firstName: string;
  type: 'software' | 'local';
}

/** Minimal RFC-4180 CSV: quoted fields, escaped quotes, commas/newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((cell) => cell.trim() !== '')) rows.push(row);
  return rows;
}

function loadProspects(file: string): Prospect[] {
  const [header, ...rows] = parseCsv(readFileSync(path.resolve(file), 'utf8').replace(/^﻿/, ''));
  if (!header) throw new Error(`${file} is empty`);
  const col = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name);
  const at = (row: string[], name: string) => (col(name) >= 0 ? (row[col(name)] ?? '').trim() : '');
  const prospects = rows.map((row, index): Prospect => {
    const prospect: Prospect = {
      name: at(row, 'name'),
      website: at(row, 'website'),
      category: at(row, 'category'),
      audience: at(row, 'audience'),
      region: at(row, 'region') || 'US',
      competitors: at(row, 'competitors').split(';').map((c) => c.trim()).filter(Boolean),
      contact: at(row, 'contact'),
      firstName: at(row, 'first_name'),
      type: at(row, 'type').toLowerCase() === 'local' ? 'local' : 'software',
    };
    if (!prospect.name || !prospect.website || !prospect.category) {
      throw new Error(`${file} row ${index + 2}: name, website and category are required`);
    }
    return prospect;
  });
  if (prospects.length === 0) throw new Error(`${file} has no prospect rows`);
  return prospects;
}

function toInput(p: Prospect): AuditInput {
  return {
    businessName: p.name,
    website: p.website,
    category: p.category,
    city: p.region, // software: buyer region label; local: the city
    businessType: p.type,
    region: p.region,
    targetCustomers: p.audience ? [p.audience] : [],
    competitors: p.competitors.map((name) => ({ name })),
    engines: ['gemini'],
  };
}

// The AI footprint adds two grounded calls (brand probe, directory search) and one judge call.
const footprintUsd = () => 2 * estimateCallUsd('engine:gemini', config.engineModel) + estimateCallUsd('parser', config.parserModel);

function estimateInr(questions: number): number {
  const usd = estimateCallUsd('promptgen', config.promptgenModel) + footprintUsd()
    + questions * (estimateCallUsd('engine:gemini', config.engineModel) + estimateCallUsd('parser', config.parserModel));
  return usd * config.usdInr;
}

const inr = (n: number) => `₹${n.toFixed(2)}`;

function reportPath(dir: string, slug: string) {
  return path.join(dir, `report-${slug}.json`);
}

function findReport(slug: string): string | null {
  if (!isOutreachSlug(slug)) throw new Error(`Not a valid report slug: ${slug}`);
  for (const dir of [LOCAL_DIR, PUBLISHED_DIR]) {
    const file = reportPath(dir, slug);
    if (existsSync(file)) return file;
  }
  return null;
}

function linkFor(baseUrl: string, slug: string) {
  return `${baseUrl.replace(/\/$/, '')}/r/${slug}`;
}

function groundedShare(results: PromptResult[]): number {
  const answered = results.filter((r) => r.answerText);
  return answered.length ? Math.round((answered.filter((r) => r.grounded !== false).length / answered.length) * 100) / 100 : 0;
}

/** One prospect: prompts → grounded answers → parse → discover rivals → report file. */
async function auditProspect(p: Prospect, questions: number, prompts?: BuyerPrompt[]) {
  const input = toInput(p);
  const frozen = prompts ?? await generatePrompts(input.category, input.city, questions, {
    businessName: input.businessName, businessType: input.businessType, region: input.region,
    targetCustomers: input.targetCustomers,
  });
  console.log(`  ${frozen.length} buyer questions ready`);
  // Website checks are free (no API calls) and run alongside the questions.
  const sitePromise = runSiteChecks(input.website);
  const pipeline = await runAuditPipeline(input, frozen, {
    onProgress: (done, total, r) => {
      const mark = !r.parsed ? '✗ failed' : r.parsed.mention_type === 'absent' ? '· absent' : '✓ named';
      console.log(`  [${done}/${total}] ${mark}  ${r.prompt.text}`);
    },
  });
  const discovered = input.competitors.length === 0;
  if (discovered) input.competitors = discoverCompetitors(pipeline.results, { name: input.businessName }).map((name) => ({ name }));
  const report = discovered ? buildReport(input, pipeline.results) : pipeline.report;
  const site = await sitePromise;
  console.log(`  website checks: ${site.reachable ? `done (${site.pages?.length ?? 0} pages)` : `site unreachable (${site.errors[0] ?? 'unknown'})`}`);
  const footprint = await footprintFor(input, pipeline.results, report.citationGap);
  return { input, prompts: frozen, results: pipeline.results, report, discovered, site, footprint };
}

async function footprintFor(input: AuditInput, answers: { citations: PromptResult['citations'] }[], citationGap: { domain: string; count: number }[]) {
  const footprint = await runAiFootprint({
    name: input.businessName, website: input.website, city: input.city, aliases: input.aliases,
    competitors: input.competitors.map((c) => c.name), answers,
  }, citationGap);
  const read = footprint.citedPages.filter((p) => p.status === 'read');
  console.log(`  AI footprint: probe ${footprint.probe?.verdict ?? 'failed'} · ${read.filter((p) => p.brandNamed).length} of ${read.length} readable cited pages name you · ${footprint.directories.length} directories checked${footprint.errors.length ? ` · ${footprint.errors.length} error(s): ${footprint.errors[0]}` : ''}`);
  return footprint;
}

async function runBatch(file: string, opts: { confirm: boolean; questions: number; maxInr: number; baseUrl: string }) {
  const prospects = loadProspects(file);
  const each = estimateInr(opts.questions);
  console.log(`\nOutreach batch: ${prospects.length} prospect(s) × ${opts.questions} questions`);
  console.log(`Models: engine ${config.engineModel} · parser ${config.parserModel} · promptgen ${config.promptgenModel}`);
  console.log(`Estimate: ~${inr(each)} per prospect, ~${inr(each * prospects.length)} total (cached answers cost ₹0)`);
  console.log(`Batch budget: ${inr(opts.maxInr)} · already spent overall: ${inr(cumulativeInr())} · global cap remaining: ${inr(remainingInr())}`);
  const fits = Math.max(0, Math.floor(opts.maxInr / each));
  if (fits < prospects.length) console.log(`⚠ Budget covers about ${fits} of ${prospects.length}; the batch stops there. Raise --max-inr to do more.`);
  for (const p of prospects) {
    const approved = approvedQuestions(p);
    console.log(`  · ${p.name} (${p.website}) — ${p.category}${p.competitors.length ? ` vs ${p.competitors.join(', ')}` : ' — rivals discovered from answers'}`);
    console.log(`    questions: ${'problem' in approved ? `✗ ${approved.problem}` : `✓ ${approved.prompts.length} approved`}`);
  }
  if (!opts.confirm) {
    console.log('\nDRY RUN — no API calls, no spend. Re-run with --confirm to execute.');
    return;
  }
  if (isOverGlobalCap()) throw new Error(`Global spend cap ₹${config.maxTotalSpendInr} already reached.`);

  mkdirSync(LOCAL_DIR, { recursive: true });
  mkdirSync(WORK_DIR, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const draftsFile = path.join(WORK_DIR, `drafts-${stamp}.md`);
  const indexFile = path.join(WORK_DIR, 'index.csv');
  if (!existsSync(indexFile)) writeFileSync(indexFile, 'date,name,website,contact,appeared,usable,top_rival,top_rival_count,link\n', 'utf8');

  const batchStart = costCheckpoint();
  for (const [i, p] of prospects.entries()) {
    const spent = currentUsdSince(batchStart) * config.usdInr;
    if (spent + each > opts.maxInr) {
      console.log(`\n⏹ Batch budget reached (${inr(spent)} of ${inr(opts.maxInr)}). ${prospects.length - i} prospect(s) left for the next batch.`);
      break;
    }
    console.log(`\n[${i + 1}/${prospects.length}] ${p.name}`);
    const approved = approvedQuestions(p);
    if ('problem' in approved) {
      console.log(`  ⏭ skipped: ${approved.problem}`);
      continue;
    }
    const before = costCheckpoint();
    try {
      const audit = await auditProspect(p, approved.prompts.length, approved.prompts);
      const slug = makeOutreachSlug(p.name, randomBytes(6).toString('base64url'));
      const now = new Date().toISOString();
      const competitors = audit.report.competitors.map((c) => c.name);
      const outreach: OutreachReportFile = {
        version: 1, slug, createdAt: now, businessType: p.type, region: p.region, audience: p.audience,
        engine: { provider: 'Google Gemini (with Google Search)', model: config.engineModel, groundedShare: groundedShare(audit.results) },
        competitorsDiscovered: audit.discovered, prompts: audit.prompts, report: audit.report,
        current: buildSnapshot(audit.results, competitors, now),
        site: audit.site,
        footprint: audit.footprint,
      };
      writeFileSync(reportPath(LOCAL_DIR, slug), JSON.stringify(outreach, null, 2), 'utf8');
      const cost = currentUsdSince(before);
      appendRunHistory(cost, `outreach ${p.name}`);

      const link = linkFor(opts.baseUrl, slug);
      const totals = snapshotTotals(outreach.current, competitors);
      const top = totals.competitors[0];
      const card = buildScorecard(outreach);
      console.log(`  → ${headline(outreach)}  Score ${card.score}/100 (${card.grade})`);
      console.log(`  → report: ${link}  (local until published)  · cost ${inr(cost * config.usdInr)}`);
      appendFileSync(draftsFile, [
        `## ${p.name} — ${p.contact || 'no contact yet'}`,
        '',
        `Report: ${link}`,
        `Publish first: npm run outreach -- --publish ${slug}`,
        '',
        '```',
        draftMessage(outreach, link, p.firstName),
        '```',
        '',
      ].join('\n'), 'utf8');
      const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
      appendFileSync(indexFile, [stamp, p.name, p.website, p.contact, totals.appeared, totals.usable, top?.name ?? '', top?.count ?? 0, link].map(cell).join(',') + '\n', 'utf8');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${p.name} failed: ${msg}`);
      if (/GLOBAL SPEND CAP/i.test(msg)) break;
    }
  }
  console.log(`\nBatch spend: ${inr(currentUsdSince(batchStart) * config.usdInr)} · cumulative: ${inr(cumulativeInr())}`);
  console.log(`Drafted messages: ${path.relative(process.cwd(), draftsFile)}  (review and send by hand)`);
}

async function recheck(slug: string, confirm: boolean) {
  const file = findReport(slug);
  if (!file) throw new Error(`No report found for ${slug}`);
  const existing = JSON.parse(readFileSync(file, 'utf8')) as OutreachReportFile;
  const ageDays = (Date.now() - new Date(existing.current.observedAt).getTime()) / 86_400_000;
  console.log(`\nRe-check ${existing.report.business.name}: ${existing.prompts.length} frozen questions, last observed ${ageDays.toFixed(1)} days ago`);
  console.log(`Estimate: ~${inr(estimateInr(existing.prompts.length) - estimateCallUsd('promptgen', config.promptgenModel) * config.usdInr)}`);
  if (ageDays < 1) console.log('⚠ Less than a day old: answers are cached per day, so this would show no change.');
  if (!confirm) {
    console.log('DRY RUN — re-run with --confirm to execute.');
    return;
  }
  const prospect: Prospect = {
    name: existing.report.business.name, website: existing.report.business.website, category: existing.report.business.category,
    audience: existing.audience, region: existing.region, competitors: existing.report.competitors.map((c) => c.name),
    contact: '', firstName: '', type: existing.businessType,
  };
  const before = costCheckpoint();
  const audit = await auditProspect(prospect, existing.prompts.length, existing.prompts);
  const now = new Date().toISOString();
  const updated: OutreachReportFile = {
    ...existing,
    report: audit.report,
    engine: { ...existing.engine, model: config.engineModel, groundedShare: groundedShare(audit.results) },
    baseline: existing.baseline ?? existing.current,
    current: buildSnapshot(audit.results, prospect.competitors, now),
    site: audit.site,
    footprint: audit.footprint,
  };
  mkdirSync(LOCAL_DIR, { recursive: true });
  writeFileSync(reportPath(LOCAL_DIR, slug), JSON.stringify(updated, null, 2), 'utf8');
  appendRunHistory(currentUsdSince(before), `recheck ${prospect.name}`);
  console.log(`→ ${headline(updated)}`);
  console.log(`Saved locally. Publish the updated report with: npm run outreach -- --publish ${slug}`);
}

/**
 * Re-audit an existing report on its prospect's APPROVED questions and keep the
 * slug, so a link already shared shows the new run. The previous file is
 * archived next to it. Unlike --recheck (same frozen questions, adds a
 * baseline), this replaces the question set, so there is no like-for-like diff.
 */
async function rerun(slug: string, confirm: boolean) {
  const file = findReport(slug);
  if (!file) throw new Error(`No report found for ${slug}`);
  const existing = JSON.parse(readFileSync(file, 'utf8')) as OutreachReportFile;
  const b = existing.report.business;
  const prospect: Prospect = {
    name: b.name, website: b.website, category: b.category, audience: existing.audience, region: existing.region,
    competitors: existing.competitorsDiscovered ? [] : existing.report.competitors.map((c) => c.name),
    contact: '', firstName: '', type: existing.businessType,
  };
  const approved = approvedQuestions(prospect);
  if ('problem' in approved) throw new Error(approved.problem);
  console.log(`
Re-run ${b.name} on ${approved.prompts.length} approved questions (replaces ${existing.prompts.length} old ones, same link)`);
  console.log(`Estimate: ~${inr(estimateInr(approved.prompts.length))}`);
  if (!confirm) {
    console.log('DRY RUN — re-run with --confirm to execute.');
    return;
  }
  const before = costCheckpoint();
  const audit = await auditProspect(prospect, approved.prompts.length, approved.prompts);
  const now = new Date().toISOString();
  const competitors = audit.report.competitors.map((c) => c.name);
  const updated: OutreachReportFile = {
    version: 1, slug, createdAt: now, businessType: existing.businessType, region: existing.region, audience: existing.audience,
    engine: { provider: 'Google Gemini (with Google Search)', model: config.engineModel, groundedShare: groundedShare(audit.results) },
    competitorsDiscovered: audit.discovered, prompts: audit.prompts, report: audit.report,
    current: buildSnapshot(audit.results, competitors, now), site: audit.site, footprint: audit.footprint,
  };
  const archive = path.join(LOCAL_DIR, 'archive');
  mkdirSync(archive, { recursive: true });
  writeFileSync(path.join(archive, `report-${slug}-${existing.createdAt.slice(0, 10)}.json`), JSON.stringify(existing, null, 2), 'utf8');
  writeFileSync(reportPath(LOCAL_DIR, slug), JSON.stringify(updated, null, 2), 'utf8');
  const cost = currentUsdSince(before);
  appendRunHistory(cost, `rerun ${b.name}`);
  console.log(`→ ${headline(updated)}  Score ${buildScorecard(updated).score}/100 · cost ${inr(cost * config.usdInr)}`);
  console.log(`Saved locally. Publish with: npm run outreach -- --publish ${slug}`);
}

/** Private, call-ready quote from a company's own audit. Prices come from outreach/rate-card.json. */
function quote(slug: string) {
  const file = findReport(slug);
  if (!file) throw new Error(`No report found for ${slug}`);
  const real = path.resolve('outreach', 'rate-card.json');
  const source = existsSync(real) ? real : path.resolve('outreach', 'rate-card.example.json');
  const card = validateRateCard(JSON.parse(readFileSync(source, 'utf8')));
  const report = JSON.parse(readFileSync(file, 'utf8')) as OutreachReportFile;
  const q = buildQuote(report, card);
  const money = (n: number) => formatMoney(n, q.currency);
  console.log(`\nQUOTE · ${report.report.business.name}  (private: never send this screen)`);
  if (source !== real) console.log('⚠ Using the EXAMPLE rate card. Copy it to outreach/rate-card.json and set your real prices.');
  console.log(`\nWhy this scope:`);
  for (const r of q.reasons) console.log(`  · ${r}`);
  console.log(`\nRecommend: ${q.recommended.name}: ${money(q.monthly)}/month, ${q.minimumMonths}-month minimum`);
  for (const item of q.recommended.includes) console.log(`  - ${item}`);
  console.log(`  Founding client price: ${money(q.foundingMonthly)}/month (first ${card.foundingSlots} clients, in exchange for a case study)`);
  if (q.stretch) {
    const stretchPrice = q.market === 'india' ? q.stretch.priceInr : q.stretch.priceUsd;
    console.log(`\nAlso show: ${q.stretch.name}: ${money(stretchPrice)}/month (${q.stretch.piecesPerMonth} pieces). Present it second.`);
  }
  console.log(`\nYour cost: ~${money(q.writerCostMonthly)}/month in writing → ${Math.round(q.marginShare * 100)}% gross margin at full price.`);
}

/**
 * Render reports to emailable A4 PDFs through the running app (dev or prod),
 * e.g. data/outreach/pdfs/Pirsch-Analytics-AI-Visibility-Audit.pdf.
 */
async function exportPdf(target: string, baseUrl: string) {
  const slugs = target === 'all'
    ? readdirSync(LOCAL_DIR).filter((f) => /^report-.+\.json$/.test(f)).map((f) => f.slice('report-'.length, -'.json'.length))
    : [target];
  const { chromium } = await import('playwright');
  const outDir = path.join(WORK_DIR, 'pdfs');
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const slug of slugs) {
      const file = findReport(slug);
      if (!file) throw new Error(`No report found for ${slug}`);
      const name = (JSON.parse(readFileSync(file, 'utf8')) as OutreachReportFile).report.business.name;
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const url = linkFor(baseUrl, slug);
      const response = await page.goto(url, { waitUntil: 'networkidle' });
      if (!response?.ok()) throw new Error(`${url} returned ${response?.status() ?? 'no response'}. Is the app running?`);
      const out = path.join(outDir, `${name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}-AI-Visibility-Audit.pdf`);
      await page.pdf({ path: out, printBackground: true, preferCSSPageSize: true });
      await page.close();
      console.log(`PDF: ${path.relative(process.cwd(), out)}`);
    }
  } finally {
    await browser.close();
  }
}

/**
 * Add the website checks and AI footprint to an existing report without
 * re-asking its questions: citations come from the engine cache (7-day TTL).
 * Costs the footprint's three calls, ~₹0.5.
 */
async function enrich(slug: string, confirm: boolean) {
  const file = reportPath(LOCAL_DIR, slug);
  if (!isOutreachSlug(slug) || !existsSync(file)) throw new Error(`No local report for ${slug}`);
  const existing = JSON.parse(readFileSync(file, 'utf8')) as OutreachReportFile;
  const answers = existing.prompts.map((p) => cacheGet<{ citations: PromptResult['citations'] }>('gemini', p.text)).filter((a): a is { citations: PromptResult['citations'] } => !!a);
  console.log(`
Enrich ${existing.report.business.name}: ${answers.length} of ${existing.prompts.length} cached answers carry their citations`);
  console.log(`Estimate: ~${inr(footprintUsd() * config.usdInr)} (brand probe, directory search, one judge call)`);
  if (!confirm) {
    console.log('DRY RUN — re-run with --confirm to execute.');
    return;
  }
  const before = costCheckpoint();
  const b = existing.report.business;
  const input: AuditInput = { businessName: b.name, website: b.website, category: b.category, city: b.city, competitors: existing.report.competitors.map((c) => ({ name: c.name })) };
  const [site, footprint] = await Promise.all([runSiteChecks(b.website), footprintFor(input, answers, existing.report.citationGap)]);
  const was = buildScorecard(existing);
  const updated: OutreachReportFile = { ...existing, site, footprint };
  writeFileSync(file, JSON.stringify(updated, null, 2), 'utf8');
  const cost = currentUsdSince(before);
  appendRunHistory(cost, `enrich ${b.name}`);
  const after = buildScorecard(updated);
  console.log(`→ score ${was.score} (${was.grade}) → ${after.score} (${after.grade}) · cost ${inr(cost * config.usdInr)}`);
}

function printQuestionFile(file: QuestionFile) {
  console.log(`\n  KEPT (${file.questions.length}):`);
  file.questions.forEach((q, i) => console.log(`   ${String(i + 1).padStart(2)}. [${q.intent}] ${q.text}\n       why: ${q.reason}`));
  if (file.rejected.length) {
    console.log(`\n  REJECTED (${file.rejected.length}):`);
    for (const r of file.rejected) console.log(`   ✗ ${r.reason.padEnd(16)} ${r.text}\n       ${r.note}`);
  }
  for (const w of file.warnings) console.log(`  ⚠ ${w}`);
}

/** Step 1 of every audit: draft and review the questions. Nothing is audited here. */
async function draftQuestionFiles(csv: string, opts: { confirm: boolean; questions: number; fresh: boolean }) {
  const prospects = loadProspects(csv);
  console.log(`\nDraft questions for ${prospects.length} prospect(s), ${opts.questions} each`);
  console.log('Reads each website, generates grounded buyer questions, reviews every one, regenerates gaps.');
  console.log('First draft ~₹15–25 per prospect (reading the site is most of it); a re-draft reuses the profile, ~₹2. --fresh re-reads the site.');
  if (!opts.confirm) {
    console.log('DRY RUN — re-run with --confirm to execute.');
    return;
  }
  mkdirSync(QUESTIONS_DIR, { recursive: true });
  for (const p of prospects) {
    console.log(`\n${p.name} (${p.website})`);
    const before = costCheckpoint();
    try {
      const out = questionFileFor(p);
      const previous = !opts.fresh && existsSync(out) ? (JSON.parse(readFileSync(out, 'utf8')) as QuestionFile) : null;
      const file = await draftQuestions(
        { name: p.name, website: p.website, category: p.category, region: p.region, audience: p.audience, type: p.type, count: opts.questions },
        (line) => console.log(line),
        { profile: previous?.profile },
      );
      writeFileSync(out, JSON.stringify(file, null, 2), 'utf8');
      const cost = currentUsdSince(before);
      appendRunHistory(cost, `questions ${p.name}`);
      printQuestionFile(file);
      console.log(`\n  → ${path.relative(process.cwd(), out)}  · cost ${inr(cost * config.usdInr)}`);
      console.log(`  Edit, delete or add questions there (each needs text, intent, reason), then approve:\n    npm run outreach -- --approve-questions ${path.relative(process.cwd(), out)}`);
    } catch (err) {
      console.error(`  ✗ ${p.name} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

function approveQuestionFile(file: string) {
  const parsed = JSON.parse(readFileSync(path.resolve(file), 'utf8')) as QuestionFile;
  const approved = approve(parsed);
  writeFileSync(path.resolve(file), JSON.stringify(approved, null, 2), 'utf8');
  printQuestionFile({ ...approved, rejected: [], warnings: [] });
  console.log(`\n✓ Approved ${approved.questions.length} questions for ${approved.business.name}. Audits will use exactly these; editing them needs a new approval.`);
}

/** Add (or refresh) the free website checks on existing local reports. No API spend. */
async function refreshSite(target: string) {
  const slugs = target === 'all'
    ? readdirSync(LOCAL_DIR).filter((f) => /^report-.+\.json$/.test(f)).map((f) => f.slice('report-'.length, -'.json'.length))
    : [target];
  for (const slug of slugs) {
    const file = reportPath(LOCAL_DIR, slug);
    if (!isOutreachSlug(slug) || !existsSync(file)) throw new Error(`No local report for ${slug}`);
    const existing = JSON.parse(readFileSync(file, 'utf8')) as OutreachReportFile;
    const site = await runSiteChecks(existing.report.business.website);
    const updated = { ...existing, site };
    writeFileSync(file, JSON.stringify(updated, null, 2), 'utf8');
    const card = buildScorecard(updated);
    console.log(`${slug}: ${site.reachable ? 'checked' : `unreachable (${site.errors[0] ?? 'unknown'})`} · score ${card.score}/100 (${card.grade})`);
  }
}

function publish(target: string) {
  mkdirSync(PUBLISHED_DIR, { recursive: true });
  const slugs = target === 'all'
    ? readdirSync(LOCAL_DIR).filter((f) => /^report-.+\.json$/.test(f)).map((f) => f.slice('report-'.length, -'.json'.length))
    : [target];
  for (const slug of slugs) {
    const source = reportPath(LOCAL_DIR, slug);
    if (!isOutreachSlug(slug) || !existsSync(source)) throw new Error(`No local report for ${slug}`);
    copyFileSync(source, reportPath(PUBLISHED_DIR, slug));
    console.log(`Published ${slug} → lib/outreach-reports/ (commit and deploy to make the link live)`);
  }
}

async function main() {
  const { values, positionals } = parseArgs({
    options: {
      confirm: { type: 'boolean' },
      questions: { type: 'string' },
      'max-inr': { type: 'string' },
      'engine-model': { type: 'string' },
      'base-url': { type: 'string' },
      publish: { type: 'string' },
      recheck: { type: 'string' },
      site: { type: 'string' },
      enrich: { type: 'string' },
      rerun: { type: 'string' },
      'draft-questions': { type: 'string' },
      'approve-questions': { type: 'string' },
      fresh: { type: 'boolean' },
      pdf: { type: 'string' },
      quote: { type: 'string' },
    },
    allowPositionals: true,
  });

  if (values.quote) return quote(values.quote);

  if (values.publish) return publish(values.publish);
  if (values['approve-questions']) return approveQuestionFile(values['approve-questions']);
  if (values.site) return refreshSite(values.site);
  if (values.pdf) return exportPdf(values.pdf, values['base-url'] ?? 'http://localhost:3000');

  assertApiKey();
  config.engineModel = values['engine-model'] ?? process.env.OUTREACH_ENGINE_MODEL ?? DEFAULT_OUTREACH_ENGINE;
  if (values.recheck) return recheck(values.recheck, !!values.confirm);
  if (values.enrich) return enrich(values.enrich, !!values.confirm);
  if (values.rerun) return rerun(values.rerun, !!values.confirm);
  if (values['draft-questions']) {
    return draftQuestionFiles(values['draft-questions'], { confirm: !!values.confirm, questions: Math.min(30, Math.max(5, Number(values.questions ?? 15))), fresh: !!values.fresh });
  }

  const csv = positionals[0];
  if (!csv) {
    console.log('Usage: npm run outreach -- prospects.csv [--confirm] [--questions 15] [--max-inr 60] [--base-url https://your-domain]');
    process.exit(1);
  }
  const questions = Math.min(40, Math.max(5, Number(values.questions ?? 15)));
  const maxInr = Math.max(1, Number(values['max-inr'] ?? 60));
  const baseUrl = values['base-url'] ?? process.env.OUTREACH_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  await runBatch(csv, { confirm: !!values.confirm, questions, maxInr, baseUrl });
}

main().catch((err) => {
  console.error('Outreach failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
