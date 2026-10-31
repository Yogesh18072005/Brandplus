// Preflight: which Gemini models does this key actually have quota for,
// and does Google Search grounding work on any of them?
//
//   npm run check-key
//
// One plain (ungrounded) call per model; if that works, one grounded call.
// Single attempt each (no retries) so the readout is fast and unambiguous.

import { assertApiKey } from './config';
import { geminiCall, sleep } from './gemini-client';

const MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

function shortError(err: unknown): string {
  const msg = (err instanceof Error ? err.message : String(err)).replace(/\s+/g, ' ');
  return msg.length > 140 ? `${msg.slice(0, 140)}…` : msg;
}

async function tryCall(model: string, grounded: boolean): Promise<{ ok: boolean; detail: string }> {
  try {
    const interaction = await geminiCall({
      kind: `preflight${grounded ? ':grounded' : ''}`,
      model,
      input: grounded
        ? 'Using web search: what is the current capital of Australia? Answer in one short sentence.'
        : 'Reply with the single word: OK',
      ...(grounded ? { tools: [{ type: 'google_search' }] } : {}),
      retries: 0,
    });
    const text: string = interaction?.output_text ?? '';
    return { ok: true, detail: text.trim().slice(0, 60) || '(empty response)' };
  } catch (err) {
    return { ok: false, detail: shortError(err) };
  }
}

async function main() {
  assertApiKey();
  console.log('Preflight: probing models on this GOOGLE_API_KEY\n');

  const summary: string[] = [];
  for (const model of MODELS) {
    process.stdout.write(`${model}\n`);

    const plain = await tryCall(model, false);
    console.log(`  ungrounded: ${plain.ok ? '✓ OK' : `✗ ${plain.detail}`}`);

    let groundedNote = 'skipped (ungrounded failed)';
    if (plain.ok) {
      await sleep(1500);
      const grounded = await tryCall(model, true);
      console.log(`  grounded:   ${grounded.ok ? `✓ OK — "${grounded.detail}"` : `✗ ${grounded.detail}`}`);
      groundedNote = grounded.ok ? 'grounded ✓' : 'grounded ✗';
    }
    summary.push(`${model}: ${plain.ok ? 'ungrounded ✓' : 'unusable ✗'}, ${groundedNote}`);

    await sleep(1500);
    console.log('');
  }

  console.log('──────────────────────────────────────────────');
  console.log('SUMMARY');
  for (const line of summary) console.log(`  ${line}`);
  console.log('\nUse the results to set ENGINE_MODEL / PARSER_MODEL / ENGINE_GROUNDING in .env.local');
}

main().catch((err) => {
  console.error('Preflight failed:', err);
  process.exit(1);
});
