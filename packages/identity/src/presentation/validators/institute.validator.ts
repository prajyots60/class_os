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

export const updateInstituteSettingsSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Institute name must be at least 2 characters')
      .max(255, 'Institute name cannot exceed 255 characters')
      .optional(),
    phone: z
      .string()
      .trim()
      .min(10, 'Phone number must be at least 10 characters')
      .max(20, 'Phone number cannot exceed 20 characters')
      .optional(),
    email: z
      .string()
      .trim()
      .email('Invalid email address')
      .max(255, 'Email cannot exceed 255 characters')
      .optional(),
    timezone: z
      .string()
      .trim()
      .min(1, 'Timezone cannot be empty')
      .max(50, 'Timezone cannot exceed 50 characters')
      .optional(),
    logoUrl: z
      .string()
      .trim()
      .max(2048, 'Logo URL cannot exceed 2048 characters')
      .refine(
        (val) => {
          if (val === null || val === '') return true;
          if (!val.startsWith('https://')) return false;
          try {
            new URL(val);
            return true;
          } catch {
            return false;
          }
        },
        { message: 'Logo URL must be a valid HTTPS URL' },
      )
      .nullable()
      .optional(),
    primaryColor: z
      .string()
      .trim()
      .refine(
        (val) => {
          if (val === null || val === '') return true;
          return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(val);
        },
        { message: 'Primary color must be a valid HEX color code (e.g. #0F172A or #3B82F6)' },
      )
      .nullable()
      .optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).some((key) => data[key as keyof typeof data] !== undefined),
    { message: 'At least one update parameter must be provided' },
  );

export type CreateInstituteInput = z.infer<typeof createInstituteSchema>;
export type UpdateInstituteInput = z.infer<typeof updateInstituteSchema>;
export type ChangeInstituteStatusInput = z.infer<typeof changeInstituteStatusSchema>;
export type UpdateInstituteSettingsInput = z.infer<typeof updateInstituteSettingsSchema>;
