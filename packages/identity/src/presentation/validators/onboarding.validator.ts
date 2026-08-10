import { z } from 'zod';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'app',
  'auth',
  'dashboard',
  'onboarding',
  'settings',
  'support',
  'billing',
  'system',
]);

export const onboardInstituteSchema = z.object({
  name: z
    .string({ required_error: 'Institute name is required' })
    .trim()
    .min(2, 'Institute name must be at least 2 characters')
    .max(255, 'Institute name cannot exceed 255 characters'),
  phone: z
    .string({ required_error: 'Contact phone number is required' })
    .trim()
    .min(10, 'Contact phone number must be at least 10 digits')
    .max(20, 'Contact phone number cannot exceed 20 characters'),
  email: z
    .string({ required_error: 'Contact email is required' })
    .trim()
    .email('Invalid contact email address')
    .max(255),
  timezone: z.string().trim().default('Asia/Kolkata'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, 'Custom slug must be at least 2 characters')
    .max(100, 'Custom slug cannot exceed 100 characters')
    .regex(
      SLUG_REGEX,
      'Slug must contain only lowercase alphanumeric characters and single hyphens',
    )
    .refine((val) => !RESERVED_SLUGS.has(val), {
      message: 'This custom slug is reserved and cannot be used',
    })
    .optional(),
  logoUrl: z.string().url('Invalid logo URL').nullable().optional(),
  primaryColor: z.string().max(50).nullable().optional(),
});

export type OnboardInstituteInput = z.infer<typeof onboardInstituteSchema>;
