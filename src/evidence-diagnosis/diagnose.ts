import { observationId, normalizeEntityName } from '@/src/ai-observation/normalize';
import type { BusinessEntity, BusinessEntityType, BusinessEvidence, CanonicalBusinessUnderstanding, SourceType } from '@/src/business-understanding/types';
import type { BuyerIntentDimension, BuyerQuestion } from '@/src/buyer-intent/types';
import type { ObservedEntity, QuestionObservation } from '@/src/ai-observation/types';
import type {
  CommercialImplication,
  ControlledConfidence,
  DiagnosisClassification,
  DiagnosisClaim,
  DiagnosedEntityRelationship,
  DiagnosisGroup,
  DiagnosisProvenance,
  DiagnosisTheme,
  DiagnosisUnknown,
  EvidenceAssessment,
  EvidenceFreshness,
  EvidenceGap,
  EvidenceScope,
  EvidenceStatus,
  EvidenceType,
  QuestionDiagnosis,
  QuestionDiagnosisInput,
  SourceHierarchy,
  SourceReliability,
} from './types';

const ACTION_LANGUAGE = /\b(?:create|publish|build|add|implement|run ads?|contact|outreach|post on|optimi[sz]e|fix|should|recommend)\b/i;
const CAUSAL_LANGUAGE = /\b(?:because|caused?|due to|therefore led|resulted in|explains why)\b/i;

const entityEvidenceType: Record<BusinessEntityType, EvidenceType> = {
  COMPANY_IDENTITY: 'IDENTITY', PRODUCT: 'PRODUCT', SERVICE: 'SERVICE', CAPABILITY: 'CAPABILITY',
  BUYER_TYPE: 'BUYER_TYPE', INDUSTRY: 'INDUSTRY', USE_CASE: 'USE_CASE', GEOGRAPHY: 'GEOGRAPHY',
  COMMERCIAL_CLAIM: 'OTHER', DIFFERENTIATOR: 'BRAND_AUTHORITY', PROOF_ASSET: 'CUSTOMER_PROOF',
  CERTIFICATION: 'CERTIFICATION', BUSINESS_MODEL_SIGNAL: 'OTHER', CONVERSION_SIGNAL: 'ORDER_INFORMATION',
};

const dimensionEvidenceTypes: Record<BuyerIntentDimension, EvidenceType[]> = {
  PRODUCT: ['PRODUCT'], SERVICE: ['SERVICE'], INDUSTRY: ['INDUSTRY'], USE_CASE: ['USE_CASE'],
  GEOGRAPHY: ['GEOGRAPHY'], BUYER_TYPE: ['BUYER_TYPE'], TECHNICAL_REQUIREMENT: ['TECHNICAL_SPECIFICATION', 'CAPABILITY'],
  COMPLIANCE: ['COMPLIANCE', 'CERTIFICATION', 'STANDARD'], APPLICATION: ['APPLICATION', 'USE_CASE'],
  ORDER_PROCUREMENT: ['ORDER_INFORMATION', 'DISTRIBUTION'],
};

const gapForDimension: Partial<Record<BuyerIntentDimension, DiagnosisClassification>> = {
  GEOGRAPHY: 'TARGET_GEOGRAPHY_EVIDENCE_GAP', INDUSTRY: 'TARGET_INDUSTRY_EVIDENCE_GAP',
  USE_CASE: 'TARGET_USE_CASE_EVIDENCE_GAP', APPLICATION: 'TARGET_USE_CASE_EVIDENCE_GAP',
  TECHNICAL_REQUIREMENT: 'TARGET_TECHNICAL_EVIDENCE_GAP', COMPLIANCE: 'TARGET_COMPLIANCE_EVIDENCE_GAP',
};

function allBusinessEntities(understanding: CanonicalBusinessUnderstanding): BusinessEntity[] {
  return [
    ...understanding.company_identity, ...understanding.products, ...understanding.services, ...understanding.capabilities,
    ...understanding.buyer_types, ...understanding.industries, ...understanding.use_cases, ...understanding.geographies,
    ...understanding.commercial_claims, ...understanding.differentiators, ...understanding.proof_assets,
    ...understanding.certifications, ...understanding.business_model_signals, ...understanding.conversion_signals,
  ];
}

function sourceHierarchy(type: SourceType): SourceHierarchy {
  if (type === 'USER_PROVIDED') return 'UNKNOWN';
  if (type === 'CERTIFICATION_QUALITY') return 'OFFICIAL_DOCUMENT';
  return 'OFFICIAL_WEBSITE';
}

function sourceReliability(type: SourceType): SourceReliability {
  return type === 'USER_PROVIDED' ? 'UNKNOWN' : 'PRIMARY';
}

export function classifyFreshness(timestamp: string | null, asOf: string, explicitSourceDate: boolean): EvidenceFreshness {
  if (!timestamp || !explicitSourceDate) return 'UNKNOWN';
  const observed = Date.parse(timestamp);
  const reference = Date.parse(asOf);
  if (!Number.isFinite(observed) || !Number.isFinite(reference) || observed > reference) return 'UNKNOWN';
  const ageDays = (reference - observed) / 86_400_000;
  if (ageDays <= 90) return 'CURRENT';
  if (ageDays <= 365) return 'RECENT';
  if (ageDays <= 730) return 'DATED';
  return 'STALE';
}

function evidenceStatus(evidence: BusinessEvidence): EvidenceStatus {
  if (evidence.confidence === 'HIGH' || evidence.confidence === 'MEDIUM') return 'SUPPORTED';
  if (evidence.confidence === 'LOW') return 'WEAK';
  return 'UNKNOWN';
}

function controlledConfidence(value: string): ControlledConfidence {
  return value === 'HIGH' || value === 'MEDIUM' || value === 'LOW' ? value : 'UNKNOWN';
}

function businessProvenance(evidence: BusinessEvidence): DiagnosisProvenance {
  return { kind: 'BUSINESS_EVIDENCE', sourceId: evidence.id, sourceUrl: evidence.source_url, sourceTitle: evidence.page_title || null, sourceType: evidence.source_type, snippet: evidence.evidence_text, timestamp: evidence.extracted_at };
}

function questionProvenance(question: BuyerQuestion): DiagnosisProvenance {
  return { kind: 'QUESTION', sourceId: question.id, sourceUrl: null, sourceTitle: null, sourceType: 'BUYER_QUESTION', snippet: question.question, timestamp: null };
}

function observationProvenance(observation: QuestionObservation): DiagnosisProvenance {
  return { kind: 'AI_OBSERVATION', sourceId: observation.id, sourceUrl: null, sourceTitle: `${observation.provider}/${observation.model}`, sourceType: 'AI_OBSERVATION', snippet: null, timestamp: observation.responseTimestamp };
}

function evidenceScope(understanding: CanonicalBusinessUnderstanding, relevantEvidenceCount: number): EvidenceScope {
  if (relevantEvidenceCount > 0) return 'INSPECTED_FOUND';
  const coverage = understanding.source_coverage;
  const inaccessible = coverage.pages_failed + coverage.pages_blocked + coverage.pages_empty;
  if (coverage.pages_successfully_analyzed === 0) return inaccessible > 0 ? 'INACCESSIBLE' : 'NOT_SEARCHED';
  return inaccessible > 0 || coverage.pages_partial > 0 ? 'PARTIALLY_INSPECTED' : 'INSPECTED_NOT_FOUND';
}

function relevantTargetEvidence(question: BuyerQuestion, understanding: CanonicalBusinessUnderstanding) {
  const entityMap = new Map(allBusinessEntities(understanding).map((entity) => [entity.id, entity]));
  const referencedEntities = question.supporting_business_entity_ids.map((id) => entityMap.get(id)).filter((item): item is BusinessEntity => Boolean(item));
  const evidenceIds = new Set(question.supporting_business_evidence_ids);
  for (const entity of referencedEntities) for (const id of entity.evidence_ids) evidenceIds.add(id);
  const evidence = understanding.evidence.filter((item) => evidenceIds.has(item.id));
  return { referencedEntities, evidence, evidenceIds };
}

function targetAssessments(question: BuyerQuestion, understanding: CanonicalBusinessUnderstanding): EvidenceAssessment[] {
  const { referencedEntities, evidence } = relevantTargetEvidence(question, understanding);
  const typesByEvidence = new Map<string, Set<EvidenceType>>();
  for (const entity of referencedEntities) {
    for (const evidenceId of entity.evidence_ids) {
      const set = typesByEvidence.get(evidenceId) ?? new Set<EvidenceType>();
      set.add(entityEvidenceType[entity.type]);
      typesByEvidence.set(evidenceId, set);
    }
  }
  return evidence.flatMap((item) => {
    const types = [...(typesByEvidence.get(item.id) ?? new Set<EvidenceType>(['OTHER']))];
    return types.map((type) => ({
      id: observationId('assessment', `${question.id}:${item.id}:${type}`), origin: 'TARGET_BUSINESS' as const,
      subjectEntityId: null, evidenceType: type, status: evidenceStatus(item), relevance: 'DIRECT' as const,
      specificity: referencedEntities.some((entity) => entity.evidence_ids.includes(item.id)) ? 'SPECIFIC' as const : 'GENERAL' as const,
      directness: 'DIRECT' as const, freshness: 'UNKNOWN' as const, sourceReliability: sourceReliability(item.source_type),
      sourceHierarchy: sourceHierarchy(item.source_type), provenanceCompleteness: item.source_url && item.evidence_text ? 'COMPLETE' as const : 'PARTIAL' as const,
      confidence: controlledConfidence(item.confidence), scope: 'INSPECTED_FOUND' as const,
      statement: 'Relevant target-business evidence was found in the inspected source scope.', provenance: [businessProvenance(item)],
    }));
  });
}

function observationAssessments(question: BuyerQuestion, observation: QuestionObservation): EvidenceAssessment[] {
  const entityItems: EvidenceAssessment[] = observation.entities.map((entity) => ({
    id: observationId('assessment', `${question.id}:observed:${entity.id}`),
    origin: entity.targetMatch ? 'AI_OBSERVATION' : 'OBSERVED_ENTITY', subjectEntityId: entity.id,
    evidenceType: entity.targetMatch ? 'IDENTITY' : 'THIRD_PARTY_MENTION', status: entity.matchStatus === 'AMBIGUOUS' ? 'AMBIGUOUS' : 'UNVERIFIED',
    relevance: entity.recommendationPosition !== null
      || ['SUGGESTED', 'RECOMMENDED', 'STRONGLY_RECOMMENDED'].includes(entity.recommendationStrength)
      ? 'RELATED' : 'UNKNOWN',
    specificity: 'UNKNOWN', directness: 'OBSERVED_ONLY', freshness: 'UNKNOWN', sourceReliability: 'AI_GENERATED',
    sourceHierarchy: 'AI_GENERATED', provenanceCompleteness: 'COMPLETE', confidence: entity.matchStatus === 'AMBIGUOUS' ? 'LOW' : 'MEDIUM',
    scope: 'INSPECTED_FOUND', statement: 'An entity mention was recorded in the historical AI observation.',
    provenance: [{ kind: 'OBSERVED_ENTITY', sourceId: entity.id, sourceUrl: null, sourceTitle: null, sourceType: 'AI_OBSERVATION', snippet: entity.mentions[0]?.context ?? entity.surfaceForm, timestamp: observation.responseTimestamp }],
  }));
  const citationItems: EvidenceAssessment[] = observation.citations.map((citation) => {
    const source = observation.sources.find((item) => item.id === citation.sourceId);
    return {
      id: observationId('assessment', `${question.id}:citation:${citation.id}`), origin: 'CITATION_REFERENCE' as const,
      subjectEntityId: null, evidenceType: 'THIRD_PARTY_MENTION' as const, status: 'UNVERIFIED' as const,
      relevance: citation.claimAssociation === 'STRUCTURAL' ? 'RELATED' as const : 'UNKNOWN' as const,
      specificity: 'UNKNOWN' as const, directness: 'INDIRECT' as const, freshness: 'UNKNOWN' as const,
      sourceReliability: 'UNKNOWN' as const, sourceHierarchy: 'UNKNOWN' as const,
      provenanceCompleteness: source?.normalizedUrl || citation.url ? 'PARTIAL' as const : 'MISSING' as const,
      confidence: citation.claimAssociation === 'STRUCTURAL' ? 'MEDIUM' as const : 'LOW' as const,
      scope: 'NOT_SEARCHED' as const, statement: 'A citation reference was present in the AI observation, but its underlying content was not inspected by this diagnosis run.',
      provenance: [{ kind: 'CITATION' as const, sourceId: citation.id, sourceUrl: source?.normalizedUrl ?? citation.url, sourceTitle: source?.title ?? citation.title, sourceType: 'AI_CITATION_REFERENCE', snippet: citation.context, timestamp: observation.responseTimestamp }],
    };
  });
  return [...entityItems, ...citationItems];
}

function commercialImplication(question: BuyerQuestion): CommercialImplication {
  if (question.commercial_relevance >= 4 && ['PURCHASE', 'VENDOR_SELECTION', 'SHORTLIST'].includes(question.intent)) return 'HIGH';
  if (question.commercial_relevance >= 3 || ['COMPARISON', 'ALTERNATIVE', 'SPECIFICATION', 'COMPLIANCE'].includes(question.intent)) return 'MEDIUM';
  if (question.commercial_relevance >= 1) return 'LOW';
  return 'UNKNOWN';
}

function recommendationRank(entity: ObservedEntity): number {
  return { NONE: 0, UNKNOWN: 0, MENTION: 1, SUGGESTED: 2, RECOMMENDED: 3, STRONGLY_RECOMMENDED: 4 }[entity.recommendationStrength];
}

function dimensionSupported(dimension: BuyerIntentDimension, assessments: EvidenceAssessment[]): boolean {
  const allowed = dimensionEvidenceTypes[dimension];
  return assessments.some((assessment) => assessment.origin === 'TARGET_BUSINESS' && allowed.includes(assessment.evidenceType) && ['SUPPORTED', 'PARTIALLY_SUPPORTED'].includes(assessment.status));
}

function entityRelationships(question: BuyerQuestion, observation: QuestionObservation): DiagnosedEntityRelationship[] {
  return observation.entities.map((entity) => {
    const relationship = entity.targetMatch ? 'TARGET'
      : entity.matchStatus === 'AMBIGUOUS' ? 'UNKNOWN'
      : ['COMPANY', 'ORGANIZATION', 'BRAND', 'PRODUCT'].includes(entity.entityType)
        && question.commercial_relevance >= 3
        && (entity.recommendationPosition !== null || ['SUGGESTED', 'RECOMMENDED', 'STRONGLY_RECOMMENDED'].includes(entity.recommendationStrength))
        ? 'POTENTIAL_ALTERNATIVE' : 'OBSERVED_ENTITY';
    return {
      id: observationId('relationship', `${question.id}:${entity.id}`), observedEntityId: entity.id, surfaceForm: entity.surfaceForm,
      relationship: relationship as DiagnosedEntityRelationship['relationship'],
      confidence: relationship === 'TARGET' ? 'HIGH' : relationship === 'POTENTIAL_ALTERNATIVE' ? 'MEDIUM' : entity.matchStatus === 'AMBIGUOUS' ? 'LOW' : 'MEDIUM',
      rationale: relationship === 'TARGET'
        ? 'The observed surface form matched a canonical target identity.'
        : relationship === 'POTENTIAL_ALTERNATIVE'
          ? 'The entity appeared in commercially relevant answer context; competitive overlap remains unverified.'
          : 'The entity was observed, but commercial overlap was not established.',
      provenance: [{ kind: 'OBSERVED_ENTITY', sourceId: entity.id, sourceUrl: null, sourceTitle: null, sourceType: 'AI_OBSERVATION', snippet: entity.mentions[0]?.context ?? entity.surfaceForm, timestamp: observation.responseTimestamp }],
    };
  });
}

function observationUsable(observation: QuestionObservation): boolean {
  return observation.status === 'COMPLETED' && observation.completeness === 'COMPLETE'
    && observation.parsingStatus === 'SUCCESS' && observation.extractionStatus === 'SUCCESS';
}

function relevantConflicts(question: BuyerQuestion, understanding: CanonicalBusinessUnderstanding) {
  const terms = new Set(normalizeEntityName(question.question).split(' ').filter((term) => term.length >= 5));
  return understanding.conflicts.filter((conflict) => normalizeEntityName(conflict.topic).split(' ').some((term) => terms.has(term))
    || conflict.evidence_ids.some((id) => question.supporting_business_evidence_ids.includes(id)));
}

function diagnosisConfidence(observation: QuestionObservation, scope: EvidenceScope): ControlledConfidence {
  if (!observationUsable(observation)) return 'UNKNOWN';
  if (observation.targetStatus === 'INCONCLUSIVE') return 'LOW';
  if (scope === 'INACCESSIBLE' || scope === 'NOT_SEARCHED') return 'LOW';
  if (scope === 'PARTIALLY_INSPECTED') return 'MEDIUM';
  return 'HIGH';
}

export function compareQuestionEvidence(target: EvidenceAssessment[], observed: EvidenceAssessment[]): 'TARGET_STRONGER' | 'OBSERVED_STRONGER' | 'COMPARABLE' | 'INCONCLUSIVE' {
  const strong = (items: EvidenceAssessment[]) => items.filter((item) => item.status === 'SUPPORTED' && item.relevance === 'DIRECT' && ['DIRECT', 'INDIRECT'].includes(item.directness));
  const targetStrong = strong(target);
  const observedStrong = strong(observed);
  if (!targetStrong.length && !observedStrong.length) return 'INCONCLUSIVE';
  if (targetStrong.length && !observedStrong.length) return 'TARGET_STRONGER';
  if (observedStrong.length && !targetStrong.length) return 'OBSERVED_STRONGER';
  return 'COMPARABLE';
}

export function diagnoseQuestion(input: QuestionDiagnosisInput): QuestionDiagnosis {
  const { question, observation, understanding } = input;
  const baseProvenance = [questionProvenance(question), observationProvenance(observation)];
  if (observation.exactQuestion !== question.question || observation.buyerQuestionId !== question.id) {
    throw new Error('Question observation does not match the frozen Buyer Question Set');
  }
  const target = targetAssessments(question, understanding);
  const observed = observationAssessments(question, observation);
  const scope = evidenceScope(understanding, target.length);
  const relationships = entityRelationships(question, observation);
  const classifications: DiagnosisClassification[] = [];
  const gaps: EvidenceGap[] = [];
  const claims: DiagnosisClaim[] = [];
  const unknowns: DiagnosisUnknown[] = [];

  if (!observationUsable(observation)) {
    classifications.push('INSUFFICIENT_OBSERVATION');
    unknowns.push({
      id: observationId('unknown', `${question.id}:observation`), area: 'AI observation',
      reason: observation.status === 'FAILED' ? 'OBSERVATION_FAILURE' : observation.parsingStatus === 'FAILED' ? 'PARSER_FAILURE' : 'UNSUPPORTED',
      detail: 'The historical observation was incomplete or could not be reliably parsed, so target absence and evidence gaps remain inconclusive.',
      provenance: baseProvenance,
    });
  } else {
    if (observation.targetStatus === 'NOT_MENTIONED') {
      classifications.push('NO_TARGET_MENTION');
      claims.push({ id: observationId('claim', `${question.id}:not-mentioned`), classification: 'NO_TARGET_MENTION', statement: 'The target business was not observed in the recorded answer.', confidence: 'HIGH', provenance: baseProvenance });
      const supportingEvidenceIds = [...new Set(target.flatMap((item) => item.provenance.map((source) => source.sourceId)))];
      gaps.push({
        id: observationId('gap', `${question.id}:not-mentioned`), gapType: 'NO_TARGET_MENTION', questionDimension: 'VISIBILITY',
        description: 'The target business was absent from the recorded answer despite relevant evidence being present in the inspected target-source scope.',
        targetEvidencePresent: target.length > 0,
        observedEntityEvidencePresent: relationships.some((item) => item.relationship === 'POTENTIAL_ALTERNATIVE'),
        evidenceStrength: target.length > 0 ? 'HIGH' : 'UNKNOWN', confidence: 'HIGH', scope,
        supportingEvidenceIds, provenance: [...baseProvenance, ...target.flatMap((item) => item.provenance)],
      });
    } else if (observation.targetStatus === 'MENTIONED') {
      const targetEntity = observation.entities.find((entity) => entity.targetMatch);
      const otherPreferred = targetEntity && observation.entities.some((entity) => !entity.targetMatch && (
        recommendationRank(entity) > recommendationRank(targetEntity)
        || (entity.recommendationPosition !== null && targetEntity.recommendationPosition !== null
          && entity.recommendationPosition < targetEntity.recommendationPosition)
      ));
      if (targetEntity && otherPreferred) classifications.push('TARGET_MENTIONED_BUT_NOT_PREFERRED');
      else if (!targetEntity || ['NONE', 'MENTION', 'UNKNOWN'].includes(targetEntity.recommendationStrength)) classifications.push('TARGET_MENTIONED_WEAKLY');
    } else if (observation.entities.some((entity) => entity.matchStatus === 'AMBIGUOUS')) {
      classifications.push('TARGET_ENTITY_RECOGNITION_GAP');
    } else {
      classifications.push('INCONCLUSIVE');
    }

    const canIdentifyMissing = ['INSPECTED_NOT_FOUND', 'PARTIALLY_INSPECTED', 'INSPECTED_FOUND'].includes(scope);
    if (canIdentifyMissing) {
      for (const dimension of question.dimensions) {
        if (dimensionSupported(dimension, target)) continue;
        const gapType = gapForDimension[dimension] ?? 'TARGET_RELEVANCE_EVIDENCE_GAP';
        if (!classifications.includes(gapType)) classifications.push(gapType);
        gaps.push({
          id: observationId('gap', `${question.id}:${dimension}`), gapType, questionDimension: dimension,
          description: `No ${dimension.toLocaleLowerCase('en').replace(/_/g, ' ')} evidence was found within the inspected target-source scope.`,
          targetEvidencePresent: false, observedEntityEvidencePresent: false, evidenceStrength: 'UNKNOWN',
          confidence: scope === 'PARTIALLY_INSPECTED' ? 'LOW' : 'MEDIUM', scope,
          supportingEvidenceIds: [], provenance: baseProvenance,
        });
      }
    } else {
      unknowns.push({
        id: observationId('unknown', `${question.id}:target-scope`), area: 'Target evidence scope',
        reason: scope === 'INACCESSIBLE' ? 'INACCESSIBLE' : 'NOT_INSPECTED',
        detail: 'The available source scope cannot establish whether relevant target evidence exists.', provenance: baseProvenance,
      });
    }

    const targetDomainCited = observation.sources.some((source) => source.targetDomainMatch);
    if (observation.citations.length > 0 && !targetDomainCited && observation.targetStatus === 'MENTIONED') {
      classifications.push('TARGET_CITATION_GAP');
      gaps.push({ id: observationId('gap', `${question.id}:citation`), gapType: 'TARGET_CITATION_GAP', questionDimension: 'CITATION', description: 'The recorded answer contained citations, but no observed source belonged to the target domain.', targetEvidencePresent: target.length > 0, observedEntityEvidencePresent: false, evidenceStrength: 'UNKNOWN', confidence: 'HIGH', scope: 'INSPECTED_FOUND', supportingEvidenceIds: target.flatMap((item) => item.provenance.map((p) => p.sourceId)), provenance: baseProvenance });
    }

    const conflicts = relevantConflicts(question, understanding);
    if (conflicts.length) {
      classifications.push('CONFLICTING_EVIDENCE');
      for (const conflict of conflicts) {
        const provenance = conflict.evidence_ids.map((id) => understanding.evidence.find((item) => item.id === id)).filter((item): item is BusinessEvidence => Boolean(item)).map(businessProvenance);
        const conflictRecord: DiagnosisProvenance = { kind: 'BUSINESS_CONFLICT', sourceId: conflict.id, sourceUrl: null, sourceTitle: null, sourceType: 'ENGINE_01_CONFLICT', snippet: conflict.topic, timestamp: null };
        const conflictProvenance: DiagnosisProvenance[] = [conflictRecord, ...provenance];
        claims.push({ id: observationId('claim', `${question.id}:conflict:${conflict.id}`), classification: 'CONFLICTING_EVIDENCE', statement: 'Inspected target sources contain unresolved conflicting evidence relevant to this question.', confidence: 'HIGH', provenance: conflictProvenance });
      }
    }
  }

  if (!classifications.length) classifications.push('INCONCLUSIVE');
  const result: QuestionDiagnosis = {
    id: observationId('question_diagnosis', `${question.id}:${observation.id}`), buyerQuestionId: question.id,
    questionObservationId: observation.id, exactQuestion: question.question,
    status: observationUsable(observation) ? 'COMPLETED' : 'INCONCLUSIVE', targetMentionStatus: observation.targetStatus,
    classifications: [...new Set(classifications)], primaryClassification: classifications[0]!,
    commercialImplication: commercialImplication(question), confidence: diagnosisConfidence(observation, scope), evidenceScope: scope,
    evidenceComparison: compareQuestionEvidence(target, observed.filter((item) => item.origin === 'OBSERVED_ENTITY')),
    assessments: [...target, ...observed], gaps, claims, entityRelationships: relationships, unknowns,
  };
  validateDiagnosis(result, input);
  return result;
}

export function validateDiagnosis(diagnosis: QuestionDiagnosis, input: QuestionDiagnosisInput): void {
  if (diagnosis.exactQuestion !== input.question.question) throw new Error('Diagnosis changed the frozen question text');
  const validIds = new Set<string>([
    input.question.id, input.observation.id,
    ...input.understanding.evidence.map((item) => item.id), ...allBusinessEntities(input.understanding).map((item) => item.id),
    ...input.understanding.conflicts.map((item) => item.id), ...input.understanding.unknowns.map((item) => item.id),
    ...input.observation.entities.map((item) => item.id), ...input.observation.citations.map((item) => item.id), ...input.observation.sources.map((item) => item.id),
  ]);
  const provenance = [
    ...diagnosis.assessments.flatMap((item) => item.provenance), ...diagnosis.gaps.flatMap((item) => item.provenance),
    ...diagnosis.claims.flatMap((item) => item.provenance), ...diagnosis.entityRelationships.flatMap((item) => item.provenance),
    ...diagnosis.unknowns.flatMap((item) => item.provenance),
  ];
  if (provenance.some((item) => !validIds.has(item.sourceId))) throw new Error('Diagnosis contains provenance outside the source bundle');
  const businessEvidenceIds = new Set(input.understanding.evidence.map((item) => item.id));
  if (diagnosis.gaps.some((gap) => gap.supportingEvidenceIds.some((id) => !businessEvidenceIds.has(id)))) throw new Error('Evidence gap references nonexistent business evidence');
  const generatedStatements = [
    ...diagnosis.assessments.map((item) => item.statement), ...diagnosis.gaps.map((item) => item.description),
    ...diagnosis.claims.map((item) => item.statement), ...diagnosis.entityRelationships.map((item) => item.rationale), ...diagnosis.unknowns.map((item) => item.detail),
  ];
  if (generatedStatements.some((statement) => ACTION_LANGUAGE.test(statement))) throw new Error('Engine 05 action language leaked into diagnosis');
  if (generatedStatements.some((statement) => CAUSAL_LANGUAGE.test(statement))) throw new Error('Unsupported causal language leaked into diagnosis');
}

const THEME_LABELS: Record<DiagnosisTheme, string> = {
  PRODUCT_EVIDENCE: 'Product & Service Evidence Gaps',
  CAPABILITY_EVIDENCE: 'Technical & Capability Evidence Gaps',
  QUALITY_TRUST_EVIDENCE: 'Quality, Trust & Certification Gaps',
  EXPORT_LOGISTICS_EVIDENCE: 'Export & Logistics Geography Gaps',
  INDUSTRY_USE_CASE_EVIDENCE: 'Industry & Use Case Application Gaps',
  ENTITY_CLARITY: 'Entity Recognition & Brand Clarity Gaps',
  SOURCE_DISTRIBUTION_EVIDENCE: 'Source Citation & Authority Coverage Gaps',
};

export function determineThemesForGap(gap: EvidenceGap, diagnosis: QuestionDiagnosis): DiagnosisTheme[] {
  const themes = new Set<DiagnosisTheme>();
  const dim = gap.questionDimension.toUpperCase();
  const type = gap.gapType;

  if (dim === 'PRODUCT' || dim === 'SERVICE') {
    themes.add('PRODUCT_EVIDENCE');
  }
  if (type === 'TARGET_TECHNICAL_EVIDENCE_GAP' || dim === 'TECHNICAL_REQUIREMENT') {
    themes.add('CAPABILITY_EVIDENCE');
  }
  if (
    type === 'TARGET_PROOF_GAP' ||
    type === 'TARGET_AUTHORITY_GAP' ||
    type === 'CONFLICTING_EVIDENCE' ||
    type === 'TARGET_COMPLIANCE_EVIDENCE_GAP' ||
    dim === 'CERTIFICATION' ||
    dim === 'COMPLIANCE'
  ) {
    themes.add('QUALITY_TRUST_EVIDENCE');
  }
  if (dim === 'GEOGRAPHY' || dim === 'ORDER_PROCUREMENT' || type === 'TARGET_GEOGRAPHY_EVIDENCE_GAP') {
    themes.add('EXPORT_LOGISTICS_EVIDENCE');
  }
  if (
    dim === 'INDUSTRY' ||
    dim === 'USE_CASE' ||
    dim === 'APPLICATION' ||
    type === 'TARGET_INDUSTRY_EVIDENCE_GAP' ||
    type === 'TARGET_USE_CASE_EVIDENCE_GAP'
  ) {
    themes.add('INDUSTRY_USE_CASE_EVIDENCE');
  }
  if (
    type === 'TARGET_ENTITY_RECOGNITION_GAP' ||
    type === 'NO_TARGET_MENTION' ||
    diagnosis.primaryClassification === 'NO_TARGET_MENTION' ||
    diagnosis.primaryClassification === 'TARGET_ENTITY_RECOGNITION_GAP'
  ) {
    themes.add('ENTITY_CLARITY');
  }
  if (
    type === 'TARGET_CITATION_GAP' ||
    type === 'TARGET_AUTHORITY_GAP' ||
    type === 'TARGET_MENTIONED_WEAKLY'
  ) {
    themes.add('SOURCE_DISTRIBUTION_EVIDENCE');
  }

  if (themes.size === 0) {
    if (dim === 'PRODUCT' || dim === 'SERVICE') themes.add('PRODUCT_EVIDENCE');
    else themes.add('CAPABILITY_EVIDENCE');
  }

  return [...themes];
}

export function groupDiagnoses(diagnoses: QuestionDiagnosis[]): DiagnosisGroup[] {
  const groupsMap = new Map<DiagnosisTheme, {
    diagnosisIds: Set<string>;
    gapIds: Set<string>;
    classifications: Set<DiagnosisClassification>;
    dimensions: Set<string>;
    confidences: ControlledConfidence[];
  }>();

  for (const diagnosis of diagnoses) {
    for (const gap of diagnosis.gaps) {
      const themes = determineThemesForGap(gap, diagnosis);
      for (const theme of themes) {
        let entry = groupsMap.get(theme);
        if (!entry) {
          entry = {
            diagnosisIds: new Set(),
            gapIds: new Set(),
            classifications: new Set(),
            dimensions: new Set(),
            confidences: [],
          };
          groupsMap.set(theme, entry);
        }
        entry.diagnosisIds.add(diagnosis.id);
        entry.gapIds.add(gap.id);
        entry.classifications.add(gap.gapType);
        if (gap.questionDimension) entry.dimensions.add(gap.questionDimension);
        entry.confidences.push(gap.confidence);
      }
    }
  }

  const result: DiagnosisGroup[] = [];
  for (const [theme, data] of groupsMap.entries()) {
    const confidence: ControlledConfidence = data.confidences.includes('HIGH')
      ? 'HIGH'
      : data.confidences.includes('MEDIUM')
      ? 'MEDIUM'
      : data.confidences.includes('LOW')
      ? 'LOW'
      : 'UNKNOWN';

    result.push({
      theme,
      label: THEME_LABELS[theme],
      diagnosisIds: [...data.diagnosisIds],
      gapIds: [...data.gapIds],
      sharedClassifications: [...data.classifications],
      sharedDimensions: [...data.dimensions],
      confidence,
    });
  }

  return result;
}
