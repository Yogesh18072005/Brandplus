'use client';

import { useState, type FormEvent } from 'react';
import { InkButton } from '@/components/ui/InkButton';

// Every audit needs an account. The landing form collects the business, keeps
// it in this browser, and sends the visitor to sign up; onboarding picks it up
// so nobody types their business twice.

export const ONBOARDING_PREFILL_KEY = 'zc_onboarding_prefill';

export interface OnboardingPrefill {
  businessName: string;
  website: string;
  category: string;
  city: string;
  competitors: string[];
}

function FormField({
  label,
  name,
  required = false,
  optional = false,
  placeholder,
  help,
  inputMode,
  maxLength,
  defaultValue,
}: {
  label: string;
  name: string;
  required?: boolean;
  optional?: boolean;
  placeholder?: string;
  help?: string;
  inputMode?: 'url' | 'text';
  maxLength?: number;
  defaultValue?: string;
}) {
  const id = `field-${name}`;
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-medium text-secondary">
        {label}
        {optional && <span className="text-muted"> (optional)</span>}
      </label>
      <input
        id={id}
        name={name}
        type="text"
        required={required}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        defaultValue={defaultValue}
        className="mt-2 block h-11 w-full rounded-xl border border-rule bg-surface-overlay/50 px-4 text-[14px] text-content placeholder:text-muted transition-colors focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
      />
      {help && <p className="mt-1.5 text-[12px] text-muted">{help}</p>}
    </div>
  );
}

export function AuditForm({ businessName = '', website = '' }: { businessName?: string; website?: string }) {
  const [sending, setSending] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const text = (key: string, max: number) => String(fd.get(key) ?? '').trim().slice(0, max);
    const prefill: OnboardingPrefill = {
      businessName: text('businessName', 80),
      website: text('website', 120),
      category: text('category', 60),
      city: text('city', 60),
      competitors: text('competitors', 240).split(',').map((item) => item.trim()).filter(Boolean).slice(0, 3),
    };
    setSending(true);
    try {
      localStorage.setItem(ONBOARDING_PREFILL_KEY, JSON.stringify(prefill));
    } catch {
      // Storage unavailable: onboarding simply starts empty.
    }
    window.location.href = '/sign-up';
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" aria-label="Start your free AI visibility audit">
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField key={businessName} label="Business name" name="businessName" required placeholder="Your business name" maxLength={80} defaultValue={businessName} />
        <FormField key={`w-${website}`} label="Website" name="website" required placeholder="yourbusiness.com" inputMode="url" maxLength={120} defaultValue={website} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Category" name="category" required placeholder="e.g. dental clinic, CRM software" maxLength={60} />
        <FormField label="Location" name="city" required placeholder="e.g. Delhi, London, or worldwide" maxLength={60} />
      </div>
      <FormField
        label="Competitors"
        name="competitors"
        optional
        placeholder="The 2–3 rivals you lose deals to"
        help="Up to 3 competitor names, comma-separated."
        maxLength={240}
      />

      <InkButton type="submit" size="lg" disabled={sending} className="mt-2 w-full">
        {sending ? 'One moment…' : 'Create my free account'}
      </InkButton>
      <p className="text-center text-[12px] text-muted">Free account, one free audit. Report in your inbox within one working day. No card.</p>
    </form>
  );
}
