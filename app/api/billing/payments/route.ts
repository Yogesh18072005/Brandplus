import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [paymentsResult, profileResult, projectsResult] = await Promise.all([
    supabase
      .from('payments')
      .select('id, plan_id, amount_paise, currency, status, razorpay_order_id, paid_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('profiles')
      .select('plan, plan_expires_at')
      .eq('id', user.id)
      .single(),
    supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ]);

  if (paymentsResult.error || profileResult.error || projectsResult.error) {
    return NextResponse.json({ error: 'Could not load billing summary' }, { status: 500 });
  }
  return NextResponse.json(
    {
      payments: paymentsResult.data ?? [],
      plan: profileResult.data.plan,
      planExpiresAt: profileResult.data.plan_expires_at,
      projectCount: projectsResult.count ?? 0,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
