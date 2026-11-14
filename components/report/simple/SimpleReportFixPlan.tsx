'use client';

import { useState } from 'react';

type FixQuestion = { id: string; question: string };
type Draft = { question: string; title: string; body: string; metaDescription: string; wordCount: number };

export function SimpleReportFixPlan({
  projectId,
  questions,
  canGenerate,
  reportId,
}: {
  projectId: string;
  questions: FixQuestion[];
  canGenerate: boolean;
  reportId: string;
}) {
  const [generating, setGenerating] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [error, setError] = useState('');

  async function generateAll() {
    if (!canGenerate || generating || questions.length === 0) return;
    const approved = window.confirm(
      `Generate drafts for all ${questions.length} recommended pages in one Gemini request? This sends the buyer questions and your saved business profile to Google Gemini and uses API quota. Nothing will be published automatically.`
    );
    if (!approved) return;

    setGenerating(true);
    setError('');
    try {
      const response = await fetch('/api/tools/content-writer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          topics: questions.map((question) => question.question),
          contentType: 'answer_page',
          keywords: [],
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Could not generate the drafts.');
      setDrafts(Array.isArray(data.drafts) ? data.drafts as Draft[] : []);
      if (!Array.isArray(data.drafts) || data.drafts.length === 0) throw new Error('Gemini did not return any drafts. Please try again.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate the drafts.');
    } finally {
      setGenerating(false);
    }
  }

  const pdfUrl = `/api/reports/${encodeURIComponent(reportId)}/pdf?includeDrafts=1`;

  return (
    <div style={{ display: 'grid', gap: 16, marginTop: 18 }}>
      <div>
        <p style={{ margin: '0 0 14px', fontSize: 14, lineHeight: 1.6, color: 'var(--sr-muted, #626274)' }}>
          These page ideas come from the buyer questions this audit found unanswered. Generate all the drafts together, then review every business fact before publishing.
        </p>
        {canGenerate ? (
          <button
            type="button"
            onClick={generateAll}
            disabled={generating || questions.length === 0}
            style={{ border: 0, borderRadius: 999, padding: '12px 20px', background: '#463eda', color: '#fff', fontWeight: 700, cursor: generating ? 'wait' : 'pointer', opacity: generating ? .7 : 1 }}
          >
            {generating ? 'Generating all drafts…' : drafts.length ? 'Regenerate all drafts with AI' : 'Generate content for all pages'}
          </button>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--sr-muted, #626274)' }}>Sign in to this project dashboard to generate drafts.</p>
        )}
        {error && <p role="alert" style={{ color: '#b42318', fontSize: 13, marginTop: 10 }}>{error}</p>}
      </div>

      {drafts.length > 0 && (
        <div style={{ border: '1px solid var(--sr-line, #dedee8)', borderRadius: 12, padding: 18, background: 'var(--sr-panel, #fff)', display: 'grid', gap: 12 }}>
          <div>
            <p style={{ margin: '0 0 5px', fontWeight: 700, color: 'var(--sr-text, #171725)' }}>Your complete report is ready</p>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--sr-muted, #626274)' }}>The audit findings, action plan and all {drafts.length} AI-generated page drafts are combined into one PDF. The original audit report remains unchanged. Nothing is published automatically.</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <a href={`${pdfUrl}&disposition=inline`} target="_blank" rel="noreferrer" style={{ display: 'inline-block', borderRadius: 999, padding: '10px 16px', background: '#463eda', color: '#fff', fontWeight: 700, textDecoration: 'none' }}>View complete PDF</a>
            <a href={`${pdfUrl}&disposition=attachment`} style={{ display: 'inline-block', border: '1px solid #c9c7d8', borderRadius: 999, padding: '10px 16px', background: '#fff', color: '#29283a', fontWeight: 700, textDecoration: 'none' }}>Download complete PDF</a>
            <button type="button" onClick={() => navigator.clipboard.writeText(drafts.map((draft, index) => `Recommended page ${index + 1}\n${draft.question}\n${draft.title}\n${draft.metaDescription}\n${draft.body}`).join('\n\n---\n\n'))} style={{ border: '1px solid #c9c7d8', borderRadius: 999, padding: '10px 16px', background: '#fff', color: '#29283a', fontWeight: 700, cursor: 'pointer' }}>Copy all drafts</button>
          </div>
        </div>
      )}
    </div>
  );
}
