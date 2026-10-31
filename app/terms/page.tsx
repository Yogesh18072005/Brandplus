import type { Metadata } from 'next';
import { Footer } from '@/components/layout/Footer';
import { SiteNav } from '@/components/layout/SiteNav';
import { PageHeader } from '@/components/layout/NightPanel';

export const metadata: Metadata = { title: 'Terms — BrandPulse' };
export default function TermsPage() { return (
    <>
      <SiteNav />
      <PageHeader eyebrow="Terms" title="Service terms" />
      <main className="mx-auto max-w-[760px] px-4 pt-16 sm:px-6">
        <div className="space-y-6 rounded-[22px] border border-rule bg-white p-6 text-[16px] leading-[1.75] text-secondary sm:p-10"><p>BrandPulse measures observed responses from supported AI answer engines at specific times. Results can vary and do not guarantee rankings, mentions, traffic, leads or revenue.</p><p>Customers are responsible for the accuracy of submitted business information and for reviewing recommendations before implementation. Do not submit information you are not authorized to process.</p><p>Free access is limited to one public audit per email and no more than two free entitlements per network across account credits and public audit requests combined. Accounts may remain usable after the limit is reached, but no additional free credit is issued. Attempts to bypass these limits may be blocked.</p><p>Paid plans currently provide a fixed access period and audit credits as displayed at checkout. Production terms covering refunds, taxes, governing law and support commitments require legal review before public launch.</p></div>
      </main>
      <Footer />
    </>
  ); }
