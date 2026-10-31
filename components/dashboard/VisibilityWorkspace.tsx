'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import type { DashboardIntelligenceSnapshot, IntelligenceSummary, ObservationOutcome } from '@/lib/reports/intelligence-contract';

interface AuditStatus {
  id: string;
  project_id: string;
  status: string;
  created_at: string;
  kind: 'LEGACY' | 'NEW_INTELLIGENCE';
}

interface Props {
  greeting: string;
  plan: string;
  projectCount: number;
  projectMap: Record<string, string>;
  firstProjectId?: string;
  creditsRemaining: number;
  freeCreditStatus: 'pending' | 'granted' | 'blocked';
  trackingEnabled: boolean;
  fullReport: boolean;
  reports: DashboardIntelligenceSnapshot[];
  audits: AuditStatus[];
  intelligenceError: string | null;
  demo?: boolean;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function outcomeLabel(outcome: ObservationOutcome): string {
  if (outcome === 'NOT_MENTIONED') return 'Not mentioned';
  if (outcome === 'INCONCLUSIVE') return 'Unclear';
  return outcome === 'RECOMMENDED' ? 'Recommended' : 'Mentioned';
}

function insight(summary: IntelligenceSummary): string {
  const share = summary.totalQuestions ? summary.meaningfulAppearances / summary.totalQuestions : 0;
  if (summary.meaningfulAppearances === 0) return 'Buyers are not finding you in these AI answers yet.';
  if (share >= 0.7) return 'You are named in most of the answers your buyers read.';
  return 'You are named in some answers, but not consistently.';
}

function answerSegments(summary: IntelligenceSummary): ObservationOutcome[] {
  return [
    ...Array.from({ length: summary.recommended }, () => 'RECOMMENDED' as const),
    ...Array.from({ length: summary.mentioned }, () => 'MENTIONED' as const),
    ...Array.from({ length: summary.notMentioned }, () => 'NOT_MENTIONED' as const),
    ...Array.from({ length: summary.inconclusive }, () => 'INCONCLUSIVE' as const),
  ];
}

const cssOutcome = (outcome: ObservationOutcome) => outcome.toLowerCase().replace('_', '-');

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d={diagonal ? 'M5 15 15 5M8 5h7v7' : 'M4 10h12M11 5l5 5-5 5'} />
    </svg>
  );
}

/** Counts up to `value` once; renders the final value immediately for reduced motion. */
function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || value === 0) { setShown(value); return; }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 900);
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    setShown(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{shown}</>;
}

/** A card that rises in on load; `order` staggers the entrance. */
function Card({ order, className = '', children, label }: { order: number; className?: string; children: ReactNode; label?: string }) {
  return <section className={`zw-card ${className}`} style={{ '--zw-i': order } as CSSProperties} aria-label={label}>{children}</section>;
}

export function VisibilityWorkspace(props: Props) {
  const {
    greeting, plan, projectCount, projectMap, creditsRemaining, freeCreditStatus,
    trackingEnabled, fullReport, reports, audits, intelligenceError,
  } = props;
  const initialProjectId = reports[0]?.projectId ?? props.firstProjectId ?? Object.keys(projectMap)[0] ?? '';
  const [projectId, setProjectId] = useState(initialProjectId);
  const report = useMemo(() => reports.find((item) => item.projectId === projectId), [reports, projectId]);
  const activeAudit = audits.find((audit) => audit.project_id === projectId && ['queued', 'running', 'processing'].includes(audit.status));
  const legacyAuditCount = audits.filter((audit) => audit.project_id === projectId && audit.kind === 'LEGACY').length;
  const projectName = projectMap[projectId] ?? 'this business';
  const projectHref = props.demo ? '/#audit' : `/dashboard/projects/${projectId}`;
  const reportHref = props.demo ? '/#audit' : report ? `/r/${report.reportId}` : projectHref;
  // The fix plan is offered on the report page, never listed here.
  const fixesHref = props.demo ? '/#audit' : `${projectHref}#sr-fix`;
  const evidenceHref = props.demo ? '/#audit' : projectHref;
  const historyHref = props.demo ? '/#audit' : projectHref;
  const summary = report?.status === 'COMPLETE' ? report.summary : null;
  const fixCount = report?.status === 'COMPLETE' ? report.totalInterventions : 0;
  const evidence = report?.observationPreview[0];

  return (
    <div className="zw-home">
      <header className="zw-hello">
        <div>
          <h1>{greeting}</h1>
          <p>{summary ? summary.statement : projectCount === 0 ? 'Add a business to see where AI recommends your competitors instead of you.' : `Build the first AI visibility baseline for ${projectName}.`}</p>
          <div className="zw-hello-meta">
            {report ? <span>Measured {formatDate(report.generatedAt)}</span> : projectCount > 0 && <span>No completed check yet</span>}
            {activeAudit && <span className="zw-live"><i aria-hidden="true" />Check {activeAudit.status}</span>}
            {!props.demo && <span>{plan} · {creditsRemaining} {creditsRemaining === 1 ? 'check' : 'checks'} left</span>}
          </div>
        </div>
        {projectCount > 0 && (
          <div className="zw-hello-actions">
            {Object.keys(projectMap).length > 1 && (
              <label className="zw-picker">
                <span className="zw-sr">Business</span>
                <select value={projectId} onChange={(event) => setProjectId(event.target.value)} aria-label="Choose business">
                  {Object.entries(projectMap).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </label>
            )}
            <Link href={report ? reportHref : projectHref} className="zw-btn zw-btn-primary">{report ? 'Open full report' : 'Start visibility check'} <Arrow /></Link>
            {report && <Link href={projectHref} className="zw-btn zw-btn-ghost">Business workspace</Link>}
          </div>
        )}
      </header>

      {freeCreditStatus === 'blocked' && (
        <div className="zw-notice" role="status"><p>Your free check has been used on this network.</p><Link href="/dashboard/billing">See options</Link></div>
      )}
      {intelligenceError && (
        <div className="zw-notice zw-notice-error" role="alert"><p>{intelligenceError}</p><Link href="/dashboard/projects">Open your businesses</Link></div>
      )}

      {projectCount === 0 ? (
        <div className="zw-grid">
          <Card order={0} className="zw-span-2 zw-onboard" label="Get started">
            <p className="zw-label">Get started · 0 of 3</p>
            <h2>Add one business. See where AI overlooks it.</h2>
            <p>We ask the questions buyers actually ask, record what AI says, and turn the gaps into a short list of fixes.</p>
            <ol className="zw-checklist">
              <li className="is-current"><span>1</span>Add your website</li>
              <li><span>2</span>Read the recorded answers</li>
              <li><span>3</span>Work on the highest-impact fix</li>
            </ol>
            <Link href="/dashboard/projects/new" className="zw-btn zw-btn-primary">Add your business <Arrow /></Link>
          </Card>
          <Card order={1} className="zw-ink" label="Done for you">
            <p className="zw-label zw-label-mint"><i aria-hidden="true" />Prefer we handle it?</p>
            <h2>We can run the audit and the fixes for you.</h2>
            <Link href="/sprint" className="zw-ink-link">See how it works <Arrow diagonal /></Link>
          </Card>
        </div>
      ) : !report ? (
        <div className="zw-grid">
          <Card order={0} className="zw-span-3 zw-onboard" label="First check">
            <p className="zw-label">Next step</p>
            <h2>Your first useful result is one check away.</h2>
            <p>We create a fixed set of buyer questions, record the AI answers, and come back with evidence-linked fixes.</p>
            <Link href={projectHref} className="zw-btn zw-btn-primary">Set up this business <Arrow /></Link>
          </Card>
        </div>
      ) : !summary ? (
        <div className="zw-grid">
          <Card order={0} className="zw-span-3 zw-onboard" label="Check needs attention">
            <p className="zw-label">Needs attention</p>
            <h2>Your check didn’t finish, so it can’t become a report yet.</h2>
            <p>{report.missingStages.length ? `Still needed: ${report.missingStages.join(' · ')}` : 'One or more measurement steps did not finish.'}</p>
            <Link href={projectHref} className="zw-btn zw-btn-primary">Review check status <Arrow /></Link>
          </Card>
        </div>
      ) : (
        <>
          {/* One bento, like the agency template: one number, one map, one answer, one next step. */}
          <div className="mt-6 grid gap-3 lg:grid-cols-12">
            <Card order={0} className="!p-0 lg:col-span-4 lg:row-span-2" label="Answers naming you">
              <div className="flex h-full flex-col justify-between bg-[linear-gradient(#f1f3f7_1px,transparent_1px),linear-gradient(90deg,#f1f3f7_1px,transparent_1px)] bg-[size:48px_48px] p-6">
                <div>
                  <p className="text-[13.5px] font-medium text-[#676480]">Answers that name {projectName}</p>
                  <p className="mt-3 flex items-baseline text-[clamp(72px,7vw,104px)] leading-none font-medium tracking-[-0.05em] text-[#171425]">
                    <CountUp value={summary.meaningfulAppearances} /><span className="ml-2 text-[0.4em] text-[#b5b3cb]">/ {summary.totalQuestions}</span>
                  </p>
                </div>
                <ul className="mt-8 flex flex-wrap gap-2">
                  {([['is-recommended', 'Recommended', summary.recommended], ['is-mentioned', 'Mentioned', summary.mentioned], ['is-not-mentioned', 'Not mentioned', summary.notMentioned], ['is-inconclusive', 'Unclear', summary.inconclusive]] as const).map(([cls, label, n]) => (
                    <li key={label} className="flex items-center gap-1.5 rounded-[9px] bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-[#2d2a40] ring-1 ring-[#e9e8f2]"><i className={`zw-dot ${cls}`} aria-hidden="true" />{label}<b className="font-semibold">{n}</b></li>
                  ))}
                </ul>
              </div>
            </Card>

            <Card order={1} className="lg:col-span-8" label="Answer map">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-[18px] font-semibold tracking-[-0.015em] text-[#171425]">{insight(summary)}</h2>
                <span className="text-[12.5px] text-[#676480]">Measured {formatDate(report.generatedAt)}</span>
              </div>
              <div className="zw-map mt-5" role="img" aria-label={`${summary.recommended} recommended, ${summary.mentioned} mentioned, ${summary.notMentioned} not mentioned, ${summary.inconclusive} unclear`}>
                {answerSegments(summary).map((outcome, index) => (
                  <span key={`${outcome}-${index}`} className={`zw-map-cell is-${cssOutcome(outcome)}`} style={{ '--zw-c': index } as CSSProperties} title={outcomeLabel(outcome)} />
                ))}
              </div>
              <p className="mt-3 text-[13px] text-[#676480]">One square per buyer question.</p>
            </Card>

            <Card order={2} className="lg:col-span-4" label="Evidence">
              <div className="flex items-center justify-between gap-3">
                <span className={`zw-badge is-${evidence ? cssOutcome(evidence.outcome) : 'inconclusive'}`}>{evidence ? outcomeLabel(evidence.outcome) : 'No answer'}</span>
                <Link href={reportHref} className="zw-text-link">All answers <Arrow /></Link>
              </div>
              {evidence ? (
                <>
                  <h3 className="mt-3 text-[14.5px] font-semibold text-[#171425]">{evidence.question}</h3>
                  <blockquote className="mt-2 text-[14px] leading-relaxed text-[#524f6d]">“{evidence.answer ? `${evidence.answer.slice(0, 220)}${evidence.answer.length > 220 ? '…' : ''}` : 'No answer text was recorded.'}”</blockquote>
                </>
              ) : <p className="zw-muted mt-3">No answer evidence is available for this check.</p>}
            </Card>

            <Card order={3} className="zw-ink lg:col-span-4" label="Best next move">
              <div className="flex h-full flex-col justify-between">
                <div>
                  <p className="zw-label zw-label-mint"><i aria-hidden="true" />Best next move</p>
                  <h2>{fixCount > 0 ? 'Your fix plan is ready.' : 'Read the missed answers first.'}</h2>
                  <p>{fixCount > 0 ? `${fixCount} ${fixCount === 1 ? 'fix' : 'fixes'}, ranked by impact. We walk you through them, and can do the work.` : 'No fix has been finalised for this check yet.'}</p>
                </div>
                <Link href={fixCount > 0 ? fixesHref : evidenceHref} className="zw-ink-link mt-5 self-start">{fixCount > 0 ? 'Get my fix plan' : 'Review the evidence'} <Arrow diagonal /></Link>
              </div>
            </Card>

            <Card order={4} className="gap-4 sm:!flex-row sm:items-center sm:justify-between lg:col-span-12" label="Re-check">
              <p className="text-[15px] text-[#171425]"><b className="font-semibold">Fix it, then ask the same questions again.</b> <span className="text-[#676480]">{trackingEnabled ? 'Weekly tracking is on for this plan.' : 'Your question set stays fixed, so the next check compares like with like.'}</span></p>
              <Link href={evidenceHref} className="zw-btn zw-btn-ghost">Plan the next check <Arrow /></Link>
            </Card>
          </div>

          {!fullReport && (
            <div className="zw-notice">
              <p><strong>You’re seeing the free preview.</strong> The full report has every answer, the diagnosis, and the prioritised fixes.</p>
              <Link href="/sprint">Talk to us about the full audit</Link>
            </div>
          )}
          {legacyAuditCount > 0 && (
            <p className="zw-history">You also have {legacyAuditCount} historical {legacyAuditCount === 1 ? 'audit' : 'audits'}. <Link href={historyHref}>Open activity</Link></p>
          )}
        </>
      )}
    </div>
  );
}
