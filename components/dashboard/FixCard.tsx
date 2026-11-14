'use client';

import { useState, type CSSProperties } from 'react';
import { startExecution } from '@/components/dashboard/api';
import type { GeneratedIntervention } from '@/src/intervention-generation/types';

type Draft = { id?: string; title: string; body: string; metaDescription: string; wordCount: number };

function humanize(value: string): string {
  const text = value.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const PRIORITY_LABEL: Record<GeneratedIntervention['priority'], string> = {
  CRITICAL: 'Do first',
  HIGH: 'High impact',
  MEDIUM: 'Worth doing',
  LOW: 'Nice to have',
  UNKNOWN: 'To review',
};

/** One ranked fix, written for the client. Founder-only controls appear when isOps. */
export function FixCard({ item, rank, projectId, isOps, onExecuted }: { item: GeneratedIntervention; rank: number; projectId: string; isOps: boolean; onExecuted: () => void }) {
  const [state, setState] = useState<'idle' | 'starting'>('idle');
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftBusy, setDraftBusy] = useState(false);
  const [draftError, setDraftError] = useState('');
  const needsInput = (item.requiredBusinessInputs ?? []).filter((input) => input.status === 'INPUT_REQUIRED');
  const otherQuestions = (item.affectedQuestions ?? []).filter((q) => q.exactQuestion !== item.exactBuyerQuestion).length;

  async function execute() {
    setState('starting');
    setError('');
    try {
      await startExecution(projectId, item.id);
      onExecuted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start execution');
    } finally {
      setState('idle');
    }
  }

  async function generateDraft() {
    const confirmed = window.confirm(
      'Generate an AI draft for this fix? This sends the fix details and business profile to Google Gemini and uses your Gemini API quota. Nothing will be published automatically.'
    );
    if (!confirmed) return;
    setDraftBusy(true);
    setDraftError('');
    setDraft(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/interventions/${item.id}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Draft generation failed');
      setDraft(data);
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'Draft generation failed');
    } finally {
      setDraftBusy(false);
    }
  }

  return (
    <article className="zw-card zw-fix" style={{ '--zw-i': Math.min(rank, 8) } as CSSProperties}>
      <div className="zw-fix-rank" aria-label={`Fix ${rank}`}>{String(rank).padStart(2, '0')}</div>
      <div className="zw-fix-main">
        <div className="zw-fix-tags">
          <span className={`zw-fix-priority is-${item.priority.toLowerCase()}`}>{PRIORITY_LABEL[item.priority]}</span>
          <span className="zw-fix-tag">{humanize(item.implementationSurface)}</span>
          {item.effort !== 'UNKNOWN' && <span className="zw-fix-tag">{humanize(item.effort)} effort</span>}
        </div>
        <h3>{item.title}</h3>
        <p className="zw-fix-question">
          For buyers asking <q>{item.exactBuyerQuestion}</q>
          {otherQuestions > 0 && <> and {otherQuestions} similar {otherQuestions === 1 ? 'question' : 'questions'}</>}
        </p>
        <p className="zw-fix-objective">{item.objective}</p>
        {item.expectedDeliverable && (
          <p className="zw-fix-deliverable"><span>What gets made</span>{item.expectedDeliverable}</p>
        )}
        {needsInput.length > 0 && (
          <div className="zw-fix-input">
            <span>We’ll need from you</span>
            <ul>{needsInput.slice(0, 3).map((input) => <li key={input.id}>{input.description}</li>)}</ul>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={generateDraft} disabled={draftBusy} className="zw-btn zw-btn-primary zw-btn-sm">
            {draftBusy ? 'Generating draft…' : 'Generate draft with AI'}
          </button>
          <span className="self-center text-xs text-gray-500">Optional · uses Gemini quota · never auto-publishes</span>
        </div>
        {draftError && <p className="zw-talk-error" role="alert">{draftError}</p>}
        {draft && (
          <section className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4" aria-label="Generated content draft">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-semibold">{draft.title}</h4>
              <span className="text-xs text-gray-400">{draft.wordCount} words · Draft only</span>
            </div>
            <p className="mb-3 text-sm text-gray-400">{draft.metaDescription}</p>
            <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap break-words font-sans text-sm leading-6 text-gray-200">{draft.body}</pre>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => void navigator.clipboard.writeText(draft.body)} className="zw-btn zw-btn-ghost zw-btn-sm">Copy HTML</button>
              <button onClick={() => void navigator.clipboard.writeText(draft.metaDescription)} className="zw-btn zw-btn-ghost zw-btn-sm">Copy meta description</button>
            </div>
            <p className="mt-3 text-xs text-amber-300">Review every claim and replace any [VERIFY] placeholders with confirmed business information before publishing.</p>
          </section>
        )}
        {isOps && (
          <div className="zw-fix-ops">
            <span>Score {item.priorityScore.toFixed(2)} · {humanize(item.category)} · {humanize(item.status)}</span>
            <button onClick={execute} disabled={state === 'starting'} className="zw-btn zw-btn-ghost zw-btn-sm">
              {state === 'starting' ? 'Starting…' : 'Start execution'}
            </button>
          </div>
        )}
        {error && <p className="zw-talk-error" role="alert">{error}</p>}
      </div>
    </article>
  );
}
