// E0.1 — owner-triggered refresh of a project's frozen question set. Regenerates
// the 40 prompts and bumps prompt_set_version. E1 treats a version change as a
// BASELINE RESET (no before/after delta is drawn across different question sets),
// so this must never happen silently — only via this explicit endpoint.

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generatePrompts } from '@/src/promptgen';
import { config } from '@/src/config';
import type { Json } from '@/lib/supabase/types';
import { guardMutationRequest } from '@/lib/http/request-security';
import { consumeRateLimit, RATE_LIMITS, rateLimitError } from '@/lib/security/rate-limit';
import { founderOnly } from '@/lib/auth/founder-only';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = guardMutationRequest(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  { const denied = founderOnly(user.email); if (denied) return denied; }
  const rateLimit = await consumeRateLimit(request, RATE_LIMITS.aiSuggestion, user.id);
  if (!rateLimit.allowed) return rateLimitError(rateLimit, 'Question refresh limit reached. Try again later.');

  // Ownership check (RLS also enforces this; explicit for a clear 404).
  const { data: project } = await supabase
    .from('projects')
    .select('id, category, city, prompt_set_version')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  if (!config.googleApiKey) {
    return NextResponse.json({ error: 'Question generation is not configured.' }, { status: 503 });
  }

  let prompts;
  try {
    prompts = await generatePrompts(project.category, project.city, config.promptCount);
  } catch (err) {
    console.error('[refresh-prompts] generation failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Could not generate questions. Try again shortly.' }, { status: 502 });
  }

  const version = (project.prompt_set_version ?? 0) + 1;
  const admin = createAdminClient();
  const { error } = await admin
    .from('projects')
    .update({ prompt_set: prompts as unknown as Json, prompt_set_version: version })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    promptCount: prompts.length,
    version,
    message: 'Questions refreshed. Your next audit starts a new tracking baseline.',
  });
}
