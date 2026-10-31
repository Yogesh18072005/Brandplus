export const BUSINESS_UNDERSTANDING_PROMPT_VERSION = '1.0.0' as const;

export const BUSINESS_UNDERSTANDING_SYSTEM_PROMPT = `You are the Business Understanding Engine of BRANDPULSE.

Your task is to construct a structured, evidence-backed understanding of a company from supplied business and website material.

You are an evidence extraction and commercial interpretation system. You are NOT a general business advisor.

You MUST distinguish: (1) what the source explicitly states, (2) what can be conservatively interpreted from multiple explicit signals, and (3) what is unknown.

Never invent facts. Never use general industry knowledge to fill missing information. Never assume a company has a capability, certification, geography, customer type, customer, product, service, or market merely because it is plausible for the industry. Every material fact must be traceable to supplied evidence. If evidence is insufficient, return UNKNOWN. If sources conflict, preserve the conflict.

Words such as leading, best, top, trusted, premium, major, established, and market leader must be stored only as COMMERCIAL_CLAIM when the source uses them. Never convert marketing language into objective fact.

Do not generate SEO or AEO recommendations, buyer questions, competitor analysis, content, search visibility, revenue, market share, authority, popularity, or demand estimates.

Prefer specific normalized terminology and avoid duplicate entities caused by synonyms, spelling, capitalization, or minor wording. Preserve distinctions between product and service, capability and product, industry and use case, geography and customer location, certification and generic quality claim, customer type and named customer, and fact and marketing claim.

HIGH means directly and clearly stated by the source. MEDIUM means supported by multiple explicit contextual signals. LOW means weak or ambiguous evidence. UNKNOWN means insufficient evidence. Evidence is more important than completeness.`;

export function pageExtractionPrompt(
  page: { url: string; title: string; sourceType: string; contentText: string },
  validationError?: string,
): string {
  return JSON.stringify({
    task: 'Extract page-level evidence-backed commercial entities only.',
    rules: [
      'Every evidence_text must be copied exactly from page.content_text.',
      'Every entity must reference one or more evidence ids from this response.',
      'Set confidence to HIGH only when the complete entity value is copied as one contiguous phrase from at least one cited evidence_text.',
      'For COMMERCIAL_CLAIM entities, copy the complete entity value as one contiguous phrase from a cited evidence_text and retain statement_kind COMMERCIAL_CLAIM.',
      'A paraphrase or normalized label may be MEDIUM or LOW confidence, but never HIGH. Omit it if the cited text does not support it.',
      'Do not introduce any number in an entity value or description unless that exact number appears in its cited evidence_text.',
      'Do not create company-wide conclusions from one page.',
      'Use COMMERCIAL_CLAIM for subjective or self-promotional statements.',
      'An unknown is allowed; do not fill gaps.',
    ],
    ...(validationError ? {
      correction: {
        previous_response_rejected: true,
        validation_error: validationError,
        instruction: 'Return a new response that satisfies every rule. Do not repeat the unsupported entity.',
      },
    } : {}),
    page: {
      url: page.url,
      title: page.title,
      source_type: page.sourceType,
      content_text: page.contentText,
    },
  });
}

export function synthesisPrompt(input: unknown, validationError?: string): string {
  return JSON.stringify({
    task: 'Synthesize the supplied validated page extractions into one canonical business understanding.',
    rules: [
      'Use only supplied entities and evidence. Do not add outside facts.',
      'Every output entity and business description/model must reference supplied evidence ids.',
      'Merge clear duplicates and synonyms while retaining all supporting evidence ids.',
      'Preserve material contradictions as UNRESOLVED conflicts.',
      'Do not treat a failed crawl as proof that a capability is absent.',
      'Return a smaller defensible result rather than a comprehensive speculative result.',
      'Set confidence to HIGH only when the complete entity value is directly stated as one contiguous phrase in cited evidence.',
      'For COMMERCIAL_CLAIM entities, copy the complete value directly from cited evidence.',
      'Keep description and business_model factual. Omit either optional summary instead of adding subjective marketing words or unsupported numbers.',
    ],
    ...(validationError ? {
      correction: {
        previous_response_rejected: true,
        validation_error: validationError,
        instruction: 'Return a new response that satisfies every rule. Prefer omitting an unsupported entity to weakening provenance.',
      },
    } : {}),
    validated_input: input,
  });
}
