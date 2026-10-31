import { getAppUrl } from '@/lib/app-url';

const BRAND_ACCENT = '#463eda';
const DARK = '#1a1a1a';
const LIGHT_BG = '#f7f7fa';
const BORDER = '#e6e5eb';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

function safeSubject(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim().slice(0, 160);
}

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${LIGHT_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${DARK};line-height:1.6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${LIGHT_BG};"><tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid ${BORDER};overflow:hidden;">
<tr><td style="padding:32px 40px 0;"><img src="${getAppUrl()}/brand/brandpulse-wordmark.png" width="132" alt="brandpulse" style="display:block;border:0;height:auto;font-size:20px;font-weight:700;color:${BRAND_ACCENT};"></td></tr>
<tr><td style="padding:24px 40px 40px;">${content}</td></tr>
</table>
<p style="margin:24px 0 0;font-size:12px;color:#9e9caf;text-align:center;">&copy; ${new Date().getFullYear()} BrandPulse &middot; AI visibility, done for you</p>
</td></tr></table>
</body></html>`;
}

function button(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;"><tr><td style="background:${BRAND_ACCENT};border-radius:8px;"><a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(label)}</a></td></tr></table>`;
}

/** Sent once, when a new account finishes its first sign-in. */
export function welcomeEmail(params: { name: string | null; freeAudit: boolean }): { subject: string; html: string } {
  const hello = params.name ? `Welcome, ${escapeHtml(params.name.split(' ')[0] ?? params.name)}` : 'Welcome to BrandPulse';
  const step = (n: number, title: string, body: string) => `<tr><td style="width:36px;vertical-align:top;padding:0 0 16px;"><span style="display:inline-block;width:26px;height:26px;border-radius:50%;background:${BRAND_ACCENT};color:#fff;font-size:13px;font-weight:700;line-height:26px;text-align:center;">${n}</span></td><td style="vertical-align:top;padding:2px 0 16px;"><p style="margin:0;font-size:15px;font-weight:600;color:${DARK};">${title}</p><p style="margin:2px 0 0;font-size:14px;color:#4c4b63;">${body}</p></td></tr>`;
  return {
    subject: 'Welcome to BrandPulse: here’s how your audit works',
    html: layout(`
<h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:${DARK};">${hello}</h1>
<p style="margin:0 0 20px;font-size:16px;line-height:1.55;color:${DARK};">We find out what AI tells your buyers when they ask about businesses like yours, and who it names instead of you.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 8px;">
${step(1, 'Tell us about your business', 'Your website, what you sell and who you compete with. Two minutes.')}
${step(2, 'We run your audit', 'We ask AI the real questions your buyers ask and record every answer word for word.')}
${step(3, 'You get your report by email', 'Where you show up, where you don’t, and who AI recommends instead.')}
</table>
${params.freeAudit
    ? '<p style="margin:0 0 4px;font-size:15px;color:#4c4b63;">Your first audit is free.</p>'
    : '<p style="margin:0 0 4px;font-size:15px;color:#4c4b63;">Your account is ready. Reply to this email if you have any trouble requesting your audit.</p>'}
${button('Set up your business', `${getAppUrl()}/dashboard/onboarding`)}
<p style="margin:16px 0 0;font-size:13px;color:#9e9caf;">Questions? Just reply to this email. A real person reads it.</p>`),
  };
}

export function auditCompleteEmail(params: {
  businessName: string;
  visibilityScore: number;
  presenceRate: number;
  reportUrl: string;
  mentionedCount?: number;
  answeredCount?: number;
  topCompetitorName?: string;
  topCompetitorMentioned?: number;
}): { subject: string; html: string } {
  const { businessName, visibilityScore, presenceRate, reportUrl, mentionedCount, answeredCount, topCompetitorName, topCompetitorMentioned } = params;
  const presencePct = Math.round(presenceRate * 100);
  const safeBusinessName = escapeHtml(businessName);
  const safeCompetitorName = topCompetitorName ? escapeHtml(topCompetitorName) : undefined;
  const observation = mentionedCount != null && answeredCount != null
    ? topCompetitorName && topCompetitorMentioned != null && topCompetitorMentioned > mentionedCount
      ? `<strong>${safeBusinessName}</strong> appeared in <strong>${mentionedCount} of ${answeredCount}</strong> observed answers. <strong style="color:#dc2626;">${safeCompetitorName} appeared in ${topCompetitorMentioned}.</strong>`
      : `<strong>${safeBusinessName}</strong> appeared in <strong>${mentionedCount} of ${answeredCount}</strong> observed answers.`
    : `The controlled answer-engine benchmark for <strong>${safeBusinessName}</strong> is complete.`;

  return {
    subject: safeSubject(`Your BrandPulse report is ready — ${businessName}`),
    html: layout(`
<h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${DARK};">Your audit is ready</h1>
<p style="margin:0 0 20px;font-size:17px;line-height:1.5;color:${DARK};">${observation}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr>
<td width="50%" style="padding:20px;background:${LIGHT_BG};border-radius:10px 0 0 10px;text-align:center;border:1px solid ${BORDER};border-right:none;"><span style="display:block;font-size:36px;font-weight:800;color:${BRAND_ACCENT};">${visibilityScore}</span><span style="font-size:13px;color:#6e6b80;text-transform:uppercase;letter-spacing:0.5px;">Observed visibility</span></td>
<td width="50%" style="padding:20px;background:${LIGHT_BG};border-radius:0 10px 10px 0;text-align:center;border:1px solid ${BORDER};border-left:none;"><span style="display:block;font-size:36px;font-weight:800;color:${BRAND_ACCENT};">${presencePct}%</span><span style="font-size:13px;color:#6e6b80;text-transform:uppercase;letter-spacing:0.5px;">Mention rate</span></td>
</tr></table>
<p style="margin:0 0 4px;font-size:15px;color:#4c4b63;">Open the report for the captured answers, competitor comparisons, source evidence, and prioritized work.</p>
${button('View report', reportUrl)}
<p style="margin:16px 0 0;font-size:13px;color:#9e9caf;">Want us to fix what the report found? Reply to this email and we’ll scope it with you.</p>`),
  };
}

export function intelligenceCompleteEmail(params: {
  businessName: string;
  reportUrl: string;
}): { subject: string; html: string } {
  const safeBusinessName = escapeHtml(params.businessName);
  return {
    subject: safeSubject(`Your AI visibility report is ready — ${params.businessName}`),
    html: layout(`
<h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${DARK};">Your report is ready</h1>
<p style="margin:0 0 20px;font-size:17px;line-height:1.5;color:${DARK};">We asked AI the questions buyers ask about <strong>${safeBusinessName}</strong>’s category and recorded every answer.</p>
<p style="margin:0 0 4px;font-size:15px;color:#4c4b63;">Open the report to see the questions, the actual AI answers, who was named instead of you, and what to fix first.</p>
${button('View your report', params.reportUrl)}
<p style="margin:16px 0 0;font-size:13px;color:#9e9caf;">Want us to fix what the report found? Reply to this email and we’ll scope it with you.</p>`),
  };
}

/** Sent to the requester the moment their audit is queued. */
export function auditRequestReceivedEmail(params: { businessName: string; website: string; questionCount: number }): { subject: string; html: string } {
  const name = escapeHtml(params.businessName);
  const site = escapeHtml(params.website.replace(/^https?:\/\//, '').replace(/\/$/, ''));
  return {
    subject: safeSubject(`We’ve got your audit request — ${params.businessName}`),
    html: layout(`
<h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${DARK};">Your audit is in the queue</h1>
<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:${DARK};">We’ll ask AI ${params.questionCount} questions buyers ask before choosing a business like <strong>${name}</strong> (${site}), and record every answer word for word.</p>
<p style="margin:0 0 16px;font-size:15px;color:#4c4b63;">You don’t need to do anything. We’ll email your report link as soon as it’s ready, usually within one working day.</p>
<p style="margin:16px 0 0;font-size:13px;color:#9e9caf;">Didn’t request this? You can ignore this email.</p>`),
  };
}

/** Sent to the admin allowlist so a new request is never missed. */
export function adminNewRequestEmail(params: { businessName: string; website: string; requesterEmail: string | null; source: string; requestedAt: string; adminUrl: string; queueId?: string | null }): { subject: string; html: string } {
  const row = (label: string, value: string) => `<tr><td style="padding:8px 0;font-size:13px;color:#6e6b80;width:120px;">${label}</td><td style="padding:8px 0;font-size:14px;color:${DARK};">${value}</td></tr>`;
  const when = new Date(params.requestedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
  return {
    subject: safeSubject(`New audit request: ${params.businessName}`),
    html: layout(`
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${DARK};">New audit request</h1>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid ${BORDER};">
${row('Business', `<strong>${escapeHtml(params.businessName)}</strong>`)}
${row('Website', escapeHtml(params.website))}
${row('Requested by', escapeHtml(params.requesterEmail ?? 'Unknown'))}
${row('Source', escapeHtml(params.source))}
${row('Received', `${escapeHtml(when)} IST`)}
</table>
${params.queueId && /^[0-9a-f-]{36}$/i.test(params.queueId) ? `
<p style="margin:20px 0 6px;font-size:13px;font-weight:600;color:${DARK};">Run it from your terminal (project folder):</p>
<p style="margin:0 0 6px;padding:10px 12px;border-radius:8px;background:#0f0e16;color:#e0dfee;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace;word-break:break-all;">npm run audit:run -- ${params.queueId} --charge --confirm</p>
<p style="margin:0 0 4px;font-size:12px;color:#6e6b80;">Takes 1 credit from the user. To run it free instead:</p>
<p style="margin:0;padding:10px 12px;border-radius:8px;background:#0f0e16;color:#e0dfee;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace;word-break:break-all;">npm run audit:run -- ${params.queueId} --free --confirm</p>` : ''}
${button('Open the admin console', params.adminUrl)}
<p style="margin:16px 0 0;font-size:13px;color:#9e9caf;">Nothing runs and nothing is charged until you run one of these.</p>`),
  };
}

export type TalkTopic = 'fixes' | 'more_audits';

const TALK_TOPIC_LABEL: Record<TalkTopic, string> = {
  fixes: 'Wants us to do the fixes',
  more_audits: 'Wants more audits',
};

/** Sent to the admin allowlist when a signed-in client asks to talk. Replies go to the client. */
export function adminTalkRequestEmail(params: {
  topic: TalkTopic;
  requesterEmail: string;
  businessName: string | null;
  website: string | null;
  phone: string | null;
  note: string | null;
  requestedAt: string;
  adminUrl: string;
}): { subject: string; html: string } {
  const row = (label: string, value: string) => `<tr><td style="padding:8px 0;font-size:13px;color:#6e6b80;width:120px;vertical-align:top;">${label}</td><td style="padding:8px 0;font-size:14px;color:${DARK};">${value}</td></tr>`;
  const when = new Date(params.requestedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
  const who = params.businessName ?? params.requesterEmail;
  return {
    subject: safeSubject(`${params.topic === 'fixes' ? 'Fix request' : 'More audits'}: ${who}`),
    html: layout(`
<h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:${DARK};">${escapeHtml(TALK_TOPIC_LABEL[params.topic])}</h1>
<p style="margin:0 0 16px;font-size:14px;color:#4c4b63;">A client asked to talk from their dashboard. Reply to this email to reach them directly.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid ${BORDER};">
${params.businessName ? row('Business', `<strong>${escapeHtml(params.businessName)}</strong>`) : ''}
${params.website ? row('Website', escapeHtml(params.website)) : ''}
${row('Email', escapeHtml(params.requesterEmail))}
${params.phone ? row('Phone', escapeHtml(params.phone)) : ''}
${params.note ? row('Note', escapeHtml(params.note).replace(/\n/g, '<br>')) : ''}
${row('Received', `${escapeHtml(when)} IST`)}
</table>
${button('Open the admin console', params.adminUrl)}`),
  };
}

/** Confirms to the client that their request reached a person. */
export function talkRequestReceivedEmail(params: { topic: TalkTopic; businessName: string | null }): { subject: string; html: string } {
  const name = params.businessName ? `<strong>${escapeHtml(params.businessName)}</strong>` : 'your business';
  const body = params.topic === 'fixes'
    ? `We’ll go through ${name}’s fix plan before we talk, so the call is about what to do first, not about what we found.`
    : `We’ll set up the extra audits for ${name} and confirm what’s included before anything runs.`;
  return {
    subject: safeSubject(params.topic === 'fixes' ? 'We got your request — let’s fix this' : 'We got your request for more audits'),
    html: layout(`
<h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${DARK};">A real person has your request</h1>
<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:${DARK};">${body}</p>
<p style="margin:0 0 16px;font-size:15px;color:#4c4b63;">Expect a reply within one working day. If something’s urgent, just reply to this email.</p>`),
  };
}
