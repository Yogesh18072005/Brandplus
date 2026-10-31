#!/usr/bin/env npx tsx
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { createAdminClient } from '../lib/supabase/admin';
import { processNextQueueJob } from '../lib/queue/process-next-job';
import { assertProductionEnvironment } from '../lib/env/production';
import { recordOperationalEvent } from '../lib/ops/events';

const pollMs = Math.max(1_000, Number(process.env.WORKER_POLL_MS ?? '5000'));
const staleMinutes = Math.max(5, Number(process.env.WORKER_STALE_MINUTES ?? '15'));
let stopping = false;

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function main() {
  if (process.env.NODE_ENV === 'production') assertProductionEnvironment();
  const admin = createAdminClient();
  console.log(`BrandPulse worker online · poll ${pollMs}ms · stale threshold ${staleMinutes}m`);
  await recordOperationalEvent({ eventType: 'worker_started', metadata: { pollMs, staleMinutes } }, admin);

  while (!stopping) {
    const { data: recovered, error: recoveryError } = await admin.rpc('recover_stale_audit_jobs', {
      p_stale_minutes: staleMinutes,
    });
    if (recoveryError) console.error('[worker] stale-job recovery failed:', recoveryError.message);
    else if ((recovered ?? 0) > 0) console.warn(`[worker] recovered ${recovered} stale job(s)`);

    const result = await processNextQueueJob(admin);
    if (result.status === 'empty' || result.status === 'cap_reached' || result.status === 'failed') {
      await delay(pollMs);
    }
  }

  await recordOperationalEvent({ eventType: 'worker_stopped' }, admin);
  console.log('BrandPulse worker stopped cleanly');
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => { stopping = true; });
}

main().catch(async (error) => {
  console.error('[worker] fatal:', error);
  await recordOperationalEvent({
    eventType: 'worker_fatal',
    severity: 'error',
    metadata: { message: error instanceof Error ? error.message : String(error) },
  });
  process.exit(1);
});
