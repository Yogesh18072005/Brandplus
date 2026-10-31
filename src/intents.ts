export const BUYER_INTENTS = [
  'discovery',
  'comparison',
  'commercial',
  'transactional',
  'problem',
  'category_authority',
  'location',
  'export',
  'product',
  'vendor_selection',
] as const;

export type BuyerIntent = (typeof BUYER_INTENTS)[number];

/** Business-value multipliers. They weight observations, not guaranteed revenue. */
export const INTENT_WEIGHTS: Readonly<Record<string, number>> = {
  discovery: 1,
  problem: 2,
  category_authority: 2,
  location: 2,
  commercial: 3,
  comparison: 4,
  export: 4,
  product: 4,
  transactional: 5,
  vendor_selection: 5,
  // Legacy frozen prompt sets remain comparable and receive stable mappings.
  direct_best: 3,
  budget: 3,
  need_specific: 3,
  location_refined: 2,
  comparison_decision: 4,
  near_me: 3,
  informational: 1,
  unknown: 1,
};

export function getIntentWeight(intent: string | undefined): number {
  return Math.max(1, INTENT_WEIGHTS[intent ?? 'unknown'] ?? 1);
}

export function intentIsCommercial(intent: string | undefined): boolean {
  return getIntentWeight(intent) >= 3;
}
