import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { SupabaseObservationRepository } from '@/lib/ai-observation/repository';
import { founderOnly } from '@/lib/auth/founder-only';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; runId: string }> }) {
  const { id, runId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  { const denied = founderOnly(user.email); if (denied) return denied; }
  const { data: project, error } = await supabase.from('projects').select('id').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (error || !project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const repository = new SupabaseObservationRepository(createAdminClient());
  const run = await repository.getRun(project.id, runId, true);
  return run ? NextResponse.json(run) : NextResponse.json({ error: 'Observation run not found' }, { status: 404 });
}
