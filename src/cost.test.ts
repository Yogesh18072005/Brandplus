import assert from 'node:assert/strict';
import test from 'node:test';
import { costCheckpoint, costSummary, currentUsdSince, recordCall } from './cost';

test('persistent workers isolate cost accounting between audit checkpoints', () => {
  const first = costCheckpoint();
  recordCall({ kind: 'engine:gemini', model: 'gemini-2.5-flash', inputTokens: 1000, outputTokens: 1000, cached: false });
  assert.ok(currentUsdSince(first) > 0);
  const second = costCheckpoint();
  assert.equal(currentUsdSince(second), 0);
  recordCall({ kind: 'engine:gemini', model: 'gemini-2.5-flash', inputTokens: 0, outputTokens: 0, cached: true });
  assert.match(costSummary(second), /0 live API calls \(1 from cache\)/);
});

test('failed call with partial usage records cost and failed flag', () => {
  const checkpoint = costCheckpoint();
  recordCall({ kind: 'engine:gemini', model: 'gemini-2.5-flash', inputTokens: 500, outputTokens: 500, cached: false, failed: true });
  assert.ok(currentUsdSince(checkpoint) > 0);
});

test('failed call without usage sets usageUnavailable flag', () => {
  const checkpoint = costCheckpoint();
  recordCall({ kind: 'engine:gemini', model: 'gemini-2.5-flash', inputTokens: 0, outputTokens: 0, cached: false, usageUnavailable: true, failed: true });
  assert.equal(currentUsdSince(checkpoint), 0);
});
