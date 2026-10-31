import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ClientDashboard } from '@/components/dashboard/ClientDashboard';
import { getEffectivePlan } from '@/lib/billing/effective-plan';
import { PLANS } from '@/lib/billing/plans';
import { loadDashboardBusinesses } from '@/lib/dashboard/load-businesses';
import { isOpsUser } from '@/lib/auth/ops-access';

/** The client overview: how AI talks about each business, and what to do next. */
export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const [{ data: profile }, { data: projects }] = await Promise.all([
    supabase.from('profiles').select('full_name, plan, plan_expires_at, credits_remaining, credits_reset_at, free_credit_status').eq('id', user.id).single(),
    supabase.from('projects').select('id, business_name, website, category, city, created_at').eq('user_id', user.id).order('created_at', { ascending: true }),
  ]);
  // New accounts start with onboarding: it runs the one-account check and
  // requests their first audit.
  if (!projects?.length && !isOpsUser(user.email)) redirect('/dashboard/onboarding');

  const businesses = await loadDashboardBusinesses(projects ?? []);
  const first = profile?.full_name?.trim().split(/\s+/)[0];
  const name = first ? `${first[0]!.toUpperCase()}${first.slice(1).toLowerCase()}` : undefined;
  const checks = Math.max(0, profile?.credits_remaining ?? 0);
  return (
    <ClientDashboard
      greeting="Hello"
      name={name}
      planLine={`${PLANS[getEffectivePlan(profile)].name} plan · ${checks} ${checks === 1 ? 'check' : 'checks'} left`}
      businesses={businesses}
    />
  );
}
