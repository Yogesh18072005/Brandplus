'use client';

import { useCallback, useRef, useState } from 'react';
import type { PlanId } from '@/lib/billing/plans';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: () => void) => void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Browser only'));
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout'));
    document.body.appendChild(script);
  });

  return scriptPromise;
}

interface CheckoutSuccess {
  plan: PlanId;
  expiresAt: string;
}

interface UseRazorpayCheckoutOptions {
  onSuccess?: (result: CheckoutSuccess) => void;
  onError?: (message: string) => void;
}

export function useRazorpayCheckout(options: UseRazorpayCheckoutOptions = {}) {
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const onSuccessRef = useRef(options.onSuccess);
  const onErrorRef = useRef(options.onError);
  onSuccessRef.current = options.onSuccess;
  onErrorRef.current = options.onError;

  const startCheckout = useCallback(async (planId: PlanId) => {
    if (planId === 'free') return;

    setLoadingPlan(planId);
    onErrorRef.current?.('');

    try {
      await loadRazorpayScript();

      const orderRes = await fetch('/api/billing/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Could not start checkout');
      }

      if (!window.Razorpay) {
        throw new Error('Razorpay failed to initialize');
      }

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay!({
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'BrandPulse',
          description: `${orderData.planName} plan — 30 days`,
          order_id: orderData.orderId,
          prefill: {
            name: orderData.userName || undefined,
            email: orderData.userEmail || undefined,
          },
          theme: { color: '#553BF3' },
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled')),
          },
          handler: async (response: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) => {
            try {
              const confirmRes = await fetch('/api/billing/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                  planId,
                }),
              });
              const confirmData = await confirmRes.json();
              if (!confirmRes.ok) {
                throw new Error(confirmData.error || 'Payment confirmation failed');
              }
              onSuccessRef.current?.({
                plan: confirmData.plan as PlanId,
                expiresAt: confirmData.expiresAt as string,
              });
              resolve();
            } catch (err) {
              reject(err instanceof Error ? err : new Error('Payment confirmation failed'));
            }
          },
        });

        rzp.on('payment.failed', () => {
          reject(new Error('Payment failed. Try again or use a different method.'));
        });

        rzp.open();
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Checkout failed';
      if (message !== 'Payment cancelled') {
        onErrorRef.current?.(message);
      }
    } finally {
      setLoadingPlan(null);
    }
  }, []);

  return { startCheckout, loadingPlan, isLoading: loadingPlan !== null };
}
