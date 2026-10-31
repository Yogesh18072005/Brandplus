import { timingSafeEqual } from 'node:crypto';

export interface ServiceRequestAuth {
  configured: boolean;
  authorized: boolean;
}

function sameSecret(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Authenticate server-to-server routes. Missing configuration always fails
 * closed; callers can return 503 to distinguish it from a bad credential.
 */
export function authorizeServiceRequest(
  request: Request,
  envNames: readonly string[] = ['ADMIN_SECRET', 'CRON_SECRET']
): ServiceRequestAuth {
  const secrets = envNames
    .map((name) => process.env[name]?.trim())
    .filter((value): value is string => Boolean(value));

  if (secrets.length === 0) return { configured: false, authorized: false };

  const header = request.headers.get('authorization') ?? '';
  const prefix = 'Bearer ';
  if (!header.startsWith(prefix)) return { configured: true, authorized: false };

  return {
    configured: true,
    authorized: secrets.some((secret) => sameSecret(header.slice(prefix.length), secret)),
  };
}
