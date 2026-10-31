import type { PlanId } from './plans';

const PAID_PLANS: PlanId[] = ['starter', 'pro'];

export interface ProfilePlanFields {
  plan: string | null;
  plan_expires_at?: string | null;
}

/** Resolve the plan that should apply right now (downgrades expired paid plans to free). */
export function getEffectivePlan(profile: ProfilePlanFields | null | undefined): PlanId {
  const stored = (profile?.plan as PlanId) ?? 'free';
  if (!PAID_PLANS.includes(stored)) return 'free';

  const expiresAt = profile?.plan_expires_at ? new Date(profile.plan_expires_at) : null;
  if (expiresAt && expiresAt.getTime() <= Date.now()) return 'free';

  return stored;
}

export function planExpiryLabel(expiresAt: string | null | undefined): string | null {
  if (!expiresAt) return null;
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function isPlanActive(profile: ProfilePlanFields | null | undefined): boolean {
  const effective = getEffectivePlan(profile);
  return effective !== 'free';
}
