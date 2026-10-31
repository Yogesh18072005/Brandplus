import type { Metadata } from 'next';
import { SignUp } from '@clerk/nextjs';
import { ClerkAuthPage, clerkAppearance } from '@/components/auth/ClerkAuthPage';

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function SignUpPage() {
  return (
    <ClerkAuthPage>
      <SignUp
        appearance={clerkAppearance}
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl="/dashboard/onboarding"
      />
    </ClerkAuthPage>
  );
}
