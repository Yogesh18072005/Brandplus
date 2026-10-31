import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { loadDashboardBusinesses } from '@/lib/dashboard/load-businesses';
import { BusinessesView } from '@/components/dashboard/BusinessesView';

/** Every business on the account, with where each one stands. */
export default async function ProjectsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: projects } = await supabase
    .from('projects')
    .select('id, business_name, website, category, city, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  return <BusinessesView businesses={await loadDashboardBusinesses(projects ?? [])} />;
}
