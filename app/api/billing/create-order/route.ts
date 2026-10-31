import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getRazorpay } from '@/lib/billing/razorpay';
import { PLANS, TOP_UP_PACK, type PlanId } from '@/lib/billing/plans';
import { canPurchasePlan } from '@/lib/billing/activate-plan';
import { getEffectivePlan } from '@/lib/billing/effective-plan';
import { guardMutationRequest } from '@/lib/http/request-security';
import { consumeRateLimit, RATE_LIMITS, rateLimitError } from '@/lib/security/rate-limit';

async function createTopUpOrder(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimit = await consumeRateLimit(request, RATE_LIMITS.billing, user.id);
  if (!rateLimit.allowed) return rateLimitError(rateLimit, 'Too many checkout requests. Try again shortly.');

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return NextResponse.json({ error: 'Payments are not configured yet.' }, { status: 503 });
  }

  try {
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: TOP_UP_PACK.priceInr * 100,
      currency: 'INR',
      receipt: `brandpulse_${user.id.slice(0, 8)}_topup_${Date.now()}`.slice(0, 40),
      notes: { userId: user.id, product: 'topup', planId: 'topup', userEmail: user.email ?? '' },
    });

    const { error: insertErr } = await supabase.from('payments').insert({
      user_id: user.id,
      plan_id: 'topup',
      amount_paise: Number(order.amount),
      currency: order.currency ?? 'INR',
      razorpay_order_id: order.id,
      credits_granted: TOP_UP_PACK.credits,
      status: 'created',
    });
    if (insertErr) {
      console.error('[billing] Failed to record top-up payment:', insertErr.message);
      return NextResponse.json({ error: 'Could not start checkout' }, { status: 500 });
    }

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      product: 'topup',
      planName: `${TOP_UP_PACK.credits} audit credits`,
      userName: profile?.full_name ?? '',
      userEmail: user.email ?? '',
    });
  } catch (err) {
    console.error('[billing] Top-up order creation failed:', err);
    return NextResponse.json({ error: 'Payment initialization failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const guard = guardMutationRequest(request, { json: true });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  // Top-up packs are a one-time credit purchase (no plan change).
  const peek = (await request.clone().json().catch(() => ({}))) as { product?: string };
  if (peek.product === 'topup') return createTopUpOrder(request);

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimit = await consumeRateLimit(request, RATE_LIMITS.billing, user.id);
  if (!rateLimit.allowed) return rateLimitError(rateLimit, 'Too many checkout requests. Try again shortly.');

  let body: { planId?: PlanId };
  try {
    body = (await request.json()) as { planId?: PlanId };
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { planId } = body;

  if (!planId || !PLANS[planId] || planId === 'free') {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at, full_name')
    .eq('id', user.id)
    .single();

  if (!canPurchasePlan(profile, planId)) {
    return NextResponse.json(
      { error: 'You already have an equal or higher plan. Renewals extend your current period.' },
      { status: 400 }
    );
  }

  const effective = getEffectivePlan(profile);
  if (effective === 'pro' && planId === 'starter') {
    return NextResponse.json({ error: 'Downgrades are not available online. Contact support.' }, { status: 400 });
  }

  const plan = PLANS[planId];

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return NextResponse.json(
      { error: 'Payments are not configured yet. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.' },
      { status: 503 }
    );
  }

  try {
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: plan.priceInr * 100,
      currency: 'INR',
      receipt: `brandpulse_${user.id.slice(0, 8)}_${planId}_${Date.now()}`.slice(0, 40),
      notes: {
        userId: user.id,
        planId,
        userEmail: user.email ?? '',
      },
    });

    const { error: insertErr } = await supabase.from('payments').insert({
      user_id: user.id,
      plan_id: planId,
      amount_paise: Number(order.amount),
      currency: order.currency ?? 'INR',
      razorpay_order_id: order.id,
      status: 'created',
    });

    if (insertErr) {
      console.error('[billing] Failed to record pending payment:', insertErr.message);
      return NextResponse.json({ error: 'Could not start checkout' }, { status: 500 });
    }

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      planId,
      planName: plan.name,
      userName: profile?.full_name ?? '',
      userEmail: user.email ?? '',
    });
  } catch (err) {
    console.error('[billing] Order creation failed:', err);
    return NextResponse.json({ error: 'Payment initialization failed' }, { status: 500 });
  }
}
