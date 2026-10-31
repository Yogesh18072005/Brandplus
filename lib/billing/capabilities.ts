// Per-plan capability gates (D4 tool unlock + D5 checklist). Pure functions so
// UI and API share one source of truth and G3 can test them without a live DB.

import type { PlanId } from './plans';

/** The two fix tools unlocked at Pro (D4). Others stay quarantined for launch. */
export type FixTool = 'schema' | 'content';

/** Which fix tools a plan may use. Free/Starter: none. Pro: schema + content. */
export function fixToolsForPlan(plan: PlanId): FixTool[] {
  return plan === 'pro' ? ['schema', 'content'] : [];
}

export function canUseFixTool(plan: PlanId, tool: FixTool): boolean {
  return fixToolsForPlan(plan).includes(tool);
}

/** Fix Plan checklist is interactive on paid plans; free sees it read-only (D3.5). */
export function canToggleFixPlan(plan: PlanId): boolean {
  return plan !== 'free';
}

/** Weekly tracking re-runs (D5) — paid plans only. */
export function canTrackWeekly(plan: PlanId): boolean {
  return plan !== 'free';
}

export interface PlanCapabilities {
  fixTools: FixTool[];
  toggleFixPlan: boolean;
  weeklyTracking: boolean;
}

export function planCapabilities(plan: PlanId): PlanCapabilities {
  return {
    fixTools: fixToolsForPlan(plan),
    toggleFixPlan: canToggleFixPlan(plan),
    weeklyTracking: canTrackWeekly(plan),
  };
}
