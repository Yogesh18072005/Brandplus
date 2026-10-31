// Provider-agnostic mailer — THE single swap point for email providers.
//
// To switch providers, change the one `send` assignment below. Everything else
// in the app imports `sendEmail` from here and never touches a provider SDK.
//
// Default: Brevo, configured through server-only environment variables.

import { sendViaBrevo } from './providers/brevo';
import { recordOperationalEvent } from '@/lib/ops/events';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  /** Where replies go instead of the sender, e.g. the client who asked for a call. */
  replyTo?: string;
  /** Plain-text alternative; improves deliverability for hand-written emails. */
  text?: string;
}

export type EmailSender = (msg: EmailMessage) => Promise<{ id: string } | null>;

// ⇩ swap provider here (one-line change) ⇩
const send: EmailSender = sendViaBrevo;

/** Send a transactional email. Never throws — logs and returns null on failure
 *  so a delivery problem can't crash the audit pipeline. */
export async function sendEmail(msg: EmailMessage): Promise<{ id: string } | null> {
  try {
    const result = await send(msg);
    await recordOperationalEvent({
      eventType: result ? 'email_sent' : 'email_failed',
      severity: result ? 'info' : 'warning',
      metadata: { provider: 'brevo' },
    });
    return result;
  } catch (err) {
    console.error('[email] send failed:', err instanceof Error ? err.message : err);
    await recordOperationalEvent({
      eventType: 'email_failed',
      severity: 'error',
      metadata: {
        provider: 'brevo',
        error: err instanceof Error ? err.message.slice(0, 300) : 'Unknown email provider error',
      },
    });
    return null;
  }
}
