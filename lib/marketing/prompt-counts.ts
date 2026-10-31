import { PLANS } from '@/lib/billing/plans';

/** Free public / free-plan snapshot size — must match plans.ts. */
export const FREE_PROMPT_COUNT = PLANS.free.limits.promptsPerAudit;

/** Full audit size on Starter and Pro. */
export const PAID_PROMPT_COUNT = PLANS.starter.limits.promptsPerAudit;

export const FREE_AUDIT_PERKS_LINE = `${FREE_PROMPT_COUNT} buyer questions on the free snapshot`;

export const PAID_AUDIT_PERKS_LINE = `${PAID_PROMPT_COUNT} buyer questions per audit on Starter & Pro`;
