import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { generateLlmsTxt } from '@/lib/tools/llms-txt-generator';
import { TOOLS_ENABLED } from '@/lib/flags';
import { founderOnly } from '@/lib/auth/founder-only';

export async function POST(request: Request) {
  if (!TOOLS_ENABLED) return NextResponse.json({ error: 'Not found' }, { status: 404 }); // quarantined (lib/flags.ts)
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  { const denied = founderOnly(user.email); if (denied) return denied; }

  const body = await request.json();
  const { projectId, sitemapUrl, pages } = body;

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }
  if (!sitemapUrl && !pages) {
    return NextResponse.json({ error: 'Either sitemapUrl or pages array is required' }, { status: 400 });
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id, user_id, business_name, website, category')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single();

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  try {
    const result = await generateLlmsTxt({ sitemapUrl, pages, project });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'llms.txt generation failed' }, { status: 500 });
  }
}
