export type PlanId = 'free' | 'starter' | 'pro';

export interface PlanLimits {
  maxProjects: number;
  /** Audit credits granted each 30-day period (one credit = one on-demand audit). No rollover. */
  monthlyCredits: number;
  auditsPerMonth: number;
  promptsPerAudit: number;
  schemaGeneratorPerMonth: number;
  pageAnalyzerPerMonth: number;
  contentWriterPerMonth: number;
  llmsTxtPerMonth: number;
  weeklyTracking: boolean;
  dailyTracking: boolean;
  whiteLabel: boolean;
  priorityQueue: boolean;
}

export interface PlanConfig {
  id: PlanId;
  name: string;
  priceInr: number;
  razorpayPlanId?: string;
  limits: PlanLimits;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    priceInr: 0,
    limits: {
      maxProjects: 1,
      monthlyCredits: 1,
      auditsPerMonth: 1,
      promptsPerAudit: 10,
      schemaGeneratorPerMonth: 0,
      pageAnalyzerPerMonth: 0,
      contentWriterPerMonth: 0,
      llmsTxtPerMonth: 0,
      weeklyTracking: false,
      dailyTracking: false,
      whiteLabel: false,
      priorityQueue: false,
    },
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    priceInr: 999,
    limits: {
      maxProjects: 1,
      monthlyCredits: 2,
      auditsPerMonth: 4,
      promptsPerAudit: 40,
      schemaGeneratorPerMonth: 0,
      pageAnalyzerPerMonth: 0,
      contentWriterPerMonth: 0,
      llmsTxtPerMonth: 0,
      weeklyTracking: true,
      dailyTracking: false,
      whiteLabel: false,
      priorityQueue: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceInr: 2499,
    limits: {
      maxProjects: 10,
      monthlyCredits: 6,
      auditsPerMonth: -1,
      promptsPerAudit: 40,
      schemaGeneratorPerMonth: 0,
      pageAnalyzerPerMonth: 0,
      contentWriterPerMonth: 0,
      llmsTxtPerMonth: 0,
      weeklyTracking: true,
      dailyTracking: true,
      whiteLabel: true,
      priorityQueue: true,
    },
  },
};

/** One-time audit-credit top-up (Razorpay one-time payment). No plan change. */
export const TOP_UP_PACK = { id: 'topup' as const, credits: 3, priceInr: 199 };

/** How long a granted batch of monthly credits lasts before it resets. No rollover. */
export const CREDIT_PERIOD_DAYS = 30;

export function getPlanLimits(planId: PlanId): PlanLimits {
  return PLANS[planId]?.limits ?? PLANS.free.limits;
}

export function isWithinLimit(current: number, limit: number): boolean {
  return limit === -1 || current < limit;
}
