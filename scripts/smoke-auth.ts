#!/usr/bin/env npx tsx
/**
 * Live Supabase auth smoke test (uses .env.local). Does NOT create persistent users
 * unless signup succeeds with a throwaway address.
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL?.trim();
const anon = process.env.SUPABASE_ANON_KEY?.trim();

async function main() {
  if (!url || !anon) {
    console.log('SKIP live auth: SUPABASE_URL or SUPABASE_ANON_KEY not set');
    process.exit(0);
  }

  const supabase = createClient(url, anon);

  // 1. Bad login should fail cleanly (proves Supabase is reachable)
  const badLogin = await supabase.auth.signInWithPassword({
    email: 'nonexistent-smoke-test@invalid.local',
    password: 'wrongpassword123',
  });
  if (!badLogin.error) {
    console.error('FAIL: bad login should have errored');
    process.exit(1);
  }
  console.log('OK bad login rejected:', badLogin.error.message.slice(0, 60));

  // 2. Signup with throwaway email (may require email confirm depending on project settings)
  const email = `aeo-smoke-${Date.now()}@mailinator.com`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000';
  const signup = await supabase.auth.signUp({
    email,
    password: 'SmokeTest123!aeo',
    options: {
      data: { full_name: 'Smoke Test' },
      emailRedirectTo: `${appUrl}/callback?next=${encodeURIComponent('/dashboard')}`,
    },
  });

  if (signup.error) {
    console.error('FAIL signup:', signup.error.message);
    process.exit(1);
  }

  const hasSession = !!signup.data.session;
  const needsConfirm = !hasSession && !!signup.data.user;
  console.log(`OK signup: user=${signup.data.user?.id?.slice(0, 8)}… session=${hasSession} needsEmailConfirm=${needsConfirm}`);

  if (hasSession) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, plan, credits_remaining')
      .eq('id', signup.data.user!.id)
      .single();

    if (profile?.id) {
      console.log(`OK profile auto-created: plan=${profile.plan} credits=${profile.credits_remaining}`);
    } else {
      console.error('FAIL: profile row not created by handle_new_user trigger');
      process.exit(1);
    }

    await supabase.auth.signOut();
    console.log('OK signout');
  } else if (needsConfirm) {
    console.log('NOTE: Supabase requires email confirmation before login — expected in production.');
  }

  console.log('\nLive auth smoke test passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
