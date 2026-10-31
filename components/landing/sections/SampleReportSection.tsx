'use client';

import { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  EChartsBarChart,
  type ChartConfig,
} from '@/components/evilcharts/charts/echarts-bar-chart';
import { EChartsSankeyChart } from '@/components/evilcharts/charts/echarts-sankey-chart';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const questionDemos = [
  {
    label: 'Best for growing teams',
    question: 'Which analytics partner is best for a growing retail team?',
    answer:
      'The category leader offers broad coverage. Your brand is also recommended for teams that value transparent reporting and faster onboarding.',
    status: 'Your brand mentioned',
    sources: ['forbes.com', 'g2.com', 'yourbrand.com'],
  },
  {
    label: 'Compare the shortlist',
    question: 'Compare the leading options by support, proof, and time to value.',
    answer:
      'The strongest shortlist includes the category leader for scale, your brand for reporting clarity, and the closest rival for specialist support.',
    status: '3 brands compared',
    sources: ['g2.com', 'industryweek.com', 'yourbrand.com'],
  },
  {
    label: 'Find the proof gap',
    question: 'What evidence should buyers check before choosing a provider?',
    answer:
      'Buyers should look for recent case studies, clear service coverage, third-party validation, and proof tied to measurable customer outcomes.',
    status: 'Proof gap detected',
    sources: ['forbes.com', 'capterra.com', 'industryweek.com'],
  },
];

const questionMixData = [
  { intent: 'Best', questions: 10 },
  { intent: 'Compare', questions: 7 },
  { intent: 'Proof', questions: 4 },
  { intent: 'Cost', questions: 6 },
  { intent: 'Fit', questions: 8 },
  { intent: 'Risk', questions: 5 },
];

const questionMixConfig = {
  questions: {
    label: 'Buyer questions',
    colors: {
      light: ['#221855', '#3b2be9', '#747bf8'],
      dark: ['#e0e0fd', '#747bf8', '#3b2be9'],
    },
  },
} satisfies ChartConfig;

const recommendationFlowData = {
  nodes: [
    { name: 'Discover' },
    { name: 'Compare' },
    { name: 'Validate' },
    { name: 'Recorded' },
    { name: 'Brand' },
    { name: 'Leader' },
    { name: 'Rival' },
  ],
  links: [
    { source: 0, target: 3, value: 14 },
    { source: 1, target: 3, value: 12 },
    { source: 2, target: 3, value: 14 },
    { source: 3, target: 4, value: 11 },
    { source: 3, target: 5, value: 17 },
    { source: 3, target: 6, value: 12 },
  ],
};

const recommendationFlowConfig = {
  Discover: { label: 'Discovery', colors: { light: ['#b2b6fb'], dark: ['#747bf8'] } },
  Compare: { label: 'Comparison', colors: { light: ['#8389f2'], dark: ['#6e75ea'] } },
  Validate: { label: 'Validation', colors: { light: ['#5659d8'], dark: ['#5659d8'] } },
  Recorded: { label: 'Recorded answer', colors: { light: ['#3b2be9'], dark: ['#5145ec'] } },
  Brand: { label: 'Your brand', colors: { light: ['#2616c8'], dark: ['#5d54ea'] } },
  Leader: { label: 'Category leader', colors: { light: ['#221855'], dark: ['#d0cef5'] } },
  Rival: { label: 'Closest rival', colors: { light: ['#525280'], dark: ['#8e8dbd'] } },
} satisfies ChartConfig;

const actionFlowData = {
  nodes: [
    { name: 'Owned' },
    { name: 'ThirdParty' },
    { name: 'Editorial' },
    { name: 'Gaps' },
    { name: 'AddProof' },
    { name: 'PublishComparison' },
    { name: 'EarnCitation' },
  ],
  links: [
    { source: 0, target: 3, value: 19 },
    { source: 1, target: 3, value: 13 },
    { source: 2, target: 3, value: 8 },
    { source: 3, target: 4, value: 15 },
    { source: 3, target: 5, value: 14 },
    { source: 3, target: 6, value: 11 },
  ],
};

const actionFlowConfig = {
  Owned: { label: 'Owned pages', colors: { light: ['#caccfc'], dark: ['#848af2'] } },
  ThirdParty: { label: 'Third-party', colors: { light: ['#a9adfa'], dark: ['#747bf8'] } },
  Editorial: { label: 'Editorial proof', colors: { light: ['#8b90f2'], dark: ['#5d61df'] } },
  Gaps: { label: 'Evidence gaps', colors: { light: ['#6d6fec'], dark: ['#5145ec'] } },
  AddProof: { label: 'Add proof', colors: { light: ['#8d92f2'], dark: ['#5f56e6'] } },
  PublishComparison: { label: 'Publish compare', colors: { light: ['#a1a5f6'], dark: ['#7572ca'] } },
  EarnCitation: { label: 'Earn citation', colors: { light: ['#b7bbf9'], dark: ['#d0cef5'] } },
} satisfies ChartConfig;

const panelClassName =
  'overflow-hidden rounded-[1.75rem] border border-[#cfd0ee] bg-white shadow-[0_24px_70px_-48px_rgba(34,24,85,0.34)]';

function PanelCaption({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-t border-[#e6e7f6] px-7 py-7 text-center sm:px-9 sm:py-8">
      <h3 className="text-[24px] font-semibold tracking-[-0.04em] text-[#221855]">{title}</h3>
      <p className="mx-auto mt-2 max-w-[52ch] text-[15px] leading-[1.6] text-[#67658a]">{body}</p>
    </div>
  );
}

export function SampleReportSection() {
  const rootRef = useRef<HTMLElement>(null);
  const [selectedDemo, setSelectedDemo] = useState(0);
  const activeDemo = questionDemos[selectedDemo]!;

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      gsap.from('[data-bento-reveal]', {
        autoAlpha: 0,
        y: 34,
        duration: 0.8,
        stagger: 0.09,
        ease: 'power3.out',
        scrollTrigger: { trigger: rootRef.current, start: 'top 72%', once: true },
      });
    },
    { scope: rootRef },
  );

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      gsap.fromTo(
        '[data-answer-copy]',
        { autoAlpha: 0, y: 10 },
        { autoAlpha: 1, y: 0, duration: 0.42, ease: 'power2.out' },
      );
    },
    { scope: rootRef, dependencies: [selectedDemo], revertOnUpdate: true },
  );

  return (
    <section
      ref={rootRef}
      id="proof"
      className="relative scroll-mt-28 overflow-hidden bg-[#f0f1fe] py-28 lg:py-36"
    >
      <div className="pointer-events-none absolute left-1/2 top-0 h-[24rem] w-[52rem] -translate-x-1/2 rounded-full bg-white/90 blur-[90px]" />

      <div className="relative mx-auto max-w-[1320px] px-5 sm:px-7">
        <header data-bento-reveal className="mx-auto max-w-[790px] text-center">
          <span className="inline-flex rounded-full border border-[#d3d4ed] bg-white px-3 py-1.5 text-[11px] font-semibold tracking-[-0.01em] text-[#55537b] shadow-[0_5px_16px_-12px_rgba(34,24,85,.45)]">
            Product intelligence
          </span>
          <h2 className="mt-6 text-balance font-display text-[clamp(3rem,5vw,5.2rem)] font-semibold leading-[0.96] tracking-[-0.06em] text-[#221855]">
            One audit. Every signal connected.
          </h2>
          <p className="mx-auto mt-6 max-w-[650px] text-[17px] leading-[1.65] text-[#646187] sm:text-[19px]">
            Replay the answer, inspect the evidence, compare who appears, and turn every gap into work.
          </p>
        </header>

        <div className="mt-16 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <article data-bento-reveal className={`${panelClassName} lg:col-span-7`}>
            <div className="relative min-h-[410px] overflow-hidden bg-[#e0e0fd] p-4 sm:p-6">
              <div className="absolute inset-0 opacity-55 [background-image:linear-gradient(#bfd9f4_1px,transparent_1px),linear-gradient(90deg,#bfd9f4_1px,transparent_1px)] [background-size:26px_26px]" />
              <div className="relative grid min-h-[362px] overflow-hidden rounded-[1.2rem] border border-white/90 bg-white/92 shadow-[0_24px_48px_-35px_rgba(34,24,85,0.45)] backdrop-blur sm:grid-cols-[200px_1fr]">
                <div className="border-b border-[#dbdcf1] bg-[#f7f7fd] p-4 sm:border-b-0 sm:border-r">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-[#221855]">Buyer questions</p>
                    <span className="font-mono text-[9px] text-[#737196]">Sample audit</span>
                  </div>
                  <div className="mt-4 grid gap-2 sm:block sm:space-y-2">
                    {questionDemos.map((demo, index) => (
                      <button
                        key={demo.label}
                        type="button"
                        aria-pressed={selectedDemo === index}
                        onClick={() => setSelectedDemo(index)}
                        className={`w-full rounded-xl border px-3 py-3 text-left text-[10px] font-semibold leading-[1.35] transition-all active:translate-y-px ${
                          selectedDemo === index
                            ? 'border-[#3b2be9] bg-[#3b2be9] text-white shadow-[0_10px_20px_-14px_rgba(59,43,233,.7)]'
                            : 'border-[#dbdbf0] bg-white text-[#55537b] hover:border-[#b3b1ed]'
                        }`}
                      >
                        <span
                          className={`mb-1 block font-mono text-[8px] ${
                            selectedDemo === index ? 'text-white/60' : 'text-[#8b8aaa]'
                          }`}
                        >
                          0{index + 1}
                        </span>
                        {demo.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div data-answer-copy className="flex min-h-[362px] flex-col p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-4 border-b border-[#e0e0f2] pb-4">
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#737196]">
                        Recorded answer
                      </p>
                      <p className="mt-1 text-[11px] font-semibold text-[#102044]">Gemini with Google Search</p>
                    </div>
                    <span className="rounded-full bg-[#e3f8ec] px-3 py-1.5 text-[8px] font-bold uppercase tracking-[0.08em] text-[#167044]">
                      Grounded
                    </span>
                  </div>
                  <p className="mt-5 max-w-[42ch] text-[15px] font-semibold leading-[1.4] tracking-[-0.02em] text-[#221855]">
                    {activeDemo.question}
                  </p>
                  <p className="mt-4 max-w-[55ch] text-[12px] leading-[1.7] text-[#5b5981]">{activeDemo.answer}</p>
                  <div className="mt-auto pt-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#221855] px-3 py-1.5 text-[8px] font-bold uppercase tracking-[0.08em] text-white">
                        {activeDemo.status}
                      </span>
                      {activeDemo.sources.map((source) => (
                        <span
                          key={source}
                          className="rounded-full border border-[#d7d7ee] bg-[#f9f9fe] px-2.5 py-1.5 text-[8px] font-semibold text-[#69688d]"
                        >
                          {source}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <PanelCaption
              title="Replay the exact answer"
              body="Switch questions and inspect the response, mention status, and cited pages together."
            />
          </article>

          <article data-bento-reveal className={`${panelClassName} lg:col-span-5`}>
            <div className="flex h-[410px] flex-col bg-[#f9f9ff] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[12px] font-semibold tracking-[-0.02em] text-[#221855]">Recommendation path</p>
                  <p className="mt-1 text-[10px] text-[#737196]">Question intent → recorded answer → brands named</p>
                </div>
                <span className="shrink-0 rounded-full border border-[#d8d9f2] bg-white px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.08em] text-[#616087]">
                  40 questions
                </span>
              </div>

              <div className="mt-4 h-[318px] w-full rounded-[1.2rem] border border-[#dbdcf3] bg-white p-3 shadow-[0_18px_38px_-30px_rgba(34,24,85,.5)]">
                <EChartsSankeyChart
                  data={recommendationFlowData}
                  config={recommendationFlowConfig}
                  className="h-full w-full"
                  renderer="svg"
                  nodeWidth={12}
                  nodePadding={20}
                  linkCurvature={0.58}
                >
                  <EChartsSankeyChart.Tooltip variant="frosted-glass" />
                  <EChartsSankeyChart.Link variant="gradient" />
                  <EChartsSankeyChart.Node radius={5} isClickable>
                    <EChartsSankeyChart.NodeLabel
                      position="outside"
                      showValues
                      valueFormatter={(value) => `${value} prompts`}
                    />
                  </EChartsSankeyChart.Node>
                </EChartsSankeyChart>
              </div>
            </div>
            <PanelCaption
              title="See who owns the answer"
              body="Follow each buyer intent through the recorded response to every brand AI recommends."
            />
          </article>

          <article data-bento-reveal className={`${panelClassName} lg:col-span-5`}>
            <div className="flex h-[338px] flex-col bg-[#f9f9ff] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-5">
                <div className="flex items-start gap-5">
                  <div>
                    <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#767498]">Question set</span>
                    <p className="mt-1 font-mono text-[28px] font-semibold leading-none tracking-[-0.06em] text-[#221855]">40</p>
                  </div>
                  <div className="h-10 border-l border-dashed border-[#b9bae0]" />
                  <div>
                    <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#767498]">Largest intent</span>
                    <p className="mt-1 text-[16px] font-semibold leading-none tracking-[-0.03em] text-[#221855]">Best provider</p>
                  </div>
                </div>
                <span className="hidden shrink-0 rounded-full border border-[#d8d9f2] bg-white px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.08em] text-[#616087] sm:inline-flex">
                  Sample audit
                </span>
              </div>

              <div className="mt-4 min-h-0 w-full flex-1 border-t border-dashed border-[#c7c8e9] pt-3">
                <EChartsBarChart
                  data={questionMixData}
                  config={questionMixConfig}
                  xDataKey="intent"
                  className="h-full w-full"
                  renderer="svg"
                  barCategoryGap={14}
                >
                  <EChartsBarChart.Grid />
                  <EChartsBarChart.XAxis dataKey="intent" hideDots />
                  <EChartsBarChart.Tooltip variant="frosted-glass" />
                  <EChartsBarChart.Bar dataKey="questions" variant="blocks" radius={3} enableHoverHighlight />
                </EChartsBarChart>
              </div>
            </div>
            <PanelCaption
              title="Audit the questions before the answers"
              body="See exactly where the fixed question set concentrates buyer intent—without a hand-drawn chart."
            />
          </article>

          <article data-bento-reveal className={`${panelClassName} lg:col-span-7`}>
            <div className="flex h-[338px] flex-col bg-[#e0e0fd] p-5 sm:p-6">
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <p className="text-[12px] font-semibold tracking-[-0.02em] text-[#221855]">Evidence allocation</p>
                  <p className="mt-1 text-[10px] text-[#636188]">Where missing proof turns into a prioritized fix</p>
                </div>
                <span className="text-[9px] font-semibold text-[#636188]">Sample audit</span>
              </div>

              <div className="mt-2 min-h-0 w-full flex-1">
                <EChartsSankeyChart
                  data={actionFlowData}
                  config={actionFlowConfig}
                  className="h-full w-full"
                  renderer="svg"
                  nodeWidth={88}
                  nodePadding={12}
                  linkCurvature={0.55}
                >
                  <EChartsSankeyChart.Tooltip variant="frosted-glass" />
                  <EChartsSankeyChart.Link variant="gradient" />
                  <EChartsSankeyChart.Node radius={6} isClickable>
                    <EChartsSankeyChart.NodeLabel
                      position="inside"
                      showValues
                      valueFormatter={(value) => `${value}`}
                    />
                  </EChartsSankeyChart.Node>
                </EChartsSankeyChart>
              </div>

              <div className="mt-2 grid shrink-0 grid-cols-3 gap-4 border-t border-[#c4c5eb] pt-3">
                {[
                  ['40', 'questions checked'],
                  ['11', 'brand mentions'],
                  ['5', 'priority actions'],
                ].map(([value, label], index) => (
                  <div
                    key={label}
                    className={`flex flex-col ${index === 1 ? 'items-center text-center' : index === 2 ? 'items-end text-right' : ''}`}
                  >
                    <span className="text-[8px] font-semibold uppercase tracking-[0.08em] text-[#6c6c91]">{label}</span>
                    <span className="mt-0.5 font-mono text-[18px] font-semibold tracking-[-0.05em] text-[#221855]">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <PanelCaption
              title="Turn evidence gaps into work"
              body="Connect every missing proof signal into a clear action your team can own and complete."
            />
          </article>
        </div>
      </div>
    </section>
  );
}
