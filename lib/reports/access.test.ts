import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canViewFullReport, intelligenceReportDepthForPlan } from './access';

test('signed-in audit owner can view the complete free report', () => {
  assert.equal(canViewFullReport({ authenticatedUserId: 'owner-1', ownerUserId: 'owner-1' }), true);
});

test('an authenticated administrator can view another user’s full report', () => {
  assert.equal(
    canViewFullReport({
      authenticatedUserId: 'admin-1',
      ownerUserId: 'owner-1',
      isAdmin: true,
    }),
    true,
  );
});

test('an unauthenticated caller cannot gain access through the admin flag', () => {
  assert.equal(
    canViewFullReport({
      authenticatedUserId: null,
      ownerUserId: 'owner-1',
      isAdmin: true,
    }),
    false,
  );
});

test('public visitors and other users cannot view a customer report', () => {
  assert.equal(canViewFullReport({ authenticatedUserId: null, ownerUserId: 'owner-1' }), false);
  assert.equal(canViewFullReport({ authenticatedUserId: 'other-user', ownerUserId: 'owner-1' }), false);
});
test('free report depth stays preview-only while paid plans and admins receive the full chain', () => {
  assert.equal(intelligenceReportDepthForPlan('free'), 'preview');
  assert.equal(intelligenceReportDepthForPlan('starter'), 'full');
  assert.equal(intelligenceReportDepthForPlan('pro'), 'full');
  assert.equal(intelligenceReportDepthForPlan('free', true), 'full');
});