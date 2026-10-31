export const BUSINESS_UNDERSTANDING_VERSION = '1.0.0' as const;

export type EvidenceConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
export type ProcessingStatus = 'SUCCESS' | 'PARTIAL_SUCCESS' | 'NO_USABLE_EVIDENCE' | 'FAILED';
export type CrawlStatus = 'SUCCESS' | 'EMPTY' | 'BLOCKED' | 'PARTIAL' | 'MALFORMED' | 'DUPLICATE' | 'INACCESSIBLE';
export type SourceType =
  | 'PRODUCT_SERVICE'
  | 'INDUSTRY_USE_CASE'
  | 'CERTIFICATION_QUALITY'
  | 'ABOUT_COMPANY'
  | 'CASE_STUDY'
  | 'CONTACT_LOCATION'
  | 'BLOG_EDITORIAL'
  | 'GENERIC_PAGE'
  | 'USER_PROVIDED';

export type BusinessEntityType =
  | 'COMPANY_IDENTITY'
  | 'PRODUCT'
  | 'SERVICE'
  | 'CAPABILITY'
  | 'BUYER_TYPE'
  | 'INDUSTRY'
  | 'USE_CASE'
  | 'GEOGRAPHY'
  | 'COMMERCIAL_CLAIM'
  | 'DIFFERENTIATOR'
  | 'PROOF_ASSET'
  | 'CERTIFICATION'
  | 'BUSINESS_MODEL_SIGNAL'
  | 'CONVERSION_SIGNAL';

export type StatementKind = 'FACT' | 'INTERPRETATION' | 'COMMERCIAL_CLAIM';

export interface CrawledPage {
  url: string;
  canonicalUrl: string;
  title: string;
  sourceType: SourceType;
  status: CrawlStatus;
  contentText: string;
  contentHash: string | null;
  httpStatus: number | null;
  fetchedAt: string;
  warning?: string;
}

export interface CrawlResult {
  pages: CrawledPage[];
  contentHash: string;
  warnings: string[];
}

export interface BusinessEvidence {
  id: string;
  source_url: string;
  page_title: string;
  source_type: SourceType;
  evidence_text: string;
  extracted_at: string;
  confidence: EvidenceConfidence;
}

export interface BusinessEntity {
  id: string;
  type: BusinessEntityType;
  value: string;
  description: string | null;
  category: string | null;
  statement_kind: StatementKind;
  confidence: Exclude<EvidenceConfidence, 'UNKNOWN'>;
  evidence_ids: string[];
}

export interface BusinessConflict {
  id: string;
  topic: string;
  conflicting_values: string[];
  evidence_ids: string[];
  resolution: 'UNRESOLVED';
}

export interface BusinessUnknown {
  id: string;
  area: string;
  reason: 'NOT_EVIDENCED' | 'CRAWL_FAILURE' | 'AMBIGUOUS' | 'CONFLICT';
  detail: string;
  evidence_ids: string[];
}

export interface SourceCoverage {
  pages_analyzed: number;
  pages_successfully_analyzed: number;
  pages_failed: number;
  pages_empty: number;
  pages_blocked: number;
  pages_partial: number;
  pages_duplicate: number;
}

export interface EvidencedValue {
  value: string;
  evidence_ids: string[];
}

export interface CanonicalBusinessUnderstanding {
  version: string;
  status: ProcessingStatus;
  project_id: string;
  content_hash: string;
  generated_at: string;
  business: {
    name: string;
    website: string;
    description: EvidencedValue | null;
    business_model: EvidencedValue | null;
  };
  products: BusinessEntity[];
  services: BusinessEntity[];
  capabilities: BusinessEntity[];
  buyer_types: BusinessEntity[];
  industries: BusinessEntity[];
  use_cases: BusinessEntity[];
  geographies: BusinessEntity[];
  proof_assets: BusinessEntity[];
  certifications: BusinessEntity[];
  commercial_claims: BusinessEntity[];
  differentiators: BusinessEntity[];
  conversion_signals: BusinessEntity[];
  business_model_signals: BusinessEntity[];
  company_identity: BusinessEntity[];
  evidence: BusinessEvidence[];
  conflicts: BusinessConflict[];
  unknowns: BusinessUnknown[];
  source_coverage: SourceCoverage;
  warnings: string[];
  extraction: {
    model: string;
    schema_version: string;
    prompt_version: string;
    reused: boolean;
  };
}

export interface PageExtraction {
  evidence: Array<Omit<BusinessEvidence, 'source_url' | 'page_title' | 'source_type' | 'extracted_at'>>;
  entities: BusinessEntity[];
  unknowns: BusinessUnknown[];
}

export interface SynthesisResult {
  description: EvidencedValue | null;
  business_model: EvidencedValue | null;
  entities: BusinessEntity[];
  conflicts: BusinessConflict[];
  unknowns: BusinessUnknown[];
}

export interface BusinessUnderstandingInput {
  projectId: string;
  businessName: string;
  website: string;
  userProvidedContext?: string[];
}

export interface BusinessUnderstandingExtractor {
  model: string;
  extractPage(page: CrawledPage): Promise<PageExtraction>;
  synthesize(input: {
    businessName: string;
    website: string;
    evidence: BusinessEvidence[];
    entities: BusinessEntity[];
    unknowns: BusinessUnknown[];
  }): Promise<SynthesisResult>;
}

export interface BusinessUnderstandingRepository {
  findReusable(projectId: string, contentHash: string, version: string): Promise<CanonicalBusinessUnderstanding | null>;
  findLatest(projectId: string): Promise<CanonicalBusinessUnderstanding | null>;
  save(result: CanonicalBusinessUnderstanding, pages: CrawledPage[]): Promise<CanonicalBusinessUnderstanding>;
}

export interface BusinessUnderstandingLogger {
  record(event: string, metadata?: Record<string, string | number | boolean | null>): Promise<void> | void;
}
