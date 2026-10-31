// On-Page AEO Analyzer — fetches a URL, analyzes the page for AI-readiness,
// and returns a 0-100 score with prioritized recommendations.
// Combines deterministic HTML checks with Gemini-powered content analysis.

import { geminiCall } from '@/src/gemini-client';
import { config } from '@/src/config';
import { extractJson } from '@/src/parse';

interface AnalysisScores {
  contentLength: number;
  headingStructure: number;
  schemaMarkup: number;
  eeatSignals: number;
  directAnswer: number;
  faqPresence: number;
  metaDescription: number;
  internalLinks: number;
  contentFreshness: number;
  aiCrawlability: number;
}

interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  issue: string;
  fix: string;
  fixCode?: string;
}

interface AnalysisResult {
  pageUrl: string;
  overallScore: number;
  scores: AnalysisScores;
  recommendations: Recommendation[];
  meta: {
    title: string;
    description: string;
    wordCount: number;
    headings: { tag: string; text: string }[];
    hasSchema: boolean;
    schemaTypes: string[];
  };
}

async function fetchPage(url: string): Promise<{ html: string; status: number }> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'AEOEngine/1.0 (page-analyzer)',
      'Accept': 'text/html',
    },
    signal: AbortSignal.timeout(20000),
    redirect: 'follow',
  });
  return { html: await res.text(), status: res.status };
}

function extractMeta(html: string) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);

  const headings: { tag: string; text: string }[] = [];
  const headingRegex = /<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = headingRegex.exec(html)) !== null) {
    headings.push({ tag: m[1]!.toUpperCase(), text: m[2]!.replace(/<[^>]*>/g, '').trim().slice(0, 100) });
  }

  const bodyText = html.replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

  const schemaBlocks: string[] = [];
  const ldRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  while ((m = ldRegex.exec(html)) !== null) {
    schemaBlocks.push(m[1]!.trim());
  }

  const schemaTypes: string[] = [];
  for (const block of schemaBlocks) {
    try {
      const parsed = JSON.parse(block);
      if (parsed['@type']) schemaTypes.push(String(parsed['@type']));
      if (Array.isArray(parsed['@graph'])) {
        for (const item of parsed['@graph']) {
          if (item['@type']) schemaTypes.push(String(item['@type']));
        }
      }
    } catch { /* skip invalid JSON-LD */ }
  }

  const internalLinks = (html.match(/<a[^>]*href=["'][^"']*["']/gi) || []).length;
  const hasDateModified = /dateModified|datemodified|last.?modified|updated/i.test(html);
  const hasAuthor = /author|byline|written.?by/i.test(html);
  const hasFaq = /faq|frequently.?asked|common.?questions/i.test(html);

  return {
    title: titleMatch?.[1]?.trim() ?? '',
    description: descMatch?.[1]?.trim() ?? '',
    headings,
    wordCount,
    bodyText: bodyText.slice(0, 10000),
    hasSchema: schemaBlocks.length > 0,
    schemaTypes,
    internalLinks,
    hasDateModified,
    hasAuthor,
    hasFaq,
  };
}

function deterministicScores(meta: ReturnType<typeof extractMeta>): Partial<AnalysisScores> {
  return {
    contentLength: meta.wordCount >= 1500 ? 100 : meta.wordCount >= 800 ? 75 : meta.wordCount >= 300 ? 50 : 20,
    headingStructure: (() => {
      const h1s = meta.headings.filter(h => h.tag === 'H1').length;
      const h2s = meta.headings.filter(h => h.tag === 'H2').length;
      if (h1s !== 1) return 30;
      if (h2s >= 3) return 100;
      if (h2s >= 1) return 70;
      return 40;
    })(),
    schemaMarkup: meta.hasSchema ? (meta.schemaTypes.length >= 2 ? 100 : 70) : 0,
    metaDescription: meta.description.length >= 120 && meta.description.length <= 160 ? 100
      : meta.description.length > 0 ? 60 : 0,
    internalLinks: meta.internalLinks >= 10 ? 100 : meta.internalLinks >= 5 ? 70 : meta.internalLinks >= 1 ? 40 : 10,
    contentFreshness: meta.hasDateModified ? 80 : 30,
    faqPresence: meta.hasFaq ? 80 : 20,
    eeatSignals: meta.hasAuthor ? 70 : 20,
  };
}

async function aiAnalysis(pageUrl: string, meta: ReturnType<typeof extractMeta>): Promise<{ directAnswer: number; eeatBonus: number; recommendations: Recommendation[] }> {
  const prompt = `Analyze this webpage for AI Answer Engine readiness. Score and recommend improvements.

URL: ${pageUrl}
TITLE: ${meta.title}
META DESCRIPTION: ${meta.description}
WORD COUNT: ${meta.wordCount}
HEADINGS: ${meta.headings.map(h => `${h.tag}: ${h.text}`).join('\n')}
SCHEMA TYPES FOUND: ${meta.schemaTypes.join(', ') || 'none'}
HAS FAQ SECTION: ${meta.hasFaq}
HAS AUTHOR INFO: ${meta.hasAuthor}

CONTENT PREVIEW (first 3000 chars):
${meta.bodyText.slice(0, 3000)}

Analyze and return JSON:
{
  "directAnswerScore": 0-100 (does the first paragraph directly answer what the page is about? AI extracts this),
  "eeatScore": 0-100 (author credentials, expertise signals, trust indicators),
  "recommendations": [
    {
      "priority": "high|medium|low",
      "category": "content|schema|technical|authority",
      "issue": "what's wrong (1 sentence)",
      "fix": "how to fix it (1-2 sentences)",
      "fixCode": "optional: actual code/markup to add"
    }
  ]
}

Focus on actionable, specific recommendations. Maximum 8 recommendations, sorted by priority.`;

  const interaction = await geminiCall({
    kind: 'tool:page-analyzer',
    model: config.parserModel,
    input: prompt,
    generationConfig: { thinking_level: 'minimal', temperature: 0, max_output_tokens: 4096 },
  });

  const result = extractJson(interaction.output_text ?? '') as {
    directAnswerScore?: number;
    eeatScore?: number;
    recommendations?: Recommendation[];
  };

  return {
    directAnswer: Math.min(result.directAnswerScore ?? 50, 100),
    eeatBonus: Math.min(result.eeatScore ?? 50, 100),
    recommendations: (result.recommendations ?? []).slice(0, 8),
  };
}

export async function analyzePage(pageUrl: string): Promise<AnalysisResult> {
  const { html, status } = await fetchPage(pageUrl);
  if (status >= 400) {
    throw new Error(`Page returned HTTP ${status}`);
  }

  const meta = extractMeta(html);
  const detScores = deterministicScores(meta);
  const ai = await aiAnalysis(pageUrl, meta);

  const scores: AnalysisScores = {
    contentLength: detScores.contentLength ?? 0,
    headingStructure: detScores.headingStructure ?? 0,
    schemaMarkup: detScores.schemaMarkup ?? 0,
    eeatSignals: Math.round(((detScores.eeatSignals ?? 0) + ai.eeatBonus) / 2),
    directAnswer: ai.directAnswer,
    faqPresence: detScores.faqPresence ?? 0,
    metaDescription: detScores.metaDescription ?? 0,
    internalLinks: detScores.internalLinks ?? 0,
    contentFreshness: detScores.contentFreshness ?? 0,
    aiCrawlability: detScores.schemaMarkup! > 0 ? 80 : 30,
  };

  const weights = {
    contentLength: 0.1, headingStructure: 0.1, schemaMarkup: 0.15,
    eeatSignals: 0.1, directAnswer: 0.15, faqPresence: 0.1,
    metaDescription: 0.05, internalLinks: 0.05, contentFreshness: 0.1,
    aiCrawlability: 0.1,
  };

  const overallScore = Math.round(
    Object.entries(scores).reduce((sum, [key, val]) => {
      return sum + val * (weights[key as keyof typeof weights] ?? 0.1);
    }, 0)
  );

  return {
    pageUrl,
    overallScore,
    scores,
    recommendations: ai.recommendations,
    meta: {
      title: meta.title,
      description: meta.description,
      wordCount: meta.wordCount,
      headings: meta.headings.slice(0, 20),
      hasSchema: meta.hasSchema,
      schemaTypes: meta.schemaTypes,
    },
  };
}
