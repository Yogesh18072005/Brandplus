import assert from 'node:assert/strict';
import test from 'node:test';
import { getSupabaseServerConfig, supabaseServerConfigured } from './config';

const keys = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'] as const;

function withCleanEnv(run: () => void) {
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  keys.forEach((key) => delete process.env[key]);
  try {
    run();
  } finally {
    keys.forEach((key) => {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  }
}

test('server-only Supabase names are accepted', () => withCleanEnv(() => {
  process.env.SUPABASE_URL = 'https://server.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'server-anon';
  assert.deepEqual(getSupabaseServerConfig(), {
    url: 'https://server.supabase.co',
    anonKey: 'server-anon',
  });
}));

test('public Supabase variable names are rejected', () => withCleanEnv(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://legacy.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'legacy-anon';
  assert.equal(supabaseServerConfigured(), false);
}));

test('configuration fails closed when incomplete', () => withCleanEnv(() => {
  process.env.SUPABASE_URL = 'https://server.supabase.co';
  assert.equal(supabaseServerConfigured(), false);
  assert.throws(() => getSupabaseServerConfig(), /Missing SUPABASE_URL or SUPABASE_ANON_KEY/);
}));