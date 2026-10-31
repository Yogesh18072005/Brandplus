import { TalkToUs } from '@/components/dashboard/TalkToUs';

/**
 * The end of every simple report: the fix plan is offered, not printed. On a
 * shared link (reportId) the reader leaves an email; in the dashboard
 * (projectId) the signed-in client's request goes straight to us.
 */
export function FixPlanOffer({ businessName, gaps, total, reportId, projectId }: {
  businessName: string;
  gaps: number;
  total: number;
  reportId?: string;
  projectId?: string;
}) {
  return (
    <TalkToUs
      topic="fixes"
      reportId={reportId}
      projectId={projectId}
      eyebrow="Your fix plan"
      title={gaps > 0 ? `You’re missing from ${gaps} of ${total} answers. That’s fixable.` : 'Want to stay ahead?'}
      body={<p>On a free 15-minute call we walk you through this report and hand you your fix plan: the exact pages to publish and where to get listed, in order, so AI starts naming {businessName}. Keep the plan whether or not you hire us to do the work.</p>}
      points={['Which pages to add or change, most important first', 'The buyer questions each page answers', 'Where to get listed so AI trusts you']}
      cta="Get my fix plan"
      bookingFirst="Book my free 15-min walkthrough"
    />
  );
}
