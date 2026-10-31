import { test } from 'node:test';
import assert from 'node:assert/strict';
import { processNextQueueJob } from './process-next-job';

test('queue worker claims through the atomic RPC and reports an empty queue', async () => {
  const calls: string[] = [];
  const client = {
    rpc(name: string) {
      calls.push(name);
      return {
        maybeSingle: async () => ({ data: null, error: null }),
      };
    },
  };

  // This focused mock exercises only the claim boundary.
  const result = await processNextQueueJob(client as never);

  assert.deepEqual(calls, ['claim_next_audit_job']);
  assert.equal(result.status, 'empty');
});

test('queue worker surfaces an atomic claim failure instead of treating it as empty', async () => {
  const client = {
    rpc() {
      return {
        maybeSingle: async () => ({ data: null, error: { message: 'RPC unavailable' } }),
      };
    },
  };

  const result = await processNextQueueJob(client as never);

  assert.equal(result.status, 'failed');
  assert.match(result.error ?? '', /Unable to claim queue job: RPC unavailable/);
});
