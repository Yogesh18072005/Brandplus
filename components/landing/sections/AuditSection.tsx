import { SectionHeader } from '@/components/landing/SectionHeader';
import { AuditForm } from '@/components/landing/AuditForm';

import { FREE_AUDIT_PERKS_LINE, PAID_AUDIT_PERKS_LINE } from '@/lib/marketing/prompt-counts';

const perks = [
  FREE_AUDIT_PERKS_LINE,
  PAID_AUDIT_PERKS_LINE,
  'Recorded answer evidence and citations',
  'Observed presence against tracked competitors',
];

export function AuditSection() {
  return (
    <section id="audit" className="bg-white py-28 lg:py-44">
      <div className="relative mx-auto max-w-[1320px] px-5 sm:px-7">
        <div className="grid overflow-hidden rounded-[2.4rem] border border-[#d6d6f0] bg-[#f1f0fe] shadow-[0_32px_100px_-58px_rgba(34,24,85,0.4)] lg:grid-cols-[0.95fr_1.05fr]">
          <div className="p-8 sm:p-12 lg:p-16">
            <SectionHeader
              align="left"
              eyebrow="Free audit"
              title="See whether AI recommends your business."
              description="No account. No card. Report emailed when your audit is processed."
            />
            <ul className="mt-10 space-y-4">
              {perks.map((perk) => (
                <li
                  key={perk}
                  className="flex items-start gap-3"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-presence/15">
                    <svg className="h-3 w-3 text-presence" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M3.5 8.5 6.5 11.5 12.5 5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="text-[14px] leading-snug text-secondary">{perk}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-[#d6d6f0] bg-white p-7 sm:p-12 lg:border-l lg:border-t-0 lg:p-16">
            <AuditForm />
          </div>
        </div>
      </div>
    </section>
  );
}
