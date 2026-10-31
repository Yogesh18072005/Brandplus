import Link from 'next/link';
import type { ReactNode } from 'react';
import { Wordmark } from '@/components/brand/Logo';
import { NightPanel } from '@/components/layout/NightPanel';
import { FREE_PROMPT_COUNT } from '@/lib/marketing/prompt-counts';

/*
 * Sign in and sign up. The night panel on the left carries the promise (the
 * same sky as the homepage hero); the form sits on light paper on the right.
 * Clerk's own form is themed to the site: ink primary button, 11px radius,
 * Inter, cool hairlines.
 */

export const clerkAppearance = {
  variables: {
    colorPrimary: '#0e0b19', colorPrimaryForeground: '#ffffff', colorBackground: '#ffffff',
    colorForeground: '#171425', colorMutedForeground: '#524f6d', colorInput: '#ffffff',
    colorInputForeground: '#171425', colorBorder: '#e4e3eb', colorRing: '#463eda',
    borderRadius: '0.7rem', fontFamily: 'var(--font-inter), sans-serif', fontSize: '15px',
  },
  elements: {
    rootBox: 'auth-clerk-root', cardBox: 'auth-clerk-box', card: 'auth-clerk-card',
    headerTitle: 'auth-clerk-title', headerSubtitle: 'auth-clerk-subtitle',
    formFieldInput: 'auth-clerk-input', formButtonPrimary: 'auth-clerk-button',
    socialButtonsBlockButton: 'auth-clerk-social', footer: 'auth-clerk-footer',
    formFieldLabel: 'auth-clerk-label', footerActionLink: 'auth-clerk-link',
  },
} as const;

const PROMISES = [
  `${FREE_PROMPT_COUNT} real buyer questions, asked to AI for you`,
  'Who it recommends instead of you, quoted word for word',
  'The sites it trusts, and the first thing to fix',
];

export function ClerkAuthPage({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-dvh bg-bone p-2 font-sans antialiased lg:grid-cols-[1.05fr_1fr]">
      <NightPanel as="aside" rim={150} mark={false} className="hidden flex-col justify-between p-10 lg:flex xl:p-14">
        <Link href="/" aria-label="BrandPulse home" className="relative z-10 w-fit no-underline"><Wordmark size={20} tone="light" /></Link>
        <div className="relative z-10 max-w-[30em] pb-40">
          <h1 className="text-[clamp(36px,3.6vw,54px)] leading-[1.03] font-semibold tracking-[-0.045em] text-balance text-white">
            See who AI recommends <span className="bg-linear-to-b from-[#e8e6fe] to-[#948df9] bg-clip-text text-transparent">instead of you.</span>
          </h1>
          <ul className="mt-8 space-y-3.5">
            {PROMISES.map((p) => (
              <li key={p} className="flex gap-3 text-[15.5px] text-white/80">
                <span aria-hidden="true" className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-white/10 text-[11px] font-bold text-[#9c9bfa]">✓</span>
                {p}
              </li>
            ))}
          </ul>
          <Link href="/demo" className="mt-10 inline-block text-[14.5px] font-semibold text-white/85 no-underline hover:text-white">See an example dashboard →</Link>
        </div>
      </NightPanel>

      <section className="flex min-h-[calc(100dvh-16px)] flex-col px-4 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="BrandPulse home" className="no-underline lg:hidden"><Wordmark size={19} /></Link>
          <Link href="/" className="ml-auto rounded-[10px] px-3 py-2 text-[14px] font-medium text-secondary no-underline hover:bg-white hover:text-content">← Back to website</Link>
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-tertiary">
          <span>Free account, one free audit. No card.</span>
          <nav aria-label="Legal" className="flex gap-4"><Link href="/privacy" className="text-tertiary no-underline hover:text-content">Privacy</Link><Link href="/terms" className="text-tertiary no-underline hover:text-content">Terms</Link></nav>
        </footer>
      </section>
    </main>
  );
}
