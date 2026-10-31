'use client';

import { useState } from 'react';

/** Copies the report's public link so a client can send it to their team. */
export function ShareLinkButton({ href }: { href: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    const url = new URL(href, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy this link', url);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }
  return (
    <button type="button" onClick={copy} className="sr-foot-link" aria-live="polite">
      {copied ? 'Link copied' : 'Copy share link'}
    </button>
  );
}
