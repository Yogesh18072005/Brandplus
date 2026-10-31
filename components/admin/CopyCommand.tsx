'use client';

import { useState } from 'react';

/** One terminal command with a copy button. */
export function CopyCommand({ command, label }: { command: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="zw-cmd">
      <span className="zw-cmd-label">{label}</span>
      <code>{command}</code>
      <button type="button" onClick={copy} aria-label={`Copy ${label} command`}>{copied ? 'Copied' : 'Copy'}</button>
    </div>
  );
}
