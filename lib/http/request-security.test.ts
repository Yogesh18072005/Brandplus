import assert from 'node:assert/strict';
import test from 'node:test';
import { guardMutationRequest } from './request-security';

test('allows same-origin JSON mutations', () => {
  const request = new Request('https://app.example/api/projects', {
    method: 'POST',
    headers: { origin: 'https://app.example', 'content-type': 'application/json' },
    body: '{}',
  });
  assert.deepEqual(guardMutationRequest(request, { json: true }), { ok: true });
});

test('rejects cross-site and foreign-origin mutations', () => {
  const crossSite = new Request('https://app.example/api/projects', {
    method: 'POST',
    headers: { 'sec-fetch-site': 'cross-site', 'content-type': 'application/json' },
    body: '{}',
  });
  assert.equal(guardMutationRequest(crossSite, { json: true }).ok, false);

  const foreign = new Request('https://app.example/api/projects', {
    method: 'POST',
    headers: { origin: 'https://evil.example', 'content-type': 'application/json' },
    body: '{}',
  });
  assert.equal(guardMutationRequest(foreign, { json: true }).ok, false);
});

test('rejects non-JSON and oversized mutation bodies', () => {
  const form = new Request('https://app.example/api/projects', {
    method: 'POST',
    headers: { 'content-type': 'text/plain' },
    body: '{}',
  });
  const wrongType = guardMutationRequest(form, { json: true });
  assert.equal(wrongType.ok, false);
  if (!wrongType.ok) assert.equal(wrongType.status, 415);

  const large = new Request('https://app.example/api/projects', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'content-length': '50000' },
    body: '{}',
  });
  const oversized = guardMutationRequest(large, { json: true, maxBodyBytes: 1024 });
  assert.equal(oversized.ok, false);
  if (!oversized.ok) assert.equal(oversized.status, 413);
});
