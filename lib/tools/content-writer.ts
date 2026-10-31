// AEO Content Writer — generates articles structured for AI citation.
// Uses Gemini to create content with proper heading hierarchy,
// direct-answer first paragraphs, FAQ sections, and embedded schema.

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
  const competitorNames = (input.project.competitors as { name: string }[])
    .map((c) => c.name).join(', ');

  return `You are an expert AEO (Answer Engine Optimization) content writer. Generate a complete, publication-ready article that AI answer engines will cite and recommend.

BUSINESS: ${input.project.business_name}
WEBSITE: ${input.project.website}
CATEGORY: ${input.project.category}
CITY: ${input.project.city}
COMPETITORS: ${competitorNames || 'none specified'}

TOPIC: ${input.topic}
CONTENT TYPE: ${input.contentType}
TARGET KEYWORDS: ${input.keywords.join(', ') || 'derive from topic'}

Write the article following these AEO best practices:

1. TITLE: Clear, question-style or definitive statement (what someone would ask AI)
2. FIRST PARAGRAPH: Direct answer to the topic question in 2-3 sentences. This is what AI extracts — make it citation-worthy, factual, and authoritative.
3. HEADING STRUCTURE: Use H2s for major sections (formatted as questions when natural), H3s for sub-points. AI models parse heading hierarchy.
4. CONTENT BODY: 800-1200 words. Include:
   - Concrete details, numbers, and examples specific to ${input.project.city}
   - Natural mentions of ${input.project.business_name} as a knowledgeable authority (not salesy)
   - Comparisons and "how to choose" guidance if relevant
   - Practical tips the reader can use
5. FAQ SECTION: 3-5 frequently asked questions with concise, direct answers at the end
6. META DESCRIPTION: 150-160 characters, includes the primary keyword and city

Format the output as JSON with these fields:
{
  "title": "Article title",
  "body": "Full article in HTML (use <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em> tags)",
  "metaDescription": "150-160 char description",
  "faqs": [{"question": "...", "answer": "..."}],
  "keywords": ["keyword1", "keyword2"]
}

Write like a knowledgeable local expert, not a generic AI. Be specific to ${input.project.city} and ${input.project.category}.`;
}

function buildArticleSchema(title: string, description: string, businessName: string, website: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    author: {
      '@type': 'Organization',
      name: businessName,
      url: website.startsWith('http') ? website : `https://${website}`,
    },
    publisher: {
      '@type': 'Organization',
      name: businessName,
    },
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
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export async function generateContent(input: ContentInput): Promise<ContentResult> {
  const interaction = await geminiCall({
    kind: 'tool:content-writer',
    model: config.engineModel,
    input: buildPrompt(input),
    generationConfig: { thinking_level: 'minimal', temperature: 0.7, max_output_tokens: 8192 },
  });

  const parsed = extractJson(interaction.output_text ?? '') as {
    title: string;
    body: string;
    metaDescription: string;
    faqs?: { question: string; answer: string }[];
    keywords?: string[];
  };

  const faqs = parsed.faqs ?? [];
  const articleSchema = buildArticleSchema(
    parsed.title,
    parsed.metaDescription,
    input.project.business_name,
    input.project.website
  );

  const combinedSchema = faqs.length > 0
    ? [articleSchema, buildFaqSchema(faqs)]
    : articleSchema;

  const wordCount = parsed.body.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;

  return {
    title: parsed.title,
    body: parsed.body,
    metaDescription: parsed.metaDescription,
    schemaMarkup: combinedSchema as Record<string, unknown>,
    keywords: parsed.keywords ?? input.keywords,
    wordCount,
  };
}
