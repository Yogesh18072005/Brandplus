import assert from 'node:assert/strict';
import test from 'node:test';
import { safeRedirectPath } from './safe-redirect';

test('keeps application-relative redirects', () => {
  assert.equal(safeRedirectPath('/dashboard/projects?view=active'), '/dashboard/projects?view=active');
});

test('rejects absolute and protocol-relative redirects', () => {
  assert.equal(safeRedirectPath('https://evil.example/steal'), '/dashboard');
  assert.equal(safeRedirectPath('//evil.example/steal'), '/dashboard');
  assert.equal(safeRedirectPath('/\\evil.example/steal'), '/dashboard');
});

test('uses the supplied fallback for missing or malformed values', () => {
  assert.equal(safeRedirectPath(null, '/login'), '/login');
  assert.equal(safeRedirectPath('not-a-path', '/login'), '/login');
});
