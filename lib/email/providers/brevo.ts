// Brevo (formerly Sendinblue) transactional email via REST API — no SDK needed.
// Free tier: 300 emails/day, sends from a verified sender address (no custom
// domain required). https://developers.brevo.com/reference/sendtransacemail
//
// Env:
//   BREVO_API_KEY   — API key (Brevo → SMTP & API → API Keys)
//   EMAIL_FROM      — verified sender email (Brevo → Senders)
//   EMAIL_FROM_NAME — display name (default "BrandPulse")

import type { EmailMessage } from '../mailer';

export async function sendViaBrevo({ to, subject, html, replyTo, text }: EmailMessage): Promise<{ id: string } | null> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn('[email] BREVO_API_KEY not set — skipping email send');
    return null;
  }
  const fromEmail = process.env.EMAIL_FROM;
  if (!fromEmail) {
    console.warn('[email] EMAIL_FROM not set — skipping email send');
    return null;
  }
  const fromName = process.env.EMAIL_FROM_NAME ?? 'BrandPulse';

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: fromEmail, name: fromName },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      ...(text ? { textContent: text } : {}),
      ...(replyTo ? { replyTo: { email: replyTo } } : {}),
    }),
  });

  if (!res.ok) {
    console.error('[email] Brevo send failed:', res.status, await res.text().catch(() => ''));
    return null;
  }
  const data = (await res.json().catch(() => ({}))) as { messageId?: string };
  return { id: data.messageId ?? '' };
}
