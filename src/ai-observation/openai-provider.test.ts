import assert from 'node:assert/strict';
import test from 'node:test';
import { OpenAIObservationProvider } from './openai-provider';

const input = {
  question: 'Which suppliers are recommended for custom furniture?',
  systemInstruction: 'Answer from current web sources and cite sources.',
  generationParameters: { maxOutputTokens: 500 },
};

test('OpenAI observation provider is disabled by default and makes no request', async () => {
  let calls = 0;
  const provider = new OpenAIObservationProvider({
    apiKey: 'test-key',
    enabled: false,
    fetcher: async () => {
      calls += 1;
      return new Response('{}', { status: 200 });
    },
  });

  assert.equal(provider.availability().available, false);
  await assert.rejects(provider.observeQuestion(input), /disabled/i);
  assert.equal(calls, 0);
});

test('OpenAI Responses API request requires web search and maps URL citations', async () => {
  let requestBody: Record<string, unknown> | null = null;
  const provider = new OpenAIObservationProvider({
    model: 'test-model',
    apiKey: 'test-key',
    enabled: true,
    fetcher: async (_url, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({
        id: 'resp_test',
        model: 'test-model',
        status: 'completed',
        output: [{
          type: 'message',
          content: [{
            type: 'output_text',
            text: 'Supplier information is available from Example.',
            annotations: [{
              type: 'url_citation',
              url: 'https://example.com/suppliers',
              title: 'Example suppliers',
              start_index: 42,
              end_index: 50,
            }],
          }],
        }],
        usage: { input_tokens: 120, output_tokens: 45, total_tokens: 165 },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    },
  });

  const result = await provider.observeQuestion(input);
  assert.equal(requestBody?.tool_choice, 'required');
  assert.deepEqual(requestBody?.tools, [{ type: 'web_search' }]);
  assert.equal(result.provider, 'openai');
  assert.equal(result.rawResponse, 'Supplier information is available from Example.');
  assert.equal(result.usage.totalTokens, 165);
  assert.equal(result.estimatedCostUsd, null);
  assert.equal(result.citations.length, 1);
  assert.equal(result.citations[0]?.url, 'https://example.com/suppliers');
  assert.equal(result.citations[0]?.domain, 'example.com');
  assert.equal(result.citations[0]?.claimAssociation, 'STRUCTURAL');
});

test('OpenAI HTTP 429 is normalized as a retryable rate limit', async () => {
  const provider = new OpenAIObservationProvider({
    apiKey: 'test-key',
    enabled: true,
    fetcher: async () => new Response(JSON.stringify({
      error: { message: 'Rate limit exceeded' },
    }), { status: 429 }),
  });

  await assert.rejects(
    provider.observeQuestion(input),
    (error: unknown) => error instanceof Error
      && 'code' in error && error.code === 'RATE_LIMITED'
      && 'retryable' in error && error.retryable === true,
  );
});
