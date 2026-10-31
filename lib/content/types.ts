/**
 * Public resources content (guides, glossary, comparisons, segments, services).
 *
 * Paragraph and list strings support two inline marks:
 *   [link text](/internal-or-https-url)  and  **bold**
 * Keep every claim factual. Studies are cited as "one study found", never as law.
 */

export type DocKind = 'guide' | 'glossary' | 'compare' | 'segment' | 'service';

export type Block =
  | { p: string }
  | { ul: string[] }
  | { ol: string[] }
  | { table: { head: string[]; rows: string[][] } }
  | { note: string }
  | { code: string };

export interface DocSection {
  heading: string;
  /** 1 to 3 sentences that answer the heading on their own. */
  answer?: string;
  body?: Block[];
}

export interface Doc {
  kind: DocKind;
  slug: string;
  /** <title> without the brand suffix. */
  title: string;
  description: string;
  h1: string;
  /** The answer capsule shown under the H1, 40 to 90 words. */
  answer: string;
  takeaways?: string[];
  sections: DocSection[];
  faqs?: [question: string, answer: string][];
  /** Internal paths, e.g. '/guides/answer-engine-optimization'. */
  related?: string[];
  sources?: { label: string; url: string }[];
  published: string; // YYYY-MM-DD
  updated: string; // YYYY-MM-DD
}
