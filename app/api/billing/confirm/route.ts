import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { verifyPaymentSignature } from '@/lib/billing/razorpay';
import { activatePlanAfterPayment } from '@/lib/billing/activate-plan';
import { grantTopUpCredits } from '@/lib/billing/credits';
import type { PlanId } from '@/lib/billing/plans';
import { guardMutationRequest } from '@/lib/http/request-security';
import { consumeRateLimit, RATE_LIMITS, rateLimitError } from '@/lib/security/rate-limit';

interface ConfirmBody {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  planId?: PlanId | 'topup';
}

export async function POST(request: Request) {
  const guard = guardMutationRequest(request, { json: true });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimit = await consumeRateLimit(request, RATE_LIMITS.billing, user.id);
  if (!rateLimit.allowed) return rateLimitError(rateLimit, 'Too many payment confirmations. Try again shortly.');

  let body: ConfirmBody;
  try {
    body = (await request.json()) as ConfirmBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const orderId = body.razorpay_order_id?.trim();
  const paymentId = body.razorpay_payment_id?.trim();
  const signature = body.razorpay_signature?.trim();
  const planId = body.planId;

  if (!orderId || !paymentId || !signature || !planId) {
    return NextResponse.json({ error: 'Missing payment confirmation fields' }, { status: 400 });
  }

  if (planId !== 'starter' && planId !== 'pro' && planId !== 'topup') {
    return NextResponse.json({ error: 'Invalid product' }, { status: 400 });
  }

  if (!verifyPaymentSignature(orderId, paymentId, signature)) {
    return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
  }

  // Top-up: grant audit credits instead of changing the plan.
  if (planId === 'topup') {
    const admin = createAdminClient();
    const result = await grantTopUpCredits(admin, {
      userId: user.id,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({
      ok: true,
      creditsRemaining: result.remaining,
      message: `${result.granted} audit credits added.`,
    });
  }

  const { data: paymentRow } = await supabase
    .from('payments')
    .select('id, user_id, plan_id, amount_paise, status')
    .eq('razorpay_order_id', orderId)
    .eq('user_id', user.id)
    .single();

  if (!paymentRow) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (paymentRow.plan_id !== planId) {
    return NextResponse.json({ error: 'Plan mismatch for this order' }, { status: 400 });
  }

  const admin = createAdminClient();
  const result = await activatePlanAfterPayment(admin, {
    userId: user.id,
    planId,
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
    amountPaise: paymentRow.amount_paise,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    plan: result.plan,
    expiresAt: result.expiresAt,
    creditsRemaining: result.creditsRemaining,
    message: `${planId === 'pro' ? 'Pro' : 'Starter'} plan activated.`,
  });
}
