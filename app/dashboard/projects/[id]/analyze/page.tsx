'use client';

import { useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import { TOOLS_ENABLED } from '@/lib/flags';

interface AnalysisResult {
  overallScore: number;
  scores: Record<string, number>;
  recommendations: { priority: string; category: string; issue: string; fix: string; fixCode?: string }[];
  meta: { title: string; description: string; wordCount: number; hasSchema: boolean; schemaTypes: string[] };
}

export default function PageAnalyzerPage() {
  if (!TOOLS_ENABLED) notFound(); // quarantined off the launch surface
  const { id } = useParams<{ id: string }>();
  const [pageUrl, setPageUrl] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleAnalyze() {
    if (!pageUrl) return;
    setLoading(true); setError(''); setResult(null);
    const res = await fetch('/api/tools/page-analyzer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: id, pageUrl }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); } else { setResult(data); }
    setLoading(false);
  }

  const inputStyle = { width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box' as const };
  const priorityColors: Record<string, string> = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: '0 0 6px' }}>On-Page AEO Analyzer</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: 14 }}>Check how AI-ready your page is.</p>
      </div>

      <div style={{ maxWidth: 600, display: 'flex', gap: 12 }}>
        <input value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} placeholder="https://example.com/page" style={{ ...inputStyle, flex: 1 }}
          onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()} />
        <button onClick={handleAnalyze} disabled={loading || !pageUrl} style={{ padding: '12px 24px', background: loading ? 'rgba(82,53,224,0.5)' : '#5235e0', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>

      {error && <p style={{ color: '#ef4444', margin: 0 }}>{error}</p>}

      {result && (
        <div style={{ display: 'grid', gap: 20 }}>
          {/* Overall score */}
          <div style={{ background: '#1a161f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '28px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 6px', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>AEO Readiness Score</p>
            <p style={{ margin: 0, fontSize: 56, fontWeight: 700, color: result.overallScore >= 70 ? '#22c55e' : result.overallScore >= 40 ? '#f59e0b' : '#ef4444' }}>
              {result.overallScore}<span style={{ fontSize: 24, color: 'rgba(255,255,255,0.3)' }}>/100</span>
            </p>
          </div>

          {/* Individual scores */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
            {Object.entries(result.scores).map(([key, val]) => (
              <div key={key} style={{ background: '#1a161f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 14px' }}>
                <p style={{ margin: '0 0 2px', fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: val >= 70 ? '#22c55e' : val >= 40 ? '#f59e0b' : '#ef4444' }}>{val}</p>
              </div>
            ))}
          </div>

          {/* Recommendations */}
          <div style={{ background: '#1a161f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '20px 24px' }}>
            <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 600, margin: '0 0 16px' }}>Recommendations</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              {result.recommendations.map((rec, i) => (
                <div key={i} style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: priorityColors[rec.priority] ?? '#fff', textTransform: 'uppercase', padding: '2px 6px', background: `${priorityColors[rec.priority] ?? '#fff'}15`, borderRadius: 4 }}>{rec.priority}</span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{rec.category}</span>
                  </div>
                  <p style={{ margin: '0 0 4px', color: '#fff', fontSize: 14, fontWeight: 500 }}>{rec.issue}</p>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{rec.fix}</p>
                  {rec.fixCode && (
                    <pre style={{ marginTop: 8, padding: '8px 12px', background: '#141118', borderRadius: 6, color: '#22c55e', fontSize: 12, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{rec.fixCode}</pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
