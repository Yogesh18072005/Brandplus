// llms.txt Generator — creates the llms.txt file that tells AI crawlers
// what content to index and how to interpret it. Supports sitemap parsing
// or manual page list input.

import { geminiCall } from '@/src/gemini-client';
import { config } from '@/src/config';
import { extractJson } from '@/src/parse';

interface LlmsTxtInput {
  sitemapUrl?: string;
  pages?: { url: string; title?: string }[];
  project: {
    business_name: string;
    website: string;
    category: string;
  };
}

interface LlmsTxtResult {
  content: string;
  pageCount: number;
}

async function fetchSitemap(url: string): Promise<{ url: string; title?: string }[]> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'AEOEngine/1.0 (llms-txt-generator)' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();

    const urls: { url: string; title?: string }[] = [];
    const locRegex = /<loc>(.*?)<\/loc>/gi;
    let match;
    while ((match = locRegex.exec(xml)) !== null) {
      const pageUrl = match[1]!.trim();
      if (pageUrl && !pageUrl.endsWith('.xml')) {
        urls.push({ url: pageUrl });
      }
    }

    return urls.slice(0, 50);
  } catch (err) {
    throw new Error(`Failed to fetch sitemap: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function generateDescriptions(
  pages: { url: string; title?: string }[],
  project: LlmsTxtInput['project']
): Promise<{ url: string; title: string; description: string }[]> {
  const prompt = `Generate short descriptions for each URL to include in an llms.txt file.

BUSINESS: ${project.business_name}
WEBSITE: ${project.website}
CATEGORY: ${project.category}

PAGES:
${pages.map((p, i) => `${i + 1}. ${p.url}${p.title ? ` — ${p.title}` : ''}`).join('\n')}

For each page, provide:
- title: A clear, descriptive title (infer from the URL path if not provided)
- description: 1-2 sentence description of what the page covers, written for AI crawlers

Return JSON: { "pages": [{ "url": "...", "title": "...", "description": "..." }] }`;

  const interaction = await geminiCall({
    kind: 'tool:llms-txt',
    model: config.parserModel,
    input: prompt,
    generationConfig: { thinking_level: 'minimal', temperature: 0.3, max_output_tokens: 4096 },
  });

  const result = extractJson(interaction.output_text ?? '') as {
    pages?: { url: string; title: string; description: string }[];
  };

  return result.pages ?? pages.map((p) => ({
    url: p.url,
    title: p.title ?? p.url.split('/').pop() ?? 'Page',
    description: `Page on ${project.website}`,
  }));
}

export async function generateLlmsTxt(input: LlmsTxtInput): Promise<LlmsTxtResult> {
  let pages = input.pages ?? [];

  if (input.sitemapUrl) {
    pages = await fetchSitemap(input.sitemapUrl);
  }

  if (pages.length === 0) {
    throw new Error('No pages found. Provide a sitemap URL or a list of pages.');
  }

  const described = await generateDescriptions(pages, input.project);

  const lines: string[] = [
    `# ${input.project.business_name}`,
    ``,
    `> ${input.project.business_name} is a ${input.project.category} business. This file helps AI assistants understand our site structure and content.`,
    ``,
    `## Pages`,
    ``,
  ];

  for (const page of described) {
    lines.push(`- [${page.title}](${page.url}): ${page.description}`);
  }

  lines.push('');
  lines.push(`## Contact`);
  lines.push(`- Website: ${input.project.website.startsWith('http') ? input.project.website : `https://${input.project.website}`}`);
  lines.push('');

  return {
    content: lines.join('\n'),
    pageCount: described.length,
  };
}
