'use client';

export function SimpleReportFixPlan({ reportId }: { reportId: string }) {
  const pdfUrl = `/api/reports/${encodeURIComponent(reportId)}/pdf?includeDrafts=1`;

  return (
    <div style={{ display: 'grid', gap: 16, marginTop: 18 }}>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--sr-muted, #626274)' }}>
        Drafts for the recommended pages are generated automatically when this audit completes. Review every business fact before publishing. Nothing is published automatically.
      </p>

      <div style={{ border: '1px solid var(--sr-line, #dedee8)', borderRadius: 12, padding: 18, background: 'var(--sr-panel, #fff)', display: 'grid', gap: 12 }}>
        <div>
          <p style={{ margin: '0 0 5px', fontWeight: 700, color: 'var(--sr-text, #171725)' }}>Complete audit report PDF</p>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--sr-muted, #626274)' }}>View or download this audit’s findings, action plan and automatically generated AI page drafts. This is a review document only; nothing is published automatically.</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <a href={`${pdfUrl}&disposition=inline`} target="_blank" rel="noreferrer" style={{ display: 'inline-block', borderRadius: 999, padding: '10px 16px', background: '#463eda', color: '#fff', fontWeight: 700, textDecoration: 'none' }}>View complete PDF</a>
          <a href={`${pdfUrl}&disposition=attachment`} style={{ display: 'inline-block', border: '1px solid #c9c7d8', borderRadius: 999, padding: '10px 16px', background: '#fff', color: '#29283a', fontWeight: 700, textDecoration: 'none' }}>Download complete PDF</a>
        </div>
      </div>
    </div>
  );
}
