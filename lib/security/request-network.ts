import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';

type HeaderReader = Pick<Headers, 'get'>;

const TRUSTED_IP_HEADERS = new Set([
  'x-vercel-forwarded-for',
  'cf-connecting-ip',
  'fly-client-ip',
  'true-client-ip',
  'x-real-ip',
  'x-forwarded-for',
]);

function configuredProxyHeader(): string | null {
  const configured = process.env.TRUSTED_PROXY_IP_HEADER?.trim().toLowerCase();
  return configured && TRUSTED_IP_HEADERS.has(configured) ? configured : null;
}

function candidateIp(headers: HeaderReader): string | null {
  if (process.env.VERCEL === '1') return headers.get('x-vercel-forwarded-for');
  const configured = configuredProxyHeader();
  if (configured) return headers.get(configured);
  if (process.env.NODE_ENV === 'production') return null;
  return headers.get('x-vercel-forwarded-for')
    ?? headers.get('x-forwarded-for')
    ?? headers.get('x-real-ip');
}

function expandIpv6(value: string): string[] | null {
  const halves = value.toLowerCase().split('::');
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves[1] ? halves[1].split(':') : [];
  const missing = 8 - left.length - right.length;
  if (missing < 0 || (halves.length === 1 && missing !== 0)) return null;
  return [...left, ...Array.from({ length: missing }, () => '0'), ...right]
    .map((part) => part.padStart(4, '0'));
}

/** IPv6 privacy addresses are grouped by /64; IPv4 addresses remain exact. */
export function normalizeNetworkAddress(raw: string | null): string | null {
  if (!raw) return null;
  let value = raw.split(',')[0]?.trim().slice(0, 128) ?? '';
  value = value.replace(/^for=/i, '').replace(/^"|"$/g, '');
  const bracketed = value.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketed) value = bracketed[1] ?? value;
  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(value)) value = value.replace(/:\d+$/, '');
  if (value.toLowerCase().startsWith('::ffff:')) value = value.slice(7);

  const version = isIP(value);
  if (version === 4) return `v4:${value}`;
  if (version !== 6) return null;
  const expanded = expandIpv6(value);
  return expanded ? `v6:${expanded.slice(0, 4).join(':')}/64` : null;
}

export function getRequestNetworkIdentity(headers: HeaderReader): string | null {
  return normalizeNetworkAddress(candidateIp(headers));
}

/** HMAC prevents offline guessing of stored network/email hashes. */
export function hashPrivateIdentifier(scope: string, value: string): string | null {
  const salt = process.env.RATE_LIMIT_SALT?.trim();
  if (!salt) {
    if (process.env.NODE_ENV === 'production') return null;
    return createHmac('sha256', 'brandpulse-development-only-salt').update(`${scope}:${value}`).digest('hex');
  }
  return createHmac('sha256', salt).update(`${scope}:${value}`).digest('hex');
}

export function hashRequestNetwork(headers: HeaderReader, scope: string): string | null {
  const network = getRequestNetworkIdentity(headers);
  return network ? hashPrivateIdentifier(scope, network) : null;
}
