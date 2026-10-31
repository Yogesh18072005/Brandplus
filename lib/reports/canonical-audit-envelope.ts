import type { Json } from '@/lib/supabase/types';

export const CANONICAL_AUDIT_KIND = 'NEW_INTELLIGENCE' as const;

export interface CanonicalAuditChain {
  businessUnderstandingRunId?: string;
  buyerIntentRunId?: string;
  buyerQuestionSetId?: string;
  observationRunId?: string;
  diagnosisRunId?: string;
  interventionRunId?: string;
}

export type CanonicalAuditState =
  | 'QUEUED'
  | 'BUILDING_UNDERSTANDING'
  | 'BUILDING_BUYER_INTENT'
  | 'OBSERVING'
  | 'DIAGNOSING'
  | 'GENERATING_INTERVENTIONS'
  | 'COMPLETE'
  | 'FAILED';

export interface CanonicalAuditEnvelope {
  kind: typeof CANONICAL_AUDIT_KIND;
  version: 1;
  state: CanonicalAuditState;
  chain: CanonicalAuditChain;
  failure?: string;
}

export function createCanonicalAuditEnvelope(): CanonicalAuditEnvelope {
  return { kind: CANONICAL_AUDIT_KIND, version: 1, state: 'QUEUED', chain: {} };
}

export function parseCanonicalAuditEnvelope(value: unknown): CanonicalAuditEnvelope | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.kind !== CANONICAL_AUDIT_KIND || record.version !== 1) return null;
  if (!record.chain || typeof record.chain !== 'object' || Array.isArray(record.chain)) return null;
  const states: CanonicalAuditState[] = ['QUEUED', 'BUILDING_UNDERSTANDING', 'BUILDING_BUYER_INTENT', 'OBSERVING', 'DIAGNOSING', 'GENERATING_INTERVENTIONS', 'COMPLETE', 'FAILED'];
  if (!states.includes(record.state as CanonicalAuditState)) return null;
  return value as CanonicalAuditEnvelope;
}

export function canonicalAuditJson(envelope = createCanonicalAuditEnvelope()): Json {
  return envelope as unknown as Json;
}

export function isCanonicalAudit(value: unknown): boolean {
  return parseCanonicalAuditEnvelope(value) !== null;
}