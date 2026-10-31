import { createHash, randomUUID } from 'node:crypto';

export function stableExecutionJson(value: unknown): string {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableExecutionJson).join(',')}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableExecutionJson(item)}`)
    .join(',')}}`;
}

export function executionHash(value: unknown): string {
  return createHash('sha256').update(stableExecutionJson(value)).digest('hex');
}

export function executionRequestId(): string {
  return randomUUID();
}

const SECRET_KEY = /(?:password|passwd|secret|api[_-]?key|access[_-]?token|refresh[_-]?token|session|cookie|private[_-]?key|authorization)/i;
const SECRET_VALUE = /(?:-----BEGIN [A-Z ]*PRIVATE KEY-----|bearer\s+[A-Za-z0-9._~+/=-]{12,}|(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{12,}|AIza[0-9A-Za-z_-]{20,})/i;

export function looksLikeSecret(key: string, value: string): boolean {
  return SECRET_KEY.test(key) || SECRET_VALUE.test(value);
}

export function redactExecutionMetadata(value: unknown, key = ''): unknown {
  if (typeof value === 'string') return looksLikeSecret(key, value) ? '[REDACTED]' : value.slice(0, 2_000);
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => redactExecutionMetadata(item, key));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([childKey, item]) => [
      childKey,
      SECRET_KEY.test(childKey) ? '[REDACTED]' : redactExecutionMetadata(item, childKey),
    ]));
  }
  return value;
}

