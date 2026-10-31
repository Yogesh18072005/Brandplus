// One account per network and per device, decided once when a person first
// finishes signing in. Everything that identifies them is HMAC-hashed here
// (RATE_LIMIT_SALT) before it reaches the database.
//
// VPN signal, with no third-party service: Vercel geolocates the connecting IP
// (x-vercel-ip-timezone) and the browser reports its own timezone. A VPN or
// proxy usually exits somewhere else, so the two disagree. We compare UTC
// offsets, not names, so "Asia/Calcutta" and "Asia/Kolkata" match.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { hashPrivateIdentifier, hashRequestNetwork } from '@/lib/security/request-network';

type HeaderReader = Pick<Headers, 'get'>;

export type AccountDecision = 'granted' | 'network_used' | 'device_used' | 'vpn_suspected' | 'identity_unavailable' | 'blocked';

/** Minutes ahead of UTC for a timezone right now, or null for an unknown zone. */
export function utcOffsetMinutes(timeZone: string, at: Date = new Date()): number | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
    }).formatToParts(at);
    const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
    const minuteFloor = Math.floor(at.getTime() / 60_000) * 60_000;
    return Math.round((asUtc - minuteFloor) / 60_000);
  } catch {
    return null;
  }
}

/**
 * True when the browser's timezone disagrees with where the IP connects from.
 * Without an IP timezone (local development) there is nothing to compare.
 * A browser that hides or fakes its timezone is treated as suspicious.
 */
export function vpnSuspected(headers: HeaderReader, browserTimeZone: string | null | undefined, at: Date = new Date()): boolean {
  // Only Vercel's edge sets this header (and overwrites any a visitor sends).
  // Behind any other production host it could be forged, so it is ignored.
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL !== '1') return false;
  const ipTimeZone = headers.get('x-vercel-ip-timezone')?.trim();
  if (!ipTimeZone) return false;
  const ipOffset = utcOffsetMinutes(ipTimeZone, at);
  if (ipOffset === null) return false;
  const browserOffset = browserTimeZone ? utcOffsetMinutes(browserTimeZone, at) : null;
  if (browserOffset === null) return true;
  return browserOffset !== ipOffset;
}

export function hashDeviceFingerprint(fingerprint: string): string | null {
  const value = fingerprint.trim();
  return /^[a-f0-9]{64}$/.test(value) ? hashPrivateIdentifier('account-device', value) : null;
}

export async function claimAccountIdentity(
  admin: SupabaseClient<Database>,
  profileId: string,
  headers: HeaderReader,
  signals: { fingerprint: string; timeZone: string | null },
): Promise<{ allowed: boolean; reason: AccountDecision; firstClaim: boolean }> {
  const { data, error } = await admin.rpc('claim_account_identity', {
    p_profile_id: profileId,
    // Same scope as the earlier free-credit claims, so old and new accounts compare.
    p_network_hash: hashRequestNetwork(headers, 'free-entitlement-network') ?? '',
    p_device_hash: hashDeviceFingerprint(signals.fingerprint) ?? '',
    p_vpn_suspected: vpnSuspected(headers, signals.timeZone),
  }).single();
  if (error || !data) throw new Error(error?.message ?? 'Account check failed');
  return { allowed: data.allowed, reason: data.reason as AccountDecision, firstClaim: data.first_claim };
}

export const ACCOUNT_BLOCK_MESSAGES: Record<Exclude<AccountDecision, 'granted'>, string> = {
  network_used: 'This network already has a BrandPulse account, and each business gets one free audit. Sign in with that account, or reply to our welcome email if this is a mistake.',
  device_used: 'This device already has a BrandPulse account, and each business gets one free audit. Sign in with that account, or reply to our welcome email if this is a mistake.',
  vpn_suspected: 'It looks like you’re on a VPN or proxy. Switch it off and refresh this page to continue.',
  identity_unavailable: 'We couldn’t verify your connection just now. Refresh the page to try again.',
  blocked: 'Your account can’t request a free audit. Reply to our welcome email and we’ll sort it out.',
};
