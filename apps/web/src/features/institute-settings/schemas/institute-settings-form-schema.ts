import { z } from 'zod';

export const TIMEZONE_OPTIONS = [
  'Asia/Kolkata',
  'UTC',
  'Asia/Dubai',
  'Asia/Singapore',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
] as const;

export const instituteSettingsFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Institute name must be at least 2 characters.')
    .max(255, 'Institute name cannot exceed 255 characters.'),
  phone: z
    .string()
    .trim()
    .min(10, 'Contact phone number must be at least 10 digits.')
    .max(20, 'Contact phone number cannot exceed 20 characters.'),
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address.')
    .max(255, 'Email address cannot exceed 255 characters.'),
  timezone: z
    .string()
    .trim()
    .min(1, 'Timezone is required.')
    .max(50, 'Timezone string is too long.'),
  logoUrl: z
    .string()
    .trim()
    .refine(
      (val) => {
        if (!val) return true;
        try {
          const url = new URL(val);
          return url.protocol === 'https:';
        } catch {
          return false;
        }
      },
      { message: 'Logo URL must be a valid HTTPS URL (e.g. https://...)' },
    )
    .max(2048, 'Logo URL cannot exceed 2048 characters')
    .nullable()
    .or(z.literal(''))
    .optional(),
  primaryColor: z
    .string()
    .trim()
    .refine(
      (val) => {
        if (!val) return true;
        return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(val);
      },
      { message: 'Primary color must be a valid HEX color code (e.g. #0F172A or #2563EB)' },
    )
    .nullable()
    .or(z.literal(''))
    .optional(),
});

export type InstituteSettingsFormData = z.infer<typeof instituteSettingsFormSchema>;
