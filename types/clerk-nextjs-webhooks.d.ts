// Clerk's runtime and documentation accept the Web Request passed to an App
// Router handler, while its current Next.js declaration narrows RequestLike to
// NextRequest. Keep the route standards-compliant until the SDK types converge.
import type { VerifyWebhookOptions, WebhookEvent } from '@clerk/backend/webhooks';

declare module '@clerk/nextjs/webhooks' {
  export function verifyWebhook(
    request: Request,
    options?: VerifyWebhookOptions,
  ): Promise<WebhookEvent>;
}
