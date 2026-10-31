'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Show, UserButton } from '@clerk/nextjs';
import { InkButton } from '@/components/ui/InkButton';

// The logo lives in components/brand/Logo; re-exported here so existing imports keep working.
import { BrandMark, Wordmark } from '@/components/brand/Logo';
export { BrandMark, Wordmark };

const NAV_LINKS: [string, string][] = [['Proof', '/#proof'], ['Services', '/#how'], ['FAQ', '/#faq']];

/**
 * The one site nav, on every public page. A floating bar with the five
 * destinations a buyer needs, Log in, and the ink "Free audit" button.
 * `overDark`: the page opens on a night panel, so the nav starts as dark glass
 * and turns light once the reader scrolls past it. Below md the links fold
 * into a menu. `minimal` is accepted for older call sites and ignored.
 */
export function SiteNav({ overDark = false }: { minimal?: boolean; overDark?: boolean }) {
  const pathname = usePathname();
  const [scrollY, setScrollY] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => setOpen(false), [pathname]);

  const dark = overDark && scrollY < 420 && !open;
  const isActive = (href: string) => !href.includes('#') && pathname.startsWith(href);
  const link = dark ? 'text-white/75 hover:bg-white/10 hover:text-white' : 'text-[#413d58] hover:bg-[#efeef6] hover:text-[#120e25]';
  const activeLink = dark ? 'bg-white/10 text-white' : 'bg-[#efeef6] text-[#120e25]';

  return (
    <header className="clarity-nav fixed top-0 left-0 right-0 z-50 flex flex-col items-center px-3 pt-3 print:hidden sm:px-4 sm:pt-5">
      <nav data-tone={dark ? 'dark' : 'light'} aria-label="Main" className="flex w-full items-center justify-between pr-2 pl-5 sm:pl-6">
        <Link href="/" className="no-underline" aria-label="BrandPulse — home">
          <Wordmark size={20} tone={dark ? 'light' : 'color'} />
        </Link>

        <ul className="hidden items-center gap-0.5 lg:flex">
          {NAV_LINKS.map(([label, href]) => (
            <li key={href}>
              <Link href={href} aria-current={isActive(href) ? 'page' : undefined} className={`rounded-[10px] px-3.5 py-2 text-[14px] font-medium no-underline transition-colors duration-150 ${isActive(href) ? activeLink : link}`}>
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1">
          <Show when="signed-out">
            <Link href="/sign-in" className={`hidden rounded-[10px] px-3.5 py-2 text-[14px] font-medium no-underline transition-colors duration-150 sm:inline-block ${link}`}>Log in</Link>
            <InkButton href="/#audit" tone={dark ? 'glass' : 'ink'}>Free audit</InkButton>
          </Show>
          <Show when="signed-in">
            <span className="mr-2"><UserButton /></span>
            <InkButton href="/dashboard" tone={dark ? 'glass' : 'ink'}>Dashboard</InkButton>
          </Show>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
            className={`ml-1 grid size-11 place-items-center rounded-[11px] transition-colors lg:hidden ${dark ? 'text-white hover:bg-white/10' : 'text-[#171425] hover:bg-[#efeef6]'}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-5" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 8h16M4 16h16" />}
            </svg>
          </button>
        </div>
      </nav>

      {open && (
        <div id="site-menu" className="mt-2 w-full max-w-[1240px] rounded-[18px] border border-[#e4e3eb] bg-white p-2 shadow-[0_24px_60px_-30px_rgb(20_25_37/0.45)] lg:hidden">
          <ul>
            {NAV_LINKS.map(([label, href]) => (
              <li key={href}>
                <Link href={href} onClick={() => setOpen(false)} aria-current={isActive(href) ? 'page' : undefined} className="block rounded-[12px] px-4 py-3 text-[16px] font-medium text-[#171425] no-underline hover:bg-[#f3f3f6] aria-[current=page]:bg-[#efeef6]">
                  {label}
                </Link>
              </li>
            ))}
            <Show when="signed-out">
              <li><Link href="/sign-in" onClick={() => setOpen(false)} className="block rounded-[12px] px-4 py-3 text-[16px] font-medium text-[#171425] no-underline hover:bg-[#f3f3f6]">Log in</Link></li>
            </Show>
          </ul>
        </div>
      )}
    </header>
  );
}
