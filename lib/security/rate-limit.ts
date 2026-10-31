import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { supabaseServerConfigured } from '@/lib/supabase/config';
import { getRequestNetworkIdentity, hashPrivateIdentifier } from '@/lib/security/request-network';

export interface RateLimitRule {
  scope: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: string;
  retryAfterSeconds: number;
  source: 'database' | 'development-memory' | 'unavailable';
}

const developmentBuckets = new Map<string, { count: number; resetAt: number }>();

export function getRequestIdentity(request: Request, userId?: string | null): string {
  if (userId) return `user:${userId}`;
  return `network:${getRequestNetworkIdentity(request.headers) ?? 'unavailable'}`;
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'RateLimit-Limit': String(result.limit),
    'RateLimit-Remaining': String(result.remaining),
    'RateLimit-Reset': result.resetAt,
    ...(result.allowed ? {} : { 'Retry-After': String(result.retryAfterSeconds) }),
  };
}

function hashIdentity(scope: string, identity: string): string {
  return hashPrivateIdentifier(`rate-limit:${scope}`, identity) ?? '';
}

function developmentRateLimit(rule: RateLimitRule, identity: string): RateLimitResult {
  const now = Date.now();
  const bucketKey = `${rule.scope}:${hashIdentity(rule.scope, identity)}`;
  const existing = developmentBuckets.get(bucketKey);
  const bucket = !existing || existing.resetAt <= now
    ? { count: 0, resetAt: now + rule.windowSeconds * 1000 }
    : existing;
  bucket.count += 1;
  developmentBuckets.set(bucketKey, bucket);
  const allowed = bucket.count <= rule.limit;
  return {
    allowed,
    limit: rule.limit,
    remaining: Math.max(rule.limit - bucket.count, 0),
    resetAt: new Date(bucket.resetAt).toISOString(),
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    source: 'development-memory',
  };
}

export async function consumeRateLimit(
  request: Request,
  rule: RateLimitRule,
  userId?: string | null,
): Promise<RateLimitResult> {
  const identity = getRequestIdentity(request, userId);
  const identityHash = hashIdentity(rule.scope, identity);
  if (!identityHash && process.env.NODE_ENV === 'production') {
    return {
      allowed: false,
      limit: rule.limit,
      remaining: 0,
      resetAt: new Date(Date.now() + 60_000).toISOString(),
      retryAfterSeconds: 60,
      source: 'unavailable',
    };
  }
  if (!supabaseServerConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    if (process.env.NODE_ENV !== 'production') return developmentRateLimit(rule, identity);
    return {
      allowed: false,
      limit: rule.limit,
      remaining: 0,
      resetAt: new Date(Date.now() + 60_000).toISOString(),
      retryAfterSeconds: 60,
      source: 'unavailable',
    };
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc('consume_rate_limit', {
      p_scope: rule.scope,
      p_key_hash: identityHash,
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
    }).single();
    if (error || !data) throw new Error(error?.message ?? 'No rate-limit result');
    const resetAt = data.reset_at;
    return {
      allowed: data.allowed,
      limit: rule.limit,
      remaining: data.remaining,
      resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((new Date(resetAt).getTime() - Date.now()) / 1000)),
      source: 'database',
    };
  } catch (error) {
    console.error('[rate-limit] shared limiter unavailable:', error instanceof Error ? error.message : error);
    if (process.env.NODE_ENV !== 'production') return developmentRateLimit(rule, identity);
    return {
      allowed: false,
      limit: rule.limit,
      remaining: 0,
      resetAt: new Date(Date.now() + 60_000).toISOString(),
      retryAfterSeconds: 60,
      source: 'unavailable',
    };
  }
}

export function rateLimitError(
  result: RateLimitResult,
  message = 'Too many requests. Please try again later.',
): NextResponse {
  return NextResponse.json(
    { error: message, code: result.source === 'unavailable' ? 'RATE_LIMIT_UNAVAILABLE' : 'RATE_LIMITED' },
    { status: result.source === 'unavailable' ? 503 : 429, headers: rateLimitHeaders(result) },
  );
}

export const RATE_LIMITS = {
  freeAudit: { scope: 'free-audit', limit: 2, windowSeconds: 3600 },
  authLogin: { scope: 'auth-login', limit: 10, windowSeconds: 900 },
  authSignup: { scope: 'auth-signup', limit: 5, windowSeconds: 3600 },
  authReset: { scope: 'auth-reset', limit: 3, windowSeconds: 3600 },
  createAudit: { scope: 'create-audit', limit: 6, windowSeconds: 3600 },
  projectMutation: { scope: 'project-mutation', limit: 12, windowSeconds: 3600 },
  accountMutation: { scope: 'account-mutation', limit: 10, windowSeconds: 3600 },
  talkRequest: { scope: 'talk-request', limit: 4, windowSeconds: 3600 },
  publicFixPlanRequest: { scope: 'fix-plan-request', limit: 3, windowSeconds: 3600 },
  reportPdf: { scope: 'report-pdf', limit: 20, windowSeconds: 600 },
  aiSuggestion: { scope: 'ai-suggestion', limit: 8, windowSeconds: 3600 },
  billing: { scope: 'billing', limit: 10, windowSeconds: 600 },
  cronScheduler: { scope: 'cron-scheduler', limit: 4, windowSeconds: 3600 },
  cronWorker: { scope: 'cron-worker', limit: 60, windowSeconds: 3600 },
  directAudit: { scope: 'direct-audit', limit: 3, windowSeconds: 3600 },
} satisfies Record<string, RateLimitRule>;
