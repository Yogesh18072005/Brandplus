import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { AdminShell } from '@/components/admin/AdminShell';
import { AdminConsole } from '@/components/admin/AdminConsole';
import { loadAdminConsole } from '@/lib/admin/load-console';
import { isOpsUser } from '@/lib/auth/ops-access';
import { adminHref } from '@/lib/admin/host';
import { mainSiteUrl, servedOnAdminHost } from '@/lib/admin/request-host';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const onAdminHost = await servedOnAdminHost();
  const signInHref = adminHref('/sign-in', onAdminHost);
  const clerkUser = await currentUser();
  if (!clerkUser) redirect(signInHref);
  const email = clerkUser.primaryEmailAddress?.emailAddress ?? null;
  if (!isOpsUser(email)) redirect(mainSiteUrl('/dashboard'));

  return (
    <AdminShell homeHref={adminHref('/', onAdminHost)} signInHref={signInHref} siteUrl={mainSiteUrl('')} email={email}>
      <AdminConsole data={await loadAdminConsole()} />
    </AdminShell>
  );
}
