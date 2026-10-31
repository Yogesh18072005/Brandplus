import { createHash } from 'node:crypto';
import {
  INTERVENTION_ENGINE_VERSION,
  INTERVENTION_GENERATION_VERSION,
  INTERVENTION_PRIORITY_VERSION,
  INTERVENTION_PROMPT_VERSION,
  INTERVENTION_SCHEMA_VERSION,
  type GeneratedIntervention,
  type InterventionSourceBundle,
} from './types';

function stable(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`;
}

export function interventionContentHash(value: unknown): string {
  return createHash('sha256').update(stable(value)).digest('hex');
}

export function interventionSourceHashes(bundle: InterventionSourceBundle) {
  const questions = [...bundle.questionSet.questions].sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));
  const diagnoses = [...bundle.diagnosisRun.diagnoses].sort((a, b) => a.buyerQuestionId.localeCompare(b.buyerQuestionId)).map((diagnosis) => ({
    ...diagnosis,
    assessments: [...diagnosis.assessments].sort((a, b) => a.id.localeCompare(b.id)),
    gaps: [...diagnosis.gaps].sort((a, b) => a.id.localeCompare(b.id)),
    claims: [...diagnosis.claims].sort((a, b) => a.id.localeCompare(b.id)),
    entityRelationships: [...diagnosis.entityRelationships].sort((a, b) => a.id.localeCompare(b.id)),
    unknowns: [...diagnosis.unknowns].sort((a, b) => a.id.localeCompare(b.id)),
  }));
  const buyerQuestionSetHash = interventionContentHash({
    id: bundle.questionSet.id,
    version: bundle.questionSet.version,
    frozen: bundle.questionSet.frozen,
    questions,
  });
  const observationHash = bundle.diagnosisRun.observationRunHash;
  const diagnosisHash = interventionContentHash({
    id: bundle.diagnosisRun.id,
    version: bundle.diagnosisRun.diagnosisVersion,
    inputHash: bundle.diagnosisRun.inputHash,
    status: bundle.diagnosisRun.status,
    diagnoses,
  });
  return {
    buyerQuestionSetHash,
    observationHash,
    diagnosisHash,
    inputHash: interventionContentHash({
      projectId: bundle.projectId,
      businessUnderstandingRunId: bundle.diagnosisRun.businessUnderstandingRunId,
      businessUnderstandingVersion: bundle.understanding.version,
      businessUnderstandingHash: bundle.understanding.content_hash,
      buyerQuestionSetHash,
      observationHash,
      diagnosisHash,
      engineVersion: INTERVENTION_ENGINE_VERSION,
      schemaVersion: INTERVENTION_SCHEMA_VERSION,
      promptVersion: INTERVENTION_PROMPT_VERSION,
      generationVersion: INTERVENTION_GENERATION_VERSION,
      priorityVersion: INTERVENTION_PRIORITY_VERSION,
    }),
  };
}

export function interventionResultHash(interventions: GeneratedIntervention[]): string {
  return interventionContentHash([...interventions].sort((a, b) => a.id.localeCompare(b.id)));
}
