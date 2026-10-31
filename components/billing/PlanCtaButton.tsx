'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { PlanId } from '@/lib/billing/plans';
import { RazorpayCheckoutButton } from '@/components/billing/RazorpayCheckoutButton';

interface PlanCtaButtonProps {
  planId: PlanId;
  label: string;
  highlight?: boolean;
}

export function PlanCtaButton({ planId, label, highlight = false }: PlanCtaButtonProps) {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => {
        if (active) setLoggedIn(Boolean(data.authenticated));
      })
      .catch(() => {
        if (active) setLoggedIn(false);
      });
    return () => { active = false; };
  }, []);

  const secondaryClass =
    'flex h-11 items-center justify-center rounded-full border border-rule text-[13px] font-semibold text-content no-underline transition-all duration-200 hover:border-signal/30 hover:bg-bone';

  if (planId === 'free') {
    return (
      <Link href="/#audit" className={highlight ? 'btn-primary flex h-11 items-center justify-center rounded-full text-[13px] font-semibold no-underline' : secondaryClass}>
        {label}
      </Link>
    );
  }

  if (loggedIn === null) {
    return (
      <span className={`${highlight ? 'btn-primary' : secondaryClass} flex h-11 items-center justify-center opacity-60`}>
        {label}
      </span>
    );
  }

  if (!loggedIn) {
    return (
      <Link
        href={`/sign-up?plan=${planId}`}
        className={highlight ? 'btn-primary flex h-11 items-center justify-center rounded-full text-[13px] font-semibold no-underline' : secondaryClass}
      >
        {label}
      </Link>
    );
  }

  return (
    <RazorpayCheckoutButton
      planId={planId}
      label={label}
      className={
        highlight
          ? 'btn-primary flex h-11 w-full items-center justify-center rounded-full text-[13px] font-semibold disabled:opacity-50'
          : `${secondaryClass} w-full disabled:opacity-50`
      }
    />
  );
}
