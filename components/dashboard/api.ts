import type { CanonicalBusinessUnderstanding } from '@/src/business-understanding/types';
import type { BuyerQuestionSet } from '@/src/buyer-intent/types';
import type { ObservationRun } from '@/src/ai-observation/types';
import type { EvidenceDiagnosisRun, QuestionDiagnosis } from '@/src/evidence-diagnosis/types';
import type { GeneratedIntervention, InterventionRun } from '@/src/intervention-generation/types';
import type { ExecutionRun } from '@/src/execution/types';

/**
 * Typed clients for the existing Engine 01–06 API routes.
 * Every response is read-only from the pages; mutations call the existing POST handlers.
 */

export interface ProjectAudit {
  id: string;
  status: string;
  report_data: unknown;
  prompt_count: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface ProjectView {
  id: string;
  business_name: string;
  website: string;
  category: string | null;
  city: string | null;
  competitors: Array<{ name: string }>;
  aliases: unknown;
  status: string | null;
  audits: ProjectAudit[];
  capabilities: { weeklyTracking: boolean };
}

export interface RunPage<T> {
  runs: T[];
  limit: number;
  offset: number;
}

export interface InterventionItemRef {
  runId: string;
  status: string;
  interventions: GeneratedIntervention[];
}

export interface DiagnosisQuestionRef {
  runId: string;
  status: string;
  questions: QuestionDiagnosis[];
}

export interface ExecutionStepRef {
  executionId: string;
  status: string;
  steps: NonNullable<ExecutionRun['steps']>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string'
      ? (body as { error: string }).error
      : `Request failed (${res.status})`;
    throw new ApiError(message, res.status, (body as { code?: string } | null)?.code);
  }
  return body as T;
}

async function getOrNull<T>(path: string): Promise<T | null> {
  try {
    return await request<T>(path);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export function getProject(id: string) {
  return request<ProjectView>(`/api/projects/${id}`);
}

export function getBusinessUnderstanding(id: string) {
  return getOrNull<CanonicalBusinessUnderstanding>(`/api/projects/${id}/business-understanding`);
}

export function getBuyerIntent(id: string) {
  return getOrNull<BuyerQuestionSet>(`/api/projects/${id}/buyer-intent`);
}

export function listObservationRuns(id: string, limit = 20, offset = 0) {
  return request<RunPage<ObservationRun>>(`/api/projects/${id}/ai-observations?limit=${limit}&offset=${offset}`);
}

export function getObservationRun(id: string, runId: string) {
  return request<ObservationRun>(`/api/projects/${id}/ai-observations/${runId}`);
}

export function listDiagnosisRuns(id: string, limit = 20, offset = 0) {
  return request<RunPage<EvidenceDiagnosisRun>>(`/api/projects/${id}/evidence-diagnoses?limit=${limit}&offset=${offset}`);
}

export function getDiagnosisRun(id: string, runId: string) {
  return request<EvidenceDiagnosisRun>(`/api/projects/${id}/evidence-diagnoses/${runId}`);
}

export function getDiagnosisQuestions(id: string, runId: string) {
  return getOrNull<DiagnosisQuestionRef>(`/api/projects/${id}/evidence-diagnoses/${runId}/questions`);
}

export function listInterventionRuns(id: string, limit = 20, offset = 0) {
  return request<RunPage<InterventionRun>>(`/api/projects/${id}/interventions?limit=${limit}&offset=${offset}`);
}

export function getInterventionItems(id: string, runId: string) {
  return getOrNull<InterventionItemRef>(`/api/projects/${id}/interventions/${runId}/items`);
}

export function listExecutionRuns(id: string, limit = 20, offset = 0) {
  return request<RunPage<ExecutionRun>>(`/api/projects/${id}/executions?limit=${limit}&offset=${offset}`);
}

export function getExecutionRun(id: string, executionId: string) {
  return request<ExecutionRun>(`/api/projects/${id}/executions/${executionId}`);
}

export function getExecutionSteps(id: string, executionId: string) {
  return getOrNull<ExecutionStepRef>(`/api/projects/${id}/executions/${executionId}/steps`);
}

export function startBusinessUnderstanding(id: string) {
  return request<CanonicalBusinessUnderstanding>(`/api/projects/${id}/business-understanding`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function regenerateBuyerIntent(id: string, questionCount: number) {
  return request<BuyerQuestionSet>(`/api/projects/${id}/buyer-intent`, {
    method: 'POST',
    body: JSON.stringify({ questionCount }),
  });
}

export function startObservation(id: string, buyerQuestionSetId: string) {
  return request<ObservationRun>(`/api/projects/${id}/ai-observations`, {
    method: 'POST',
    body: JSON.stringify({ buyerQuestionSetId, provider: 'gemini' }),
  });
}

export function startDiagnosis(id: string, observationRunId: string) {
  return request<EvidenceDiagnosisRun>(`/api/projects/${id}/evidence-diagnoses`, {
    method: 'POST',
    body: JSON.stringify({ observationRunId }),
  });
}

export function startInterventionRun(id: string, diagnosisRunId: string) {
  return request<InterventionRun>(`/api/projects/${id}/interventions`, {
    method: 'POST',
    body: JSON.stringify({ diagnosisRunId }),
  });
}

export function startExecution(id: string, interventionId: string) {
  return request<ExecutionRun>(`/api/projects/${id}/executions`, {
    method: 'POST',
    body: JSON.stringify({ interventionId }),
  });
}

export function postExecutionAction(id: string, executionId: string, action: 'approve' | 'reject' | 'cancel' | 'retry', payloadHash?: string) {
  const body = action === 'approve' || action === 'reject'
    ? payloadHash ? JSON.stringify({ payloadHash }) : undefined
    : undefined;
  return request<ExecutionRun>(`/api/projects/${id}/executions/${executionId}/${action}`, {
    method: 'POST',
    ...(body ? { body } : {}),
  });
}