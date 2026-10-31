const DEFAULT_MAX_BODY_BYTES = 32 * 1024;

function allowedOrigins(request: Request): Set<string> {
  const allowed = new Set<string>();

  try {
    allowed.add(new URL(request.url).origin);
  } catch {
    // A malformed request URL will fail the origin check below.
  }

  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    try {
      allowed.add(new URL(configured).origin);
    } catch {
      // Deployment configuration is validated separately at startup.
    }
  }

  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  if (forwardedHost) {
    const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https';
    try {
      allowed.add(new URL(`${forwardedProto}://${forwardedHost}`).origin);
    } catch {
      // Ignore malformed proxy headers.
    }
  }

  return allowed;
}

export type MutationGuardResult =
  | { ok: true }
  | { ok: false; status: 403 | 413 | 415; error: string };

/**
 * Defense-in-depth for cookie-authenticated mutation routes. Supabase cookies
 * are SameSite, but rejecting explicit cross-site browser requests closes the
 * CSRF gap if cookie settings change later.
 */
export function guardMutationRequest(
  request: Request,
  options: { json?: boolean; maxBodyBytes?: number } = {},
): MutationGuardResult {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite === 'cross-site') {
    return { ok: false, status: 403, error: 'Cross-site request rejected' };
  }

  const origin = request.headers.get('origin');
  if (origin && !allowedOrigins(request).has(origin)) {
    return { ok: false, status: 403, error: 'Request origin rejected' };
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
  if (Number.isFinite(contentLength) && contentLength > maxBodyBytes) {
    return { ok: false, status: 413, error: 'Request body is too large' };
  }

  if (options.json) {
    const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
    if (!contentType.startsWith('application/json')) {
      return { ok: false, status: 415, error: 'Content-Type must be application/json' };
    }
  }

  return { ok: true };
}
