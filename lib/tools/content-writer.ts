// AEO Content Writer — generates evidence-conscious drafts for human review.
// Gemini is called only after an authenticated user explicitly requests a draft.

import { geminiCall } from '@/src/gemini-client';
import { config } from '@/src/config';
import { extractJson } from '@/src/parse';

interface ContentInput {
  topic: string;
  contentType: 'blog_post' | 'faq_page' | 'comparison' | 'answer_page';
  keywords: string[];
  project: {
    business_name: string;
    website: string;
    category: string;
    city: string;
    competitors: { name: string }[];
    products?: unknown;
    services?: unknown;
    locations?: unknown;
    target_customers?: unknown;
    markets?: unknown;
  };
}

interface ContentResult {
  title: string;
  body: string;
  metaDescription: string;
  schemaMarkup: Record<string, unknown>;
  keywords: string[];
  wordCount: number;
}

function buildPrompt(input: ContentInput): string {
  return `You are an AEO content editor. Create a useful first draft based on the supplied business profile and buyer question.

BUSINESS PROFILE (the only verified business facts supplied):
Business: ${input.project.business_name}
Website: ${input.project.website}
Category: ${input.project.category}
City: ${input.project.city}

FIX / BUYER QUESTION:
${input.topic}
CONTENT TYPE: ${input.contentType}
TARGET KEYWORDS: ${input.keywords.join(', ') || 'derive naturally from the buyer question'}

STRICT FACT RULES:
- Do not invent products, services, materials, certifications, customers, clients, years of experience, prices, capacities, locations, statistics, awards, guarantees, contact details, or capabilities.
- Do not imply the business offers something unless the supplied profile explicitly establishes it.
- Where a necessary business fact is missing, insert a clear [VERIFY: describe the exact fact needed] placeholder.
- Distinguish general educational advice from claims about this specific business.
- Do not invent local market statistics or cite sources that were not supplied.
- Never fabricate testimonials, reviews, case studies, or competitor comparisons.
- The output is an editable draft, not a claim that the page exists or is published.

DRAFT REQUIREMENTS:
1. Write a direct 2–3 sentence answer to the buyer question first.
2. Use a clear title and logical H2/H3 headings.
3. Provide useful, specific guidance without making unsupported claims about the business.
4. Include 3–5 concise FAQs that answer the same buyer intent.
5. Keep the draft around 500–800 words; prefer accuracy over length.
6. Write a meta description under 160 characters.
7. Include a short list of relevant keywords.

Return only valid JSON with:
{
  "title": "Draft title",
  "body": "HTML using only h2, h3, p, ul, li, strong and em tags",
  "metaDescription": "Description",
  "faqs": [{"question": "Question", "answer": "Answer"}],
  "keywords": ["keyword"]
}`;
}

function buildArticleSchema(title: string, description: string, businessName: string, website: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    author: { '@type': 'Organization', name: businessName, url: website.startsWith('http') ? website : `https://${website}` },
    publisher: { '@type': 'Organization', name: businessName },
    datePublished: new Date().toISOString().split('T')[0],
    dateModified: new Date().toISOString().split('T')[0],
  };
}

function buildFaqSchema(faqs: { question: string; answer: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}

export async function generateContent(input: ContentInput): Promise<ContentResult> {
  if (!config.googleApiKey) throw new Error('Gemini is not configured. Add GOOGLE_API_KEY before generating a draft.');
  const interaction = await geminiCall({
    kind: 'tool:content-writer',
    model: config.engineModel,
    input: buildPrompt(input),
    generationConfig: { thinking_level: 'minimal', temperature: 0.3, max_output_tokens: 6144 },
    retries: 0,
  });

  const parsed = extractJson(interaction.output_text ?? '') as {
    title: string;
    body: string;
    metaDescription: string;
    faqs?: { question: string; answer: string }[];
    keywords?: string[];
  };
  if (!parsed || typeof parsed.title !== 'string' || typeof parsed.body !== 'string' || typeof parsed.metaDescription !== 'string') {
    throw new Error('Gemini returned an incomplete content draft. No draft was saved.');
  }

  const faqs = Array.isArray(parsed.faqs) ? parsed.faqs : [];
  const articleSchema = buildArticleSchema(parsed.title, parsed.metaDescription, input.project.business_name, input.project.website);
  const combinedSchema = faqs.length > 0 ? [articleSchema, buildFaqSchema(faqs)] : articleSchema;
  const wordCount = parsed.body.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;

  return {
    title: parsed.title,
    body: parsed.body,
    metaDescription: parsed.metaDescription,
    schemaMarkup: combinedSchema as Record<string, unknown>,
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords : input.keywords,
    wordCount,
  };
}


export async function generateContentBatch(input: {
  topics: string[];
  keywords: string[];
  project: ContentInput['project'];
  evidence?: { question: string; answerQuote: string | null; competitorsNamed: string[] }[];
}): Promise<(ContentResult & { question: string })[]> {
  if (!config.googleApiKey) throw new Error('Gemini is not configured. Add GOOGLE_API_KEY before generating drafts.');
  if (input.topics.length < 1 || input.topics.length > 5) throw new Error('Generate between 1 and 5 page drafts at a time.');

  const topicList = input.topics.map((topic, index) => `${index + 1}. ${topic}`).join('\n');
  const prompt = `You are an AEO content editor. Create one useful, concise webpage draft for EACH buyer question below. Return exactly ${input.topics.length} drafts in the same order.

VERIFIED BUSINESS PROFILE (only use supplied profile entries as business facts):
Business: ${input.project.business_name}
Website: ${input.project.website}
Category: ${input.project.category}
City: ${input.project.city}
Recorded products: ${JSON.stringify(input.project.products ?? [])}
Recorded services: ${JSON.stringify(input.project.services ?? [])}
Recorded locations: ${JSON.stringify(input.project.locations ?? [])}
Recorded target customers: ${JSON.stringify(input.project.target_customers ?? [])}
Recorded markets: ${JSON.stringify(input.project.markets ?? [])}

AUDIT EVIDENCE (evidence of what the AI answer said, NOT proof that competitors' capabilities belong to this business):
${(input.evidence ?? []).map((item, index) => `Question ${index + 1}: ${item.question}\nRecorded answer excerpt: ${item.answerQuote || 'No excerpt retained'}\nCompetitors named in that answer: ${item.competitorsNamed.join(', ') || 'None recorded'}`).join('\n\n')}

BUYER QUESTIONS:
${topicList}

TARGET KEYWORDS: ${input.keywords.join(', ') || 'derive naturally'}

FACT RULES:
- Use only non-empty entries in the verified business profile above as verified facts.
- Treat audit excerpts only as evidence of the answer and the content gap; competitor mentions are not facts about this business.
- Use recorded products, services, customer types, locations and markets only when relevant to the specific question.
- Never invent services, products, certifications, customers, years, prices, statistics, locations, awards, guarantees, capabilities, testimonials or contact details.
- Put [VERIFY: exact missing fact] wherever a business-specific fact is needed but not supplied.
- Clearly label educational guidance as general guidance and put business-specific claims only in a clearly named business section.
- If the profile does not establish a service or capability, do not imply it is offered; use a precise [VERIFY: ...] placeholder.
- Do not fabricate citations or claim a page is already published.

FOR EACH QUESTION:
- Give a direct answer first, then a clear title and useful H2/H3 sections.
- Include 2-3 FAQs.
- Keep each draft concise (about 250-400 words).
- Include a meta description under 160 characters and relevant keywords.
- HTML may use only h2, h3, p, ul, li, strong and em tags.

Return only valid JSON in this shape:
{"drafts":[{"question":"original question","title":"...","body":"...","metaDescription":"...","faqs":[{"question":"...","answer":"..."}],"keywords":["..."]}]}`;

  const interaction = await geminiCall({
    kind: 'tool:content-writer',
    model: config.engineModel,
    input: prompt,
    generationConfig: { thinking_level: 'minimal', temperature: 0.3, max_output_tokens: 8192 },
    retries: 0,
  });
  const parsed = extractJson(interaction.output_text ?? '') as {
    drafts?: { question: string; title: string; body: string; metaDescription: string; faqs?: { question: string; answer: string }[]; keywords?: string[] }[];
  };
  if (!Array.isArray(parsed?.drafts) || parsed.drafts.length !== input.topics.length) {
    throw new Error('Gemini returned an incomplete set of drafts. No drafts were saved.');
  }

  return parsed.drafts.map((draft, index) => {
    if (typeof draft.title !== 'string' || typeof draft.body !== 'string' || typeof draft.metaDescription !== 'string') {
      throw new Error('Gemini returned an incomplete draft. No drafts were saved.');
    }
    const faqs = Array.isArray(draft.faqs) ? draft.faqs : [];
    const schemaMarkup = faqs.length > 0
      ? [buildArticleSchema(draft.title, draft.metaDescription, input.project.business_name, input.project.website), buildFaqSchema(faqs)]
      : buildArticleSchema(draft.title, draft.metaDescription, input.project.business_name, input.project.website);
    return {
      title: draft.title,
      body: draft.body,
      metaDescription: draft.metaDescription,
      schemaMarkup: schemaMarkup as Record<string, unknown>,
      keywords: Array.isArray(draft.keywords) ? draft.keywords : input.keywords,
      wordCount: draft.body.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length,
      question: input.topics[index],
    };
  });
}
