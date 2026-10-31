import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { attachLeadsForUser } from '@/lib/onboarding/attach-leads';
import { safeRedirectPath } from '@/lib/auth/safe-redirect';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeRedirectPath(searchParams.get('next'));

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // D1 conversion bridge: on first login, claim any free-audit leads for
      // this email and seed the project. Best-effort — must never block login.
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: projects } = await supabase.from('projects').select('id').eq('user_id', user.id).limit(1);
          if (!projects || projects.length === 0) {
            const admin = createAdminClient();
            const { projectId } = await attachLeadsForUser(admin, user.id, user.email);
            // No project could be seeded → send them through onboarding.
            if (!projectId && next === '/dashboard') {
              return NextResponse.redirect(`${origin}/dashboard/onboarding`);
            }
          }
        }
      } catch (err) {
        console.error('[auth/callback] lead attach failed:', err);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth_callback_failed`);
}
