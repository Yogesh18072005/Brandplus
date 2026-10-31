import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { getSupabaseServerConfig } from './config';

export function createAdminClient() {
  const { url: supabaseUrl } = getSupabaseServerConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
