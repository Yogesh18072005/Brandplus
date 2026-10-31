// E0.1 — frozen prompt sets. Proves a re-audit never regenerates questions.
// Run: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveProjectPrompts, asPromptArray, type ProjectPromptFields } from './resolve-prompts';
import type { BuyerPrompt } from '@/src/types';

// Minimal mock: capture projects.update(...) payloads.
function mockSupabase() {
  const updates: Record<string, unknown>[] = [];
  const api: Record<string, unknown> = {};
  api.from = () => api;
  api.update = (vals: Record<string, unknown>) => {
    updates.push(vals);
    return { eq: () => Promise.resolve({ error: null }) };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { client: api as any, updates };
}

const GEN: BuyerPrompt[] = [
  { text: 'best acp supplier delhi', intent: 'direct_best' },
  { text: 'acp wholesale price delhi', intent: 'budget' },
];
function spyGenerate() {
  let calls = 0;
  const fn = async () => {
    calls += 1;
    return GEN;
  };
  return { fn, calls: () => calls };
}

const baseProject = (over: Partial<ProjectPromptFields>): ProjectPromptFields => ({
  id: 'p1',
  category: 'ACP supplier',
  city: 'Delhi',
  prompt_set: null,
  prompt_set_version: 0,
  ...over,
});

test('asPromptArray: valid → array, junk/empty → null', () => {
  assert.deepEqual(asPromptArray([{ text: 'a', intent: 'budget' }]), [{ text: 'a', intent: 'budget' }]);
  assert.equal(asPromptArray([]), null);
  assert.equal(asPromptArray(null), null);
  assert.equal(asPromptArray([{ nope: 1 }]), null);
  // missing intent defaults to 'unknown'
  assert.deepEqual(asPromptArray([{ text: 'a' }]), [{ text: 'a', intent: 'unknown' }]);
});

test('first audit: generates once, persists the frozen set at version 1', async () => {
  const { client, updates } = mockSupabase();
  const gen = spyGenerate();
  const r = await resolveProjectPrompts(client, baseProject({}), 40, gen.fn);
  assert.equal(gen.calls(), 1);
  assert.equal(r.frozen, false);
  assert.equal(r.version, 1);
  assert.deepEqual(r.prompts, GEN);
  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0]!.prompt_set, GEN);
  assert.equal(updates[0]!.prompt_set_version, 1);
});

test('re-audit: NEVER regenerates — reuses the frozen set verbatim', async () => {
  const { client, updates } = mockSupabase();
  const gen = spyGenerate();
  const frozen = baseProject({ prompt_set: GEN as unknown as ProjectPromptFields['prompt_set'], prompt_set_version: 1 });
  const r = await resolveProjectPrompts(client, frozen, 40, gen.fn);
  assert.equal(gen.calls(), 0); // the whole point of E0.1
  assert.equal(r.frozen, true);
  assert.equal(r.version, 1);
  assert.deepEqual(r.prompts, GEN);
  assert.equal(updates.length, 0); // no write on reuse
});

test('end-to-end: run 1 generates, run 2 (with persisted set) does not', async () => {
  const gen = spyGenerate();

  const s1 = mockSupabase();
  const first = await resolveProjectPrompts(s1.client, baseProject({}), 40, gen.fn);

  // Simulate the queue re-fetching the project AFTER the first freeze persisted.
  const persisted = baseProject({
    prompt_set: s1.updates[0]!.prompt_set as ProjectPromptFields['prompt_set'],
    prompt_set_version: s1.updates[0]!.prompt_set_version as number,
  });
  const s2 = mockSupabase();
  const second = await resolveProjectPrompts(s2.client, persisted, 40, gen.fn);

  assert.equal(gen.calls(), 1); // generated exactly once across both runs
  assert.deepEqual(first.prompts, second.prompts); // identical question sets
});
