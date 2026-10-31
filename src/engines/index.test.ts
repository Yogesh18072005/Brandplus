import assert from 'node:assert/strict';
import test from 'node:test';
import { getAdapter } from './index';
import { generationConfigFor } from '../gemini-client';

test('thinking_level is only sent to models that support it', () => {
  const cfg = { thinking_level: 'minimal', max_output_tokens: 3072 };
  assert.deepEqual(generationConfigFor('gemini-2.5-flash', cfg), { max_output_tokens: 3072 });
  assert.deepEqual(generationConfigFor('gemini-3.5-flash', cfg), cfg);
  assert.deepEqual(generationConfigFor('gemini-2.5-flash', { temperature: 0 }), { temperature: 0 });
});

test('Gemini is the only launch engine and unsupported names fail explicitly', () => {
  assert.equal(getAdapter('gemini').name, 'gemini');
  assert.throws(() => getAdapter('chatgpt'), /not available/);
  assert.throws(() => getAdapter('perplexity'), /not available/);
  assert.throws(() => getAdapter('ai_overview'), /not available/);
});
