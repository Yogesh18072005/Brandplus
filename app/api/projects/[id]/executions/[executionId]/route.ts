import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ownedExecutionProject } from '@/lib/execution/api';
import { SupabaseExecutionRepository } from '@/lib/execution/repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; executionId: string }> }) {
  const { id, executionId } = await params;
  const owned = await ownedExecutionProject(id);
  if ('error' in owned) return owned.error;
  const run = await new SupabaseExecutionRepository(createAdminClient()).getRun(owned.project.id, executionId, true);
  return run ? NextResponse.json(run) : NextResponse.json({ error: 'Execution not found' }, { status: 404 });
}

