'use client';

import type { ReactNode } from 'react';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, CreditCard, HelpCircle, LayoutGrid, Plus, Settings } from 'lucide-react';
import { Wordmark } from '@/components/brand/Logo';

/*
 * The signed-in shell, after the dashboard references (Fenco, iDraft): a soft
 * grey canvas, a white rounded sidebar with black-pill active state, a dark
 * "want us to fix it?" card at the foot, and a light top bar with one black
 * primary action. Mobile gets a bottom dock.
 */

const NAV = [
  { label: 'Overview', href: '/dashboard', icon: <LayoutGrid className="size-[18px]" /> },
  { label: 'Businesses', href: '/dashboard/projects', icon: <Building2 className="size-[18px]" /> },
] as const;
const ACCOUNT = [
  { label: 'Plan', href: '/dashboard/billing', icon: <CreditCard className="size-[18px]" /> },
  { label: 'Settings', href: '/dashboard/settings', icon: <Settings className="size-[18px]" /> },
] as const;

/** Kept for /demo and older imports. */
export function NavIcon({ type }: { type: 'home' | 'business' | 'billing' | 'settings' }) {
  const map = { home: <LayoutGrid className="size-[18px]" />, business: <Building2 className="size-[18px]" />, billing: <CreditCard className="size-[18px]" />, settings: <Settings className="size-[18px]" /> };
  return map[type];
}

export function WorkspaceBrand() {
  return <span className="inline-flex"><Wordmark size={19} /></span>;
}

/** The sidebar's standing offer, styled like the references' dark upsell card. */
export function DoneForYouCard() {
  return (
    <div className="relative overflow-hidden rounded-[20px] bg-[#121118] p-5 text-white">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(80%_60%_at_100%_0%,rgb(40_116_225/0.45),transparent)]" />
      <div className="relative">
        <p className="text-[15px] font-semibold tracking-[-0.01em]">Want us to fix it?</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-white/65">We write, publish and re-check the pages your audit says are missing.</p>
        <Link href="/sprint" className="mt-4 inline-flex h-9 items-center rounded-full bg-white px-4 text-[13px] font-semibold text-[#121118]! no-underline hover:bg-[#f2f0fe]">See how it works</Link>
      </div>
    </div>
  );
}

function NavLink({ href, label, icon, active }: { href: string; label: string; icon: ReactNode; active: boolean }) {
  return (
    <Link href={href} aria-current={active ? 'page' : undefined}
      className={`flex h-11 items-center gap-3 rounded-full px-4 text-[14.5px] font-medium no-underline transition-colors ${active ? 'bg-[#121118] text-white!' : 'text-[#413d58]! hover:bg-[#f2f1f5]'}`}>
      {icon}{label}
    </Link>
  );
}

export function DashboardShell({ children, userEmail }: { children: ReactNode; userEmail: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/dashboard' ? pathname === href : pathname.startsWith(href));

  return (
    <div className="zw min-h-screen bg-[#eae9ee] p-0 font-sans antialiased lg:p-3">
      <div className="mx-auto flex min-h-[calc(100vh-24px)] max-w-[1480px] gap-3 lg:rounded-[30px] lg:bg-[#f4f4f7] lg:p-3">
        <aside className="sticky top-3 hidden h-[calc(100vh-48px)] w-[248px] shrink-0 flex-col rounded-[24px] bg-white p-4 lg:flex">
          <Link href="/dashboard" aria-label="BrandPulse overview" className="px-2 pt-1 pb-6 no-underline"><WorkspaceBrand /></Link>
          <nav aria-label="Workspace" className="flex flex-col gap-1">
            {NAV.map((item) => <NavLink key={item.href} {...item} active={isActive(item.href)} />)}
            <p className="mt-6 mb-2 px-4 text-[12px] font-semibold text-[#9c9ab2]">Account</p>
            {ACCOUNT.map((item) => <NavLink key={item.href} {...item} active={isActive(item.href)} />)}
          </nav>
          <div className="mt-auto"><DoneForYouCard /></div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 px-4 pt-4 pb-2 lg:px-3 lg:pt-1">
            <Link href="/dashboard" className="no-underline lg:hidden" aria-label="BrandPulse overview"><WorkspaceBrand /></Link>
            <span className="hidden truncate text-[13px] text-[#676480] lg:block">{userEmail}</span>
            <div className="flex items-center gap-2">
              <Link href="/dashboard/projects/new" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#121118] px-4 text-[13.5px] font-semibold text-white! no-underline hover:bg-[#282633]"><Plus className="size-4" /><span className="hidden sm:inline">Add business</span></Link>
              <Link href="/sprint" aria-label="How it works" className="grid size-10 place-items-center rounded-full bg-white text-[#413d58]! ring-1 ring-[#e4e3ec] hover:bg-[#f6f6f9]"><HelpCircle className="size-[18px]" /></Link>
              <span className="grid size-10 place-items-center rounded-full bg-white ring-1 ring-[#e4e3ec]"><UserButton /></span>
            </div>
          </header>
          <main className="flex-1 px-4 pt-2 pb-28 lg:px-3 lg:pb-6">{children}</main>
        </div>
      </div>

      <nav aria-label="Workspace" className="fixed inset-x-3 bottom-3 z-40 flex justify-around rounded-[22px] bg-white/95 p-2 shadow-[0_20px_40px_-20px_rgb(17_19_24/0.5)] ring-1 ring-[#e4e3ec] backdrop-blur lg:hidden">
        {[...NAV, ...ACCOUNT].map((item) => (
          <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? 'page' : undefined}
            className={`flex flex-1 flex-col items-center gap-1 rounded-[14px] py-2 text-[11.5px] font-semibold no-underline ${isActive(item.href) ? 'bg-[#121118] text-white!' : 'text-[#5b567a]!'}`}>
            {item.icon}{item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
