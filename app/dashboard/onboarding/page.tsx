import { BusinessSetup } from '@/components/dashboard/BusinessSetup';

/** First visit: set up the business and request the free audit. */
export default function OnboardingPage() {
  return <BusinessSetup mode="first" />;
}
