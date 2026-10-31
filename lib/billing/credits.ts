// D2 — audit credits. Pure decision functions (unit-tested in G3) + thin
// Supabase helpers that use them. One credit = one on-demand audit run.
// Paid monthly grants reset each CREDIT_PERIOD_DAYS with no rollover; the free
// credit is a one-time entitlement. Top-up packs
// add credits on top of the current balance.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { PLANS, CREDIT_PERIOD_DAYS, type PlanId } from './plans';
import { getEffectivePlan, type ProfilePlanFields } from './effective-plan';

// ─────────────────────────── pure logic (G3 tests these) ───────────────────────────

export function monthlyCreditsFor(plan: PlanId): number {
  return PLANS[plan]?.limits.monthlyCredits ?? PLANS.free.limits.monthlyCredits;
}

/** True if the credit period has lapsed (or was never initialised) → time to reset. */
export function needsCreditReset(resetAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!resetAt) return true;
  const t = new Date(resetAt).getTime();
  return Number.isNaN(t) || t <= now.getTime();
}

export function nextCreditResetAt(now: Date = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() + CREDIT_PERIOD_DAYS);
  return d.toISOString();
}

export interface CreditState {
  plan: PlanId;
  creditsRemaining: number;
  resetAt: string | null;
}

/**
 * Given the stored profile, compute the credit state that applies right now.
 * If the period lapsed, credits reset to the (effective) plan's monthly grant.
 * Pure — the DB write is done by the caller based on `didReset`.
 */
export function resolveCredits(
  profile: (ProfilePlanFields & { credits_remaining?: number | null; credits_reset_at?: string | null }) | null | undefined,
  now: Date = new Date()
): CreditState & { didReset: boolean } {
  const plan = getEffectivePlan(profile);
  if (plan === 'free') {
    return {
      plan,
      creditsRemaining: Math.max(0, profile?.credits_remaining ?? 0),
      resetAt: null,
      didReset: false,
    };
  }
  if (needsCreditReset(profile?.credits_reset_at, now)) {
    return { plan, creditsRemaining: monthlyCreditsFor(plan), resetAt: nextCreditResetAt(now), didReset: true };
  }
  return {
    plan,
    creditsRemaining: Math.max(0, profile?.credits_remaining ?? 0),
    resetAt: profile?.credits_reset_at ?? nextCreditResetAt(now),
    didReset: false,
  };
}

export function hasCredit(creditsRemaining: number): boolean {
  return creditsRemaining > 0;
}

export function upgradeMessage(plan: PlanId): string {
  if (plan === 'free') {
    return 'You’ve used your free audit. Need more? Ask us from the Plan page and we’ll set up more audits for you.';
  }
  return 'You’re out of audit credits for this period. Ask us from the Plan page and we’ll add more.';
}

// ─────────────────────────── Supabase helpers ───────────────────────────

type DB = SupabaseClient<Database>;

interface ReserveOk { ok: true; remaining: number; plan: PlanId }
interface ReserveNo { ok: false; reason: 'no_credit'; plan: PlanId; message: string }

/**
 * Reserve one credit for an audit run. The database locks the profile row and
 * performs reset + effective-plan resolution + decrement atomically.
 */
export async function reserveAuditCredit(supabase: DB, userId: string): Promise<ReserveOk | ReserveNo> {
  const { data, error } = await supabase
    .rpc('reserve_audit_credit', { p_user_id: userId })
    .single();
  if (error || !data) {
    throw new Error(`Unable to reserve audit credit: ${error?.message ?? 'No result returned'}`);
  }

  const plan: PlanId = data.plan === 'starter' || data.plan === 'pro' ? data.plan : 'free';
  if (!data.ok) {
    return { ok: false, reason: 'no_credit', plan, message: upgradeMessage(plan) };
  }

  return { ok: true, remaining: data.remaining, plan };
}

/** Return a reserved credit if the audit couldn't be queued. */
export async function refundAuditCredit(supabase: DB, userId: string): Promise<void> {
  const { error } = await supabase.rpc('refund_audit_credit', { p_user_id: userId });
  if (error) throw new Error(`Unable to refund audit credit: ${error.message}`);
}

/**
 * Grant a top-up pack's credits after a verified payment. Idempotent: keyed on
 * the payment row's status flipping created → paid.
 */
export async function grantTopUpCredits(
  supabase: DB,
  args: { userId: string; razorpayOrderId: string; razorpayPaymentId: string }
): Promise<{ ok: true; granted: number; remaining: number } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc('grant_topup_credits', {
    p_user_id: args.userId,
    p_order_id: args.razorpayOrderId,
    p_payment_id: args.razorpayPaymentId,
  }).single();
  if (error || !data) return { ok: false, error: error?.message ?? 'Top-up could not be applied' };
  return { ok: true, granted: data.granted, remaining: data.remaining };
}
