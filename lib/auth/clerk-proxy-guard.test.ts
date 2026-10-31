import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

for (const path of ['proxy.ts', 'app/layout.tsx']) {
  test(`${path} enables the Clerk frontend proxy only for a live HTTPS instance`, () => {
    const source = readFileSync(path, 'utf8');
    assert.match(source, /CLERK_FRONTEND_API_PROXY_ENABLED === 'true'/);
    assert.match(source, /NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY\?\.startsWith\('pk_live_'\) === true/);
    assert.match(source, /NEXT_PUBLIC_APP_URL\?\.startsWith\('https:\/\/'\) === true/);
  });
}
