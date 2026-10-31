import { createHash } from 'node:crypto';
import {
  EVIDENCE_DIAGNOSIS_ENGINE_VERSION,
  EVIDENCE_DIAGNOSIS_PROMPT_VERSION,
  EVIDENCE_DIAGNOSIS_SCHEMA_VERSION,
  EVIDENCE_DIAGNOSIS_VERSION,
  EVIDENCE_MATCHING_VERSION,
  type DiagnosisSourceBundle,
} from './types';

function stable(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`;
}

export function contentHash(value: unknown): string {
  return createHash('sha256').update(stable(value)).digest('hex');
}

export function diagnosisSourceHashes(bundle: DiagnosisSourceBundle) {
  const questions = [...bundle.questionSet.questions].sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));
  const observations = [...bundle.observationRun.observations]
    .sort((a, b) => a.buyerQuestionId.localeCompare(b.buyerQuestionId))
    .map((observation) => ({
      ...observation,
      entities: [...observation.entities].sort((a, b) => a.id.localeCompare(b.id)).map((entity) => ({
        ...entity,
        mentions: [...entity.mentions].sort((a, b) => a.characterPosition - b.characterPosition),
      })),
      citations: [...observation.citations].sort((a, b) => a.id.localeCompare(b.id)),
      sources: [...observation.sources].sort((a, b) => a.id.localeCompare(b.id)),
    }));
  const buyerQuestionSetHash = contentHash({
    recordId: bundle.buyerQuestionSetRecordId,
    id: bundle.questionSet.id,
    version: bundle.questionSet.version,
    frozen: bundle.questionSet.frozen,
    questions,
  });
  const observationRunHash = contentHash({
    id: bundle.observationRun.id,
    engineVersion: bundle.observationRun.engineVersion,
    provider: bundle.observationRun.provider,
    model: bundle.observationRun.model,
    observations,
  });
  return {
    buyerQuestionSetHash,
    observationRunHash,
    inputHash: contentHash({
      projectId: bundle.projectId,
      businessUnderstandingRunId: bundle.businessUnderstandingRunId,
      businessUnderstandingVersion: bundle.understanding.version,
      businessUnderstandingContentHash: bundle.understanding.content_hash,
      buyerQuestionSetHash,
      observationRunHash,
      engineVersion: EVIDENCE_DIAGNOSIS_ENGINE_VERSION,
      promptVersion: EVIDENCE_DIAGNOSIS_PROMPT_VERSION,
      schemaVersion: EVIDENCE_DIAGNOSIS_SCHEMA_VERSION,
      diagnosisVersion: EVIDENCE_DIAGNOSIS_VERSION,
      matchingVersion: EVIDENCE_MATCHING_VERSION,
    }),
  };
}
