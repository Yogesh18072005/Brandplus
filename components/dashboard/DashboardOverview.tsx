import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { SAMPLE_AUDIT } from '@/lib/marketing/sample-audit';
import { PIPELINE_STAGES, StageChip, type ProjectStageMap } from '@/components/dashboard/project/kit';

interface DashboardOverviewProps {
  greeting: string;
  plan: string;
  projectCount: number;
  latestScore: number | null;
  audits: Array<{ id: string; project_id: string; status: string; report_data: unknown; created_at: string }>;
  projectMap: Record<string, string>;
  projectStages?: Record<string, ProjectStageMap>;
  firstProjectId?: string;
  creditsRemaining: number;
  freeCreditStatus: 'pending' | 'granted' | 'blocked';
  trackingEnabled: boolean;
  latestIntelligence: {
    mentionRate: number;
    recommendationRate: number;
    citationRate: number;
    competitiveShare: number;
    missedQuestion: string | null;
    topCompetitor: string | null;
    actionCount: number;
  } | null;
}

function getScore(reportData: unknown): number | null {
  if (!reportData || typeof reportData !== 'object') return null;
  const scores = (reportData as Record<string, unknown>).scores as Record<string, unknown> | undefined;
  return typeof scores?.brandpulseScore === 'number'
    ? scores.brandpulseScore
    : typeof scores?.visibilityScore === 'number' ? scores.visibilityScore : null;
}

export function DashboardOverview(props: DashboardOverviewProps) {
  const { greeting, plan, projectCount, latestScore, audits, projectMap, projectStages = {}, firstProjectId, creditsRemaining, freeCreditStatus, trackingEnabled, latestIntelligence } = props;
  const activeAudit = audits.find((audit) => audit.status === 'queued' || audit.status === 'processing');
  const completed = audits.filter((audit) => audit.status === 'completed');
  const latestCompleted = completed[0];
  const previousScore = completed[1] ? getScore(completed[1].report_data) : null;
  const change = latestScore != null && previousScore != null ? latestScore - previousScore : null;
  const mainHref = projectCount === 0
    ? '/dashboard/projects/new'
    : activeAudit ? `/dashboard/projects/${activeAudit.project_id}`
      : latestCompleted ? `/r/${latestCompleted.id}` : `/dashboard/projects/${firstProjectId}`;
  const mainLabel = projectCount === 0 ? 'Add your business' : activeAudit ? 'View audit progress' : latestCompleted ? 'Open full report' : 'Run first audit';

  return (
    <div className="pb-16">
      <header className="flex flex-col gap-6 border-b border-rule pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-signal">BrandPulse workspace</p>
          <h1 className="mt-3 font-display text-[clamp(2rem,4vw,3.2rem)] font-semibold tracking-[-0.045em] text-content">{greeting}</h1>
          <p className="mt-3 max-w-[58ch] text-[15px] leading-7 text-secondary">One view of what changed, why it changed, and the work worth doing next.</p>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="rounded-full border border-rule bg-paper px-3 py-2 font-mono text-secondary">{creditsRemaining} {creditsRemaining === 1 ? 'credit' : 'credits'}</span>
          <span className="rounded-full bg-signal px-3 py-2 font-semibold text-white">{plan}</span>
        </div>
      </header>

      {freeCreditStatus === 'blocked' && (
        <section className="mt-6 rounded-2xl border border-amber-300/50 bg-amber-50 px-5 py-4 text-amber-950" role="status">
          <p className="text-[14px] font-semibold">Free-access limit reached</p>
          <p className="mt-1 text-[13px] leading-6">
            Two accounts on this network have already received free audit credits. This account remains active, but no additional free credit will be issued. Purchase a plan or credit pack to run audits.
          </p>
        </section>
      )}

      {projectCount === 0 ? (
        <section className="mt-9 overflow-hidden rounded-[2rem] bg-[#221859] p-8 text-white sm:p-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">Start with understanding</p>
          <h2 className="mt-5 max-w-[650px] text-balance font-display text-[clamp(2rem,5vw,4rem)] font-semibold leading-[1.02] tracking-[-0.055em]">Give BrandPulse the business. We’ll find the buyer questions that matter.</h2>
          <p className="mt-5 max-w-[580px] text-[15px] leading-7 text-white/65">Your website, offer, market, locations, and known competitors become a fixed question set you can measure again later.</p>
          <div className="mt-8 flex flex-wrap gap-4"><Link href="/dashboard/projects/new" className="inline-flex h-12 items-center rounded-full bg-white px-6 text-[14px] font-semibold text-[#221859] no-underline">Add your business →</Link><Link href={SAMPLE_AUDIT.reportUrl} className="inline-flex h-12 items-center text-[14px] font-semibold text-white/75 no-underline">See a complete example</Link></div>
        </section>
      ) : (
        <>
          <section className="mt-9 grid overflow-hidden rounded-[2rem] border border-rule bg-paper lg:grid-cols-[0.82fr_1.18fr]">
            <div className="flex min-h-[310px] flex-col justify-between bg-[#221859] p-8 text-white sm:p-10">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">Your AI visibility</p>
                <p className="mt-5 font-display text-[clamp(5rem,10vw,8.5rem)] font-semibold leading-none tracking-[-0.09em] tabular-nums">{latestScore ?? '—'}</p>
              </div>
              <div className="flex items-center justify-between border-t border-white/15 pt-5">
                <span className="text-[13px] text-white/55">Latest observed score</span>
                <span className={`font-mono text-[13px] ${change == null ? 'text-white/45' : change >= 0 ? 'text-[#8ee8b0]' : 'text-[#ffb1a8]'}`}>{change == null ? 'First benchmark' : `${change >= 0 ? '+' : ''}${change} since last run`}</span>
              </div>
            </div>

            <div className="grid gap-px bg-rule sm:grid-cols-2">
              <article className="bg-paper p-7 sm:p-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-signal">01 · What happened?</p>
                <h2 className="mt-4 text-[20px] font-semibold leading-snug text-content">{latestIntelligence?.missedQuestion ? 'You are absent from a commercially important question.' : latestScore == null ? 'Your first benchmark has not run yet.' : 'No competitor-won gap was found in the latest sample.'}</h2>
                {latestIntelligence?.missedQuestion && <p className="mt-4 text-[13px] leading-6 text-secondary">“{latestIntelligence.missedQuestion}”</p>}
              </article>
              <article className="bg-paper p-7 sm:p-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-signal">02 · Why?</p>
                <h2 className="mt-4 text-[20px] font-semibold leading-snug text-content">{latestIntelligence?.topCompetitor ? `${latestIntelligence.topCompetitor} has stronger observed answer presence.` : 'Open the evidence trail behind each answer.'}</h2>
                <p className="mt-4 text-[13px] leading-6 text-secondary">BrandPulse keeps the answer and cited pages together so this is inspectable, not a mystery score.</p>
              </article>
              <article className="bg-paper p-7 sm:p-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-signal">03 · What should change?</p>
                <h2 className="mt-4 text-[20px] font-semibold leading-snug text-content">{latestIntelligence ? `${latestIntelligence.actionCount} evidence-backed actions, in priority order.` : 'Run the audit to build a focused action queue.'}</h2>
                {firstProjectId && <Link href={`/dashboard/projects/${firstProjectId}/actions`} className="mt-5 inline-flex text-[13px] font-semibold text-signal no-underline">Open the action queue →</Link>}
              </article>
              <article className="bg-paper p-7 sm:p-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-signal">04 · Did it work?</p>
                <h2 className="mt-4 text-[20px] font-semibold leading-snug text-content">{change == null ? 'Make one change, then rerun the same question set.' : `${change >= 0 ? '+' : ''}${change} visibility across the same benchmark.`}</h2>
                <p className="mt-4 text-[13px] leading-6 text-secondary">{trackingEnabled ? 'Monitoring is enabled for this workspace.' : 'Ongoing comparison is available on a tracking plan.'}</p>
              </article>
            </div>
          </section>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link href={mainHref} className="btn-primary inline-flex h-12 items-center rounded-full px-6 text-[14px] font-semibold no-underline">{mainLabel} →</Link>
            {firstProjectId && <Link href={`/dashboard/projects/${firstProjectId}`} className="text-[14px] font-semibold text-signal no-underline">Open project</Link>}
          </div>
        </>
      )}

      {(projectCount > 0 || Object.keys(projectMap).length > 0) && (
        <section className="mt-14">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-tertiary">Pipeline</p>
              <h2 className="mt-2 font-display text-[22px] font-semibold text-content">Projects</h2>
              <p className="mt-2 max-w-[58ch] text-[13px] leading-6 text-secondary">Live engine stages from Business Understanding through Execution, straight from each project’s real runs.</p>
            </div>
            <Link href="/dashboard/projects" className="text-[13px] font-semibold text-signal no-underline">All projects →</Link>
          </div>
          <div className="divide-y divide-rule border-y border-rule">
            {Object.entries(projectMap).map(([pid, name]) => {
              const stages = projectStages[pid];
              return (
                <div key={pid} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <Link href={`/dashboard/projects/${pid}`} className="text-[14px] font-semibold text-content no-underline hover:text-signal">{name}</Link>
                  <div className="flex flex-wrap gap-1.5">
                    {PIPELINE_STAGES.map((stage) => (
                      <StageChip key={stage.key} stage={stage.key} status={stages && stage.key in stages ? stages[stage.key as keyof ProjectStageMap] : undefined} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {audits.length > 0 && (
        <section className="mt-14">
          <div className="mb-5 flex items-end justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-tertiary">Benchmarks</p><h2 className="mt-2 font-display text-[22px] font-semibold text-content">Recent measurements</h2></div><Link href="/dashboard/projects" className="text-[13px] font-semibold text-signal no-underline">All projects →</Link></div>
          <div className="divide-y divide-rule border-y border-rule">
            {audits.map((audit) => {
              const score = getScore(audit.report_data);
              return <div key={audit.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center sm:gap-6"><div><p className="text-[14px] font-semibold text-content">{projectMap[audit.project_id] ?? 'Business'}</p><p className="mt-1 text-[11px] text-secondary">{new Date(audit.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div><Badge status={audit.status === 'completed' ? 'completed' : audit.status === 'failed' ? 'failed' : audit.status === 'processing' ? 'active' : 'queued'}>{audit.status}</Badge><span className="font-mono text-[15px] font-semibold tabular-nums text-content">{score ?? '—'}</span><Link href={audit.status === 'completed' ? `/r/${audit.id}` : `/dashboard/projects/${audit.project_id}`} className="text-[12px] font-semibold text-signal no-underline">{audit.status === 'completed' ? 'Report →' : 'Details →'}</Link></div>;
            })}
          </div>
        </section>
      )}
    </div>
  );
}
