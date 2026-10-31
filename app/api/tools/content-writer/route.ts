import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { generateContent } from '@/lib/tools/content-writer';
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
  const { projectId, topic, contentType = 'blog_post', keywords = [] } = body;

  if (!projectId || !topic) {
    return NextResponse.json({ error: 'projectId and topic are required' }, { status: 400 });
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id, user_id, business_name, website, category, city, competitors')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single();

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  try {
    const result = await generateContent({
      topic, contentType, keywords,
      project: { ...project, competitors: (project.competitors ?? []) as { name: string }[] },
    });

    const { data: saved } = await supabase
      .from('generated_content')
      .insert({
        project_id: projectId,
        content_type: contentType,
        title: result.title,
        body: result.body,
        meta_description: result.metaDescription,
        schema_markup: result.schemaMarkup as unknown as Json,
        keywords: result.keywords as unknown as Json,
      })
      .select()
      .single();

    return NextResponse.json({ ...result, id: saved?.id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Content generation failed' }, { status: 500 });
  }
}
