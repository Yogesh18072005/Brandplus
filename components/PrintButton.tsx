'use client';

import { useState } from 'react';

function filenameFromHeader(value: string | null): string {
  const match = value?.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? 'brandpulse-visibility-report.pdf';
}

export function PrintButton({ reportId }: { reportId: string }) {
  const [state, setState] = useState<'idle' | 'downloading' | 'error'>('idle');

  async function download() {
    if (state === 'downloading') return;
    setState('downloading');
    try {
      const response = await fetch(`/api/reports/${encodeURIComponent(reportId)}/pdf`, { method: 'GET', credentials: 'same-origin' });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error ?? 'The PDF could not be generated.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filenameFromHeader(response.headers.get('content-disposition'));
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setState('idle');
    } catch {
      setState('error');
    }
  }

  return (
    <span className="report-download-control print:hidden">
      <button type="button" onClick={download} disabled={state === 'downloading'} aria-describedby={state === 'error' ? 'report-download-error' : undefined}>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M10 2v10m0 0 4-4m-4 4L6 8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3 13v3.5A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V13" strokeLinecap="round" />
        </svg>
        {state === 'downloading' ? 'Preparing PDF' : state === 'error' ? 'Try PDF again' : 'Download PDF'}
      </button>
      {state === 'error' && <small id="report-download-error" role="status">PDF generation failed. Try again or contact support.</small>}
    </span>
  );
}
