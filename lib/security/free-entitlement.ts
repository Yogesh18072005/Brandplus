import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { hashPrivateIdentifier, hashRequestNetwork } from '@/lib/security/request-network';

type AdminClient = SupabaseClient<Database>;

export const FREE_NETWORK_ACCOUNT_LIMIT = 2;
export const FREE_NETWORK_AUDIT_LIMIT = 2;

export async function claimSignupCredit(
  admin: AdminClient,
  profileId: string,
  headers: Pick<Headers, 'get'>,
): Promise<{ allowed: boolean; status: string }> {
  const networkHash = hashRequestNetwork(headers, 'free-entitlement-network');
  const { data, error } = await admin.rpc('claim_free_signup_credit', {
    p_profile_id: profileId,
    p_network_hash: networkHash ?? '',
  }).single();
  if (error || !data) throw new Error(error?.message ?? 'Free-credit decision failed');
  return { allowed: data.allowed, status: data.status };
}

export async function claimPublicAudit(
  admin: AdminClient,
  headers: Pick<Headers, 'get'>,
  email: string,
): Promise<{ allowed: boolean; reason: string }> {
  const networkHash = hashRequestNetwork(headers, 'free-entitlement-network');
  const emailHash = hashPrivateIdentifier('free-audit-email', email.trim().toLowerCase());
  const { data, error } = await admin.rpc('claim_free_public_audit', {
    p_network_hash: networkHash ?? '',
    p_email_hash: emailHash ?? '',
  }).single();
  if (error || !data) throw new Error(error?.message ?? 'Free-audit decision failed');
  return { allowed: data.allowed, reason: data.reason };
}

export const FREE_CREDIT_LIMIT_MESSAGE =
  'Free audit credit unavailable. This network has already claimed the maximum of two free accounts. You can still use your account and purchase a plan or credit pack.';

export const FREE_AUDIT_LIMIT_MESSAGE =
  'This network has already used the maximum of two free audits. Sign in to continue with a paid plan or credit pack.';
