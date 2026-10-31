// Preview or send one hand-written findings email (lib/email/findings-email.ts).
// Nothing is sent without --send, a recipient and --confirm.
//
//   npm run findings-email -- data/outreach/emails/citybond.json
//       → writes citybond.preview.html next to the spec. Open it in a browser.
//   npm run findings-email -- data/outreach/emails/citybond.json --send --to owner@example.com --confirm
//       → sends through Brevo from EMAIL_FROM. Replies go to --reply-to (default EMAIL_FROM).
//   Logo and links use NEXT_PUBLIC_APP_URL unless it is localhost; then https://www.zerociate.com.

import { readFileSync, writeFileSync } from 'node:fs';
import { config } from 'dotenv';
import { findingsEmail, type FindingsEmailInput } from '@/lib/email/findings-email';

config({ path: '.env.local', quiet: true });

// The email leaves this machine, so its logo and links must point at the live
// site, never localhost. Override with --app-url.
const appUrlFlag = process.argv.indexOf('--app-url');
const appUrl = appUrlFlag > 0 ? process.argv[appUrlFlag + 1] : process.env.NEXT_PUBLIC_APP_URL;
process.env.NEXT_PUBLIC_APP_URL = appUrl && !/localhost|127\.0\.0\.1/.test(appUrl) ? appUrl : 'https://www.zerociate.com';

function arg(name: string): string | null {
  const index = process.argv.indexOf(`--${name}`);
  return index > 0 ? process.argv[index + 1] ?? null : null;
}

async function main() {
  const specPath = process.argv[2];
  if (!specPath || specPath.startsWith('--')) {
    console.log('Usage: npm run findings-email -- <spec.json> [--send --to email --confirm] [--reply-to email]');
    process.exit(1);
  }
  const spec = JSON.parse(readFileSync(specPath, 'utf8')) as FindingsEmailInput;
  const replyTo = arg('reply-to') ?? process.env.EMAIL_FROM ?? null;
  if (spec.cta.href === 'reply') {
    if (!replyTo) throw new Error('Set EMAIL_FROM or pass --reply-to so the button can open a reply.');
    spec.cta.href = `mailto:${replyTo}?subject=${encodeURIComponent(`Re: ${spec.subject}`)}`;
  }
  const email = findingsEmail(spec);
  const previewPath = specPath.replace(/\.json$/, '.preview.html');
  writeFileSync(previewPath, email.html);
  console.log(`Subject: ${email.subject}`);
  console.log(`Preview: ${previewPath}`);

  if (!process.argv.includes('--send')) return;
  const to = arg('to');
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error('--send needs --to <email>.');
  if (!process.argv.includes('--confirm')) {
    console.log(`DRY RUN: would send to ${to}. Add --confirm to send.`);
    return;
  }
  const { sendEmail } = await import('@/lib/email/mailer');
  const sent = await sendEmail({ to, subject: email.subject, html: email.html, text: email.text, ...(replyTo ? { replyTo } : {}) });
  if (!sent) throw new Error('Send failed. Check BREVO_API_KEY, EMAIL_FROM and the Brevo logs.');
  console.log(`Sent to ${to} (message ${sent.id || 'accepted'}).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
