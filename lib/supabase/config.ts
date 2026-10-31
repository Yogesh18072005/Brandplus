/** Server-only Supabase configuration. Never use NEXT_PUBLIC_ names here. */
export function getSupabaseServerConfig(): { url: string; anonKey: string } {
  const url = process.env.SUPABASE_URL?.trim();
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  }

  return { url, anonKey };
}

export function supabaseServerConfigured(): boolean {
  try {
    const { url, anonKey } = getSupabaseServerConfig();
    return url.startsWith('http') && anonKey.length > 0;
  } catch {
    return false;
  }
}