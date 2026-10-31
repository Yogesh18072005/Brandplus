import {
  determineThemesForGap,
  groupDiagnoses,
} from '@/src/evidence-diagnosis/diagnose';
import type { BuyerQuestion } from '@/src/buyer-intent/types';
import type {
  ControlledConfidence,
  DiagnosisClassification,
  DiagnosisProvenance,
  EvidenceGap,
  EvidenceType,
  QuestionDiagnosis,
} from '@/src/evidence-diagnosis/types';
import { interventionContentHash } from './hash';
import type {
  AcceptanceCriterion,
  ContentBrief,
  GeneratedIntervention,
  ImplementationSurface,
  InterventionCategory,
  InterventionEffort,
  InterventionEvidenceLink,
  InterventionGenerationContext,
  InterventionImpact,
  InterventionPriority,
  InterventionProposal,
  InterventionSourceBundle,
  InterventionStatus,
  InterventionType,
  MeasurementLink,
  RequiredBusinessInput,
  RequiredInputType,
  StructuredDataRequirement,
} from './types';

const EXECUTION_LANGUAGE = /\b(?:completed|implemented|published|deployed)\b/i;
const GUARANTEE_LANGUAGE = /\b(?:guarantee(?:d|s)?|will rank|will recommend|will generate leads|will get citations)\b/i;
const CAUSAL_LANGUAGE = /\b(?:recommended .+ because|caused the ai|made the ai|force .+ mention|manipulat(?:e|ing) ai)\b/i;
const SPAM_LANGUAGE = /\b(?:link farms?|pbns?|fake reviews?|fake testimonials?|mass (?:reddit|quora)|keyword stuffing|invisible text|fabricated pr|build backlinks?)\b/i;
const GENERIC_LANGUAGE = /\b(?:improve seo|create more content|do more seo|improve online presence|get more citations|write more blogs)\b/i;
const COMPETITOR_COPYING = /\b(?:copy|duplicate|clone)\s+(?:competitor|company|their)\b/i;
const UNSUPPORTED_FACT_ASSERTION = /\b(?:business|company|target)\s+(?:manufactures|produces|supplies|supports)\b|\b(?:is|has|holds|serves|operates in|manufactures|produces|supplies|supports)\b.{0,80}\b(?:iso\s?\d+|certified|certification|customer|client|india|countries|capacity|tons?|kilograms?|kg|millimet(?:er|re)s?|mm|microns?)\b/i;

const gapTypeToInterventions: Record<DiagnosisClassification, InterventionType[]> = {
  NO_TARGET_MENTION: ['ENTITY_CLARIFICATION', 'SOURCE_COVERAGE'],
  TARGET_MENTIONED_WEAKLY: ['ENTITY_CLARIFICATION', 'SOURCE_COVERAGE'],
  TARGET_MENTIONED_BUT_NOT_PREFERRED: ['SOURCE_COVERAGE', 'PROOF_EVIDENCE'],
  TARGET_RELEVANCE_EVIDENCE_GAP: ['PRODUCT_EVIDENCE', 'SERVICE_EVIDENCE', 'BUYER_EVIDENCE', 'CONTENT_BRIEF'],
  TARGET_SPECIFICITY_GAP: ['CONTENT_BRIEF', 'DOCUMENTATION', 'TECHNICAL_EVIDENCE'],
  TARGET_PROOF_GAP: ['PROOF_EVIDENCE', 'CASE_STUDY', 'CUSTOMER_PROOF'],
  TARGET_AUTHORITY_GAP: ['SOURCE_COVERAGE', 'THIRD_PARTY_EVIDENCE', 'PROOF_EVIDENCE'],
  TARGET_CITATION_GAP: ['SOURCE_COVERAGE', 'THIRD_PARTY_EVIDENCE'],
  TARGET_ENTITY_RECOGNITION_GAP: ['ENTITY_CLARIFICATION', 'INFORMATION_ARCHITECTURE', 'STRUCTURED_DATA', 'PROFILE_COMPLETENESS'],
  TARGET_GEOGRAPHY_EVIDENCE_GAP: ['GEOGRAPHIC_EVIDENCE', 'PROFILE_COMPLETENESS'],
  TARGET_INDUSTRY_EVIDENCE_GAP: ['INDUSTRY_EVIDENCE', 'CONTENT_BRIEF'],
  TARGET_USE_CASE_EVIDENCE_GAP: ['USE_CASE_EVIDENCE', 'CONTENT_BRIEF'],
  TARGET_TECHNICAL_EVIDENCE_GAP: ['TECHNICAL_EVIDENCE', 'DOCUMENTATION'],
  TARGET_COMPLIANCE_EVIDENCE_GAP: ['COMPLIANCE_EVIDENCE', 'CERTIFICATION_EVIDENCE', 'DOCUMENTATION'],
  OBSERVED_ENTITY_HAS_STRONGER_RELEVANT_EVIDENCE: ['SOURCE_COVERAGE', 'PROOF_EVIDENCE'],
  CONFLICTING_EVIDENCE: ['DOCUMENTATION', 'ENTITY_CLARIFICATION'],
  INSUFFICIENT_OBSERVATION: [],
  INCONCLUSIVE: [],
};

const typeSurface: Record<InterventionType, ImplementationSurface[]> = {
  ENTITY_CLARIFICATION: ['ABOUT_PAGE', 'WEBSITE_SECTION', 'BUSINESS_PROFILE'],
  PRODUCT_EVIDENCE: ['PRODUCT_PAGE', 'WEBSITE_PAGE'], SERVICE_EVIDENCE: ['SERVICE_PAGE', 'WEBSITE_PAGE'],
  INDUSTRY_EVIDENCE: ['INDUSTRY_PAGE', 'WEBSITE_PAGE'], USE_CASE_EVIDENCE: ['USE_CASE_PAGE', 'WEBSITE_PAGE'],
  BUYER_EVIDENCE: ['WEBSITE_PAGE', 'WEBSITE_SECTION'], TECHNICAL_EVIDENCE: ['TECHNICAL_DOCUMENT', 'PRODUCT_PAGE', 'SERVICE_PAGE'],
  COMPLIANCE_EVIDENCE: ['CERTIFICATION_PAGE', 'TECHNICAL_DOCUMENT'], CERTIFICATION_EVIDENCE: ['CERTIFICATION_PAGE', 'TECHNICAL_DOCUMENT'],
  GEOGRAPHIC_EVIDENCE: ['CONTACT_PAGE', 'WEBSITE_SECTION', 'BUSINESS_PROFILE'], PROOF_EVIDENCE: ['WEBSITE_SECTION', 'CONTENT_LIBRARY'],
  CASE_STUDY: ['CASE_STUDY', 'CONTENT_LIBRARY'], CUSTOMER_PROOF: ['CASE_STUDY', 'WEBSITE_SECTION'],
  SOURCE_COVERAGE: ['WEBSITE_PAGE', 'THIRD_PARTY_PROFILE', 'DIRECTORY_PROFILE'], THIRD_PARTY_EVIDENCE: ['THIRD_PARTY_PROFILE', 'DIRECTORY_PROFILE'],
  CONTENT_BRIEF: ['CONTENT_LIBRARY'], INFORMATION_ARCHITECTURE: ['WEBSITE_PAGE', 'CONTENT_LIBRARY'],
  STRUCTURED_DATA: ['STRUCTURED_DATA'], PROFILE_COMPLETENESS: ['BUSINESS_PROFILE', 'DIRECTORY_PROFILE', 'THIRD_PARTY_PROFILE'],
  DOCUMENTATION: ['TECHNICAL_DOCUMENT', 'CONTENT_LIBRARY'], OTHER: ['OTHER'],
};

const typeCategories: Record<InterventionType, InterventionCategory[]> = {
  ENTITY_CLARIFICATION: ['CLARIFY', 'CONSOLIDATE', 'ADD_INFORMATION', 'REMOVE_AMBIGUITY'],
  PRODUCT_EVIDENCE: ['CLARIFY', 'CONSOLIDATE', 'ADD_INFORMATION'],
  SERVICE_EVIDENCE: ['CLARIFY', 'CONSOLIDATE', 'ADD_INFORMATION'],
  INDUSTRY_EVIDENCE: ['CLARIFY', 'CONSOLIDATE', 'ADD_INFORMATION'],
  USE_CASE_EVIDENCE: ['CLARIFY', 'CONSOLIDATE', 'ADD_INFORMATION'],
  BUYER_EVIDENCE: ['CLARIFY', 'CONSOLIDATE', 'ADD_INFORMATION'],
  TECHNICAL_EVIDENCE: ['CLARIFY', 'CONSOLIDATE', 'ADD_INFORMATION'],
  COMPLIANCE_EVIDENCE: ['CLARIFY', 'CONSOLIDATE', 'ADD_INFORMATION', 'REMOVE_AMBIGUITY'],
  CERTIFICATION_EVIDENCE: ['CLARIFY', 'ADD_PROOF', 'ADD_INFORMATION', 'REMOVE_AMBIGUITY'],
  GEOGRAPHIC_EVIDENCE: ['CLARIFY', 'CONSOLIDATE', 'ADD_INFORMATION'],
  PROOF_EVIDENCE: ['CLARIFY', 'CONSOLIDATE', 'ADD_PROOF'],
  CASE_STUDY: ['ADD_PROOF', 'ADD_INFORMATION'],
  CUSTOMER_PROOF: ['ADD_PROOF', 'ADD_INFORMATION'],
  SOURCE_COVERAGE: ['IMPROVE_SOURCE', 'CONSOLIDATE'],
  THIRD_PARTY_EVIDENCE: ['IMPROVE_SOURCE', 'ADD_PROOF'],
  CONTENT_BRIEF: ['CLARIFY', 'CONSOLIDATE', 'ADD_INFORMATION'],
  INFORMATION_ARCHITECTURE: ['STRUCTURE', 'CONSOLIDATE'],
  STRUCTURED_DATA: ['STRUCTURE'],
  PROFILE_COMPLETENESS: ['CLARIFY', 'IMPROVE_SOURCE', 'ADD_INFORMATION'],
  DOCUMENTATION: ['CLARIFY', 'CONSOLIDATE', 'ADD_INFORMATION', 'REMOVE_AMBIGUITY'],
  OTHER: ['ADD_INFORMATION'],
};

const dimensionEvidenceType: Record<string, EvidenceType> = {
  PRODUCT: 'PRODUCT', SERVICE: 'SERVICE', INDUSTRY: 'INDUSTRY', USE_CASE: 'USE_CASE', APPLICATION: 'APPLICATION',
  BUYER_TYPE: 'BUYER_TYPE', GEOGRAPHY: 'GEOGRAPHY', TECHNICAL_REQUIREMENT: 'TECHNICAL_SPECIFICATION',
  COMPLIANCE: 'COMPLIANCE', CERTIFICATION: 'CERTIFICATION', CITATION: 'THIRD_PARTY_MENTION',
};

const dimensionInputType: Record<string, RequiredInputType> = {
  GEOGRAPHY: 'GEOGRAPHY_DETAIL', TECHNICAL_REQUIREMENT: 'TECHNICAL_SPECIFICATION', COMPLIANCE: 'COMPLIANCE_DETAIL',
  CERTIFICATION: 'CERTIFICATION_DETAIL', CASE_STUDY: 'CASE_STUDY_DETAIL', CUSTOMER_PROOF: 'CUSTOMER_PROOF',
  PRODUCT: 'CAPABILITY_DETAIL', SERVICE: 'CAPABILITY_DETAIL', INDUSTRY: 'BUSINESS_FACT', USE_CASE: 'BUSINESS_FACT',
  APPLICATION: 'BUSINESS_FACT', BUYER_TYPE: 'BUSINESS_FACT', CITATION: 'BUSINESS_FACT',
};

const evidenceProperties: Partial<Record<EvidenceType, string[]>> = {
  IDENTITY: ['name', 'url'], PRODUCT: ['name', 'description'], SERVICE: ['name', 'description'],
  GEOGRAPHY: ['areaServed'], CERTIFICATION: ['award'],
};

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function normalizeKey(value: string): string {
  return value.toLocaleLowerCase('en').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

function confidenceValue(value: ControlledConfidence): number {
  return { HIGH: 1, MEDIUM: 0.67, LOW: 0.33, UNKNOWN: 0 }[value];
}

function lowerConfidence(values: ControlledConfidence[], hasMissingInputs: boolean): ControlledConfidence {
  const scale: ControlledConfidence[] = ['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH'];
  let index = Math.min(...values.map((value) => scale.indexOf(value)));
  if (hasMissingInputs) index = Math.max(0, index - 1);
  return scale[index] ?? 'UNKNOWN';
}

function severityValue(type: DiagnosisClassification): number {
  if (['TARGET_COMPLIANCE_EVIDENCE_GAP', 'TARGET_TECHNICAL_EVIDENCE_GAP', 'TARGET_PROOF_GAP'].includes(type)) return 1;
  if (['TARGET_RELEVANCE_EVIDENCE_GAP', 'TARGET_SPECIFICITY_GAP', 'TARGET_INDUSTRY_EVIDENCE_GAP', 'TARGET_USE_CASE_EVIDENCE_GAP', 'TARGET_GEOGRAPHY_EVIDENCE_GAP'].includes(type)) return 0.8;
  if (['TARGET_ENTITY_RECOGNITION_GAP', 'TARGET_CITATION_GAP', 'TARGET_AUTHORITY_GAP', 'CONFLICTING_EVIDENCE'].includes(type)) return 0.65;
  return 0.4;
}

function interventionEffort(type: InterventionType, surface: ImplementationSurface): InterventionEffort {
  if (['CASE_STUDY', 'CUSTOMER_PROOF', 'THIRD_PARTY_EVIDENCE'].includes(type)) return 'HIGH';
  if (['WEBSITE_SECTION', 'ABOUT_PAGE', 'CONTACT_PAGE', 'BUSINESS_PROFILE', 'STRUCTURED_DATA'].includes(surface)) return 'LOW';
  if (surface === 'OTHER') return 'UNKNOWN';
  return 'MEDIUM';
}

function commercialValue(value: QuestionDiagnosis['commercialImplication']): number {
  return { HIGH: 1, MEDIUM: 0.67, LOW: 0.33, UNKNOWN: 0 }[value];
}

export function calculateInterventionPriority(input: {
  diagnoses: QuestionDiagnosis[];
  gaps: EvidenceGap[];
  affectedQuestionCount: number;
  totalQuestionCount: number;
  confidence: ControlledConfidence;
  effort: InterventionEffort;
}) {
  const commercialRelevance = Math.max(0, ...input.diagnoses.map((item) => commercialValue(item.commercialImplication)));
  const diagnosisSeverity = Math.max(0, ...input.gaps.map((item) => severityValue(item.gapType)));
  const evidenceGapStrength = Math.max(0, ...input.gaps.map((item) => confidenceValue(item.confidence)));
  const crossQuestionImpact = Math.min(1, input.affectedQuestionCount / Math.max(1, Math.min(input.totalQuestionCount, 5)));
  const confidence = confidenceValue(input.confidence);
  const effortEfficiency = { LOW: 1, MEDIUM: 0.6, HIGH: 0.25, UNKNOWN: 0.1 }[input.effort];
  const score = Math.round((commercialRelevance * 0.30 + diagnosisSeverity * 0.20 + evidenceGapStrength * 0.15
    + crossQuestionImpact * 0.15 + confidence * 0.10 + effortEfficiency * 0.10) * 100);
  const priority: InterventionPriority = input.confidence === 'UNKNOWN' ? 'UNKNOWN'
    : score >= 80 ? 'CRITICAL' : score >= 65 ? 'HIGH' : score >= 45 ? 'MEDIUM' : 'LOW';
  return { score, priority, factors: { commercialRelevance, diagnosisSeverity, evidenceGapStrength, crossQuestionImpact, confidence, effortEfficiency } };
}

function impact(diagnoses: QuestionDiagnosis[], questionCount: number): InterventionImpact {
  const top = Math.max(0, ...diagnoses.map((item) => commercialValue(item.commercialImplication)));
  if (top >= 1 || (top >= 0.67 && questionCount >= 3)) return 'HIGH';
  if (top >= 0.67 || questionCount >= 2) return 'MEDIUM';
  if (top > 0) return 'LOW';
  return 'UNKNOWN';
}

export function eligibleInterventionDiagnoses(diagnoses: QuestionDiagnosis[]): QuestionDiagnosis[] {
  return diagnoses.filter((diagnosis) => ['COMPLETED'].includes(diagnosis.status) && diagnosis.gaps.some((gap) =>
    !['INSUFFICIENT_OBSERVATION', 'INCONCLUSIVE'].includes(gap.gapType)
    && !['INACCESSIBLE', 'NOT_SEARCHED', 'UNKNOWN'].includes(gap.scope)));
}

export function buildInterventionContext(bundle: InterventionSourceBundle): InterventionGenerationContext {
  const eligibleDiagnoses = eligibleInterventionDiagnoses(bundle.diagnosisRun.diagnoses);
  const evidenceById = new Map(bundle.understanding.evidence.map((item) => [item.id, item]));
  const availableEvidence = new Map<string, InterventionGenerationContext['availableEvidence'][number]>();
  for (const diagnosis of eligibleDiagnoses) {
    for (const assessment of diagnosis.assessments) {
      if (assessment.origin !== 'TARGET_BUSINESS' || !['SUPPORTED', 'PARTIALLY_SUPPORTED', 'WEAK'].includes(assessment.status)) continue;
      for (const provenance of assessment.provenance) {
        const evidence = evidenceById.get(provenance.sourceId);
        if (evidence) availableEvidence.set(evidence.id, { id: evidence.id, type: assessment.evidenceType, text: evidence.evidence_text, confidence: evidence.confidence });
      }
    }
  }
  return { businessName: bundle.understanding.business.name, eligibleDiagnoses, availableEvidence: [...availableEvidence.values()].sort((a, b) => a.id.localeCompare(b.id)), totalQuestionCount: bundle.questionSet.questions.length };
}

function gapEvidenceType(gap: EvidenceGap): EvidenceType {
  if (gap.gapType === 'TARGET_PROOF_GAP') return 'CUSTOMER_PROOF';
  if (gap.gapType === 'TARGET_AUTHORITY_GAP') return 'BRAND_AUTHORITY';
  if (gap.gapType === 'TARGET_ENTITY_RECOGNITION_GAP') return 'IDENTITY';
  return dimensionEvidenceType[gap.questionDimension] ?? 'OTHER';
}

function requiredInputDescription(type: RequiredInputType, dimensions: string[]): string {
  const dimension = unique(dimensions).map((item) => item.toLocaleLowerCase('en').replace(/_/g, ' ')).join(', ');
  const details: Record<RequiredInputType, string> = {
    BUSINESS_FACT: `Verified business facts for the diagnosed ${dimension || 'evidence'} gap.`,
    CERTIFICATION_DETAIL: 'Exact certification name, issuing body, certificate identifier, scope, and validity date.',
    CUSTOMER_PROOF: 'Customer-approved proof with the exact claim, attribution permission, and supporting source.',
    GEOGRAPHY_DETAIL: 'Verified service, supply, facility, or delivery geography and its supporting source.',
    CAPABILITY_DETAIL: 'Verified capability details and the source that substantiates each statement.',
    TECHNICAL_SPECIFICATION: 'Verified technical values, units, applicability, and supporting technical source.',
    COMPLIANCE_DETAIL: 'Exact compliance claim, applicable standard or regime, scope, and supporting source.',
    CASE_STUDY_DETAIL: 'Verified situation, work performed, evidence-backed result, and publication permission.',
    OTHER: `Verified information required to resolve the diagnosed ${dimension || 'evidence'} gap.`,
  };
  return details[type];
}

function typeLabel(type: InterventionType): string {
  return type.toLocaleLowerCase('en').replace(/_/g, ' ');
}

function dimensionLabel(gaps: EvidenceGap[]): string {
  return unique(gaps.map((gap) => gap.questionDimension.toLocaleLowerCase('en').replace(/_/g, ' '))).join(' and ');
}

function interventionTitle(type: InterventionType, label: string): string {
  const action = typeLabel(type);
  const evidenceLabel = `${label} evidence`;
  if (action === evidenceLabel) return `Add verified ${evidenceLabel}`;
  return `${action.replace(/^./, (letter) => letter.toUpperCase())} for ${evidenceLabel}`;
}

function provenanceFor(diagnoses: QuestionDiagnosis[], gaps: EvidenceGap[]): DiagnosisProvenance[] {
  const items = [...gaps.flatMap((gap) => gap.provenance), ...diagnoses.flatMap((diagnosis) => diagnosis.claims.flatMap((claim) => claim.provenance))];
  return [...new Map(items.map((item) => [`${item.kind}:${item.sourceId}`, item])).values()];
}

function contentBrief(intervention: { questions: Array<{ id: string; exactQuestion: string }>; evidenceIds: string[]; dimensions: string[]; criteria: string[] }): ContentBrief {
  return {
    targetBuyerQuestions: intervention.questions.map((item) => item.exactQuestion),
    discoveryIntent: `Address the diagnosed ${intervention.dimensions.join(', ').toLocaleLowerCase('en')} evidence gap without adding unsupported claims.`,
    objective: 'Define an evidence-bounded content deliverable for the affected buyer intent.',
    verifiedFactEvidenceIds: intervention.evidenceIds,
    requiredSections: ['Buyer question context', 'Verified target evidence', 'Facts requiring clarification', 'Source references'],
    requiredFactsToClarify: intervention.dimensions.map((item) => `Verified ${item.toLocaleLowerCase('en').replace(/_/g, ' ')} information.`),
    prohibitedUnsupportedClaims: ['Unverified certifications', 'Unverified customers', 'Unverified capabilities', 'Unverified geographies', 'Unverified specifications'],
    internalEvidenceReferences: intervention.evidenceIds,
    acceptanceCriteria: intervention.criteria,
  };
}

function structuredData(input: { proposal: InterventionProposal; businessName: string; evidence: InterventionEvidenceLink[]; surface: ImplementationSurface; criteria: string[] }): StructuredDataRequirement | null {
  if (input.proposal.interventionType !== 'STRUCTURED_DATA') return null;
  if (!input.proposal.schemaType) throw new InterventionValidationError('Structured data proposal must specify a controlled schema type');
  const supportedProperties = unique(input.evidence.flatMap((item) => evidenceProperties[item.evidenceType] ?? []));
  if (!supportedProperties.length) throw new InterventionValidationError('Structured data proposal has no evidence-supported properties');
  return {
    schemaType: input.proposal.schemaType,
    representedEntity: input.businessName,
    supportedProperties,
    inputRequiredProperties: [],
    proposedSurfaces: [input.surface],
    acceptanceCriteria: input.criteria,
  };
}

export class InterventionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InterventionValidationError';
  }
}

export function buildDeterministicProposals(context: InterventionGenerationContext): InterventionProposal[] {
  const groups = groupDiagnoses(context.eligibleDiagnoses);
  const proposals: InterventionProposal[] = [];
  const availableEvidenceIds = new Set(context.availableEvidence.map((item) => item.id));

  for (const group of groups) {
    const candidateKey = `det-${group.theme.toLowerCase().replace(/_/g, '-')}`;
    const diagnosisIds = group.diagnosisIds;
    const gapIds = group.gapIds;

    let interventionType: InterventionType = 'ENTITY_CLARIFICATION';
    let category: InterventionCategory = 'CLARIFY';
    let implementationSurface: ImplementationSurface = 'ABOUT_PAGE';
    let requiredInputTypes: RequiredInputType[] = [];

    switch (group.theme) {
      case 'PRODUCT_EVIDENCE':
        interventionType = 'PRODUCT_EVIDENCE';
        implementationSurface = 'PRODUCT_PAGE';
        break;
      case 'CAPABILITY_EVIDENCE':
        interventionType = 'TECHNICAL_EVIDENCE';
        implementationSurface = 'TECHNICAL_DOCUMENT';
        requiredInputTypes = ['TECHNICAL_SPECIFICATION'];
        break;
      case 'QUALITY_TRUST_EVIDENCE':
        interventionType = 'PROOF_EVIDENCE';
        implementationSurface = 'WEBSITE_SECTION';
        requiredInputTypes = ['CUSTOMER_PROOF'];
        break;
      case 'EXPORT_LOGISTICS_EVIDENCE':
        interventionType = 'GEOGRAPHIC_EVIDENCE';
        implementationSurface = 'CONTACT_PAGE';
        requiredInputTypes = ['GEOGRAPHY_DETAIL'];
        break;
      case 'INDUSTRY_USE_CASE_EVIDENCE':
        interventionType = 'INDUSTRY_EVIDENCE';
        implementationSurface = 'INDUSTRY_PAGE';
        break;
      case 'ENTITY_CLARITY':
        interventionType = 'ENTITY_CLARIFICATION';
        implementationSurface = 'ABOUT_PAGE';
        break;
      case 'SOURCE_DISTRIBUTION_EVIDENCE':
        interventionType = 'SOURCE_COVERAGE';
        category = 'IMPROVE_SOURCE';
        implementationSurface = 'WEBSITE_PAGE';
        break;
    }

    const groupDiagnosesList = context.eligibleDiagnoses.filter((d) => diagnosisIds.includes(d.id));
    const evidenceToReuseIds = groupDiagnosesList
      .flatMap((d) => d.assessments)
      .flatMap((a) => a.provenance)
      .map((p) => p.sourceId)
      .filter((id) => availableEvidenceIds.has(id));

    const uniqueReuseIds = [...new Set(evidenceToReuseIds)];

    if (category === 'CLARIFY' && uniqueReuseIds.length === 0) {
      category = 'ADD_INFORMATION';
      if (requiredInputTypes.length === 0) {
        requiredInputTypes = ['BUSINESS_FACT'];
      }
    }

    proposals.push({
      candidateKey,
      diagnosisIds,
      gapIds,
      interventionType,
      category,
      implementationSurface,
      evidenceToReuseIds: uniqueReuseIds,
      requiredInputTypes,
      dependsOnCandidateKeys: [],
      theme: group.theme,
    });
  }

  return proposals;
}

function proposalTheme(proposal: InterventionProposal, gaps: EvidenceGap[], diagnoses: QuestionDiagnosis[]): string {
  if (proposal.theme) return proposal.theme;
  const gap = gaps[0];
  if (!gap) return 'GENERAL';
  const diag = diagnoses.find((d) => d.gaps.some((g) => g.id === gap.id)) ?? diagnoses[0]!;
  const themes = determineThemesForGap(gap, diag);
  return themes[0] ?? 'GENERAL';
}

function proposalGroupKey(proposal: InterventionProposal, gaps: EvidenceGap[], diagnoses: QuestionDiagnosis[]): string {
  const themeKey = proposalTheme(proposal, gaps, diagnoses);
  return [proposal.interventionType, proposal.category, proposal.implementationSurface, themeKey, ...unique(gaps.map((gap) => gap.questionDimension)).sort()].join(':');
}

function validateProposal(proposal: InterventionProposal, context: InterventionGenerationContext): { diagnoses: QuestionDiagnosis[]; gaps: EvidenceGap[] } {
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/.test(proposal.candidateKey)) throw new InterventionValidationError('Candidate key is invalid');
  const diagnosisMap = new Map(context.eligibleDiagnoses.map((item) => [item.id, item]));
  const diagnoses = unique(proposal.diagnosisIds).map((id) => diagnosisMap.get(id)).filter((item): item is QuestionDiagnosis => Boolean(item));
  if (!diagnoses.length || diagnoses.length !== unique(proposal.diagnosisIds).length) throw new InterventionValidationError('Proposal references an ineligible diagnosis');
  const gapMap = new Map(diagnoses.flatMap((diagnosis) => diagnosis.gaps.map((gap) => [gap.id, gap] as const)));
  const gaps = unique(proposal.gapIds).map((id) => gapMap.get(id)).filter((item): item is EvidenceGap => Boolean(item));
  if (!gaps.length || gaps.length !== unique(proposal.gapIds).length) throw new InterventionValidationError('Proposal references an unavailable diagnosis gap');
  if (gaps.some((gap) => !gapTypeToInterventions[gap.gapType].includes(proposal.interventionType))) throw new InterventionValidationError('Intervention type is unsupported by the diagnosed gap');
  if (!typeSurface[proposal.interventionType].includes(proposal.implementationSurface)) throw new InterventionValidationError('Implementation surface is incompatible with the intervention type');
  if (!typeCategories[proposal.interventionType].includes(proposal.category)) throw new InterventionValidationError('Intervention category is incompatible with the intervention type');
  if (proposal.category === 'CLARIFY' && proposal.evidenceToReuseIds.length === 0) throw new InterventionValidationError('Clarification requires existing evidence to reuse');
  if (proposal.category === 'ADD_INFORMATION' && proposal.requiredInputTypes.length === 0) throw new InterventionValidationError('Add-information intervention must declare required input');
  if (proposal.requiredInputTypes.length > 0 && gaps.every((gap) => gap.targetEvidencePresent)) throw new InterventionValidationError('Proposal requests input even though every linked gap has reusable target evidence');
  const allowedEvidence = new Set(context.availableEvidence.map((item) => item.id));
  if (proposal.evidenceToReuseIds.some((id) => !allowedEvidence.has(id))) throw new InterventionValidationError('Proposal references unavailable evidence');
  if (proposal.dependsOnCandidateKeys.includes(proposal.candidateKey)) throw new InterventionValidationError('Intervention cannot depend on itself');
  return { diagnoses, gaps };
}

export function generateInterventions(
  proposals: InterventionProposal[],
  context: InterventionGenerationContext,
): { interventions: GeneratedIntervention[]; rejectedCount: number } {
  const deterministicFallback = buildDeterministicProposals(context);
  const inputProposals = proposals.length > 0 ? proposals : deterministicFallback;
  const limited = inputProposals.slice(0, Math.max(1, context.eligibleDiagnoses.length) * 5);
  const valid: Array<{ proposal: InterventionProposal; diagnoses: QuestionDiagnosis[]; gaps: EvidenceGap[] }> = [];
  let rejectedCount = proposals.length - limited.length;
  const perDiagnosis = new Map<string, number>();
  for (const proposal of limited) {
    try {
      const resolved = validateProposal(proposal, context);
      if (resolved.diagnoses.some((diagnosis) => (perDiagnosis.get(diagnosis.id) ?? 0) >= 5)) {
        rejectedCount += 1;
        continue;
      }
      for (const diagnosis of resolved.diagnoses) perDiagnosis.set(diagnosis.id, (perDiagnosis.get(diagnosis.id) ?? 0) + 1);
      valid.push({ proposal, ...resolved });
    } catch {
      rejectedCount += 1;
    }
  }

  const validKeys = new Set(valid.map((item) => item.proposal.candidateKey));
  const dependencySafe = valid.filter((item) => {
    const safe = item.proposal.dependsOnCandidateKeys.every((key) => validKeys.has(key));
    if (!safe) rejectedCount += 1;
    return safe;
  });
  const consolidated = new Map<string, typeof valid>();
  for (const item of dependencySafe) {
    const key = proposalGroupKey(item.proposal, item.gaps, item.diagnoses);
    consolidated.set(key, [...(consolidated.get(key) ?? []), item]);
  }
  const candidateAlias = new Map<string, string>();
  const interventions = [...consolidated.entries()].map(([groupKey, items]) => {
    const proposal = items[0]!.proposal;
    const diagnoses = [...new Map(items.flatMap((item) => item.diagnoses).map((item) => [item.id, item])).values()];
    const gaps = [...new Map(items.flatMap((item) => item.gaps).map((item) => [item.id, item])).values()];
    const questions = [...new Map(diagnoses.map((item) => [item.buyerQuestionId, { id: item.buyerQuestionId, exactQuestion: item.exactQuestion }])).values()];
    const evidenceIds = unique(items.flatMap((item) => item.proposal.evidenceToReuseIds));
    const evidenceById = new Map(context.availableEvidence.map((item) => [item.id, item]));
    const evidenceToPreserve: InterventionEvidenceLink[] = evidenceIds.map((id) => ({
      id: `reuse-${interventionContentHash(`${groupKey}:${id}`).slice(0, 20)}`, kind: 'EVIDENCE_TO_REUSE', evidenceId: id,
      evidenceType: evidenceById.get(id)!.type, description: 'Preserve this verified existing evidence and its source attribution.',
    }));
    const dimensions = unique(gaps.map((gap) => gap.questionDimension));
    const requiredTypes = unique([
      ...items.flatMap((item) => item.proposal.requiredInputTypes),
      ...gaps.filter((gap) => !gap.targetEvidencePresent).map((gap) => dimensionInputType[gap.questionDimension] ?? 'BUSINESS_FACT'),
    ]);
    const requiredBusinessInputs: RequiredBusinessInput[] = requiredTypes.map((type) => ({
      id: `input-${interventionContentHash(`${groupKey}:${type}`).slice(0, 20)}`, type,
      description: requiredInputDescription(type, dimensions), status: 'INPUT_REQUIRED',
    }));
    const evidenceToAdd: InterventionEvidenceLink[] = gaps.filter((gap) => !gap.targetEvidencePresent).map((gap) => ({
      id: `add-${interventionContentHash(`${groupKey}:${gap.id}`).slice(0, 20)}`, kind: 'EVIDENCE_TO_ADD', evidenceId: null,
      evidenceType: gapEvidenceType(gap), description: `Verified ${gap.questionDimension.toLocaleLowerCase('en').replace(/_/g, ' ')} evidence is required for this diagnosed gap.`,
    }));
    const confidence = lowerConfidence([...diagnoses.map((item) => item.confidence), ...gaps.map((item) => item.confidence)], requiredBusinessInputs.length > 0);
    const effort = interventionEffort(proposal.interventionType, proposal.implementationSurface);
    const priority = calculateInterventionPriority({ diagnoses, gaps, affectedQuestionCount: questions.length, totalQuestionCount: context.totalQuestionCount, confidence, effort });
    const label = dimensionLabel(gaps) || 'relevant';
    const criteriaText = [
      `The proposed ${proposal.implementationSurface.toLocaleLowerCase('en').replace(/_/g, ' ')} explicitly addresses the diagnosed ${label} evidence gap.`,
      'Every business statement is supported by a preserved evidence ID or marked as requiring verified business input.',
      'The deliverable retains source attribution and contains no unsupported certification, customer, capability, geography, or specification claims.',
      `The deliverable remains connected to ${questions.length} affected buyer question${questions.length === 1 ? '' : 's'}.`,
    ];
    const acceptanceCriteria: AcceptanceCriterion[] = criteriaText.map((criterion, index) => ({
      id: `criterion-${interventionContentHash(`${groupKey}:${index}:${criterion}`).slice(0, 20)}`, criterion,
    }));
    const measurementLinkage: MeasurementLink[] = [
      {
        id: `measure-${interventionContentHash(`${groupKey}:question`).slice(0, 20)}`, type: 'QUESTION_REOBSERVATION',
        affectedQuestionIds: questions.map((item) => item.id), evidenceDimensions: dimensions,
        description: 'Re-observe the exact affected buyer questions after execution in a later measurement engine.',
      },
      {
        id: `measure-${interventionContentHash(`${groupKey}:evidence`).slice(0, 20)}`, type: 'EVIDENCE_DIMENSION',
        affectedQuestionIds: questions.map((item) => item.id), evidenceDimensions: dimensions,
        description: 'Measure whether the diagnosed evidence dimensions become publicly inspectable and source-backed.',
      },
    ];
    const id = `intervention-${interventionContentHash(groupKey).slice(0, 24)}`;
    for (const item of items) candidateAlias.set(item.proposal.candidateKey, id);
    const status: InterventionStatus = gaps.some((gap) => gap.gapType === 'CONFLICTING_EVIDENCE') ? 'BLOCKED'
      : requiredBusinessInputs.length > 0 ? 'NEEDS_INPUT' : confidence === 'LOW' || confidence === 'UNKNOWN' ? 'PROPOSED' : 'READY_FOR_EXECUTION';
    const result: GeneratedIntervention = {
      id, diagnosisId: diagnoses[0]!.id, affectedDiagnosisIds: diagnoses.map((item) => item.id),
      affectedGapIds: gaps.map((item) => item.id), questionId: questions[0]!.id,
      exactBuyerQuestion: questions[0]!.exactQuestion, affectedQuestions: questions,
      interventionType: proposal.interventionType, category: proposal.category,
      title: interventionTitle(proposal.interventionType, label),
      objective: `Address the diagnosed ${label} evidence gap using only verified target-business information.`,
      problemStatement: `${gaps.map((gap) => gap.gapType).join(', ')} was diagnosed across ${questions.length} buyer question${questions.length === 1 ? '' : 's'}.`,
      diagnosedGap: [...new Set(gaps.map((gap) => gap.description))].join(' '),
      whyThisAddressesGap: `This proposed intervention connects verified ${label} evidence to the affected buyer intent and explicitly marks unavailable facts as input required.`,
      requiredBusinessInputs, evidenceToPreserve, evidenceToAdd,
      expectedDeliverable: `A proposed ${proposal.implementationSurface.toLocaleLowerCase('en').replace(/_/g, ' ')} specification containing source-backed ${label} evidence, explicit input requirements, and the recorded acceptance criteria.`,
      implementationSurface: proposal.implementationSurface, proposedSurface: true,
      priority: priority.priority, priorityScore: priority.score, priorityFactors: priority.factors,
      impact: impact(diagnoses, questions.length), effort, confidence, dependencyIds: [], acceptanceCriteria,
      measurementLinkage, provenance: provenanceFor(diagnoses, gaps), status,
      contentBrief: proposal.interventionType === 'CONTENT_BRIEF' ? contentBrief({ questions, evidenceIds, dimensions, criteria: criteriaText }) : null,
      structuredData: null,
    };
    result.structuredData = structuredData({ proposal, businessName: context.businessName, evidence: evidenceToPreserve, surface: proposal.implementationSurface, criteria: criteriaText });
    return { result, dependencyKeys: unique(items.flatMap((item) => item.proposal.dependsOnCandidateKeys)) };
  });

  for (const item of interventions) {
    item.result.dependencyIds = unique(item.dependencyKeys.map((key) => candidateAlias.get(key)).filter((id): id is string => Boolean(id) && id !== item.result.id));
    validateIntervention(item.result, context);
  }
  const byId = new Map(interventions.map((item) => [item.result.id, item.result]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): void => {
    if (visiting.has(id)) throw new InterventionValidationError('Intervention dependency cycle is prohibited');
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of byId.get(id)?.dependencyIds ?? []) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of byId.keys()) visit(id);
  const ordered = interventions.map((item) => item.result).sort((a, b) => b.priorityScore - a.priorityScore || a.id.localeCompare(b.id));
  return { interventions: ordered, rejectedCount };
}

export function validateIntervention(intervention: GeneratedIntervention, context: InterventionGenerationContext): void {
  const diagnosisMap = new Map(context.eligibleDiagnoses.map((item) => [item.id, item]));
  if (!intervention.affectedDiagnosisIds.length || intervention.affectedDiagnosisIds.some((id) => !diagnosisMap.has(id))) throw new InterventionValidationError('Intervention is not traceable to an eligible diagnosis');
  const diagnoses = intervention.affectedDiagnosisIds.map((id) => diagnosisMap.get(id)!);
  const gaps = new Map(diagnoses.flatMap((diagnosis) => diagnosis.gaps.map((gap) => [gap.id, gap] as const)));
  if (!intervention.affectedGapIds.length || intervention.affectedGapIds.some((id) => !gaps.has(id))) throw new InterventionValidationError('Intervention is not traceable to a diagnosed gap');
  const exactQuestions = new Map(diagnoses.map((item) => [item.buyerQuestionId, item.exactQuestion]));
  if (intervention.affectedQuestions.some((item) => exactQuestions.get(item.id) !== item.exactQuestion)) throw new InterventionValidationError('Intervention changed an exact buyer question');
  const evidenceIds = new Set(context.availableEvidence.map((item) => item.id));
  if (intervention.evidenceToPreserve.some((item) => !item.evidenceId || !evidenceIds.has(item.evidenceId))) throw new InterventionValidationError('Intervention cites unsupported business evidence');
  if (intervention.evidenceToAdd.some((item) => item.evidenceId !== null)) throw new InterventionValidationError('Evidence-to-add cannot claim an existing evidence ID');
  const allowedProvenance = new Set(diagnoses.flatMap((diagnosis) => [
    ...diagnosis.assessments.flatMap((item) => item.provenance),
    ...diagnosis.gaps.flatMap((item) => item.provenance),
    ...diagnosis.claims.flatMap((item) => item.provenance),
    ...diagnosis.entityRelationships.flatMap((item) => item.provenance),
    ...diagnosis.unknowns.flatMap((item) => item.provenance),
  ]).map((item) => `${item.kind}:${item.sourceId}`));
  if (!intervention.provenance.length || intervention.provenance.some((item) => !allowedProvenance.has(`${item.kind}:${item.sourceId}`))) {
    throw new InterventionValidationError('Intervention contains unsupported provenance');
  }
  if (!intervention.acceptanceCriteria.length || !intervention.measurementLinkage.length) throw new InterventionValidationError('Intervention requires acceptance criteria and measurement linkage');
  if (['COMPLETED', 'PUBLISHED', 'IMPLEMENTED', 'VERIFIED'].includes(intervention.status as string)) throw new InterventionValidationError('Engine 05 cannot mark work completed');
  // Language policy applies to what Engine 05 wrote, not to text it carries over
  // verbatim: exact buyer questions and the business's own site copy. CityBond's
  // site says its "composition guarantees better rigidity"; preserving that
  // evidence is not an outcome guarantee from us.
  const quoted = [...intervention.affectedQuestions.map((item) => item.exactQuestion), ...context.availableEvidence.map((item) => item.text)]
    .filter((value) => value.trim().length >= 12)
    .map((value) => JSON.stringify(value).slice(1, -1))
    .sort((left, right) => right.length - left.length);
  let text = JSON.stringify({ ...intervention, evidenceToPreserve: intervention.evidenceToPreserve.map((item) => ({ ...item, description: '' })) });
  for (const value of quoted) text = text.split(value).join(' ');
  if (GENERIC_LANGUAGE.test(text)) throw new InterventionValidationError('Generic recommendation language is prohibited');
  if (SPAM_LANGUAGE.test(text)) throw new InterventionValidationError('Spam tactics are prohibited');
  if (COMPETITOR_COPYING.test(text)) throw new InterventionValidationError('Competitor copying is prohibited');
  if (GUARANTEE_LANGUAGE.test(text)) throw new InterventionValidationError('Outcome guarantees are prohibited');
  if (CAUSAL_LANGUAGE.test(text)) throw new InterventionValidationError('Unsupported causal or manipulation language is prohibited');
  const assertedText = `${intervention.title} ${intervention.objective} ${intervention.problemStatement} ${intervention.whyThisAddressesGap} ${intervention.expectedDeliverable}`;
  if (UNSUPPORTED_FACT_ASSERTION.test(assertedText)) throw new InterventionValidationError('Unsupported business fact assertion is prohibited');
  if (EXECUTION_LANGUAGE.test(`${intervention.title} ${intervention.objective} ${intervention.expectedDeliverable}`)) throw new InterventionValidationError('Engine 06 execution state leaked into Engine 05');
  if (intervention.contentBrief) {
    if (intervention.contentBrief.requiredSections.length === 0) throw new InterventionValidationError('Content brief must remain structured');
    const allowedBriefKeys = ['targetBuyerQuestions', 'discoveryIntent', 'objective', 'verifiedFactEvidenceIds', 'requiredSections', 'requiredFactsToClarify', 'prohibitedUnsupportedClaims', 'internalEvidenceReferences', 'acceptanceCriteria'];
    if (Object.keys(intervention.contentBrief).some((key) => !allowedBriefKeys.includes(key))) throw new InterventionValidationError('Finished content leaked into the content brief');
  }
  if (intervention.structuredData) {
    if (intervention.evidenceToPreserve.length === 0) throw new InterventionValidationError('Structured data properties require verified evidence');
    const allowedProperties = new Set(intervention.evidenceToPreserve.flatMap((item) => evidenceProperties[item.evidenceType] ?? []));
    if (intervention.structuredData.supportedProperties.some((property) => !allowedProperties.has(property))) {
      throw new InterventionValidationError('Structured data contains unsupported properties');
    }
  }
}

export function questionByKey(bundle: InterventionSourceBundle): Map<string, BuyerQuestion> {
  return new Map(bundle.questionSet.questions.map((question) => [question.id, question]));
}
