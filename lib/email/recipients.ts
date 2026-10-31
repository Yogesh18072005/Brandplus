import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

type AdminClient = SupabaseClient<Database>;

/**
 * Who receives a project's report email, in order:
 * 1. the email from the free-audit request (homepage form → leads),
 * 2. the account email on the owner's profile (Clerk sign-ins live here),
 * 3. the legacy Supabase Auth user (accounts created before Clerk).
 * Returns null when no address is known; never throws.
 */
export async function resolveReportRecipient(client: AdminClient, projectId: string, ownerUserId: string | null | undefined): Promise<string | null> {
  try {
    const { data: lead } = await client.from('leads').select('email').eq('project_id', projectId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (lead?.email) return lead.email;
    if (!ownerUserId) return null;
    const { data: profile } = await client.from('profiles').select('email').eq('id', ownerUserId).maybeSingle();
    if (profile?.email) return profile.email;
    const { data } = await client.auth.admin.getUserById(ownerUserId);
    return data.user?.email ?? null;
  } catch (error) {
    console.warn('[email] recipient lookup failed:', error instanceof Error ? error.message : error);
    return null;
  }
}

/** Addresses on the admin allowlist, for operational notifications. */
export function adminNotificationEmails(value: string | undefined = process.env.ADMIN_EMAILS): string[] {
  return [...new Set((value ?? '').split(',').map((email) => email.trim().toLowerCase()).filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))];
}
