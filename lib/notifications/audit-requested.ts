import { sendEmail } from '@/lib/email/mailer';
import { adminNewRequestEmail, auditRequestReceivedEmail } from '@/lib/email/templates';
import { adminNotificationEmails } from '@/lib/email/recipients';
import { adminOrigin } from '@/lib/admin/host';
import { getAppUrl } from '@/lib/app-url';

export interface AuditRequestedNotice {
  businessName: string;
  website: string;
  requesterEmail: string | null;
  /** Shown to the admin: "Homepage form", "Free account", "Starter account", … */
  source: string;
  questionCount: number;
  requestedAt?: string;
  /** The request id, so the admin email can carry the run commands. */
  queueId?: string | null;
}

export function adminQueueUrl(): string {
  return adminOrigin() ?? `${getAppUrl()}/admin`;
}

/**
 * A new audit is waiting in the admin queue: confirm receipt to the requester
 * and alert the admin allowlist. Email failures are logged by the mailer and
 * never block or fail the request itself.
 */
export async function notifyAuditRequested(notice: AuditRequestedNotice): Promise<{ requester: boolean; admins: number }> {
  const requestedAt = notice.requestedAt ?? new Date().toISOString();
  const sends: Array<Promise<unknown>> = [];
  let requester = false;
  if (notice.requesterEmail) {
    sends.push(sendEmail({
      to: notice.requesterEmail,
      ...auditRequestReceivedEmail({ businessName: notice.businessName, website: notice.website, questionCount: notice.questionCount }),
    }).then((sent) => { requester = Boolean(sent); }));
  }
  const admins = adminNotificationEmails();
  let adminsSent = 0;
  const adminMessage = adminNewRequestEmail({
    businessName: notice.businessName,
    website: notice.website,
    requesterEmail: notice.requesterEmail,
    source: notice.source,
    requestedAt,
    adminUrl: adminQueueUrl(),
    queueId: notice.queueId ?? null,
  });
  for (const to of admins) {
    sends.push(sendEmail({ to, ...adminMessage }).then((sent) => { if (sent) adminsSent++; }));
  }
  await Promise.allSettled(sends);
  return { requester, admins: adminsSent };
}
