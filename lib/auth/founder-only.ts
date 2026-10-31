import { NextResponse } from 'next/server';
import { isOpsUser } from '@/lib/auth/ops-access';

/**
 * Engine and fix-plan routes are founder tooling. Clients read their report
 * (server-rendered) and ask us for the fix plan; they never run engines, which
 * spend money, or read the fixes, which are what we sell.
 */
export function founderOnly(email: string | null | undefined): NextResponse | null {
  return isOpsUser(email) ? null : NextResponse.json({ error: 'This is handled by the BrandPulse team.' }, { status: 403 });
}
