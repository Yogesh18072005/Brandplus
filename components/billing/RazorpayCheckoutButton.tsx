'use client';

import type { PlanId } from '@/lib/billing/plans';
import { useRazorpayCheckout } from '@/lib/billing/useRazorpayCheckout';

interface RazorpayCheckoutButtonProps {
  planId: PlanId;
  label?: string;
  disabled?: boolean;
  className?: string;
  onSuccess?: (result: { plan: PlanId; expiresAt: string }) => void;
}

export function RazorpayCheckoutButton({
  planId,
  label,
  disabled = false,
  className = 'btn-primary inline-flex h-11 items-center justify-center rounded-full px-6 text-[14px] font-semibold disabled:opacity-50',
  onSuccess,
}: RazorpayCheckoutButtonProps) {
  const { startCheckout, loadingPlan } = useRazorpayCheckout({ onSuccess });

  if (planId === 'free') return null;

  const isLoading = loadingPlan === planId;

  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      onClick={() => startCheckout(planId)}
      className={className}
    >
      {isLoading ? 'Opening checkout…' : (label ?? 'Pay now')}
    </button>
  );
}
