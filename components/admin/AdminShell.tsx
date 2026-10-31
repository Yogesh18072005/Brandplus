'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { UserButton, useClerk } from '@clerk/nextjs';
import { ExternalLink, Globe, LayoutDashboard, LogOut, ShieldCheck } from 'lucide-react';
import { Wordmark } from '@/components/brand/Logo';

/** The founder's shell: same canvas and sidebar as the client dashboard, marked Admin. */
export function AdminShell({ children, homeHref, signInHref, siteUrl, email }: {
  children: ReactNode;
  homeHref: string;
  signInHref: string;
  siteUrl: string;
  email: string | null;
}) {
  const { signOut } = useClerk();
  const outbound = [
    { label: 'Live site', href: siteUrl || '/', icon: <Globe className="size-[18px]" /> },
    { label: 'Customer dashboard', href: `${siteUrl}/dashboard`, icon: <LayoutDashboard className="size-[18px]" /> },
  ];
  return (
    <div className="zw min-h-screen bg-[#eae9ee] font-sans antialiased lg:p-3">
      <div className="mx-auto flex min-h-[calc(100vh-24px)] max-w-[1560px] gap-3 lg:rounded-[30px] lg:bg-[#f4f4f7] lg:p-3">
        <aside className="sticky top-3 hidden h-[calc(100vh-48px)] w-[248px] shrink-0 flex-col rounded-[24px] bg-white p-4 lg:flex">
          <Link href={homeHref} className="flex items-center gap-2 px-2 pt-1 pb-6 no-underline" aria-label="BrandPulse admin">
            <Wordmark size={19} /><span className="rounded-full bg-[#121118] px-2 py-0.5 text-[11px] font-semibold text-white">Admin</span>
          </Link>
          <nav className="flex flex-col gap-1" aria-label="Admin">
            <Link href={homeHref} aria-current="page" className="flex h-11 items-center gap-3 rounded-full bg-[#121118] px-4 text-[14.5px] font-medium text-white! no-underline"><ShieldCheck className="size-[18px]" />Console</Link>
            <p className="mt-6 mb-2 px-4 text-[12px] font-semibold text-[#9c9ab2]">Open</p>
            {outbound.map((o) => (
              <a key={o.label} href={o.href} target="_blank" rel="noreferrer" className="flex h-11 items-center gap-3 rounded-full px-4 text-[14.5px] font-medium text-[#413d58]! no-underline hover:bg-[#f2f1f5]">
                {o.icon}{o.label}<ExternalLink className="ml-auto size-3.5 text-[#9c9ab2]" />
              </a>
            ))}
          </nav>
          <div className="mt-auto rounded-[20px] bg-[#121118] p-5 text-white">
            <p className="text-[12px] font-semibold text-white/55">Founder access</p>
            <p className="mt-1 truncate text-[14px] font-semibold">{email ?? 'Administrator'}</p>
            <button type="button" onClick={() => signOut({ redirectUrl: signInHref })} className="mt-4 inline-flex h-9 items-center gap-2 rounded-full bg-white/10 px-3.5 text-[13px] font-semibold text-white hover:bg-white/15"><LogOut className="size-4" />Sign out</button>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 px-4 pt-4 pb-2 lg:px-3 lg:pt-1">
            <span className="truncate text-[13px] text-[#676480]">{email}</span>
            <span className="grid size-10 place-items-center rounded-full bg-white ring-1 ring-[#e4e3ec]"><UserButton /></span>
          </header>
          <main className="flex-1 px-4 pt-2 pb-8 lg:px-3">{children}</main>
        </div>
      </div>
    </div>
  );
}
