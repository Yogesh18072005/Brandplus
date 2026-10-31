'use client';

import { useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import { TOOLS_ENABLED } from '@/lib/flags';

const SCHEMA_TYPES = ['FAQPage', 'Article', 'HowTo', 'Organization', 'LocalBusiness', 'Product', 'BreadcrumbList'] as const;

export default function SchemaGeneratorPage() {
  if (!TOOLS_ENABLED) notFound(); // quarantined off the launch surface
  const { id } = useParams<{ id: string }>();
  const [schemaType, setSchemaType] = useState<string>('LocalBusiness');
  const [pageUrl, setPageUrl] = useState('');
  const [result, setResult] = useState<{ jsonLd: object; validation: { valid: boolean; warnings: string[] } } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleGenerate() {
    setLoading(true); setError(''); setResult(null);
    const res = await fetch('/api/tools/schema-generator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: id, schemaType, pageUrl: pageUrl || undefined }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); } else { setResult(data); }
    setLoading(false);
  }

  const inputStyle = { width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box' as const };

  return (
    <div style={{ maxWidth: 700, display: 'grid', gap: 24 }}>
      <div>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: '0 0 6px' }}>Schema Markup Generator</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: 14 }}>Generate JSON-LD structured data for your pages.</p>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>Schema Type</label>
          <select value={schemaType} onChange={(e) => setSchemaType(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            {SCHEMA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>Page URL (optional — generates from page content)</label>
          <input value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} placeholder="https://example.com/page" style={inputStyle} />
        </div>
        <button onClick={handleGenerate} disabled={loading} style={{ padding: '12px 24px', background: loading ? 'rgba(82,53,224,0.5)' : '#5235e0', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Generating...' : 'Generate Schema'}
        </button>
      </div>

      {error && <p style={{ color: '#ef4444', margin: 0 }}>{error}</p>}

      {result && (
        <div style={{ display: 'grid', gap: 16 }}>
          {!result.validation.valid && (
            <div style={{ padding: '12px 16px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8 }}>
              <p style={{ margin: '0 0 6px', color: '#f59e0b', fontWeight: 600, fontSize: 13 }}>Warnings</p>
              {result.validation.warnings.map((w, i) => <p key={i} style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{w}</p>)}
            </div>
          )}
          <div style={{ background: '#141118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>JSON-LD</span>
              <button
                onClick={() => navigator.clipboard.writeText(`<script type="application/ld+json">\n${JSON.stringify(result.jsonLd, null, 2)}\n</script>`)}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '4px 10px', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}
              >
                Copy
              </button>
            </div>
            <pre style={{ margin: 0, color: '#22c55e', fontSize: 13, overflow: 'auto', maxHeight: 400, whiteSpace: 'pre-wrap' }}>
              {`<script type="application/ld+json">\n${JSON.stringify(result.jsonLd, null, 2)}\n</script>`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
