// D1 helper — infer likely competitors from (category, city) using the same
// Gemini surface as prompt generation. Cost-guarded by the global spend cap in
// gemini-client; best-effort (the onboarding form works fine without it).

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { config } from '@/src/config';
import { geminiCall } from '@/src/gemini-client';
import { extractJson } from '@/src/parse';
import { guardMutationRequest } from '@/lib/http/request-security';
import { consumeRateLimit, RATE_LIMITS, rateLimitError } from '@/lib/security/rate-limit';

const SCHEMA = {
  type: 'object',
  properties: { competitors: { type: 'array', items: { type: 'string' }, maxItems: 3 } },
  required: ['competitors'],
} as const;

export async function POST(request: Request) {
  const guard = guardMutationRequest(request, { json: true, maxBodyBytes: 8 * 1024 });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimit = await consumeRateLimit(request, RATE_LIMITS.aiSuggestion, user.id);
  if (!rateLimit.allowed) return rateLimitError(rateLimit, 'Suggestion limit reached. Add competitors manually or try later.');

  if (!config.googleApiKey) return NextResponse.json({ competitors: [] });

  let body: { category?: string; city?: string; businessName?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ competitors: [] });
  }
  const category = (body.category ?? '').trim().slice(0, 60);
  const city = (body.city ?? '').trim().slice(0, 60);
  const businessName = (body.businessName ?? '').trim().slice(0, 80);
  if (!category || !city) return NextResponse.json({ competitors: [] });

  try {
    const interaction = await geminiCall({
      kind: 'promptgen',
      model: config.promptgenModel,
      input:
        `Name up to 3 well-known real businesses that compete in "${category}" in ${city}` +
        `${businessName ? `, other than "${businessName}"` : ''}. ` +
        `Return ONLY JSON: {"competitors":["Name 1","Name 2","Name 3"]}. Real, specific businesses only.`,
      responseFormat: { type: 'text', mime_type: 'application/json', schema: SCHEMA },
      generationConfig: { thinking_level: 'minimal', temperature: 0.4, max_output_tokens: 256 },
      retries: 0,
    });
    const parsed = extractJson(interaction.output_text ?? '') as { competitors?: unknown };
    const competitors = Array.isArray(parsed.competitors)
      ? parsed.competitors.filter((c): c is string => typeof c === 'string' && c.trim() !== '').slice(0, 3)
      : [];
    return NextResponse.json({ competitors });
  } catch (err) {
    console.error('[suggest-competitors] failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ competitors: [] });
  }
}
