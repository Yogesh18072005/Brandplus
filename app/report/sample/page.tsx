import type { Metadata } from 'next';
import { SimpleReport } from '@/components/report/simple/SimpleReport';
import { InkButton } from '@/components/ui/InkButton';
import { SAMPLE_REPORT } from '@/lib/marketing/sample-report';

export const metadata: Metadata = {
  title: 'Sample AI visibility report | BrandPulse',
  description: 'A real BrandPulse report: eight buyer questions asked to Gemini, every answer word for word, and who AI named instead.',
};

export default function SampleReportPage() {
  return (
    <SimpleReport
      model={SAMPLE_REPORT}
      mode="public"
      sample
      cta={
        <section className="sr-card sr-cta-sample">
          <p className="sr-label">Your turn</p>
          <h2>This was one startup. Yours takes a day.</h2>
          <p className="sr-sub">Same questions your buyers ask, the real answers word for word, and who AI names instead of you. Free.</p>
          <InkButton href="/#audit" className="mt-5">Get my free audit</InkButton>
        </section>
      }
    />
  );
}
