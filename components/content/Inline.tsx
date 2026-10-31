import Link from 'next/link';
import type { ReactNode } from 'react';

const TOKEN = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;

/** Renders [text](href) links and **bold** inside content strings. */
export function Inline({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    if (m[1] !== undefined) {
      const href = m[2] ?? '#';
      out.push(
        href.startsWith('/') ? (
          <Link key={at} href={href} className="text-signal underline decoration-signal/30 underline-offset-2 hover:decoration-signal">
            {m[1]}
          </Link>
        ) : (
          <a key={at} href={href} rel="noopener" className="text-signal underline decoration-signal/30 underline-offset-2 hover:decoration-signal">
            {m[1]}
          </a>
        ),
      );
    } else {
      out.push(<strong key={at} className="font-semibold text-content">{m[3]}</strong>);
    }
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

/** Strips inline marks for plain-text uses (JSON-LD, meta). */
export function plain(text: string): string {
  return text.replace(TOKEN, (_m, label, _href, bold) => label ?? bold ?? '');
}
