import { NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { guardMutationRequest } from '@/lib/http/request-security';
import { recordOperationalEvent } from '@/lib/ops/events';
import { canRunLocally, requireOps, RUNS_DIR } from '@/lib/admin/require-ops';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const body = z.object({ mode: z.enum(['charge', 'free']) });

function alive(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

/**
 * Start one audit request on this machine: the same `npm run audit:run` the
 * console's copy commands give, in the background, logging to .runs/<id>.log.
 * 'charge' takes one of the customer's credits; 'free' is an admin credit.
 * The script keeps every guard (global ₹ cap, idempotent credit, resume).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = guardMutationRequest(request, { json: true, maxBodyBytes: 512 });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const ops = await requireOps();
  if (!ops.ok) return ops.response;
  if (!canRunLocally()) {
    return NextResponse.json({ error: 'Audits run for several minutes, so start them from the admin console on localhost (npm run dev), or copy the command.' }, { status: 409 });
  }

  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: 'Bad request id' }, { status: 400 });
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Choose charge or free' }, { status: 400 });
  const { mode } = parsed.data;

  const { data: job } = await createAdminClient().from('audit_queue').select('id, job_type, status, credit_mode').eq('id', id).maybeSingle();
  if (!job || job.job_type !== 'AUDIT') return NextResponse.json({ error: 'No audit request with that id' }, { status: 404 });
  if (job.credit_mode && job.credit_mode !== mode) {
    return NextResponse.json({ error: `Already started as ${job.credit_mode === 'charge' ? 'their credit' : 'an admin credit'}. Resume it the same way.` }, { status: 409 });
  }

  const dir = path.join(process.cwd(), RUNS_DIR);
  mkdirSync(dir, { recursive: true });
  const stateFile = path.join(dir, `${id}.json`);
  if (existsSync(stateFile)) {
    const prev = JSON.parse(readFileSync(stateFile, 'utf8')) as { pid?: number };
    if (prev.pid && alive(prev.pid)) return NextResponse.json({ error: 'Already running' }, { status: 409 });
  }

  const out = openSync(path.join(dir, `${id}.log`), 'w');
  const child = spawn('npx', ['tsx', 'scripts/run-audit-request.ts', id, `--${mode}`, '--confirm'], {
    cwd: process.cwd(),
    detached: true,
    shell: process.platform === 'win32',
    windowsHide: true,
    stdio: ['ignore', out, out],
  });
  child.unref();
  closeSync(out);
  writeFileSync(stateFile, JSON.stringify({ pid: child.pid, mode, startedAt: new Date().toISOString(), by: ops.email }));
  await recordOperationalEvent({ eventType: 'audit_run_started', severity: 'info', metadata: { queueId: id, mode, by: ops.email } }).catch(() => null);
  return NextResponse.json({ started: true, mode });
}
