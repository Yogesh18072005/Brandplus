'use client';

import { useState } from 'react';

type FixQuestion = { id: string; question: string };
type Draft = { title: string; body: string; metaDescription: string; wordCount: number };

export function SimpleReportFixPlan({
  projectId,
  questions,
  canGenerate,
}: {
  projectId: string;
  questions: FixQuestion[];
  canGenerate: boolean;
}) {
  const [generating, setGenerating] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function generate(question: FixQuestion) {
    if (!canGenerate || generating) return;
    const approved = window.confirm(
      'Generate an AI draft for this page? This sends the buyer question and your saved business profile to Google Gemini and uses your Gemini API quota. Nothing will be published automatically.'
    );
    if (!approved) return;

    setGenerating(question.id);
    setErrors((current) => ({ ...current, [question.id]: '' }));
    try {
      const response = await fetch('/api/tools/content-writer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          topic: question.question,
          contentType: 'answer_page',
          keywords: [],
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Could not generate this draft.');
      setDrafts((current) => ({ ...current, [question.id]: data as Draft }));
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [question.id]: error instanceof Error ? error.message : 'Could not generate this draft.',
      }));
    } finally {
      setGenerating(null);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 16, marginTop: 18 }}>
      {questions.map((question, index) => {
        const draft = drafts[question.id];
        return (
          <article key={question.id} style={{ border: '1px solid var(--sr-line, #dedee8)', borderRadius: 12, padding: 18, background: 'var(--sr-panel, #fff)' }}>
            <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#6256d9' }}>Page {index + 1}</p>
            <h3 style={{ margin: '0 0 12px', fontSize: 18, lineHeight: 1.4, color: 'var(--sr-text, #171725)' }}>Answer: “{question.question}”</h3>
            <p style={{ margin: '0 0 14px', fontSize: 14, lineHeight: 1.6, color: 'var(--sr-muted, #626274)' }}>Create a dedicated, useful page that answers this exact buyer question. Add only services, proof and capabilities your business can verify.</p>
            {canGenerate ? (
              <button
                type="button"
                onClick={() => generate(question)}
                disabled={generating !== null}
                style={{ border: 0, borderRadius: 999, padding: '10px 16px', background: '#463eda', color: '#fff', fontWeight: 700, cursor: generating ? 'wait' : 'pointer', opacity: generating && generating !== question.id ? .6 : 1 }}
              >
                {generating === question.id ? 'Generating…' : draft ? 'Regenerate draft with AI' : 'Generate draft with AI'}
              </button>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--sr-muted, #626274)' }}>Sign in to this project dashboard to generate a draft.</p>
            )}
            {errors[question.id] && <p role="alert" style={{ color: '#b42318', fontSize: 13 }}>{errors[question.id]}</p>}
            {draft && (
              <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
                <div>
                  <h4 style={{ margin: '0 0 5px', color: 'var(--sr-text, #171725)' }}>{draft.title}</h4>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--sr-muted, #626274)' }}>{draft.metaDescription} · {draft.wordCount} words</p>
                </div>
                <pre style={{ margin: 0, padding: 14, borderRadius: 8, background: '#f5f4fa', color: '#242333', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 13, lineHeight: 1.6 }}>{draft.body}</pre>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(draft.body)}
                  style={{ justifySelf: 'start', border: '1px solid #c9c7d8', borderRadius: 999, padding: '8px 14px', background: '#fff', color: '#29283a', fontWeight: 600, cursor: 'pointer' }}
                >
                  Copy HTML
                </button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
