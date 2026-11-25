import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateContent } from '@/lib/tools/content-writer';
import type { Json } from '@/lib/supabase/types';
import { guardMutationRequest } from '@/lib/http/request-security';
import { consumeRateLimit, rateLimitError } from '@/lib/security/rate-limit';
import { founderOnly } from '@/lib/auth/founder-only';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DRAFT_LIMIT = { scope: 'fix-content-draft', limit: 3, windowSeconds: 60 * 60 } as const;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; runId: string }> },
) {
  const guard = guardMutationRequest(request, { json: true, maxBodyBytes: 1024 });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id, runId } = await params;
  const interventionId = runId;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to generate a content draft.' }, { status: 401 });
  const founderGuard = founderOnly(user.email);
  if (founderGuard) return founderGuard;

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, user_id, business_name, website, category, city, competitors')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (projectError || !project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });

  const { data: fix, error: fixError } = await supabase
    .from('generated_interventions')
    .select('id, title, objective, exact_buyer_question, expected_deliverable')
    .eq('intervention_key', interventionId)
    .eq('project_id', project.id)
    .maybeSingle();
  if (fixError || !fix) return NextResponse.json({ error: 'This fix was not found for the selected project.' }, { status: 404 });

  const rateLimit = await consumeRateLimit(request, DRAFT_LIMIT, user.id);
  if (!rateLimit.allowed) return rateLimitError(rateLimit, 'AI draft limit reached. Try again later.');

  try {
    const result = await generateContent({
      contentType: 'answer_page',
      keywords: [],
      topic: [
        `Fix title: ${fix.title}`,
        `Goal: ${fix.objective}`,
        `Buyer question to answer: ${fix.exact_buyer_question}`,
        fix.expected_deliverable ? `Expected deliverable: ${fix.expected_deliverable}` : '',
      ].filter(Boolean).join('\n'),
      project: {
        business_name: project.business_name,
        website: project.website ?? '',
        category: project.category ?? '',
        city: project.city ?? '',
        competitors: (project.competitors ?? []) as { name: string }[],
      },
    });

    const { data: saved, error: saveError } = await supabase
      .from('generated_content')
      .insert({
        project_id: project.id,
        content_type: 'answer_page',
        title: result.title,
        body: result.body,
        meta_description: result.metaDescription,
        schema_markup: result.schemaMarkup as unknown as Json,
        keywords: result.keywords as unknown as Json,
      })
      .select('id')
      .single();
    if (saveError) throw new Error(`Draft could not be saved: ${saveError.message}`);

    return NextResponse.json({ ...result, id: saved.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI draft generation failed.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
