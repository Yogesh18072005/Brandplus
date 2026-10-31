import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: audit, error } = await supabase
    .from('audits')
    .select('*, projects!inner(user_id, business_name, website, category, city, competitors)')
    .eq('id', id)
    .eq('projects.user_id', user.id)
    .single();

  if (error || !audit) return NextResponse.json({ error: 'Audit not found' }, { status: 404 });

  const { data: results } = await supabase
    .from('audit_results')
    .select('*')
    .eq('audit_id', id)
    .order('created_at', { ascending: true });

  return NextResponse.json({ ...(audit as Record<string, unknown>), results: results ?? [] });
}
