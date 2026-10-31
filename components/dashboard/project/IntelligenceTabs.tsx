'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { label: 'Overview', href: '', matches: [''] },
  { label: 'Buyer questions', href: '/questions', matches: ['/questions'] },
  { label: 'Evidence', href: '/observations', matches: ['/observations', '/diagnosis'] },
  { label: 'Fix plan', href: '/interventions', matches: ['/interventions', '/executions', '/actions'] },
  { label: 'Activity', href: '/runs', matches: ['/runs'] },
] as const;

export function IntelligenceTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/projects/${projectId}`;

  return (
    <nav className="project-tabs" aria-label="Business workspace">
      {TABS.map((tab) => {
        const href = `${base}${tab.href}`;
        const active = tab.matches.some((suffix) => suffix === '' ? pathname === base : pathname.startsWith(`${base}${suffix}`));
        return <Link key={tab.label} href={href} aria-current={active ? 'page' : undefined}>{tab.label}</Link>;
      })}
    </nav>
  );
}
