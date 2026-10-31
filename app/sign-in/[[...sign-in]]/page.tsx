import type { Metadata } from 'next';
import { SignIn } from '@clerk/nextjs';
import { ClerkAuthPage, clerkAppearance } from '@/components/auth/ClerkAuthPage';

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function SignInPage() {
  return (
    <ClerkAuthPage>
      <SignIn
        appearance={clerkAppearance}
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        forceRedirectUrl="/dashboard"
      />
    </ClerkAuthPage>
  );
}
