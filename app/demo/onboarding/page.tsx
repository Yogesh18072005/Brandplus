import { BusinessSetup } from '@/components/dashboard/BusinessSetup';

export const metadata = { title: 'Onboarding preview | BrandPulse', robots: { index: false, follow: false } };

/** The real onboarding flow in preview mode: nothing is saved or requested. */
export default function OnboardingPreviewPage() {
  return (
    <div className="zw min-h-screen bg-[#f6f6fb] p-3 sm:p-4">
      <BusinessSetup mode="preview" />
    </div>
  );
}
