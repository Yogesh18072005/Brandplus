// G3 — plans/credits/capability enforcement, proven with mocked data (no live DB).
// Run: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  monthlyCreditsFor,
  needsCreditReset,
  resolveCredits,
  hasCredit,
  upgradeMessage,
  reserveAuditCredit,
  grantTopUpCredits,
} from './credits';
import { fixToolsForPlan, canUseFixTool, canToggleFixPlan, canTrackWeekly } from './capabilities';
import { getEffectivePlan } from './effective-plan';
import { activatePlanAfterPayment } from './activate-plan';

// ── tiny chainable mock of the Supabase client ──
function mockSupabase(profile: Record<string, unknown> | null) {
  const updates: Record<string, unknown>[] = [];
  const rpcCalls: string[] = [];
  const api: Record<string, unknown> = {};
  const chain = () => api;
  api.from = chain;
  api.select = chain;
  api.eq = chain;
  api.single = () => Promise.resolve({ data: profile });
  api.maybeSingle = () => Promise.resolve({ data: profile });
  api.update = (vals: Record<string, unknown>) => {
    updates.push(vals);
    // reflect the write so a subsequent read in the same call sees it
    if (profile) Object.assign(profile, vals);
    return { eq: () => Promise.resolve({ error: null }) };
  };
  api.rpc = (name: string) => {
    rpcCalls.push(name);
    if (name !== 'reserve_audit_credit') {
      return Promise.resolve({ data: null, error: null });
    }
    return {
      single: async () => {
        const state = resolveCredits(profile as Parameters<typeof resolveCredits>[0]);
        if (!hasCredit(state.creditsRemaining)) {
          return { data: { ok: false, remaining: 0, plan: state.plan }, error: null };
        }
        const values = { credits_remaining: state.creditsRemaining - 1, credits_reset_at: state.resetAt };
        updates.push(values);
        if (profile) Object.assign(profile, values);
        return { data: { ok: true, remaining: values.credits_remaining, plan: state.plan }, error: null };
      },
    };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { client: api as any, updates, rpcCalls };
}

function mockActivationSupabase(
  payment: Record<string, unknown> | null,
  profile: Record<string, unknown> | null,
  behavior: { profileUpdateError?: boolean; claimReturnsRow?: boolean } = {},
) {
  const updates = {
    payments: [] as Record<string, unknown>[],
    profiles: [] as Record<string, unknown>[],
  };

  const client = {
    from(table: 'payments' | 'profiles') {
      const query: Record<string, unknown> = {};
      let updateValues: Record<string, unknown> | null = null;
      query.select = () => query;
      query.eq = () => query;
      query.is = () => query;
      query.maybeSingle = () => {
        const isClaim = table === 'payments' && updateValues?.status === 'paid' && !('paid_at' in updateValues);
        if (isClaim && behavior.claimReturnsRow === false) {
          return Promise.resolve({ data: null, error: null });
        }
        return Promise.resolve({ data: table === 'payments' ? payment : profile, error: null });
      };
      query.single = () => Promise.resolve({ data: table === 'payments' ? payment : profile });
      query.update = (values: Record<string, unknown>) => {
        updateValues = values;
        updates[table].push(values);
        const row = table === 'payments' ? payment : profile;
        const shouldFail = table === 'profiles' && behavior.profileUpdateError;
        const isRejectedClaim =
          table === 'payments' &&
          values.status === 'paid' &&
          !('paid_at' in values) &&
          behavior.claimReturnsRow === false;
        if (row && !shouldFail && !isRejectedClaim) Object.assign(row, values);
        return query;
      };
      query.then = (resolve: (value: { error: { message: string } | null }) => void) => {
        const error = table === 'profiles' && updateValues && behavior.profileUpdateError
          ? { message: 'profile update failed' }
          : null;
        resolve({ error });
      };
      return query;
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { client: client as any, updates };
}

const future = new Date(Date.now() + 10 * 86_400_000).toISOString();
const past = new Date(Date.now() - 1 * 86_400_000).toISOString();

// ─────────────────────────── credit logic ───────────────────────────

test('monthly credits per plan match the brief (free 1 / starter 2 / pro 6)', () => {
  assert.equal(monthlyCreditsFor('free'), 1);
  assert.equal(monthlyCreditsFor('starter'), 2);
  assert.equal(monthlyCreditsFor('pro'), 6);
});

test('needsCreditReset: null or past = reset, future = keep', () => {
  assert.equal(needsCreditReset(null), true);
  assert.equal(needsCreditReset(past), true);
  assert.equal(needsCreditReset(future), false);
});

test('resolveCredits resets to plan grant when the period lapsed', () => {
  const s = resolveCredits({ plan: 'pro', plan_expires_at: future, credits_remaining: 0, credits_reset_at: past });
  assert.equal(s.plan, 'pro');
  assert.equal(s.creditsRemaining, 6);
  assert.equal(s.didReset, true);
});

test('resolveCredits keeps the stored balance mid-period', () => {
  const s = resolveCredits({ plan: 'starter', plan_expires_at: future, credits_remaining: 1, credits_reset_at: future });
  assert.equal(s.creditsRemaining, 1);
  assert.equal(s.didReset, false);
});

test('expired paid plan resolves to free without minting a new free credit', () => {
  assert.equal(getEffectivePlan({ plan: 'pro', plan_expires_at: past }), 'free');
  const s = resolveCredits({ plan: 'pro', plan_expires_at: past, credits_remaining: 0, credits_reset_at: past });
  assert.equal(s.plan, 'free');
  assert.equal(s.creditsRemaining, 0);
  assert.equal(s.didReset, false);
});

test('hasCredit is strictly positive', () => {
  assert.equal(hasCredit(1), true);
  assert.equal(hasCredit(0), false);
});

// ─────────────────────── credit enforcement (mocked DB) ───────────────────────

test('G3: a run WITH credit is reserved and decrements the balance', async () => {
  const { client, updates, rpcCalls } = mockSupabase({ plan: 'starter', plan_expires_at: future, credits_remaining: 2, credits_reset_at: future });
  const r = await reserveAuditCredit(client, 'user-1');
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.remaining, 1);
  assert.equal(updates.at(-1)?.credits_remaining, 1);
  assert.deepEqual(rpcCalls, ['reserve_audit_credit']);
});

test('G3: a run WITHOUT credit is BLOCKED with a way to get more (never silent)', async () => {
  const { client } = mockSupabase({ plan: 'free', plan_expires_at: null, credits_remaining: 0, credits_reset_at: future });
  const r = await reserveAuditCredit(client, 'user-2');
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.reason, 'no_credit');
    assert.match(r.message, /Plan page/);
  }
});

test('G3: a used free credit never resets', async () => {
  const { client } = mockSupabase({ plan: 'free', plan_expires_at: null, credits_remaining: 0, credits_reset_at: past });
  const r = await reserveAuditCredit(client, 'user-3');
  assert.equal(r.ok, false);
});

test('P0: top-up grants use the atomic idempotent database function', async () => {
  const calls: Array<{ name: string; args: unknown }> = [];
  const client = {
    rpc(name: string, args: unknown) {
      calls.push({ name, args });
      return { single: async () => ({ data: { granted: 3, remaining: 5 }, error: null }) };
    },
  };
  const result = await grantTopUpCredits(client as never, {
    userId: 'user-atomic',
    razorpayOrderId: 'order-topup',
    razorpayPaymentId: 'pay-topup',
  });
  assert.deepEqual(result, { ok: true, granted: 3, remaining: 5 });
  assert.equal(calls[0]?.name, 'grant_topup_credits');
});

test('upgradeMessage points to a person, never a public price', () => {
  assert.match(upgradeMessage('free'), /Plan page/);
  assert.match(upgradeMessage('starter'), /Plan page/);
  assert.doesNotMatch(upgradeMessage('free') + upgradeMessage('starter'), /₹/);
});

test('P0: verified Starter payment immediately resets the plan credit grant', async () => {
  const payment = {
    id: 'payment-row',
    status: 'created',
    plan_id: 'starter',
    amount_paise: 99_900,
    razorpay_payment_id: null,
    paid_at: null,
  };
  const profile = {
    plan: 'free',
    plan_expires_at: null,
    credits_remaining: 0,
    credits_reset_at: null,
  };
  const { client, updates } = mockActivationSupabase(payment, profile);

  const result = await activatePlanAfterPayment(client, {
    userId: 'user-1',
    planId: 'starter',
    razorpayOrderId: 'order-1',
    razorpayPaymentId: 'pay-1',
    amountPaise: 99_900,
  });

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.creditsRemaining, 2);
  assert.equal(updates.profiles.length, 1);
  assert.equal(updates.profiles[0]?.plan, 'starter');
  assert.equal(updates.profiles[0]?.credits_remaining, 2);
  assert.ok(new Date(String(updates.profiles[0]?.credits_reset_at)).getTime() > Date.now());
});

test('P0: retrying an already-paid activation does not grant credits twice', async () => {
  const payment = {
    id: 'payment-row',
    status: 'paid',
    plan_id: 'pro',
    amount_paise: 249_900,
    razorpay_payment_id: 'pay-2',
    paid_at: new Date().toISOString(),
  };
  const profile = {
    plan: 'pro',
    plan_expires_at: future,
    credits_remaining: 4,
    credits_reset_at: future,
  };
  const { client, updates } = mockActivationSupabase(payment, profile);

  const result = await activatePlanAfterPayment(client, {
    userId: 'user-2',
    planId: 'pro',
    razorpayOrderId: 'order-2',
    razorpayPaymentId: 'pay-2',
    amountPaise: 249_900,
  });

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.creditsRemaining, 4);
  assert.equal(updates.profiles.length, 0);
  assert.equal(updates.payments.length, 0);
});

test('P0: a failed entitlement write releases the payment claim and retry succeeds', async () => {
  const payment: Record<string, unknown> = {
    id: 'payment-row',
    status: 'created',
    plan_id: 'starter',
    amount_paise: 99_900,
    razorpay_payment_id: null,
    paid_at: null,
  };
  const profile: Record<string, unknown> = {
    plan: 'free',
    plan_expires_at: null,
    credits_remaining: 0,
    credits_reset_at: null,
  };
  const behavior = { profileUpdateError: true };
  const { client } = mockActivationSupabase(payment, profile, behavior);
  const args = {
    userId: 'user-3',
    planId: 'starter' as const,
    razorpayOrderId: 'order-3',
    razorpayPaymentId: 'pay-3',
    amountPaise: 99_900,
  };

  const failed = await activatePlanAfterPayment(client, args);
  assert.equal(failed.ok, false);
  assert.equal(payment.status, 'created');
  assert.equal(payment.razorpay_payment_id, null);

  behavior.profileUpdateError = false;
  const retried = await activatePlanAfterPayment(client, args);
  assert.equal(retried.ok, true);
  assert.equal(profile.plan, 'starter');
  assert.equal(profile.credits_remaining, 2);
});

test('P0: a zero-row conditional payment claim never mutates entitlements', async () => {
  const payment = {
    id: 'payment-row',
    status: 'created',
    plan_id: 'pro',
    amount_paise: 249_900,
    razorpay_payment_id: null,
    paid_at: null,
  };
  const profile = {
    plan: 'free',
    plan_expires_at: null,
    credits_remaining: 0,
    credits_reset_at: null,
  };
  const { client, updates } = mockActivationSupabase(payment, profile, { claimReturnsRow: false });

  const result = await activatePlanAfterPayment(client, {
    userId: 'user-4',
    planId: 'pro',
    razorpayOrderId: 'order-4',
    razorpayPaymentId: 'pay-4',
    amountPaise: 249_900,
  });

  assert.equal(result.ok, false);
  assert.match(result.ok ? '' : result.error, /in progress/i);
  assert.equal(updates.profiles.length, 0);
  assert.equal(profile.plan, 'free');
  assert.equal(profile.credits_remaining, 0);
});

// ─────────────────────── capability gates (D4/D5) ───────────────────────

test('G3: Pro unlocks the two fix tools; Starter and Free do not', () => {
  assert.deepEqual(fixToolsForPlan('pro'), ['schema', 'content']);
  assert.deepEqual(fixToolsForPlan('starter'), []);
  assert.deepEqual(fixToolsForPlan('free'), []);
  assert.equal(canUseFixTool('pro', 'schema'), true);
  assert.equal(canUseFixTool('starter', 'schema'), false);
});

test('G3: free user cannot toggle the Fix Plan checklist; paid can', () => {
  assert.equal(canToggleFixPlan('free'), false);
  assert.equal(canToggleFixPlan('starter'), true);
  assert.equal(canToggleFixPlan('pro'), true);
});

test('weekly tracking is paid-only', () => {
  assert.equal(canTrackWeekly('free'), false);
  assert.equal(canTrackWeekly('starter'), true);
});
