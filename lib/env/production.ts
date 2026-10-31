export interface EnvironmentCheck {
  name: string;
  configured: boolean;
  purpose: string;
}

const PLACEHOLDER_VALUE = /^(?:your[_-]|replace(?:[_-]|$)|change[_-]?me(?:[_-]|$)|changeme$|placeholder$)/i;

function configuredValue(name: string, env: NodeJS.ProcessEnv): string {
  const value = env[name]?.trim() ?? '';
  return value && !PLACEHOLDER_VALUE.test(value) ? value : '';
}

const present = (name: string, env: NodeJS.ProcessEnv) => Boolean(configuredValue(name, env));
const strongSecret = (name: string, env: NodeJS.ProcessEnv) => configuredValue(name, env).length >= 32;

export function productionEnvironmentChecks(env: NodeJS.ProcessEnv = process.env): EnvironmentCheck[] {
  return [
    { name: 'SUPABASE_URL', configured: present('SUPABASE_URL', env), purpose: 'server-only database URL' },
    { name: 'SUPABASE_ANON_KEY', configured: present('SUPABASE_ANON_KEY', env), purpose: 'server-side RLS client' },
    { name: 'SERVER_ONLY_SUPABASE_KEYS', configured: !present('NEXT_PUBLIC_SUPABASE_URL', env) && !present('NEXT_PUBLIC_SUPABASE_ANON_KEY', env), purpose: 'prevents Supabase configuration from being bundled into the browser' },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', configured: present('SUPABASE_SERVICE_ROLE_KEY', env), purpose: 'trusted queue and billing writes' },
    { name: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', configured: present('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', env), purpose: 'public Clerk frontend identifier' },
    { name: 'CLERK_SECRET_KEY', configured: present('CLERK_SECRET_KEY', env), purpose: 'server-only Clerk API authentication' },
    { name: 'CLERK_WEBHOOK_SIGNING_SECRET', configured: present('CLERK_WEBHOOK_SIGNING_SECRET', env), purpose: 'Clerk webhook verification' },
    { name: 'CLERK_FRONTEND_API_PROXY_ENABLED', configured: env.CLERK_FRONTEND_API_PROXY_ENABLED === 'true', purpose: 'same-origin Clerk Frontend API proxy' },
    { name: 'GOOGLE_API_KEY', configured: present('GOOGLE_API_KEY', env), purpose: 'Gemini answer engine' },
    { name: 'NEXT_PUBLIC_APP_URL', configured: present('NEXT_PUBLIC_APP_URL', env) && /^https:\/\//.test(env.NEXT_PUBLIC_APP_URL ?? ''), purpose: 'canonical production links' },
    { name: 'CRON_SECRET', configured: strongSecret('CRON_SECRET', env), purpose: 'scheduler authentication, at least 32 characters' },
    { name: 'ADMIN_SECRET', configured: strongSecret('ADMIN_SECRET', env), purpose: 'administrative authentication, at least 32 characters' },
    { name: 'RATE_LIMIT_SALT', configured: strongSecret('RATE_LIMIT_SALT', env), purpose: 'HMAC hashing for network identities, at least 32 characters' },
    { name: 'RAZORPAY_KEY_ID', configured: present('RAZORPAY_KEY_ID', env), purpose: 'payment checkout public identifier' },
    { name: 'RAZORPAY_KEY_SECRET', configured: present('RAZORPAY_KEY_SECRET', env), purpose: 'server-only payment order creation' },
    { name: 'RAZORPAY_WEBHOOK_SECRET', configured: strongSecret('RAZORPAY_WEBHOOK_SECRET', env), purpose: 'payment webhook verification' },
    { name: 'BREVO_API_KEY', configured: present('BREVO_API_KEY', env), purpose: 'server-only transactional email' },
    { name: 'EMAIL_FROM', configured: present('EMAIL_FROM', env), purpose: 'verified email sender' },
    { name: 'ADMIN_EMAILS', configured: present('ADMIN_EMAILS', env) && !/@example\.com(?:,|$)/i.test(env.ADMIN_EMAILS ?? ''), purpose: 'operations-console allowlist' },
    { name: 'GUEST_AUDIT_USER_ID', configured: present('GUEST_AUDIT_USER_ID', env), purpose: 'pre-signup free audits' },
  ];
}

export function missingProductionEnvironment(env: NodeJS.ProcessEnv = process.env): EnvironmentCheck[] {
  return productionEnvironmentChecks(env).filter((check) => !check.configured);
}

export function assertProductionEnvironment(env: NodeJS.ProcessEnv = process.env): void {
  const missing = missingProductionEnvironment(env);
  if (missing.length > 0) {
    throw new Error(`Missing production configuration: ${missing.map((item) => item.name).join(', ')}`);
  }
}