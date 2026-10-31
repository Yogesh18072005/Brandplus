import { sendEmail } from '@/lib/email/mailer';
import { adminTalkRequestEmail, talkRequestReceivedEmail, type TalkTopic } from '@/lib/email/templates';
import { adminNotificationEmails } from '@/lib/email/recipients';
import { recordOperationalEvent } from '@/lib/ops/events';
import { adminQueueUrl } from './audit-requested';

export interface TalkRequestNotice {
  topic: TalkTopic;
  requesterEmail: string;
  projectId: string | null;
  businessName: string | null;
  website: string | null;
  phone: string | null;
  note: string | null;
  /**
   * Confirm to the requester. Off for unauthenticated requests: an unverified
   * address could otherwise be used to send our email to anyone.
   */
  confirmToRequester?: boolean;
}

/**
 * A client asked a person to get in touch. Alert the admin allowlist (replies go
 * straight to the client), confirm receipt to the client, and log it so the
 * admin console lists it even if an email bounces. Never throws.
 */
export async function notifyTalkRequested(notice: TalkRequestNotice): Promise<{ requester: boolean; admins: number }> {
  const requestedAt = new Date().toISOString();
  const adminMessage = adminTalkRequestEmail({ ...notice, requestedAt, adminUrl: adminQueueUrl() });
  let adminsSent = 0;
  let requester = false;
  await Promise.allSettled([
    ...adminNotificationEmails().map((to) => sendEmail({ to, replyTo: notice.requesterEmail, ...adminMessage })
      .then((sent) => { if (sent) adminsSent++; })),
    notice.confirmToRequester === false
      ? Promise.resolve()
      : sendEmail({ to: notice.requesterEmail, ...talkRequestReceivedEmail({ topic: notice.topic, businessName: notice.businessName }) })
        .then((sent) => { requester = Boolean(sent); }),
    recordOperationalEvent({
      eventType: 'talk_requested',
      projectId: notice.projectId,
      metadata: {
        topic: notice.topic,
        email: notice.requesterEmail,
        businessName: notice.businessName ?? undefined,
        hasPhone: Boolean(notice.phone),
        note: notice.note?.slice(0, 280) ?? undefined,
      },
    }),
  ]);
  return { requester, admins: adminsSent };
}
