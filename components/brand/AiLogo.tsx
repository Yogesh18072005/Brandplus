import { siG2, siReddit, siTrustpilot, siWikipedia, siYoutube } from 'simple-icons';

/*
 * Real brand marks for the AI assistants and the sites they read, used to
 * name them (nominative use), never to imply endorsement.
 * AI marks: @lobehub/icons-static-svg, copied to public/logos/.
 * Site marks: simple-icons, drawn in their brand colour.
 */

export const AI = {
  chatgpt: { name: 'ChatGPT', file: 'openai.svg' },
  gemini: { name: 'Gemini', file: 'gemini-color.svg' },
  claude: { name: 'Claude', file: 'claude-color.svg' },
  perplexity: { name: 'Perplexity', file: 'perplexity-color.svg' },
  copilot: { name: 'Copilot', file: 'copilot-color.svg' },
  aioverviews: { name: 'AI Overviews', file: 'google-color.svg' },
  metaai: { name: 'Meta AI', file: 'metaai-color.svg' },
  grok: { name: 'Grok', file: 'grok.svg' },
} as const;

export type AiKey = keyof typeof AI;

export function AiLogo({ name, className = 'size-6' }: { name: AiKey; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- tiny static SVGs, no optimisation needed
  return <img src={`/logos/${AI[name].file}`} alt={AI[name].name} className={`shrink-0 ${className}`} draggable={false} />;
}

const SITES = { g2: siG2, reddit: siReddit, trustpilot: siTrustpilot, wikipedia: siWikipedia, youtube: siYoutube } as const;
export type SiteKey = keyof typeof SITES;

export function SiteLogo({ name, className = 'size-6' }: { name: SiteKey; className?: string }) {
  const icon = SITES[name];
  return (
    <svg viewBox="0 0 24 24" className={`shrink-0 ${className}`} role="img" aria-label={icon.title}>
      <path d={icon.path} fill={`#${icon.hex}`} />
    </svg>
  );
}
