function configuredOpsEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Server-only allowlist for the v1 founder operations console. */
export function isOpsUser(email: string | null | undefined): boolean {
  if (!email) return false;
  return configuredOpsEmails().has(email.trim().toLowerCase());
}
