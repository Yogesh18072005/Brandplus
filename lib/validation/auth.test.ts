import assert from 'node:assert/strict';
import test from 'node:test';
import { loginSchema, passwordUpdateSchema, profileUpdateSchema, signupSchema } from './auth';

test('auth schemas enforce valid email and an eight-character password', () => {
  assert.equal(loginSchema.safeParse({ email: 'bad', password: '12345678' }).success, false);
  assert.equal(passwordUpdateSchema.safeParse({ password: 'short' }).success, false);
  assert.equal(loginSchema.safeParse({ email: 'owner@example.com', password: 'correct-horse' }).success, true);
});

test('signup and profile payloads reject unexpected fields', () => {
  assert.equal(signupSchema.safeParse({
    fullName: 'Aditi Rao',
    email: 'aditi@example.com',
    password: 'correct-horse',
    admin: true,
  }).success, false);
  assert.equal(profileUpdateSchema.safeParse({ fullName: 'Aditi Rao', companyName: 'Signal Works' }).success, true);
  assert.equal(profileUpdateSchema.safeParse({ fullName: '', companyName: '' }).success, false);
});
