import { NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { requireOps, RUNS_DIR } from '@/lib/admin/require-ops';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ANSI = new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g');

function alive(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

/** The tail of a local run's output, and whether its process is still alive. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ops = await requireOps();
  if (!ops.ok) return ops.response;
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: 'Bad request id' }, { status: 400 });
  const dir = path.join(process.cwd(), RUNS_DIR);
  const logFile = path.join(dir, `${id}.log`);
  const stateFile = path.join(dir, `${id}.json`);
  if (!existsSync(logFile)) return NextResponse.json({ running: false, mode: null, lines: [] });
  const state = existsSync(stateFile) ? (JSON.parse(readFileSync(stateFile, 'utf8')) as { pid?: number; mode?: string }) : {};
  const lines = readFileSync(logFile, 'utf8').replace(ANSI, '').split(/\r?\n/).filter((line) => line.trim()).slice(-12);
  return NextResponse.json({ running: Boolean(state.pid && alive(state.pid)), mode: state.mode ?? null, lines });
}
