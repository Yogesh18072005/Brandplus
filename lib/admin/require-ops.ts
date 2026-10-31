import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { isOpsUser } from '@/lib/auth/ops-access';

/** Admin API guard: a signed-in ops user, or a ready-made error response. */
export async function requireOps(): Promise<{ ok: true; userId: string; email: string } | { ok: false; response: NextResponse }> {
  const user = await currentUser();
  if (!user) return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const email = user.primaryEmailAddress?.emailAddress ?? null;
  if (!email || !isOpsUser(email)) return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { ok: true, userId: user.id, email };
}

/** Audits run for minutes; only a long-lived local server can start one. */
export function canRunLocally(): boolean {
  return !process.env.VERCEL;
}

/** Where local runs keep their pid and output (git-ignored). */
export const RUNS_DIR = '.runs';
