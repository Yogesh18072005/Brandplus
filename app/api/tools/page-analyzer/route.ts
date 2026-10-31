import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { analyzePage } from '@/lib/tools/page-analyzer';
import type { Json } from '@/lib/supabase/types';
import { TOOLS_ENABLED } from '@/lib/flags';
import { founderOnly } from '@/lib/auth/founder-only';

export async function POST(request: Request) {
  if (!TOOLS_ENABLED) return NextResponse.json({ error: 'Not found' }, { status: 404 }); // quarantined (lib/flags.ts)
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  { const denied = founderOnly(user.email); if (denied) return denied; }

  const body = await request.json();
  const { projectId, pageUrl } = body;

  if (!projectId || !pageUrl) {
    return NextResponse.json({ error: 'projectId and pageUrl are required' }, { status: 400 });
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id, user_id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single();

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  try {
    const result = await analyzePage(pageUrl);

    await supabase.from('page_analyses').insert({
      project_id: projectId,
      page_url: pageUrl,
      scores: result.scores as unknown as Json,
      recommendations: result.recommendations as unknown as Json,
      overall_score: result.overallScore,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Page analysis failed' }, { status: 500 });
  }
}
