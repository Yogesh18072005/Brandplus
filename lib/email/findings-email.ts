// The "here's what AI said about you" email: one prospect, their real audit
// evidence, written by hand per business. Email-safe HTML only (tables, inline
// styles, solid colours) so it renders the same in Gmail, Outlook and Apple Mail.
// Every quote must be copied verbatim from a recorded answer.

import { getAppUrl } from '@/lib/app-url';

export interface FindingsQuote {
  question: string;
  /** Verbatim from the recorded AI answer. */
  quote: string;
  verdict: 'absent' | 'shared' | 'named';
  /** One line on why this answer matters to this business. */
  note: string;
}

export interface FindingsSource {
  domain: string;
  answers: number;
  /** "competitor", "you", or a short label. */
  tag?: string;
}

export interface FindingsFix {
  title: string;
  body: string;
}

export interface FindingsEmailInput {
  businessName: string;
  greeting: string;
  preheader: string;
  subject: string;
  observedOn: string;
  engineLabel: string;
  intro: string[];
  headline: { value: string; caption: string };
  stats: Array<{ value: string; label: string }>;
  quotes: FindingsQuote[];
  sources: { total: number; items: FindingsSource[]; note: string };
  why: string[];
  fixes: FindingsFix[];
  cta: { title: string; body: string; label: string; href: string };
  senderName: string;
  senderRole?: string;
  ps?: string;
}

const C = {
  paper: '#ededf4',
  card: '#ffffff',
  soft: '#f5f4fa',
  line: '#e2e1ee',
  text: '#15141f',
  muted: '#5f5d75',
  faint: '#8c8aa1',
  ink: '#0f0e16',
  inkText: '#b0aec5',
  blue: '#463eda',
  blueDeep: '#2a1bcc',
  mint: '#a9ffdf',
  mintDeep: '#0e7a5c',
  coral: '#c9402f',
  coralSoft: '#fdeeeb',
  blueSoft: '#ecebfc',
};
const SANS = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`;
const MONO = `ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function label(text: string, color: string = C.faint): string {
  return `<p style="margin:0 0 10px;font:600 10.5px/1 ${MONO};letter-spacing:.14em;text-transform:uppercase;color:${color};">${esc(text)}</p>`;
}

function card(inner: string, opts: { bg?: string; border?: string; pad?: string } = {}): string {
  return `<tr><td style="padding:0 0 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${opts.bg ?? C.card};border:1px solid ${opts.border ?? C.line};border-radius:20px;"><tr><td style="padding:${opts.pad ?? '26px 28px'};">${inner}</td></tr></table></td></tr>`;
}

const VERDICT: Record<FindingsQuote['verdict'], { text: string; color: string; bg: string }> = {
  absent: { text: 'Not named', color: C.coral, bg: C.coralSoft },
  shared: { text: 'Named, in a shared line', color: C.blueDeep, bg: C.blueSoft },
  named: { text: 'Named', color: C.mintDeep, bg: '#e6f6f0' },
};

function quoteBlock(q: FindingsQuote, last: boolean): string {
  const v = VERDICT[q.verdict];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 ${last ? 0 : 22}px;">
<tr><td>
  <p style="margin:0 0 10px;"><span style="display:inline-block;padding:4px 9px;border-radius:8px;background:${v.bg};color:${v.color};font:600 10px/1.2 ${MONO};letter-spacing:.08em;text-transform:uppercase;">${esc(v.text)}</span></p>
  <p style="margin:0 0 10px;font:500 13px/1.5 ${MONO};color:${C.text};">Buyer asked: “${esc(q.question)}”</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="width:3px;background:${q.verdict === 'absent' ? C.coral : C.blue};border-radius:3px;"></td>
    <td style="padding:12px 16px;background:${C.soft};border-radius:0 12px 12px 0;font:400 14.5px/1.6 ${SANS};color:#2c2b3b;">AI answered: “${esc(q.quote)}”</td>
  </tr></table>
  <p style="margin:10px 0 0;font:400 13.5px/1.55 ${SANS};color:${C.muted};">${esc(q.note)}</p>
</td></tr></table>`;
}

function sourceRow(s: FindingsSource, max: number): string {
  const pct = Math.max(8, Math.round((s.answers / max) * 100));
  const isYou = s.tag === 'you';
  return `<tr>
  <td style="padding:7px 12px 7px 0;font:500 13px/1.3 ${MONO};color:${C.text};white-space:nowrap;">${esc(s.domain)}${s.tag ? `<br><span style="font:400 11px ${SANS};color:${C.faint};">${esc(s.tag === 'you' ? 'your site' : s.tag)}</span>` : ''}</td>
  <td style="padding:7px 0;width:100%;"><table role="presentation" width="${pct}%" cellpadding="0" cellspacing="0"><tr><td style="height:10px;background:${isYou ? C.mintDeep : C.blue};border-radius:6px;font-size:0;line-height:0;">&nbsp;</td></tr></table></td>
  <td style="padding:7px 0 7px 12px;font:600 13px ${SANS};color:${C.text};white-space:nowrap;text-align:right;">${s.answers} ${s.answers === 1 ? 'answer' : 'answers'}</td>
</tr>`;
}

export function findingsEmail(input: FindingsEmailInput): { subject: string; html: string; text: string } {
  const maxSource = Math.max(1, ...input.sources.items.map((s) => s.answers));
  const appUrl = getAppUrl();

  const header = `<tr><td style="padding:0 4px 18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
  <td><img src="${appUrl}/brand/brandpulse-wordmark.png" width="124" alt="brandpulse" style="display:block;border:0;height:auto;font:700 18px ${SANS};color:${C.blue};"></td>
  <td align="right" style="font:500 10.5px ${MONO};letter-spacing:.12em;text-transform:uppercase;color:${C.faint};">AI visibility check · ${esc(input.observedOn)}</td>
</tr></table></td></tr>`;

  const intro = card(`<p style="margin:0 0 14px;font:600 17px/1.4 ${SANS};color:${C.text};">${esc(input.greeting)}</p>
${input.intro.map((p) => `<p style="margin:0 0 12px;font:400 15px/1.65 ${SANS};color:#2c2b3b;">${esc(p)}</p>`).join('')}`);

  const hero = `<tr><td style="padding:0 0 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.ink};border-radius:20px;"><tr><td style="padding:30px 28px;">
${label('The result', '#a09fcf')}
<p style="margin:0;font:500 64px/1 ${SANS};letter-spacing:-.05em;color:#ffffff;">${esc(input.headline.value)}</p>
<p style="margin:14px 0 22px;font:400 16px/1.55 ${SANS};color:#e0dfee;">${esc(input.headline.caption)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
${input.stats.map((s, i) => `<td width="${Math.floor(100 / input.stats.length)}%" style="padding:14px 14px 14px ${i === 0 ? 0 : 14}px;border-top:1px solid #2c2a38;vertical-align:top;">
  <p style="margin:0;font:500 26px/1 ${SANS};letter-spacing:-.04em;color:${C.mint};">${esc(s.value)}</p>
  <p style="margin:6px 0 0;font:400 12.5px/1.45 ${SANS};color:${C.inkText};">${esc(s.label)}</p>
</td>`).join('')}
</tr></table>
<p style="margin:16px 0 0;font:400 11.5px/1.5 ${MONO};color:#807d96;">${esc(input.engineLabel)} · ${esc(input.observedOn)}</p>
</td></tr></table></td></tr>`;

  const quotes = card(`${label('What AI actually said')}
<p style="margin:0 0 22px;font:600 20px/1.3 ${SANS};letter-spacing:-.02em;color:${C.text};">Real answers, word for word</p>
${input.quotes.map((q, i) => quoteBlock(q, i === input.quotes.length - 1)).join('')}`);

  const sources = card(`${label('Who AI trusts instead')}
<p style="margin:0 0 6px;font:600 20px/1.3 ${SANS};letter-spacing:-.02em;color:${C.text};">The websites AI quoted</p>
<p style="margin:0 0 16px;font:400 14px/1.55 ${SANS};color:${C.muted};">Out of ${input.sources.total} answers, how many cited each site as a source.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${input.sources.items.map((s) => sourceRow(s, maxSource)).join('')}</table>
<p style="margin:16px 0 0;font:400 13.5px/1.55 ${SANS};color:${C.muted};">${esc(input.sources.note)}</p>`);

  const why = card(`${label('Why this happens')}
${input.why.map((p) => `<p style="margin:0 0 12px;font:400 15px/1.65 ${SANS};color:#2c2b3b;">${esc(p)}</p>`).join('')}`, { bg: C.card });

  const fixes = card(`${label('What we would fix first')}
<p style="margin:0 0 18px;font:600 20px/1.3 ${SANS};letter-spacing:-.02em;color:${C.text};">${input.fixes.length} pages, in this order</p>
${input.fixes.map((f, i) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 ${i === input.fixes.length - 1 ? 0 : 16}px;"><tr>
  <td style="width:44px;vertical-align:top;font:500 20px/1.2 ${MONO};color:${i === 0 ? C.blue : '#c4c3d7'};">${String(i + 1).padStart(2, '0')}</td>
  <td style="vertical-align:top;">
    <p style="margin:0 0 4px;font:600 15.5px/1.4 ${SANS};color:${C.text};">${esc(f.title)}</p>
    <p style="margin:0;font:400 14px/1.6 ${SANS};color:${C.muted};">${esc(f.body)}</p>
  </td>
</tr></table>`).join('')}`);

  const cta = `<tr><td style="padding:0 0 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.blueDeep};border-radius:20px;"><tr><td style="padding:30px 28px;">
${label('Done for you', '#dcdbfd')}
<p style="margin:0 0 10px;font:600 22px/1.3 ${SANS};letter-spacing:-.02em;color:#ffffff;">${esc(input.cta.title)}</p>
<p style="margin:0 0 22px;font:400 15px/1.6 ${SANS};color:#e8e6fe;">${esc(input.cta.body)}</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#ffffff;border-radius:12px;"><a href="${esc(input.cta.href)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 22px;font:600 15px ${SANS};color:#261d5a;text-decoration:none;">${esc(input.cta.label)} &rarr;</a></td></tr></table>
</td></tr></table></td></tr>`;

  const signoff = `<tr><td style="padding:14px 6px 0;">
<p style="margin:0 0 4px;font:400 15px/1.6 ${SANS};color:${C.text};">${esc(input.senderName)}</p>
${input.senderRole ? `<p style="margin:0;font:400 13.5px/1.5 ${SANS};color:${C.muted};">${esc(input.senderRole)}</p>` : ''}
${input.ps ? `<p style="margin:18px 0 0;font:400 13.5px/1.6 ${SANS};color:${C.muted};"><strong style="color:${C.text};">P.S.</strong> ${esc(input.ps)}</p>` : ''}
<p style="margin:28px 0 0;font:400 11.5px/1.6 ${SANS};color:${C.faint};">BrandPulse · AI visibility, done for you · <a href="${appUrl}" style="color:${C.faint};">${esc(appUrl.replace(/^https?:\/\//, ''))}</a><br>Not useful? Reply “no” and we won’t email again.</p>
</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(input.subject)}</title></head>
<body style="margin:0;padding:0;background:${C.paper};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.paper};">${esc(input.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper};"><tr><td align="center" style="padding:32px 12px 40px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
${header}${intro}${hero}${quotes}${sources}${why}${fixes}${cta}${signoff}
</table></td></tr></table>
</body></html>`;

  const text = [
    input.greeting, '', ...input.intro, '',
    `${input.headline.value}: ${input.headline.caption}`, '',
    'What AI actually said:',
    ...input.quotes.flatMap((q) => [`- Buyer asked: "${q.question}"`, `  AI answered: "${q.quote}"`, `  ${q.note}`]), '',
    'The websites AI quoted:', ...input.sources.items.map((s) => `- ${s.domain}: ${s.answers} of ${input.sources.total} answers`), '',
    ...input.why, '',
    'What we would fix first:', ...input.fixes.map((f, i) => `${i + 1}. ${f.title}: ${f.body}`), '',
    input.cta.title, input.cta.body, '',
    input.senderName, input.senderRole ?? '', input.ps ? `P.S. ${input.ps}` : '',
  ].join('\n');

  return { subject: input.subject, html, text };
}
