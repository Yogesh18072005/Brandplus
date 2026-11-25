import { randomUUID } from 'node:crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { generateContentBatch } from '@/lib/tools/content-writer';
import type { Json } from '@/lib/supabase/types';
import { consumeRateLimit, rateLimitError, RATE_LIMITS } from '@/lib/security/rate-limit';
import { founderOnly } from '@/lib/auth/founder-only';

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const founderGuard = founderOnly(user.email);
  if (founderGuard) return founderGuard;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const { projectId, topics, evidence = [], contentType = 'answer_page', keywords = [] } = body;

  if (typeof projectId !== 'string' || !Array.isArray(topics) || topics.length < 1 || topics.length > 5 ||
      topics.some((topic) => typeof topic !== 'string' || !topic.trim() || topic.length > 1000)) {
    return NextResponse.json({ error: 'Provide between 1 and 5 valid buyer questions.' }, { status: 400 });
  }
  if (contentType !== 'answer_page') return NextResponse.json({ error: 'Invalid content type.' }, { status: 400 });
  if (!Array.isArray(evidence) || evidence.length > 5 || evidence.some((item) => !item || typeof item !== 'object' || typeof item.question !== 'string' || (item.answerQuote !== null && item.answerQuote !== undefined && typeof item.answerQuote !== 'string') || !Array.isArray(item.competitorsNamed) || item.competitorsNamed.some((name: unknown) => typeof name !== 'string'))) {
    return NextResponse.json({ error: 'Invalid audit evidence.' }, { status: 400 });
  }
  if (!Array.isArray(keywords) || keywords.length > 20 || keywords.some((keyword) => typeof keyword !== 'string' || keyword.length > 100)) {
    return NextResponse.json({ error: 'Invalid keywords.' }, { status: 400 });
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id, user_id, business_name, website, category, city, competitors, products, services, locations, target_customers, markets')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single();

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const limit = await consumeRateLimit(request, RATE_LIMITS.contentDraft, user.id);
  if (!limit.allowed) return rateLimitError(limit, 'You have reached the draft limit. Try again later.');

  try {
    const drafts = await generateContentBatch({
      topics,
      evidence,
      keywords,
      project: { ...project, competitors: (project.competitors ?? []) as { name: string }[] },
    });

    // The project was checked against the signed-in user's identity above.
    // Use the server-only admin client for this validated server-side mutation.
    const admin = createAdminClient();
    const generationBatchId = randomUUID();
    const rows = drafts.map((draft) => ({
      project_id: projectId,
      generation_batch_id: generationBatchId,
      content_type: contentType,
      title: draft.title,
      buyer_question: draft.question,
      body: draft.body,
      meta_description: draft.metaDescription,
      schema_markup: draft.schemaMarkup as unknown as Json,
      keywords: draft.keywords as unknown as Json,
    }));
    const { data: saved, error } = await admin.from('generated_content').insert(rows).select('id');
    if (error) {
      console.error('[content-writer] Draft save failed:', error.message);
      return NextResponse.json({
        error: 'The drafts were generated, but saving failed. Confirm database migration 027 has been applied.',
      }, { status: 500 });
    }
    return NextResponse.json({
      drafts: drafts.map((draft, index) => ({ ...draft, id: saved?.[index]?.id, question: topics[index] })),
    });
  } catch (err) {
    console.error('[content-writer] Generation or save failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Content generation failed' }, { status: 500 });
  }
}
