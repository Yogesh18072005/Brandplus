// Processes one pending job from audit_queue — shared by the local CLI and
// the optional HTTP trigger. Audits take minutes; run via `npm run queue` on
// your machine, not on Vercel serverless (60s timeout on Hobby).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/lib/supabase/types';
import { runAuditPipeline } from '@/src/pipeline';
import { resolveProjectPrompts } from '@/lib/queue/resolve-prompts';
import { sendEmail } from '@/lib/email/mailer';
import { resolveReportRecipient } from '@/lib/email/recipients';
import { auditCompleteEmail } from '@/lib/email/templates';
import { getAppUrl } from '@/lib/app-url';
import type { AuditInput } from '@/src/types';
import { recordOperationalEvent } from '@/lib/ops/events';
import { processObservationQueueJob } from '@/lib/ai-observation/process-job';
import { processEvidenceDiagnosisQueueJob } from '@/lib/evidence-diagnosis/process-job';
import { processInterventionQueueJob } from '@/lib/intervention-generation/process-job';
import { processExecutionQueueJob } from '@/lib/execution/process-job';
import { parseCanonicalAuditEnvelope } from '@/lib/reports/canonical-audit-envelope';
import { processCanonicalAuditBootstrap } from '@/lib/reports/canonical-audit-orchestration';

type AdminClient = SupabaseClient<Database>;

export interface ProcessQueueResult {
  status: 'empty' | 'completed' | 'failed' | 'cap_reached';
  message: string;
  auditId?: string;
  reportUrl?: string;
  visibilityScore?: number;
  costInr?: number;
  emailed?: boolean;
  error?: string;
  spentInr?: number;
  capInr?: number;
}

function positiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function processNextQueueJob(supabase: AdminClient): Promise<ProcessQueueResult> {
  // The database claims the row under FOR UPDATE SKIP LOCKED. A second worker
  // therefore receives a different row (or null), never this same audit.
  const { data: job, error: claimError } = await supabase
    .rpc('claim_next_audit_job')
    .maybeSingle();

  if (claimError) {
    const message = `Unable to claim queue job: ${claimError.message}`;
    console.error(`[queue] ${message}`);
    return { status: 'failed', message, error: message };
  }

  if (!job) {
    return { status: 'empty', message: 'No pending jobs in the queue.' };
  }

  return processQueueJob(supabase, job);
}

/**
 * Claim and process the next runnable job for one business only. The local
 * audit runner uses this so it never picks up somebody else's request.
 */
export async function processNextProjectJob(supabase: AdminClient, projectId: string): Promise<ProcessQueueResult> {
  const { data: job, error: claimError } = await supabase
    .rpc('claim_project_audit_job', { p_project_id: projectId })
    .maybeSingle();
  if (claimError) {
    const message = `Unable to claim queue job: ${claimError.message}`;
    return { status: 'failed', message, error: message };
  }
  if (!job) return { status: 'empty', message: 'No runnable jobs for this business.' };
  return processQueueJob(supabase, job);
}

type ClaimedJob = Database['public']['Tables']['audit_queue']['Row'];

async function processQueueJob(supabase: AdminClient, job: ClaimedJob): Promise<ProcessQueueResult> {
  await recordOperationalEvent({
    eventType: job.job_type === 'AI_OBSERVATION'
      ? 'ai_observation_job_claimed'
      : job.job_type === 'EVIDENCE_DIAGNOSIS'
        ? 'evidence_diagnosis_job_claimed'
        : job.job_type === 'INTERVENTION_GENERATION'
          ? 'intervention_generation_job_claimed'
          : job.job_type === 'EXECUTION'
            ? 'execution_job_claimed'
        : 'audit_job_claimed',
    projectId: job.project_id,
    auditId: job.audit_id,
    metadata: { queueId: job.id, attempt: job.attempts },
  }, supabase);

  if (job.job_type === 'AI_OBSERVATION') {
    return processObservationQueueJob(supabase, job);
  }
  if (job.job_type === 'EVIDENCE_DIAGNOSIS') {
    return processEvidenceDiagnosisQueueJob(supabase, job);
  }
  if (job.job_type === 'INTERVENTION_GENERATION') {
    return processInterventionQueueJob(supabase, job);
  }
  if (job.job_type === 'EXECUTION') {
    return processExecutionQueueJob(supabase, job);
  }

  const capInr = positiveNumber(process.env.MAX_TOTAL_SPEND_INR, 1000);
  const usdInr = positiveNumber(process.env.USD_INR, 90);
  const { data: costRows, error: costError } = await supabase.from('audits').select('cost_estimate_cents');
  if (costError) {
    const message = `Unable to read audit spend: ${costError.message}`;
    const { error: releaseError } = await supabase
      .from('audit_queue')
      .update({
        status: 'pending',
        attempts: Math.max(0, job.attempts - 1),
        started_at: null,
        error: message,
      })
      .eq('id', job.id)
      .eq('status', 'processing');
    const error = releaseError ? `${message}; unable to release claim: ${releaseError.message}` : message;
    return { status: 'failed', message: error, error };
  }
  const spentInr = ((costRows ?? []).reduce((s, r) => s + (r.cost_estimate_cents ?? 0), 0) / 100) * usdInr;

  if (spentInr >= capInr) {
    // A report may already be durable while its queue row still needs a cheap
    // repair pass. Never let the spend cap block that zero-model-call repair.
    const { data: durableAudit, error: durableAuditError } = job.audit_id
      ? await supabase
          .from('audits')
          .select('report_data')
          .eq('id', job.audit_id)
          .maybeSingle()
      : { data: null, error: null };
    if (durableAuditError) {
      const message = `Unable to inspect audit before enforcing spend cap: ${durableAuditError.message}`;
      return { status: 'failed', message, error: message, spentInr, capInr };
    }

    const durableCanonical = parseCanonicalAuditEnvelope(durableAudit?.report_data);
    const hasDurableReport = Boolean(durableAudit?.report_data) && (!durableCanonical || durableCanonical.state === 'COMPLETE');
    if (hasDurableReport) {
      // Fall through to the normal durable-report recovery below.
    } else {
    // No model call happened, so this is not an execution attempt. Put the job
    // back in pending state; raising the cap automatically makes it claimable.
    const { error: releaseError } = await supabase
      .from('audit_queue')
      .update({
        status: 'pending',
        attempts: Math.max(0, job.attempts - 1),
        started_at: null,
        error: `Global spend cap ₹${capInr} reached (est. ₹${spentInr.toFixed(0)} spent)`,
      })
      .eq('id', job.id)
      .eq('status', 'processing');
    if (releaseError) {
      const message = `Spend cap reached, but queue claim could not be released: ${releaseError.message}`;
      return { status: 'failed', message, error: message, spentInr, capInr };
    }
    return {
      status: 'cap_reached',
      message: `Global spend cap ₹${capInr} reached`,
      spentInr,
      capInr,
    };
    }
  }

  const { data: audit, error: auditError } = job.audit_id
    ? await supabase
        .from('audits')
        .select('id, prompt_count, project_id, status, report_data, cost_estimate_cents, started_at, completed_at')
        .eq('id', job.audit_id)
        .maybeSingle()
    : { data: null, error: null };
  if (auditError || !audit) {
    const reason = auditError ? `Unable to load linked audit: ${auditError.message}` : 'No linked audit';
    const { error: queueError } = await supabase
      .from('audit_queue')
      .update({ status: 'failed', error: reason, completed_at: new Date().toISOString() })
      .eq('id', job.id)
      .eq('status', 'processing');
    const error = queueError ? `${reason}; unable to fail queue row: ${queueError.message}` : reason;
    return { status: 'failed', message: error, error };
  }

  const canonicalEnvelope = parseCanonicalAuditEnvelope(audit.report_data);
  if (canonicalEnvelope) {
    return processCanonicalAuditBootstrap(supabase, job, audit, canonicalEnvelope);
  }

  if (audit.report_data) {
    // A prior worker saved the customer report but failed before updating the
    // queue row. The expensive work is already durable: repair queue state and
    // never spend again by rerunning the model pipeline.
    const repairedAt = audit.completed_at ?? new Date().toISOString();
    const { error: auditRepairError } = await supabase
      .from('audits')
      .update({ status: 'completed', completed_at: repairedAt })
      .eq('id', audit.id);
    if (auditRepairError) {
      const message = `Audit report exists, but audit status repair failed: ${auditRepairError.message}`;
      const { error: releaseError } = await supabase
        .from('audit_queue')
        .update({ status: 'pending', started_at: null, error: message })
        .eq('id', job.id)
        .eq('status', 'processing');
      const error = releaseError ? `${message}; unable to release queue row: ${releaseError.message}` : message;
      return { status: 'failed', message: error, auditId: audit.id, error };
    }

    const { error: repairError } = await supabase
      .from('audit_queue')
      .update({ status: 'done', error: null, completed_at: repairedAt })
      .eq('id', job.id)
      .eq('status', 'processing');
    if (repairError) {
      const message = `Audit report already exists, but queue repair failed: ${repairError.message}`;
      return { status: 'failed', message, auditId: audit.id, error: message };
    }

    const savedReport = audit.report_data as { scores?: { visibilityScore?: unknown } };
    const savedScore = savedReport.scores?.visibilityScore;
    return {
      status: 'completed',
      message: 'Existing completed audit recovered without rerunning model calls',
      auditId: audit.id,
      reportUrl: `${getAppUrl()}/r/${audit.id}`,
      visibilityScore: typeof savedScore === 'number' ? savedScore : undefined,
      costInr: Math.round(((audit.cost_estimate_cents / 100) * usdInr) * 100) / 100,
      emailed: false,
    };
  }

  if (job.attempts > 1) {
    // onProgress persists rows incrementally. A genuine retry starts clean so
    // each prompt has at most one result and report scoring is not duplicated.
    const { error: clearResultsError } = await supabase
      .from('audit_results')
      .delete()
      .eq('audit_id', audit.id);
    if (clearResultsError) {
      const message = `Unable to clear partial audit results before retry: ${clearResultsError.message}`;
      const { error: releaseError } = await supabase
        .from('audit_queue')
        .update({
          status: 'pending',
          attempts: Math.max(0, job.attempts - 1),
          started_at: null,
          error: message,
        })
        .eq('id', job.id)
        .eq('status', 'processing');
      const error = releaseError ? `${message}; unable to release claim: ${releaseError.message}` : message;
      return { status: 'failed', message: error, auditId: audit.id, error };
    }
  }

  const { error: startAuditError } = await supabase
    .from('audits')
    .update({ status: 'running', started_at: new Date().toISOString() })
    .eq('id', audit.id);
  if (startAuditError) {
    const message = `Unable to start audit: ${startAuditError.message}`;
    const { error: releaseError } = await supabase
      .from('audit_queue')
      .update({
        status: 'pending',
        attempts: Math.max(0, job.attempts - 1),
        error: message,
        started_at: null,
      })
      .eq('id', job.id)
      .eq('status', 'processing');
    const error = releaseError ? `${message}; unable to release claim: ${releaseError.message}` : message;
    return { status: 'failed', message: error, auditId: audit.id, error };
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*, profiles(id, full_name)')
    .eq('id', audit.project_id)
    .single();

  if (projectError || !project) {
    const reason = projectError ? `Unable to load project: ${projectError.message}` : 'Project not found';
    const [{ error: queueError }, { error: failAuditError }] = await Promise.all([
      supabase
        .from('audit_queue')
        .update({ status: 'failed', error: reason, completed_at: new Date().toISOString() })
        .eq('id', job.id)
        .eq('status', 'processing'),
      supabase.from('audits').update({ status: 'failed', completed_at: new Date().toISOString() }).eq('id', audit.id),
    ]);
    const cleanupErrors = [queueError?.message, failAuditError?.message].filter(Boolean).join('; ');
    const error = cleanupErrors ? `${reason}; cleanup failed: ${cleanupErrors}` : reason;
    return { status: 'failed', message: error, auditId: audit.id, error };
  }

  const auditInput: AuditInput = {
    businessName: project.business_name,
    website: project.website,
    category: project.category,
    city: project.city,
    competitors: project.competitors as { name: string; aliases?: string[] }[],
    aliases: project.aliases as string[],
    products: project.products as string[],
    services: project.services as string[],
    locations: project.locations as string[],
    targetCustomers: project.target_customers as string[],
    markets: project.markets as string[],
  };

  try {
    // E0.1: use the project's FROZEN question set (generate + freeze on first
    // audit; reuse verbatim on every re-run so before/after stays comparable).
    const { prompts, version } = await resolveProjectPrompts(supabase, project, audit.prompt_count || 40);
    const { error: promptSyncError } = await supabase.from('monitored_prompts').upsert(
      prompts.map((prompt) => ({
        project_id: project.id,
        prompt_set_version: version,
        prompt_text: prompt.text,
        intent: prompt.intent,
        intent_weight: prompt.intentWeight ?? 1,
      })),
      { onConflict: 'project_id,prompt_set_version,prompt_text', ignoreDuplicates: true },
    );
    if (promptSyncError) console.warn(`[queue] Unable to sync monitored prompts: ${promptSyncError.message}`);

    const pipelineResult = await runAuditPipeline(auditInput, prompts, {
      async onProgress(completed, total, result) {
        const [{ data: storedResult, error }, { error: heartbeatError }] = await Promise.all([
          supabase.from('audit_results').insert({
            audit_id: audit.id,
            prompt_text: result.prompt.text,
            intent: result.prompt.intent,
            intent_weight: result.prompt.intentWeight ?? 1,
            engine: result.engine,
            answer_text: result.answerText,
            citations: result.citations as unknown as Json,
            parsed: result.parsed as unknown as Json,
            grounded: result.grounded ?? null,
            observed_at: result.observedAt ?? null,
            execution_metadata: (result.execution ?? {}) as unknown as Json,
            error: result.error ?? null,
          }).select('id').single(),
          supabase
            .from('audit_queue')
            .update({ last_heartbeat_at: new Date().toISOString() })
            .eq('id', job.id)
            .eq('status', 'processing'),
        ]);
        if (error) throw new Error(`Unable to persist audit result: ${error.message}`);
        if (heartbeatError) throw new Error(`Unable to heartbeat audit worker: ${heartbeatError.message}`);
        if (storedResult && result.citations.length > 0) {
          const { error: citationError } = await supabase.from('audit_citations').upsert(
            result.citations.map((citation) => ({
              audit_result_id: storedResult.id,
              audit_id: audit.id,
              url: citation.url,
              domain: citation.domain,
              title: citation.title ?? null,
            })),
            { onConflict: 'audit_result_id,url', ignoreDuplicates: true },
          );
          if (citationError) throw new Error(`Unable to persist citations: ${citationError.message}`);
        }
        if (result.error) {
          await recordOperationalEvent({
            eventType: 'prompt_failed',
            severity: 'warning',
            projectId: project.id,
            auditId: audit.id,
            metadata: { engine: result.engine, completed, total, error: result.error.slice(0, 500) },
          }, supabase);
        }
      },
      onQuotaExhausted() {
        console.warn(`[queue] Quota exhausted during audit ${audit.id}`);
      },
    });

    const costCents = parseFloat(pipelineResult.costSummary.match(/(\d+\.?\d*)¢/)?.[1] ?? '0');

    const { error: completeAuditError } = await supabase
      .from('audits')
      .update({
        status: 'completed',
        report_data: pipelineResult.report as unknown as Json,
        cost_estimate_cents: costCents,
        completed_at: new Date().toISOString(),
      })
      .eq('id', audit.id);
    if (completeAuditError) {
      throw new Error(`Unable to save completed audit: ${completeAuditError.message}`);
    }

    const { error: completeQueueError } = await supabase
      .from('audit_queue')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', job.id)
      .eq('status', 'processing');
    if (completeQueueError) {
      // report_data and its cost are already durable. Release only the queue
      // state for a cheap repair pass; never mark the audit failed or rerun AI.
      const message = `Audit saved, but queue completion failed: ${completeQueueError.message}`;
      const { error: releaseError } = await supabase
        .from('audit_queue')
        .update({ status: 'pending', started_at: null, error: message })
        .eq('id', job.id)
        .eq('status', 'processing');
      const error = releaseError ? `${message}; unable to release queue row: ${releaseError.message}` : message;
      return { status: 'failed', message: error, auditId: audit.id, error };
    }

    const { error: snapshotError } = await supabase.from('tracking_snapshots').insert({
      project_id: project.id,
      audit_id: audit.id,
      visibility_score: pipelineResult.report.scores.visibilityScore,
      brandpulse_score: pipelineResult.report.scores.brandpulseScore,
      presence_rate: pipelineResult.report.scores.presenceRate,
      recommendation_rate: pipelineResult.report.scores.recommendationRate,
      citation_rate: pipelineResult.report.scores.citationRate,
      commercial_visibility: pipelineResult.report.scores.commercialVisibility,
      prompt_coverage: pipelineResult.report.scores.promptCoverage,
      share_of_voice: pipelineResult.report.scores.shareOfVoice,
      competitor_data: pipelineResult.report.competitors,
    });
    if (snapshotError) {
      // The report is already durable; a derived tracking row should not turn a
      // completed customer audit into a retry and duplicate model spending.
      console.warn(`[queue] Tracking snapshot for audit ${audit.id} failed: ${snapshotError.message}`);
    }

    const actions = pipelineResult.report.fixPlan.executionQueue.map((item) => ({
      project_id: project.id,
      audit_id: audit.id,
      title: item.title,
      problem: item.whyItMatters,
      why_it_matters: item.whyItMatters,
      evidence: item.targetsQueries as unknown as Json,
      recommended_action: item.detail,
      expected_objective: `Improve observed visibility for ${item.targetsQueries.length || 'the'} monitored buyer question${item.targetsQueries.length === 1 ? '' : 's'}.`,
      implementation_guidance: item.deliverable,
      priority: item.rank === 1 ? 'critical' : item.effort === 'easy' ? 'quick_win' : 'high',
      confidence: item.targetsQueries.length > 0 ? 'high' : 'medium',
    }));
    if (actions.length > 0) {
      const { error: actionError } = await supabase.from('action_items').upsert(actions, {
        onConflict: 'project_id,audit_id,title',
        ignoreDuplicates: true,
      });
      if (actionError) console.warn(`[queue] Unable to persist action items: ${actionError.message}`);
    }

    await recordOperationalEvent({
      eventType: 'audit_completed',
      projectId: project.id,
      auditId: audit.id,
      metadata: {
        promptCount: pipelineResult.report.totals.promptCount,
        failedPrompts: pipelineResult.report.totals.failedPrompts,
        visibilityScore: pipelineResult.report.scores.visibilityScore,
        costCents,
      },
    }, supabase);

    const answered = pipelineResult.report.totals.promptCount - pipelineResult.report.totals.failedPrompts;
    const mentioned = Math.round(pipelineResult.report.scores.presenceRate * answered);
    const topCompetitor = [...pipelineResult.report.competitors].sort(
      (a, b) => b.presenceRate - a.presenceRate
    )[0];
    const topCompetitorMentioned = topCompetitor
      ? Math.round(topCompetitor.presenceRate * answered)
      : undefined;

    const costInr = (costCents / 100) * usdInr;
    const appUrl = getAppUrl();
    const reportUrl = `${appUrl}/r/${audit.id}`;

    console.info(
      `[queue] Audit ${audit.id} complete — score ${pipelineResult.report.scores.visibilityScore}, ` +
        `est. ₹${costInr.toFixed(2)} (${costCents}¢) → ${reportUrl}`
    );

    const emailContent = auditCompleteEmail({
      businessName: project.business_name,
      visibilityScore: pipelineResult.report.scores.visibilityScore,
      presenceRate: pipelineResult.report.scores.presenceRate,
      reportUrl,
      mentionedCount: mentioned,
      answeredCount: answered,
      topCompetitorName: topCompetitor?.name,
      topCompetitorMentioned,
    });

    // Free-audit lead first, then the account email on the profile (Clerk users), then legacy auth.
    const recipient = await resolveReportRecipient(supabase, project.id, project.user_id);
    let emailed = false;
    if (recipient) {
      const sent = await sendEmail({ to: recipient, ...emailContent });
      emailed = !!sent;
      if (!sent) console.warn(`[queue] Report email to ${recipient} failed (check BREVO_API_KEY)`);
    } else {
      console.warn(`[queue] No email address found for project ${project.id}; report not emailed`);
    }

    return {
      status: 'completed',
      message: 'Audit completed',
      auditId: audit.id,
      reportUrl,
      visibilityScore: pipelineResult.report.scores.visibilityScore,
      costInr: Math.round(costInr * 100) / 100,
      emailed,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[queue] Audit ${audit.id} failed:`, errorMsg);

    const shouldRetry = job.attempts < (job.max_attempts ?? 3);
    const retryDelaySeconds = Math.min(900, 30 * (2 ** Math.max(job.attempts - 1, 0)));
    const [{ error: failAuditError }, { error: retryError }] = await Promise.all([
      supabase.from('audits').update({
        status: shouldRetry ? 'queued' : 'failed',
        completed_at: shouldRetry ? null : new Date().toISOString(),
      }).eq('id', audit.id),
      supabase
      .from('audit_queue')
      .update({
        status: shouldRetry ? 'pending' : 'failed',
        error: errorMsg,
        started_at: shouldRetry ? null : job.started_at,
        completed_at: shouldRetry ? null : new Date().toISOString(),
        available_at: shouldRetry
          ? new Date(Date.now() + retryDelaySeconds * 1000).toISOString()
          : job.available_at,
      })
      .eq('id', job.id)
      .eq('status', 'processing'),
    ]);

    const cleanupErrors = [failAuditError?.message, retryError?.message].filter(Boolean).join('; ');
    const finalError = cleanupErrors ? `${errorMsg}; queue cleanup failed: ${cleanupErrors}` : errorMsg;
    await recordOperationalEvent({
      eventType: shouldRetry ? 'audit_retry_scheduled' : 'audit_failed',
      severity: shouldRetry ? 'warning' : 'error',
      projectId: project.id,
      auditId: audit.id,
      metadata: { attempt: job.attempts, maxAttempts: job.max_attempts, retryDelaySeconds, error: finalError.slice(0, 800) },
    }, supabase);
    return { status: 'failed', message: finalError, auditId: audit.id, error: finalError };
  }
}

/** Process all pending jobs until the queue is empty or a job fails. */
export async function processAllQueueJobs(supabase: AdminClient): Promise<ProcessQueueResult[]> {
  const results: ProcessQueueResult[] = [];
  for (;;) {
    const result = await processNextQueueJob(supabase);
    results.push(result);
    if (result.status !== 'completed') break;
  }
  return results;
}
