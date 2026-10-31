import { z } from 'zod';

const shortText = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);

const websiteSchema = z
  .string()
  .trim()
  .min(1, 'Website is required')
  .max(120, 'Website is too long')
  .transform((value, context) => {
    try {
      const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.') || url.username || url.password) {
        throw new Error('invalid website');
      }
      return url.toString().replace(/\/$/, '');
    } catch {
      context.addIssue({ code: 'custom', message: 'Enter a valid public website URL' });
      return z.NEVER;
    }
  });

const competitorsSchema = z.array(z.string().trim().min(1).max(80)).max(5).default([]);
const aliasesSchema = z.array(z.string().trim().min(1).max(80)).max(5).default([]);
const profileListSchema = z.array(z.string().trim().min(1).max(120)).max(12).default([]);

export const projectCreateSchema = z.object({
  businessName: shortText('Business name', 80),
  website: websiteSchema,
  category: shortText('Category', 60),
  city: shortText('City', 60),
  competitors: competitorsSchema.optional().default([]),
  aliases: aliasesSchema.optional().default([]),
  products: profileListSchema.optional().default([]),
  services: profileListSchema.optional().default([]),
  locations: profileListSchema.optional().default([]),
  targetCustomers: profileListSchema.optional().default([]),
  markets: profileListSchema.optional().default([]),
}).strict();

export const projectUpdateSchema = z.object({
  businessName: shortText('Business name', 80).optional(),
  website: websiteSchema.optional(),
  category: shortText('Category', 60).optional(),
  city: shortText('City', 60).optional(),
  competitors: competitorsSchema.optional(),
  aliases: aliasesSchema.optional(),
  products: profileListSchema.optional(),
  services: profileListSchema.optional(),
  locations: profileListSchema.optional(),
  targetCustomers: profileListSchema.optional(),
  markets: profileListSchema.optional(),
  status: z.enum(['active', 'paused', 'archived']).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: 'No valid fields to update' });

export const queueAuditSchema = z.object({
  projectId: z.string().uuid('Invalid project id'),
}).strict();

export function firstValidationError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid request';
}
