import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { generatePrompts } from '@/src/promptgen';
import { TOOLS_ENABLED } from '@/lib/flags';
import { founderOnly } from '@/lib/auth/founder-only';

export async function POST(request: Request) {
  if (!TOOLS_ENABLED) return NextResponse.json({ error: 'Not found' }, { status: 404 }); // quarantined (lib/flags.ts)
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  { const denied = founderOnly(user.email); if (denied) return denied; }

  const body = await request.json();
  const { category, city, count = 40 } = body;

  if (!category || !city) {
    return NextResponse.json({ error: 'category and city are required' }, { status: 400 });
  }

  try {
    const prompts = await generatePrompts(category, city, Math.min(count, 50));
    return NextResponse.json({ prompts, count: prompts.length });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Prompt generation failed' }, { status: 500 });
  }
}
