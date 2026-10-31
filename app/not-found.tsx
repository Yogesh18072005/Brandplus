import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="section" style={{ padding: '80px 20px', display: 'grid', gap: 12, maxWidth: 560 }}>
      <h1 style={{ fontSize: 28 }}>Report not found</h1>
      <p style={{ margin: 0, color: 'var(--quote)' }}>
        This report link doesn&rsquo;t exist (or hasn&rsquo;t been generated yet). If your audit is queued,
        you&rsquo;ll get an email when it&rsquo;s ready — free capacity resets daily.
      </p>
      <p style={{ margin: 0 }}>
        <Link href="/">← Request a free audit</Link>
      </p>
    </main>
  );
}
