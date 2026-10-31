import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildExecutionQueue, buildFixPlan, type FixSection } from './fix-plan';

const input = {
  business: {
    name: 'Acme Logistics',
    category: 'customs clearance',
    city: 'Delhi',
    website: 'acmelogistics.in',
  },
  citationGap: [
    { domain: 'indiamart.com', count: 4 },
    { domain: 'rivalcargo.com', count: 3 },
  ],
  missedPrompts: [
    {
      prompt: 'customs clearance cost in Delhi',
      competitorsPresent: ['Rival Cargo'],
      evidence: 'Rival Cargo handles customs clearance.',
      commercial: true,
      intent: 'budget',
    },
    {
      prompt: 'best customs clearance agent in Delhi',
      competitorsPresent: ['Rival Cargo'],
      evidence: 'Rival Cargo is recommended.',
      commercial: true,
      intent: 'direct_best',
    },
  ],
  competitors: [{ name: 'Rival Cargo' }],
  totalPrompts: 10,
};

const plan = buildFixPlan(input);

test('keeps audit context internally but only queues evidence-backed work', () => {
  assert.ok(plan.sections.flatMap((section) => section.items).length > 2);
  assert.equal(plan.executionQueue.length, 3);
  assert.deepEqual(plan.executionQueue.map((item) => item.rank), [1, 2, 3]);
});

test('execution queue covers observed question and source levers in deterministic order', () => {
  assert.deepEqual(
    plan.executionQueue.map((item) => item.sourceSection),
    ['answer_questions', 'get_listed', 'answer_questions']
  );
  assert.match(plan.executionQueue[0]!.title, /customs clearance cost in Delhi/);
  assert.match(plan.executionQueue[1]!.title, /indiamart\.com/);
  assert.ok(!plan.executionQueue.some((item) => item.id.startsWith('foundation-')));
  assert.ok(!plan.executionQueue.some((item) => item.id.startsWith('jsonld-')));
});

test('every execution item has evidence, deliverable guidance, and an honest query scope', () => {
  for (const item of plan.executionQueue) {
    assert.ok(item.whyItMatters.length > 0);
    assert.ok(item.deliverable.length > 0);
    assert.equal(item.status, 'todo');
  }
  assert.ok(plan.executionQueue[0]!.targetsQueries.length > 0);
  assert.deepEqual(plan.executionQueue[1]!.targetsQueries, []);
  assert.match(plan.executionQueue[0]!.deliverable, /Review it, then publish it/);
  assert.match(plan.executionQueue[1]!.deliverable, /Submit it manually/);
});

test('schema drafts never invent unverified business facts or placeholder answers', () => {
  assert.equal(plan.jsonLd.localBusiness['@type'], 'Organization');
  assert.equal(plan.jsonLd.localBusiness._status, 'draft_requires_business_verification');
  assert.equal('address' in plan.jsonLd.localBusiness, false);
  assert.equal('description' in plan.jsonLd.localBusiness, false);

  const questions = plan.jsonLd.faqPage.mainEntity as Record<string, unknown>[];
  assert.ok(questions.length > 0);
  assert.equal('acceptedAnswer' in questions[0]!, false);
  assert.equal(questions[0]!._status, 'verified_answer_required_before_publication');
});

test('queue excludes unsupported actionable items even if a caller supplies them', () => {
  const sections: FixSection[] = [
    { key: 'answer_questions', title: 'Content', intro: 'Content intro', items: [] },
    {
      key: 'structured_data',
      title: 'Schema',
      intro: 'Schema intro',
      items: [
        {
          id: 'jsonld-localbusiness',
          title: 'Add LocalBusiness schema',
          detail: 'Generic implementation advice.',
          effort: 'easy',
          impact: 'medium',
          status: 'todo',
          actionable: true,
        },
      ],
    },
  ];

  assert.deepEqual(buildExecutionQueue(sections), []);
});

test('an evidence-empty audit says more evidence is required instead of prescribing work', () => {
  const empty = buildFixPlan({
    ...input,
    citationGap: [],
    missedPrompts: [],
    competitors: [],
  });

  assert.equal(empty.executionQueue.length, 0);
  assert.match(empty.summary.leadInsight, /Capture question-level evidence/);
});
