'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  getBuyerIntent,
  getBusinessUnderstanding,
  regenerateBuyerIntent,
  startBusinessUnderstanding,
} from '@/components/dashboard/api';
import {
  RunStatusBadge,
  SectionHeading,
  MetricTile,
  EmptyState,
  LoadingRow,
  ErrorNote,
  formatDate,
} from '@/components/dashboard/project/kit';
import type { BuyerQuestion, BuyerQuestionSet, BuyerIntentCategory } from '@/src/buyer-intent/types';

const INTENT_TONE: Record<BuyerIntentCategory, string> = {
  DISCOVERY: 'bg-surface-overlay text-secondary',
  COMPARISON: 'bg-warning/10 text-warning',
  SHORTLIST: 'bg-presence/10 text-presence',
  VENDOR_SELECTION: 'bg-presence/10 text-presence',
  PURCHASE: 'bg-absence/10 text-absence',
  SPECIFICATION: 'bg-surface-overlay text-secondary',
  COMPLIANCE: 'bg-surface-overlay text-secondary',
  ALTERNATIVE: 'bg-warning/10 text-warning',
  GEOGRAPHIC: 'bg-surface-overlay text-secondary',
};

function QuestionRow({ question, rank }: { question: BuyerQuestion; rank: number }) {
  return (
    <li className="grid gap-3 px-5 py-4 transition-colors hover:bg-bone/60 sm:grid-cols-[64px_1fr_auto] sm:items-start sm:gap-4">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[12px] font-semibold tabular-nums text-tertiary">{String(rank).padStart(2, '0')}</span>
        <span className="font-mono text-[11px] font-semibold tabular-nums text-presence">{question.priority_score.toFixed(2)}</span>
      </div>
      <div>
        <p className="text-[14px] font-medium leading-6 text-ink">{question.question}</p>
        {question.normalized_question && question.normalized_question !== question.question && (
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-tertiary">Normalized: {question.normalized_question}</p>
        )}
        {Array.isArray(question.supporting_business_evidence_ids) && question.supporting_business_evidence_ids.length > 0 && (
          <p className="mt-1.5 text-[12px] leading-5 text-secondary">Backed by {question.supporting_business_evidence_ids.length} {question.supporting_business_evidence_ids.length === 1 ? 'piece' : 'pieces'} of site evidence.</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
        <span className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${INTENT_TONE[question.intent]}`}>{question.intent.replace(/_/g, ' ')}</span>
        <span className="rounded-full bg-bone px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-secondary">{question.buyer_stage.toLowerCase()}</span>
        <span className="rounded-full bg-bone px-2.5 py-1 font-mono text-[10px] font-semibold text-tertiary">{question.confidence.toLowerCase()}</span>
      </div>
    </li>
  );
}

export default function BuyerQuestionsPage() {
  const { id } = useParams<{ id: string }>();
  const [questionSet, setQuestionSet] = useState<BuyerQuestionSet | null>(null);
  const [hasUnderstanding, setHasUnderstanding] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<null | 'understanding' | 'regenerate'>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [set, understanding] = await Promise.all([getBuyerIntent(id), getBusinessUnderstanding(id)]);
      setQuestionSet(set);
      setHasUnderstanding(
        understanding != null && (understanding.status === 'SUCCESS' || understanding.status === 'PARTIAL_SUCCESS'),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load buyer questions');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    load().then(() => void cancelled);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleRegenerate() {
    setBusy('regenerate');
    setError('');
    try {
      const count = questionSet?.requested_question_count ?? 30;
      const next = await regenerateBuyerIntent(id, count);
      setQuestionSet(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate questions');
    } finally {
      setBusy(null);
    }
  }

  async function handleGenerateUnderstanding() {
    setBusy('understanding');
    setError('');
    try {
      await startBusinessUnderstanding(id);
      setError('Business understanding queued. Refresh this page in a moment to generate buyer questions.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start business understanding');
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <LoadingRow />
        <LoadingRow />
      </div>
    );
  }

  if (error) return <ErrorNote message={error} />;

  if (!questionSet) {
    return (
      <section>
        <SectionHeading
          index="Buyer Questions · Stage 02"
          title="The questions real buyers ask AI"
          description="A fixed question set is what makes every measurement comparable. It is generated from your business understanding."
        />
        {hasUnderstanding === false ? (
          <EmptyState
            title="Business understanding comes first"
            description="Buyer questions are derived from the verified facts about your business. Generate the business understanding first — it crawls your website and extracts what you actually offer."
            action={
              <button
                onClick={handleGenerateUnderstanding}
                disabled={busy === 'understanding'}
                className="btn-primary inline-flex h-11 items-center rounded-full px-6 text-[14px] font-semibold no-underline disabled:opacity-60"
              >
                {busy === 'understanding' ? 'Generating…' : 'Generate business understanding'}
              </button>
            }
          />
        ) : (
          <EmptyState
            title="No buyer-question set yet"
            description="Generate the question set that will anchor every AI-answer measurement for this business."
            action={
              <button
                onClick={handleRegenerate}
                disabled={busy === 'regenerate'}
                className="btn-primary inline-flex h-11 items-center rounded-full px-6 text-[14px] font-semibold no-underline disabled:opacity-60"
              >
                {busy === 'regenerate' ? 'Generating…' : 'Generate buyer questions'}
              </button>
            }
          />
        )}
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <section>
        <SectionHeading
          index="Buyer Questions · Stage 02"
          title="Fixed question set"
          description="Every run of AI-answer observation asks exactly these questions, so numbers stay comparable."
        />
        <div className="grid gap-3 sm:grid-cols-4">
          <MetricTile label="Status" value={<RunStatusBadge status={questionSet.status} />} sub={questionSet.frozen ? 'Frozen — used for measurement' : 'Draft set'} />
          <MetricTile label="Questions" value={questionSet.requested_question_count} sub={`${questionSet.questions.length} shown`} />
          <MetricTile label="Candidates" value={questionSet.candidate_count} sub={`${questionSet.rejected_candidate_count} rejected`} />
          <MetricTile label="Generated" value={formatDate(questionSet.generated_at)} sub={`Model ${questionSet.generation?.model ?? '—'}`} />
        </div>
        <div className="mt-3 flex items-center justify-between rounded-2xl border border-rule bg-paper px-5 py-4">
          <p className="text-[13px] text-secondary">
            {questionSet.frozen
              ? 'This set is frozen. Only a new question set can change what is measured.'
              : 'This set is not frozen yet — you can regenerate or keep it as your measurement baseline.'}
          </p>
          <button
            onClick={handleRegenerate}
            disabled={busy === 'regenerate' || questionSet.frozen}
            className="ml-4 inline-flex h-9 shrink-0 items-center rounded-full bg-presence px-4 text-[12px] font-semibold text-white no-underline disabled:cursor-not-allowed disabled:bg-bone disabled:text-tertiary"
          >
            {busy === 'regenerate' ? 'Generating…' : questionSet.frozen ? 'Regenerate as new set' : 'Regenerate'}
          </button>
        </div>
        {Array.isArray(questionSet.warnings) && questionSet.warnings.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {questionSet.warnings.map((w, i) => (
              <p key={i} className="rounded-xl border border-warning/20 bg-warning/5 px-4 py-2.5 text-[12px] leading-5 text-warning">{w}</p>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeading
          index="The list"
          title="All questions"
          description="Ranked by commercial relevance, business fit, and specificity."
        />
        {questionSet.questions.length === 0 ? (
          <EmptyState title="No questions in this set" description="Regenerate the set to produce ranked buyer questions." />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-rule bg-paper">
            <ol className="divide-y divide-rule">
              {questionSet.questions.map((q, i) => (
                <QuestionRow key={q.id} question={q} rank={q.rank ?? i + 1} />
              ))}
            </ol>
          </div>
        )}
      </section>
    </div>
  );
}