// Local Ollama client for the buyer-intent structured-generation stage.
// Uses Ollama's native /api/chat endpoint and JSON-schema constrained output.
// No API key or cloud request is used.

import { config } from './config';
import type { geminiCall, Interaction } from './gemini-client';

type CallOptions = Parameters<typeof geminiCall>[0];

interface OllamaChatResponse {
  message?: { content?: string };
  error?: string;
}

export async function ollamaCall(opts: CallOptions): Promise<Interaction> {
  const schema = (opts.responseFormat as { schema?: Record<string, unknown> } | undefined)?.schema;
  if (!schema) throw new Error('Ollama structured generation requires a JSON schema');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.ollamaTimeoutMs);
  const startedAt = Date.now();
  const requestKind = opts.kind || 'buyer-intent';
  console.info(`[ollama] request started kind=${requestKind} model=${config.ollamaModel} timeout_ms=${config.ollamaTimeoutMs}`);
  try {
    const response = await fetch(`${config.ollamaBaseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.ollamaModel,
        stream: false,
        format: schema,
        messages: [
          ...(opts.systemInstruction ? [{ role: 'system', content: opts.systemInstruction }] : []),
          { role: 'user', content: opts.input },
        ],
        options: {
          temperature: opts.generationConfig?.temperature ?? 0.1,
          // Keep an explicit safety ceiling even if a caller requests an oversized response.
          num_predict: Math.min(opts.generationConfig?.max_output_tokens ?? 2500, 3000),
        },
      }),
    });

    const payload = await response.json().catch(() => ({})) as OllamaChatResponse;
    if (!response.ok) {
      throw new Error(payload.error || `Ollama request failed with HTTP ${response.status}`);
    }
    const outputText = payload.message?.content;
    if (typeof outputText !== 'string' || !outputText.trim()) {
      throw new Error('Ollama returned an empty response');
    }
    console.info(`[ollama] request completed kind=${requestKind} model=${config.ollamaModel} duration_ms=${Date.now() - startedAt}`);
    return { output_text: outputText };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`[ollama] request timed out kind=${requestKind} model=${config.ollamaModel} duration_ms=${durationMs}`);
      throw new Error(`Ollama request timed out after ${config.ollamaTimeoutMs}ms`);
    }
    if (error instanceof TypeError) {
      console.warn(`[ollama] request connection error kind=${requestKind} model=${config.ollamaModel} duration_ms=${durationMs}`);
      throw new Error(`Cannot reach Ollama at ${config.ollamaBaseUrl}. Start Ollama and verify the local service is running.`);
    }
    console.warn(`[ollama] request failed kind=${requestKind} model=${config.ollamaModel} duration_ms=${durationMs}: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
