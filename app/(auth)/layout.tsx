import type { ReactNode } from 'react';
import Link from 'next/link';
import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel';
import { Wordmark } from '@/components/layout/SiteNav';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-paper font-sans text-content antialiased lg:grid-cols-2">
      <AuthBrandPanel />

      <main className="flex flex-col justify-center px-6 py-12 lg:px-16">
        <div className="mb-8 lg:hidden">
          <Link href="/" className="no-underline" aria-label="BrandPulse — home">
            <Wordmark />
          </Link>
        </div>
        <div className="mx-auto w-full max-w-[400px]">{children}</div>
      </main>
    </div>
  );
}
