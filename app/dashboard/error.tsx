'use client';

import { Button } from '@/components/ui/Button';

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-[520px] flex-col items-center justify-center text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-absence/10 font-mono text-[18px] font-semibold text-absence">!</span>
      <h1 className="mt-6 font-display text-[28px] font-semibold text-content">The dashboard could not load</h1>
      <p className="mt-3 max-w-[48ch] text-[14px] leading-relaxed text-secondary">
        Your data is safe. The connection to the workspace failed before this page could finish loading.
      </p>
      <Button onClick={reset} className="mt-7">Try again</Button>
    </div>
  );
}
