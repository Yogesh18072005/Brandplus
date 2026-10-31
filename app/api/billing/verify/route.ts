import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRazorpay, verifyWebhookSignature } from '@/lib/billing/razorpay';
import { activatePlanAfterPayment } from '@/lib/billing/activate-plan';
import { grantTopUpCredits } from '@/lib/billing/credits';
import type { PlanId } from '@/lib/billing/plans';
import { guardMutationRequest } from '@/lib/http/request-security';
import { recordOperationalEvent } from '@/lib/ops/events';

export async function POST(request: Request) {
  const guard = guardMutationRequest(request, { maxBodyBytes: 128 * 1024 });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const body = await request.text();
  const signature = request.headers.get('x-razorpay-signature') ?? '';

  if (!verifyWebhookSignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: {
      payment?: { entity?: Record<string, unknown> };
      order?: { entity?: Record<string, unknown> };
    };
  };

  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventName = event.event;
  if (eventName !== 'payment.captured' && eventName !== 'order.paid' && eventName !== 'payment.refunded') {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const payment = event.payload?.payment?.entity;
  if (!payment || typeof payment !== 'object') {
    return NextResponse.json({ error: 'No payment entity' }, { status: 400 });
  }

  const paymentId = String(payment.id ?? '');
  const orderId = String(payment.order_id ?? '');
  const amountPaise = Number(payment.amount ?? 0);

  if (!paymentId || !orderId) {
    return NextResponse.json({ error: 'Missing payment identifiers' }, { status: 400 });
  }

  const supabase = createAdminClient();
  if (eventName === 'payment.refunded') {
    const { data, error } = await supabase.rpc('record_payment_refund', {
      p_order_id: orderId,
      p_payment_id: paymentId,
    }).single();
    if (error || !data) {
      await recordOperationalEvent({ eventType: 'payment_refund_failed', severity: 'error', metadata: { orderId, error: error?.message ?? 'No refund result' } }, supabase);
      return NextResponse.json({ error: 'Refund reconciliation failed' }, { status: 500 });
    }
    await recordOperationalEvent({
      eventType: 'payment_refunded',
      severity: 'warning',
      metadata: { orderId, product: data.product, entitlementRevoked: data.entitlement_revoked },
    }, supabase);
    return NextResponse.json({ ok: true, refunded: true, entitlementRevoked: data.entitlement_revoked });
  }

  let userId = (payment.notes as Record<string, string> | undefined)?.userId;
  let planId = (payment.notes as Record<string, string> | undefined)?.planId as PlanId | 'topup' | undefined;

  if (!userId || !planId) {
    try {
      const razorpay = getRazorpay();
      const order = await razorpay.orders.fetch(orderId);
      userId = order.notes?.userId as string | undefined;
      planId = order.notes?.planId as PlanId | 'topup' | undefined;
    } catch (err) {
      console.error('[billing/webhook] Failed to fetch order notes:', err);
    }
  }

  if (!userId || !planId || (planId !== 'starter' && planId !== 'pro' && planId !== 'topup')) {
    return NextResponse.json({ error: 'Missing user/plan info on order' }, { status: 400 });
  }

  if (planId === 'topup') {
    const topUp = await grantTopUpCredits(supabase, {
      userId,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
    });
    if (!topUp.ok) return NextResponse.json({ error: topUp.error }, { status: 500 });
    return NextResponse.json({ ok: true, product: 'topup', creditsGranted: topUp.granted, creditsRemaining: topUp.remaining });
  }

  const result = await activatePlanAfterPayment(supabase, {
    userId,
    planId,
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
    amountPaise,
  });

  if (!result.ok) {
    console.error('[billing/webhook] Activation failed:', result.error);
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    plan: result.plan,
    expiresAt: result.expiresAt,
    creditsRemaining: result.creditsRemaining,
  });
}
