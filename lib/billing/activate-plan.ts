import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import type { PlanId } from './plans';
import { getEffectivePlan, type ProfilePlanFields } from './effective-plan';
import { monthlyCreditsFor, nextCreditResetAt } from './credits';

const PLAN_RANK: Record<PlanId, number> = { free: 0, starter: 1, pro: 2 };
const SUBSCRIPTION_DAYS = 30;

export function canPurchasePlan(profile: ProfilePlanFields | null | undefined, target: PlanId): boolean {
  if (target === 'free') return false;
  const effective = getEffectivePlan(profile);
  return PLAN_RANK[target] >= PLAN_RANK[effective];
}

export function addSubscriptionDays(from: Date, days = SUBSCRIPTION_DAYS): Date {
  const next = new Date(from);
  next.setDate(next.getDate() + days);
  return next;
}

interface ActivatePlanArgs {
  userId: string;
  planId: PlanId;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amountPaise: number;
}

/** Idempotent plan activation after a verified Razorpay payment. */
export async function activatePlanAfterPayment(
  supabase: SupabaseClient<Database>,
  args: ActivatePlanArgs
): Promise<
  | { ok: true; plan: PlanId; expiresAt: string; creditsRemaining: number }
  | { ok: false; error: string }
> {
  const { userId, planId, razorpayOrderId, razorpayPaymentId, amountPaise } = args;

  if (planId !== 'starter' && planId !== 'pro') {
    return { ok: false, error: 'Invalid plan' };
  }

  const { data: payment } = await supabase
    .from('payments')
    .select('id, status, plan_id, amount_paise, razorpay_payment_id, paid_at')
    .eq('razorpay_order_id', razorpayOrderId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!payment) {
    return { ok: false, error: 'Payment order not found' };
  }

  if (payment.plan_id !== planId || payment.amount_paise !== amountPaise) {
    return { ok: false, error: 'Payment does not match this plan order' };
  }

  if (
    payment.razorpay_payment_id &&
    payment.razorpay_payment_id !== razorpayPaymentId
  ) {
    return { ok: false, error: 'Payment identifier does not match this order' };
  }

  if (payment.status === 'paid') {
    if (!payment.paid_at) {
      return { ok: false, error: 'Payment activation is already in progress' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, plan_expires_at, credits_remaining')
      .eq('id', userId)
      .single();
    const effective = getEffectivePlan(profile);
    if (PLAN_RANK[effective] < PLAN_RANK[planId]) {
      return { ok: false, error: 'Paid order requires plan reconciliation' };
    }
    return {
      ok: true,
      plan: effective,
      expiresAt: profile?.plan_expires_at ?? new Date().toISOString(),
      creditsRemaining: profile?.credits_remaining ?? 0,
    };
  }

  if (payment.status !== 'created') {
    return { ok: false, error: 'Payment order is not available for activation' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at')
    .eq('id', userId)
    .single();

  if (!canPurchasePlan(profile, planId)) {
    return { ok: false, error: 'This plan change is not allowed' };
  }

  const now = new Date();
  let base = now;
  const currentExpires = profile?.plan_expires_at ? new Date(profile.plan_expires_at) : null;
  if (currentExpires && currentExpires.getTime() > now.getTime()) {
    base = currentExpires;
  }
  const expiresAt = addSubscriptionDays(base);

  const paidAt = now.toISOString();
  const creditsRemaining = monthlyCreditsFor(planId);
  const creditsResetAt = nextCreditResetAt(now);

  // Claim this order before changing entitlements. `paid_at` intentionally stays
  // null until the profile write succeeds, so concurrent verification cannot
  // mistake an in-progress activation for a completed one.
  const { data: claimedPayment, error: paymentErr } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      razorpay_payment_id: razorpayPaymentId,
    })
    .eq('razorpay_order_id', razorpayOrderId)
    .eq('user_id', userId)
    .eq('status', 'created')
    .select('id')
    .maybeSingle();

  if (paymentErr) {
    return { ok: false, error: paymentErr.message };
  }
  if (!claimedPayment) {
    return { ok: false, error: 'Payment activation is already in progress' };
  }

  const { error: profileErr } = await supabase
    .from('profiles')
    .update({
      plan: planId,
      plan_expires_at: expiresAt.toISOString(),
      credits_remaining: creditsRemaining,
      credits_reset_at: creditsResetAt,
    })
    .eq('id', userId);

  if (profileErr) {
    // Lean compensation: make a failed profile write retryable. The filters
    // ensure we only release the claim created by this verification attempt.
    const { data: releasedPayment, error: releaseErr } = await supabase
      .from('payments')
      .update({
        status: 'created',
        razorpay_payment_id: null,
        paid_at: null,
      })
      .eq('razorpay_order_id', razorpayOrderId)
      .eq('user_id', userId)
      .eq('status', 'paid')
      .eq('razorpay_payment_id', razorpayPaymentId)
      .is('paid_at', null)
      .select('id')
      .maybeSingle();

    if (releaseErr || !releasedPayment) {
      return {
        ok: false,
        error: `${profileErr.message}; payment requires reconciliation`,
      };
    }
    return { ok: false, error: profileErr.message };
  }

  const { data: completedPayment, error: completeErr } = await supabase
    .from('payments')
    .update({ paid_at: paidAt })
    .eq('razorpay_order_id', razorpayOrderId)
    .eq('user_id', userId)
    .eq('status', 'paid')
    .eq('razorpay_payment_id', razorpayPaymentId)
    .is('paid_at', null)
    .select('id')
    .maybeSingle();

  if (completeErr || !completedPayment) {
    return { ok: false, error: completeErr?.message ?? 'Payment activation could not be finalized' };
  }

  return {
    ok: true,
    plan: planId,
    expiresAt: expiresAt.toISOString(),
    creditsRemaining,
  };
}

export async function recordFailedPayment(
  supabase: SupabaseClient<Database>,
  razorpayOrderId: string
): Promise<void> {
  await supabase
    .from('payments')
    .update({ status: 'failed' })
    .eq('razorpay_order_id', razorpayOrderId)
    .eq('status', 'created');
}

export { SUBSCRIPTION_DAYS, PLAN_RANK };
