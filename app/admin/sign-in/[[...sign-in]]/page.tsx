import { SignIn } from '@clerk/nextjs';
import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Wordmark } from '@/components/brand/Logo';
import { clerkAppearance } from '@/components/auth/ClerkAuthPage';
import { isOpsUser } from '@/lib/auth/ops-access';
import { adminHref } from '@/lib/admin/host';
import { mainSiteUrl, servedOnAdminHost } from '@/lib/admin/request-host';

export default async function AdminSignInPage() {
  const onAdminHost = await servedOnAdminHost();
  const homeHref = adminHref('/', onAdminHost);
  const user = await currentUser();
  if (user) {
    const email = user.primaryEmailAddress?.emailAddress;
    redirect(isOpsUser(email) ? homeHref : mainSiteUrl('/dashboard'));
  }

  // Admin sign-in is email only: no social buttons, no sign-up link, and no
  // second heading (the card has its own). Style objects, not utility classes:
  // Clerk's injected styles outrank layered Tailwind utilities like `hidden`.
  const hide = { display: 'none' } as const;
  const appearance = {
    ...clerkAppearance,
    elements: {
      ...clerkAppearance.elements,
      header: hide,
      socialButtons: hide,
      socialButtonsBlockButton: hide,
      socialButtonsIconButton: hide,
      dividerRow: hide,
      footerAction: hide,
    },
  } as const;

  return (
    <main className="zw zw-signin">
      <div className="zw-signin-arc zw-signin-arc-a" aria-hidden="true" />
      <div className="zw-signin-arc zw-signin-arc-b" aria-hidden="true" />
      <section className="zw-signin-card">
        <div className="zw-signin-head">
          <a href={mainSiteUrl('/')} aria-label="BrandPulse home"><Wordmark size={19} /></a>
          <span className="zw-admin-pill">Admin</span>
        </div>
        <h1>Operations sign in</h1>
        <p>For the BrandPulse team only. Other accounts are sent to the customer dashboard.</p>
        <div className="zw-signin-clerk">
          <SignIn appearance={appearance} routing="path" path={adminHref('/sign-in', onAdminHost)} forceRedirectUrl={homeHref} />
        </div>
      </section>
    </main>
  );
}
