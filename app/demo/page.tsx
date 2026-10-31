import { ClientDashboard } from '@/components/dashboard/ClientDashboard';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { SAMPLE_REPORT } from '@/lib/marketing/sample-report';

export const metadata = { title: 'Example dashboard | BrandPulse', robots: { index: false, follow: false } };

/** The client dashboard with a real audit (name hidden), for prospects and previews. */
export default function DemoPage() {
  return (
    <DashboardShell userEmail="Example: a real audit, name hidden">
      <ClientDashboard
        demo
        greeting="Hello"
        name="there"
        planLine="Example data"
        businesses={[{ id: 'sample', name: 'The startup we audited', website: '', category: 'privacy-friendly analytics', city: 'worldwide', stage: 'ready', reportId: null, report: SAMPLE_REPORT, recheckOpen: false, history: [] }]}
      />
    </DashboardShell>
  );
}
