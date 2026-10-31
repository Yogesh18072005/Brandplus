import { isOpsUser } from '@/lib/auth/ops-access';

/** True when the signed-in Clerk user is on the founder allowlist. Never throws. */
export async function currentViewerIsOps(): Promise<boolean> {
  try {
    const { currentUser } = await import('@clerk/nextjs/server');
    const user = await currentUser();
    return isOpsUser(user?.primaryEmailAddress?.emailAddress ?? null);
  } catch {
    return false;
  }
}
