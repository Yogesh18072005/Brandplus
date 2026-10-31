import type { Metadata } from 'next';
import { Footer } from '@/components/layout/Footer';
import { SiteNav } from '@/components/layout/SiteNav';
import { PageHeader } from '@/components/layout/NightPanel';

export const metadata: Metadata = { title: 'Privacy — BrandPulse' };
export default function PrivacyPage() { return (
    <>
      <SiteNav />
      <PageHeader eyebrow="Privacy" title="How BrandPulse handles your data" />
      <main className="mx-auto max-w-[760px] px-4 pt-16 sm:px-6">
        <div className="space-y-6 rounded-[22px] border border-rule bg-white p-6 text-[16px] leading-[1.75] text-secondary sm:p-10"><p>BrandPulse stores the account, business profile, monitored questions, observed answer-engine responses, citations, reports, actions, billing records and operational events required to provide the service.</p><p>Secret provider credentials remain on the server. Customer data is separated using authenticated ownership checks and PostgreSQL row-level security. Full audit answers are not anonymously readable from the database.</p><p>Payment card details are handled by Razorpay. BrandPulse stores order and payment identifiers, status, amount and entitlement information—not card numbers.</p><p>To prevent repeated free-tier abuse, BrandPulse derives a keyed cryptographic hash from the client network address and stores only that scoped hash with the entitlement decision. Raw network addresses are not stored in the free-entitlement tables, and the hashes are not used for advertising.</p><p>To request access, correction or deletion, use the contact address shown in the site footer. A deployment operator should replace that address and obtain legal review before public launch.</p></div>
      </main>
      <Footer />
    </>
  ); }
