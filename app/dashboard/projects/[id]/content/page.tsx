'use client';

import { useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import { TOOLS_ENABLED } from '@/lib/flags';

export default function ContentWriterPage() {
  if (!TOOLS_ENABLED) notFound(); // quarantined off the launch surface
  const { id } = useParams<{ id: string }>();
  const [topic, setTopic] = useState('');
  const [contentType, setContentType] = useState('blog_post');
  const [keywords, setKeywords] = useState('');
  const [result, setResult] = useState<{ title: string; body: string; metaDescription: string; wordCount: number; schemaMarkup: object } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleGenerate() {
    if (!topic) return;
    setLoading(true); setError(''); setResult(null);
    const res = await fetch('/api/tools/content-writer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: id, topic, contentType, keywords: keywords.split(',').map(k => k.trim()).filter(Boolean) }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); } else { setResult(data); }
    setLoading(false);
  }

  const inputStyle = { width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box' as const };

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: '0 0 6px' }}>AEO Content Writer</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: 14 }}>Generate AI-citation-optimized articles.</p>
      </div>

      <div style={{ maxWidth: 600, display: 'grid', gap: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>Topic / Title *</label>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. How to choose the right provider" style={inputStyle} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>Content Type</label>
          <select value={contentType} onChange={(e) => setContentType(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="blog_post">Blog Post</option>
            <option value="faq_page">FAQ Page</option>
            <option value="comparison">Comparison</option>
            <option value="answer_page">Answer Page</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>Keywords (comma-separated)</label>
          <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="provider comparison, buyer guide" style={inputStyle} />
        </div>
        <button onClick={handleGenerate} disabled={loading || !topic} style={{ padding: '12px 24px', background: loading ? 'rgba(82,53,224,0.5)' : '#5235e0', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Writing...' : 'Generate Article'}
        </button>
      </div>

      {error && <p style={{ color: '#ef4444', margin: 0 }}>{error}</p>}

      {result && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ background: '#1a161f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ color: '#fff', margin: 0, fontSize: 20 }}>{result.title}</h2>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{result.wordCount} words</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: '0 0 16px', fontStyle: 'italic' }}>{result.metaDescription}</p>
            <pre style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'inherit', fontSize: 15, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {result.body}
            </pre>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(result.body)}
            style={{ justifySelf: 'start', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}
          >
            Copy HTML
          </button>
        </div>
      )}
    </div>
  );
}
