import { z } from 'zod';

const email = z.string().trim().email('Enter a valid email address').max(160);
const password = z.string().min(8, 'Password must be at least 8 characters').max(128);

export const loginSchema = z.object({ email, password }).strict();

export const signupSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(80),
  email,
  password,
  next: z.string().max(300).optional(),
}).strict();

export const resetPasswordSchema = z.object({ email }).strict();

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(80),
  companyName: z.string().trim().max(100),
}).strict();

export const passwordUpdateSchema = z.object({ password }).strict();

export function authValidationError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid request';
}
