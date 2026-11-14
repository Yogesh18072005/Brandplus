import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { generateContent } from '@/lib/tools/content-writer';
import type { Json } from '@/lib/supabase/types';
import { consumeRateLimit, rateLimitError, RATE_LIMITS } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const limit = await consumeRateLimit(request, RATE_LIMITS.contentDraft, user.id);
  if (!limit.allowed) return rateLimitError(limit, 'You have reached the draft limit. Try again later.');

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const { projectId, topic, contentType = 'blog_post', keywords = [] } = body;

  if (typeof projectId !== 'string' || typeof topic !== 'string' || !topic.trim() || topic.length > 1000) {
    return NextResponse.json({ error: 'projectId and topic are required' }, { status: 400 });
  }

  if (!['blog_post', 'faq_page', 'comparison', 'answer_page'].includes(contentType)) {
    return NextResponse.json({ error: 'Invalid content type.' }, { status: 400 });
  }
  if (!Array.isArray(keywords) || keywords.length > 20 || keywords.some((keyword) => typeof keyword !== 'string' || keyword.length > 100)) {
    return NextResponse.json({ error: 'Invalid keywords.' }, { status: 400 });
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
