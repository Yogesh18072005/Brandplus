import { createClient, type User } from '@supabase/supabase-js';
import type { Database } from './types';
import { getSupabaseServerConfig } from './config';

interface ProvisionedProfile {
  internalId: string;
  email: string;
  fullName: string;
  createdAt: string;
  updatedAt?: string;
}

// Provisioning costs a Clerk Backend API call plus two database RPCs. Every
// dashboard request used to pay that before reading any data, so remember the
// result per Clerk user for a few minutes on this server instance. The mapping
// is stable; an email change shows up once the entry expires.
const PROFILE_TTL_MS = 5 * 60 * 1000;
const PROFILE_CACHE_LIMIT = 500;
const profileCache = new Map<string, { profile: ProvisionedProfile; expiresAt: number }>();

function cachedProfile(clerkUserId: string): ProvisionedProfile | null {
  const entry = profileCache.get(clerkUserId);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    profileCache.delete(clerkUserId);
    return null;
  }
  return entry.profile;
}

function rememberProfile(clerkUserId: string, profile: ProvisionedProfile) {
  if (profileCache.size >= PROFILE_CACHE_LIMIT) {
    const oldest = profileCache.keys().next().value;
    if (oldest) profileCache.delete(oldest);
  }
  profileCache.set(clerkUserId, { profile, expiresAt: Date.now() + PROFILE_TTL_MS });
}

export async function createServerSupabaseClient() {
  // Lazy-load Clerk so Node-only unit tests can import this bridge without
  // evaluating Next's server-only ESM graph. Next still bundles this normally.
  const { auth, currentUser } = await import('@clerk/nextjs/server');
  const { url, anonKey } = getSupabaseServerConfig();
  const clerkAuth = await auth();
  const token = await clerkAuth.getToken();

  const supabase = createClient<Database>(url, anonKey, {
    accessToken: async () => token,
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let mappedUser: User | null = null;
  if (clerkAuth.userId) {
    let profile = cachedProfile(clerkAuth.userId);
    if (!profile) {
      const clerkUser = await currentUser();
      const email = clerkUser?.primaryEmailAddress?.emailAddress ?? '';
      const fullName = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ').trim();
      const { data: internalId, error } = await supabase.rpc('ensure_clerk_profile', {
        p_email: email,
        p_full_name: fullName,
      });
      if (error || !internalId) {
        throw new Error(`Unable to provision Clerk profile: ${error?.message ?? 'No profile returned'}`);
      }

      // The free-audit decision (one account per network and device, VPN check)
      // happens once in /api/account/claim, which also has the browser signals.

      profile = {
        internalId,
        email,
        fullName,
        createdAt: clerkUser?.createdAt ? new Date(clerkUser.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: clerkUser?.updatedAt ? new Date(clerkUser.updatedAt).toISOString() : undefined,
      };
      rememberProfile(clerkAuth.userId, profile);
    }

    mappedUser = {
      id: profile.internalId,
      aud: 'authenticated',
      role: 'authenticated',
      email: profile.email,
      app_metadata: { provider: 'clerk' },
      user_metadata: { clerk_user_id: clerkAuth.userId, full_name: profile.fullName },
      identities: [],
      created_at: profile.createdAt,
      updated_at: profile.updatedAt,
      is_anonymous: false,
    } as User;
  }

  // Supabase intentionally disables auth.getUser when a third-party accessToken
  // provider is configured. Existing BrandPulse routes still consume that small
  // contract, so expose a Clerk-backed facade while every database method stays
  // bound to the real Supabase client.
  const authFacade = new Proxy(supabase.auth, {
    get(target, property) {
      if (property === 'getUser') {
        return async () => ({ data: { user: mappedUser }, error: null });
      }
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });

  return new Proxy(supabase, {
    get(target, property) {
      if (property === 'auth') return authFacade;
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as typeof supabase;
}
