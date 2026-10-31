import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

/** Mirror of proxy route guards — keep in sync with proxy.ts. */
function routeKind(pathname: string): 'dashboard' | 'admin' | 'auth' | 'public' {
  const isDashboard =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/projects') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/billing');

  const isAdmin = pathname.startsWith('/admin') && !pathname.startsWith('/admin/sign-in');
  const isAuth = pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/admin/sign-in');

  if (isDashboard) return 'dashboard';
  if (isAdmin) return 'admin';
  if (isAuth) return 'auth';
  return 'public';
}

describe('proxy route classification', () => {
  test('dashboard paths require auth', () => {
    assert.equal(routeKind('/dashboard'), 'dashboard');
    assert.equal(routeKind('/dashboard/projects/abc'), 'dashboard');
    assert.equal(routeKind('/dashboard/billing'), 'dashboard');
  });

  test('admin console requires auth while its dedicated sign-in stays reachable', () => {
    assert.equal(routeKind('/admin'), 'admin');
    assert.equal(routeKind('/admin/sign-in'), 'auth');
  });

  test('auth paths redirect when logged in', () => {
    assert.equal(routeKind('/login'), 'auth');
    assert.equal(routeKind('/signup'), 'auth');
    assert.equal(routeKind('/signup?plan=starter'), 'auth');
  });

  test('public paths are not gated', () => {
    assert.equal(routeKind('/'), 'public');
    assert.equal(routeKind('/r/krishnavi-india'), 'public');
    assert.equal(routeKind('/pricing'), 'public');
    assert.equal(routeKind('/callback'), 'public');
  });
});

describe('supabaseConfigured', () => {
  test('requires http URL and anon key', () => {
    function configured(url?: string, key?: string) {
      return Boolean(url?.trim() && key?.trim() && url.trim().startsWith('http'));
    }
    assert.equal(configured('https://x.supabase.co', 'anon-key'), true);
    assert.equal(configured(undefined, 'anon-key'), false);
    assert.equal(configured('https://x.supabase.co', ''), false);
    assert.equal(configured('not-a-url', 'key'), false);
  });
});
