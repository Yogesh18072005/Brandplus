// POST /api/admin/process-pending-leads
// Queues audits for leads that were saved without a guest audit user configured.
// Auth: Bearer CRON_SECRET or ADMIN_SECRET.

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { processPendingLeadAudits } from '@/lib/onboarding/queue-free-audit';
import { authorizeServiceRequest } from '@/lib/auth/service-request';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = authorizeServiceRequest(request);
  if (!auth.configured) {
    return NextResponse.json({ error: 'Service authentication is not configured' }, { status: 503 });
  }
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let limit = 10;
  try {
    const body = (await request.json()) as { limit?: number };
    if (typeof body.limit === 'number' && body.limit > 0 && body.limit <= 50) {
      limit = body.limit;
    }
  } catch {
    // empty body is fine
  }

  const admin = createAdminClient();
  const results = await processPendingLeadAudits(admin, limit);
  const queued = results.filter((r) => r.ok).length;

  return NextResponse.json({
    message: `Processed ${results.length} lead(s); ${queued} queued`,
    results,
  });
}
