import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { generateSchema } from '@/lib/tools/schema-generator';
import { TOOLS_ENABLED } from '@/lib/flags';
import { founderOnly } from '@/lib/auth/founder-only';

export async function POST(request: Request) {
  if (!TOOLS_ENABLED) return NextResponse.json({ error: 'Not found' }, { status: 404 }); // quarantined (lib/flags.ts)
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  { const denied = founderOnly(user.email); if (denied) return denied; }

  const body = await request.json();
  const { projectId, pageUrl, schemaType, manualData } = body;

  if (!projectId || !schemaType) {
    return NextResponse.json({ error: 'projectId and schemaType are required' }, { status: 400 });
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id, user_id, business_name, website, category, city')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single();

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  try {
    const result = await generateSchema({ schemaType, pageUrl, manualData, project });

    await supabase.from('schema_markups').insert({
      project_id: projectId,
      page_url: pageUrl ?? null,
      schema_type: schemaType,
      json_ld: result.jsonLd as unknown as import('@/lib/supabase/types').Json,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Schema generation failed' }, { status: 500 });
  }
}
