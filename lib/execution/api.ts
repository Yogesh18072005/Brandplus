import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ExecutionAuthorizationError, ExecutionConflictError, ExecutionInputError } from '@/src/execution/service';
import { founderOnly } from '@/lib/auth/founder-only';

export const EXECUTION_RATE_LIMIT = { scope: 'execution-engine', limit: 30, windowSeconds: 60 * 60 } as const;

export async function ownedExecutionProject(projectId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const;
  { const denied = founderOnly(user.email); if (denied) return { error: denied } as const; }
  const { data, error } = await supabase.from('projects').select('id').eq('id', projectId).eq('user_id', user.id).maybeSingle();
  if (error || !data) return { error: NextResponse.json({ error: 'Project not found' }, { status: 404 }) } as const;
  return { user, project: data } as const;
}

export function executionApiError(error: unknown): NextResponse {
  if (error instanceof ExecutionInputError) return NextResponse.json({ error: error.message }, { status: 400 });
  if (error instanceof ExecutionAuthorizationError) return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
  if (error instanceof ExecutionConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
  const message = error instanceof Error ? error.message : String(error);
  if (/not found/i.test(message)) return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
  if (/conflict|unique|active operation/i.test(message)) return NextResponse.json({ error: 'Execution state conflict' }, { status: 409 });
  throw error;
}

