'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/** Clients have one page per business; engine sub-pages send them back to it. */
export function ClientRouteGuard({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/dashboard/projects/${projectId}`;
  useEffect(() => {
    if (pathname !== base) router.replace(base);
  }, [pathname, base, router]);
  return null;
}
