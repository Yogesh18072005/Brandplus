// E0.1 — resolve the buyer-question set for an audit. Freeze on first use so
// every re-audit of a project asks the SAME questions (the prerequisite for a
// valid before/after in E1). One shared path for the queue job + tests.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/lib/supabase/types';
// Value import must be relative (not '@/') so the test runner (tsx) resolves it;
// '@/' is fine only for erased `import type`.
import { generatePrompts } from '../../src/promptgen';
import type { BuyerPrompt } from '@/src/types';

type DB = SupabaseClient<Database>;

export interface ProjectPromptFields {
  id: string;
  category: string;
  city: string;
  prompt_set: Json | null;
  prompt_set_version: number | null;
  products?: Json;
  services?: Json;
  locations?: Json;
  target_customers?: Json;
  markets?: Json;
}

/** Coerce a stored JSON value into a valid, non-empty BuyerPrompt[] or null. */
export function asPromptArray(value: unknown): BuyerPrompt[] | null {
  if (!Array.isArray(value)) return null;
  const list = value
    .filter((p): p is { text: string; intent?: string } => !!p && typeof (p as { text?: unknown }).text === 'string')
    .filter((p) => p.text.trim() !== '')
    .map((p) => ({ text: p.text, intent: p.intent ?? 'unknown', ...('intentWeight' in p && typeof p.intentWeight === 'number' ? { intentWeight: p.intentWeight } : {}) }));
  return list.length > 0 ? list : null;
}

export type GenerateFn = (
  category: string,
  city: string,
  count: number,
  profile?: Partial<import('@/src/types').AuditInput>,
) => Promise<BuyerPrompt[]>;

/**
 * Return the prompts to run for this project's audit.
 * - If a frozen set exists → reuse it VERBATIM (full array, never regenerate,
 *   never truncate). This keeps re-runs comparable.
 * - Otherwise → generate once, persist to projects.prompt_set, freeze at v1.
 */
export async function resolveProjectPrompts(
  supabase: DB,
  project: ProjectPromptFields,
  promptCount = 40,
  generate: GenerateFn = generatePrompts
): Promise<{ prompts: BuyerPrompt[]; frozen: boolean; version: number }> {
  const existing = asPromptArray(project.prompt_set);
  if (existing) {
    return { prompts: existing, frozen: true, version: project.prompt_set_version ?? 1 };
  }

  const asStrings = (value: Json | undefined) => Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
  const prompts = await generate(project.category, project.city, promptCount, {
    products: asStrings(project.products),
    services: asStrings(project.services),
    locations: asStrings(project.locations),
    targetCustomers: asStrings(project.target_customers),
    markets: asStrings(project.markets),
  });
  const version = (project.prompt_set_version ?? 0) + 1; // 0 → 1 on first freeze
  const { error } = await supabase
    .from('projects')
    .update({ prompt_set: prompts as unknown as Json, prompt_set_version: version })
    .eq('id', project.id);
  if (error) throw new Error(`Unable to freeze project prompt set: ${error.message}`);

  return { prompts, frozen: false, version };
}
