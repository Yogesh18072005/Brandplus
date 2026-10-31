const DEFAULT_REDIRECT = '/dashboard';

/**
 * Accept only paths inside this application. This prevents login/callback URLs
 * from becoming open redirects to attacker-controlled sites.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = DEFAULT_REDIRECT): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return fallback;
  }

  try {
    const parsed = new URL(value, 'https://app.invalid');
    if (parsed.origin !== 'https://app.invalid') return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
