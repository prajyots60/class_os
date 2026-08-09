import { z } from 'zod';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createInstituteSchema = z.object({
  name: z.string().trim().min(1, 'Institute name is required'),
  slug: z
    .string()
    .trim()
    .regex(
      SLUG_REGEX,
      'Institute slug must contain only lowercase alphanumeric characters and hyphens',
    )
    .optional(),
  phone: z.string().trim(),
  email: z.string().trim().email('Invalid email address'),
  timezone: z.string().trim().optional(),
  logoUrl: z.string().trim().url('Invalid logo URL').nullable().optional(),
  primaryColor: z.string().trim().nullable().optional(),
});

export const updateInstituteSchema = z.object({
  name: z.string().trim().min(1, 'Institute name cannot be empty').optional(),
  slug: z
    .string()
    .trim()
    .regex(
      SLUG_REGEX,
      'Institute slug must contain only lowercase alphanumeric characters and hyphens',
    )
    .optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email('Invalid email address').optional(),
  timezone: z.string().trim().min(1, 'Timezone cannot be empty').optional(),
  logoUrl: z.string().trim().url('Invalid logo URL').nullable().optional(),
  primaryColor: z.string().trim().nullable().optional(),
});

export const changeInstituteStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'archived'], {
    errorMap: () => ({ message: 'Status must be active, suspended, or archived' }),
  }),
});

export type CreateInstituteInput = z.infer<typeof createInstituteSchema>;
export type UpdateInstituteInput = z.infer<typeof updateInstituteSchema>;
export type ChangeInstituteStatusInput = z.infer<typeof changeInstituteStatusSchema>;
