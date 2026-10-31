'use client';

// Browser half of the one-account guard. The fingerprint is a SHA-256 of
// stable device traits (screen, hardware, graphics, canvas rendering), so a
// new account from the same machine matches even in a private window or after
// clearing cookies. Only the hash leaves the browser; the server hashes it
// again with its own salt before storing it.

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function canvasSignal(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 220;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';
    ctx.textBaseline = 'top';
    ctx.font = '16px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(100, 1, 62, 20);
    ctx.fillStyle = '#0928A6';
    ctx.fillText('BrandPulse, AI visibility ✓', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('BrandPulse, AI visibility ✓', 4, 17);
    return canvas.toDataURL();
  } catch {
    return 'canvas-blocked';
  }
}

function webglSignal(): string {
  try {
    const gl = document.createElement('canvas').getContext('webgl') as WebGLRenderingContext | null;
    if (!gl) return 'no-webgl';
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = info ? gl.getParameter(info.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
    const renderer = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    return `${vendor}|${renderer}`;
  } catch {
    return 'webgl-blocked';
  }
}

export async function deviceFingerprint(): Promise<string> {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const traits = [
    nav.platform,
    nav.hardwareConcurrency,
    nav.deviceMemory ?? '',
    nav.maxTouchPoints,
    screen.width,
    screen.height,
    screen.colorDepth,
    window.devicePixelRatio,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    webglSignal(),
    canvasSignal(),
  ].join('||');
  return sha256Hex(traits);
}

export interface AccountClaim {
  allowed: boolean;
  reason: string;
  message: string | null;
}

/** Idempotent: the first call decides; later calls return the same verdict. */
export async function ensureAccountClaim(): Promise<AccountClaim> {
  let timeZone: string | null = null;
  try { timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null; } catch { /* hidden timezone */ }
  const res = await fetch('/api/account/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fingerprint: await deviceFingerprint(), timeZone }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.redirected || !res.ok || typeof data.allowed !== 'boolean') {
    throw new Error(typeof data.error === 'string' ? data.error : 'We couldn’t finish setting up your account. Refresh to try again.');
  }
  return { allowed: data.allowed, reason: String(data.reason ?? ''), message: data.message ?? null };
}
