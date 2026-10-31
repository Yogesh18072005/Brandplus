// Core pipeline types — see CLAUDE.md §5. Engine-agnostic from day one.

export type EngineName = 'perplexity' | 'chatgpt' | 'gemini' | 'ai_overview';

export interface Citation {
  title?: string;
  url: string;
  domain: string; // registrable domain, lowercased
}

export interface EngineResult {
  engine: EngineName;
  query: string;
  answerText: string;
  citations: Citation[];
  observedAt: string;
  grounded?: boolean; // false = answered WITHOUT web search (citations unavailable, not just empty)
  execution: {
    provider: string;
    model?: string;
    startedAt: string;
    completedAt: string;
    durationMs: number;
    cached?: boolean;
  };
  raw?: unknown; // keep raw response for debugging
  error?: string; // set if this engine failed; answerText left empty
}

export interface EngineAvailability {
  available: boolean;
  reason?: string;
}

export interface EngineContext {
  city: string;
  category?: string;
  country?: string;
}

/** Normalized provider boundary. Product logic must not depend on an SDK response shape. */
export interface AnswerEngine {
  name: EngineName;
  label: string;
  availability(): EngineAvailability;
  runPrompt(prompt: string, context: EngineContext): Promise<EngineResult>;
}

/** @deprecated Kept as an alias for extensions built against the v0 name. */
export type EngineAdapter = AnswerEngine;

export interface Competitor {
  name: string;
  aliases?: string[];
}

/** 'local' = Indian city-anchored business (default); 'software' = SaaS/app sold to a region, no city. */
export type BusinessType = 'local' | 'software';

export interface AuditInput {
  businessName: string;
  website: string; // used for domain-based citation matching
  category: string; // e.g. "cosmetic dentistry"
  city: string; // e.g. "Delhi"; for software audits, the buyer region label (e.g. "US")
  businessType?: BusinessType; // default: 'local'
  region?: string; // software only: where buyers are, e.g. "US", "UK and EU", "global"
  aliases?: string[]; // other names the brand goes by
  competitors: Competitor[]; // 2–5 tracked competitors
  engines?: EngineName[]; // default: ['gemini'] for now
  promptCount?: number; // default: 40
  products?: string[];
  services?: string[];
  locations?: string[];
  targetCustomers?: string[];
  markets?: string[];
}

export interface BuyerPrompt {
  text: string;
  intent: string;
  intentWeight?: number;
  /** Why this question is in the audit (set by the question gate). */
  reason?: string;
}

export type MentionType =
  | 'top_recommendation'
  | 'listed_among_others'
  | 'passing_mention'
  | 'absent';

export type Sentiment = 'positive' | 'neutral' | 'negative' | 'not_mentioned';

export interface ParsedAnswer {
  brand_mentioned: boolean;
  mention_type: MentionType;
  brand_rank: number | null; // position among recommendations, if ranked
  sentiment: Sentiment;
  competitors_mentioned: { name: string; is_tracked_competitor: boolean }[];
  cited_domains: string[];
  evidence_quote: string; // short real snippet from the answer, <20 words
  brand_cited: boolean; // deterministic post-step: brand domain in citations
}

// One prompt × one engine, fully processed.
export interface PromptResult {
  prompt: BuyerPrompt;
  engine: EngineName;
  answerText: string;
  citations: Citation[];
  grounded?: boolean;
  observedAt?: string;
  execution?: EngineResult['execution'];
  parsed: ParsedAnswer | null;
  error?: string;
}
