// Prompt Explorer — web interface wrapper around the existing promptgen module.
// Re-exports the core functions and adds CSV export formatting.

export { generatePrompts, INTENTS, dedupePrompts } from '@/src/promptgen';
import type { BuyerPrompt } from '@/src/types';

export function promptsToCsv(prompts: BuyerPrompt[]): string {
  const header = 'prompt,intent';
  const rows = prompts.map(
    (p) => `"${p.text.replace(/"/g, '""')}","${p.intent}"`
  );
  return [header, ...rows].join('\n');
}

export function groupByIntent(prompts: BuyerPrompt[]): Record<string, BuyerPrompt[]> {
  const groups: Record<string, BuyerPrompt[]> = {};
  for (const p of prompts) {
    const key = p.intent;
    if (!groups[key]) groups[key] = [];
    groups[key]!.push(p);
  }
  return groups;
}
