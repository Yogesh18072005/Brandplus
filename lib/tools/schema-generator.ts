// Schema Markup Generator — generates JSON-LD structured data from page content
// or manual input. Uses Gemini for intelligent, context-aware schema generation
// rather than generic templates.

import { geminiCall } from '@/src/gemini-client';
import { config } from '@/src/config';
import { extractJson } from '@/src/parse';

export type SchemaType = 'FAQPage' | 'Article' | 'HowTo' | 'Organization' | 'LocalBusiness' | 'Product' | 'BreadcrumbList';

interface SchemaInput {
  schemaType: SchemaType;
  pageUrl?: string;
  manualData?: {
    name?: string;
    description?: string;
    faqs?: { question: string; answer: string }[];
    steps?: string[];
    address?: string;
    phone?: string;
    services?: string[];
    priceRange?: string;
  };
  project: {
    business_name: string;
    website: string;
    category: string;
    city: string;
  };
}

interface SchemaResult {
  jsonLd: Record<string, unknown>;
  schemaType: SchemaType;
  validation: { valid: boolean; warnings: string[] };
}

async function fetchPageContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'AEOEngine/1.0 (schema-generator)' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    return html.slice(0, 15000);
  } catch {
    return '';
  }
}

function buildPrompt(input: SchemaInput, pageContent: string): string {
  const context = pageContent
    ? `\nPAGE CONTENT (HTML excerpt):\n${pageContent}\n`
    : '';

  const manualContext = input.manualData
    ? `\nMANUAL DATA PROVIDED:\n${JSON.stringify(input.manualData, null, 2)}\n`
    : '';

  return `Generate a valid JSON-LD structured data object for schema type "${input.schemaType}".

BUSINESS: ${input.project.business_name}
WEBSITE: ${input.project.website}
CATEGORY: ${input.project.category}
CITY: ${input.project.city}
${context}${manualContext}
Requirements:
- Return ONLY valid JSON-LD (a single JSON object with @context and @type)
- Use schema.org vocabulary
- Include all required properties for the "${input.schemaType}" type
- If page content is provided, extract real data from it
- If manual data is provided, use it
- For LocalBusiness: include name, address, telephone, openingHours, geo, url, image, priceRange, areaServed
- For FAQPage: include mainEntity with Question/Answer pairs
- For Article: include headline, datePublished, dateModified, author, publisher, description, image
- For HowTo: include name, step array with HowToStep items
- For Organization: include name, url, logo, contactPoint, sameAs, address
- For Product: include name, description, offers, brand, review/aggregateRating
- For BreadcrumbList: include itemListElement with ListItem entries
- All URLs should be absolute
- Escape special characters properly in JSON

Return the JSON-LD object only, no markdown fences or explanation.`;
}

function validateSchema(jsonLd: Record<string, unknown>, schemaType: SchemaType): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (!jsonLd['@context']) warnings.push('Missing @context — should be "https://schema.org"');
  if (!jsonLd['@type']) warnings.push('Missing @type');
  if (jsonLd['@type'] !== schemaType) warnings.push(`@type is "${jsonLd['@type']}" but expected "${schemaType}"`);

  switch (schemaType) {
    case 'FAQPage':
      if (!jsonLd.mainEntity || !Array.isArray(jsonLd.mainEntity)) warnings.push('FAQPage should have mainEntity array');
      break;
    case 'LocalBusiness':
      if (!jsonLd.name) warnings.push('LocalBusiness missing name');
      if (!jsonLd.address) warnings.push('LocalBusiness missing address');
      break;
    case 'Article':
      if (!jsonLd.headline) warnings.push('Article missing headline');
      if (!jsonLd.datePublished) warnings.push('Article missing datePublished');
      break;
    case 'Organization':
      if (!jsonLd.name) warnings.push('Organization missing name');
      if (!jsonLd.url) warnings.push('Organization missing url');
      break;
  }

  return { valid: warnings.length === 0, warnings };
}

export async function generateSchema(input: SchemaInput): Promise<SchemaResult> {
  let pageContent = '';
  if (input.pageUrl) {
    pageContent = await fetchPageContent(input.pageUrl);
  }

  const interaction = await geminiCall({
    kind: 'tool:schema-generator',
    model: config.parserModel,
    input: buildPrompt(input, pageContent),
    generationConfig: { thinking_level: 'minimal', temperature: 0.2, max_output_tokens: 4096 },
  });

  const jsonLd = extractJson(interaction.output_text ?? '') as Record<string, unknown>;

  if (!jsonLd['@context']) {
    jsonLd['@context'] = 'https://schema.org';
  }

  const validation = validateSchema(jsonLd, input.schemaType);

  return { jsonLd, schemaType: input.schemaType, validation };
}
