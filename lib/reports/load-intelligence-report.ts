import { createAdminClient } from '@/lib/supabase/admin';
import { SupabaseInterventionRepository } from '@/lib/intervention-generation/repository';
import { SupabaseExecutionRepository } from '@/lib/execution/repository';
import {
  summarizeObservations,
  validateIntelligenceChain,
  type CanonicalIntelligenceReport,
  type IncompleteIntelligenceReport,
  type IntelligenceChainIds,
  type IntelligenceReport,
} from '@/lib/reports/intelligence-contract';
import { parseCanonicalAuditEnvelope } from '@/lib/reports/canonical-audit-envelope';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TERMINAL_INTERVENTION_STATUSES = ['COMPLETED', 'PARTIAL_SUCCESS', 'INCONCLUSIVE'] as const;

function incomplete(input: {
  id: string;
  projectId: string;
  businessName: string;
  createdAt: string;
  chain: Partial<IntelligenceChainIds>;
  missingStages: string[];
}): IncompleteIntelligenceReport {
  return {
    kind: 'NEW_INTELLIGENCE',
    id: input.id,
    projectId: input.projectId,
    status: 'INCOMPLETE',
    missingStages: input.missingStages,
    chain: input.chain,
    businessName: input.businessName,
    generatedAt: input.createdAt,
  };
}

export async function loadIntelligenceReport(id: string): Promise<IntelligenceReport | null> {
  if (!UUID_PATTERN.test(id)) return null;
  const admin = createAdminClient();
  let { data: row, error } = await admin
    .from('intervention_generation_runs')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`Intelligence report lookup failed: ${error.message}`);
  let reportProjectId: string | null = row?.project_id ?? null;
  let reportBusinessName = 'Business';
  let reportCreatedAt = row?.created_at ?? new Date().toISOString();
  let auditChain: Partial<IntelligenceChainIds> = {};

  if (!row) {
    const auditResult = await admin.from('audits').select('project_id,report_data,created_at').eq('id', id).maybeSingle();
    if (auditResult.error) throw new Error(`Intelligence audit lookup failed: ${auditResult.error.message}`);
    const envelope = parseCanonicalAuditEnvelope(auditResult.data?.report_data);
    if (!auditResult.data || !envelope) return null;
    reportProjectId = auditResult.data.project_id;
    reportCreatedAt = auditResult.data.created_at;
    auditChain = { ...envelope.chain };
    const projectResult = await admin.from('projects').select('business_name').eq('id', reportProjectId).maybeSingle();
    reportBusinessName = projectResult.data?.business_name ?? reportBusinessName;
    if (!envelope.chain.interventionRunId) {
      const stages = [
        ['businessUnderstandingRunId', 'Engine 01 Business Understanding'],
        ['buyerIntentRunId', 'Engine 02 Buyer Intent'],
        ['buyerQuestionSetId', 'Engine 02 frozen buyer question set'],
        ['observationRunId', 'Engine 03 AI Observation'],
        ['diagnosisRunId', 'Engine 04 Evidence & Diagnosis'],
        ['interventionRunId', 'Engine 05 Interventions'],
      ] as const;
      const missingStages: string[] = stages.filter(([key]) => !envelope.chain[key]).map(([, label]) => label);
      if (envelope.state === 'FAILED' && envelope.failure) missingStages.unshift(envelope.failure);
      return incomplete({ id, projectId: reportProjectId, businessName: reportBusinessName, createdAt: reportCreatedAt, chain: auditChain, missingStages });
    }
    const runResult = await admin.from('intervention_generation_runs').select('*').eq('id', envelope.chain.interventionRunId).maybeSingle();
    if (runResult.error) throw new Error(`Intelligence report lookup failed: ${runResult.error.message}`);
    row = runResult.data;
    error = runResult.error;
    if (!row) return incomplete({ id, projectId: reportProjectId, businessName: reportBusinessName, createdAt: reportCreatedAt, chain: auditChain, missingStages: ['Engine 05 intervention record'] });
  }

  const [{ data: project }, { data: setRow }] = await Promise.all([
    admin.from('projects').select('business_name').eq('id', row.project_id).maybeSingle(),
    admin.from('buyer_question_sets').select('id,run_id').eq('id', row.buyer_question_set_id).maybeSingle(),
  ]);
  const businessName = project?.business_name ?? reportBusinessName;
  const partialChain: Partial<IntelligenceChainIds> = {
    businessUnderstandingRunId: row.business_understanding_run_id ?? auditChain.businessUnderstandingRunId,
    buyerIntentRunId: setRow?.run_id ?? auditChain.buyerIntentRunId,
    buyerQuestionSetId: row.buyer_question_set_id,
    observationRunId: row.observation_run_id,
    diagnosisRunId: row.diagnosis_run_id,
    interventionRunId: row.id,
  };

  if (!setRow) {
    return incomplete({ id, projectId: row.project_id, businessName, createdAt: row.created_at, chain: partialChain, missingStages: ['Engine 02 frozen buyer question set'] });
  }
  if (!TERMINAL_INTERVENTION_STATUSES.includes(row.status as (typeof TERMINAL_INTERVENTION_STATUSES)[number])) {
    return incomplete({ id, projectId: row.project_id, businessName, createdAt: row.created_at, chain: partialChain, missingStages: [`Engine 05 is ${row.status.toLowerCase()}`] });
  }

  try {
    const interventionRepository = new SupabaseInterventionRepository(admin);
    const executionRepository = new SupabaseExecutionRepository(admin);
    const [interventionRun, bundle, allExecutions, interventionRows] = await Promise.all([
      interventionRepository.getRun(row.project_id, row.id, true),
      interventionRepository.loadSourceBundle(row.project_id, row.diagnosis_run_id),
      executionRepository.listRuns(row.project_id, 200, 0),
      admin.from('generated_interventions').select('id,intervention_key').eq('run_id', row.id),
    ]);
    if (!interventionRun || !bundle) {
      return incomplete({ id, projectId: row.project_id, businessName, createdAt: row.created_at, chain: partialChain, missingStages: ['One or more required Engine 01–05 records'] });
    }

    const executions = allExecutions.filter((run) => run.interventionRunId === row.id);
    const chain: IntelligenceChainIds = {
      businessUnderstandingRunId: interventionRun.businessUnderstandingRunId,
      buyerIntentRunId: setRow.run_id,
      buyerQuestionSetId: interventionRun.buyerQuestionSetId,
      observationRunId: interventionRun.observationRunId,
      diagnosisRunId: interventionRun.diagnosisRunId,
      interventionRunId: interventionRun.id,
      executionRunIds: executions.map((run) => run.id),
    };
    const missingStages = validateIntelligenceChain({
      chain,
      questionSet: bundle.questionSet,
      observationRun: bundle.observationRun,
      diagnosisRun: bundle.diagnosisRun,
      interventionRun,
      executions,
    });
    if (!['COMPLETED', 'PARTIAL_SUCCESS'].includes(bundle.observationRun.status)) missingStages.push(`Engine 03 is ${bundle.observationRun.status.toLowerCase()}`);
    if (!['COMPLETED', 'PARTIAL_SUCCESS', 'INCONCLUSIVE'].includes(bundle.diagnosisRun.status)) missingStages.push(`Engine 04 is ${bundle.diagnosisRun.status.toLowerCase()}`);
    if (missingStages.length) {
      return incomplete({ id, projectId: row.project_id, businessName, createdAt: row.created_at, chain, missingStages });
    }

    const physicalToKey = new Map((interventionRows.data ?? []).map((item) => [item.id, item.intervention_key]));
    const observationDate = bundle.observationRun.completedAt ?? bundle.observationRun.startedAt ?? bundle.observationRun.createdAt;
    const report: CanonicalIntelligenceReport = {
      kind: 'NEW_INTELLIGENCE',
      id,
      projectId: row.project_id,
      status: 'COMPLETE',
      missingStages: [],
      chain,
      business: bundle.understanding,
      questionSet: bundle.questionSet,
      observationRun: { ...bundle.observationRun, observations: bundle.observationRun.observations ?? [] },
      diagnosisRun: { ...bundle.diagnosisRun, diagnoses: bundle.diagnosisRun.diagnoses ?? [] },
      interventionRun: { ...interventionRun, interventions: interventionRun.interventions ?? [] },
      executions,
      executionStates: executions.flatMap((run) => {
        const interventionId = physicalToKey.get(run.interventionRecordId);
        return interventionId ? [{ interventionId, run }] : [];
      }),
      summary: summarizeObservations(
        bundle.understanding.business.name,
        bundle.questionSet.questions,
        bundle.observationRun.observations ?? [],
        observationDate,
      ),
      generatedAt: interventionRun.completedAt ?? interventionRun.createdAt,
    };
    return report;
  } catch (loadError) {
    const message = loadError instanceof Error ? loadError.message : 'Unknown report load failure';
    return incomplete({ id, projectId: row.project_id, businessName, createdAt: row.created_at, chain: partialChain, missingStages: [message] });
  }
}

export async function loadLatestIntelligenceReports(projectIds: string[]): Promise<IntelligenceReport[]> {
  if (!projectIds.length) return [];
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('intervention_generation_runs')
    .select('id,project_id,created_at')
    .in('project_id', projectIds)
    .in('status', [...TERMINAL_INTERVENTION_STATUSES])
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Latest intelligence report lookup failed: ${error.message}`);
  const latestIds: string[] = [];
  const seen = new Set<string>();
  for (const row of data ?? []) {
    if (seen.has(row.project_id)) continue;
    seen.add(row.project_id);
    latestIds.push(row.id);
  }
  const reports = await Promise.all(latestIds.map((runId) => loadIntelligenceReport(runId)));
  return reports.filter((report): report is IntelligenceReport => Boolean(report));
}

export async function loadIntelligenceReportHistory(projectId: string, limit = 50): Promise<CanonicalIntelligenceReport[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from('intervention_generation_runs')
    .select('id')
    .eq('project_id', projectId)
    .in('status', [...TERMINAL_INTERVENTION_STATUSES])
    .order('created_at', { ascending: true })
    .limit(Math.min(100, Math.max(1, limit)));
  if (error) throw new Error(`Intelligence report history lookup failed: ${error.message}`);
  const reports = await Promise.all((data ?? []).map((item) => loadIntelligenceReport(item.id)));
  return reports.filter((report): report is CanonicalIntelligenceReport => report?.status === 'COMPLETE');
}
