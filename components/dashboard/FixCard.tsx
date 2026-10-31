'use client';

import { useState, type CSSProperties } from 'react';
import { startExecution } from '@/components/dashboard/api';
import type { GeneratedIntervention } from '@/src/intervention-generation/types';

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
