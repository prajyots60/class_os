import { z } from 'zod';

/**
 * Minimum password length aligned with Better Auth default configuration.
 * Better Auth does not enforce a server-side policy beyond presence check
 * for the current project config (emailAndPassword.enabled = true).
 * We enforce 8 chars client-side as a sensible baseline.
 */
export const SIGN_UP_PASSWORD_MIN_LENGTH = 8;

export const signUpSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Full name is required.')
      .min(2, 'Full name must be at least 2 characters.')
      .refine((v) => v.trim().length > 0, 'Full name cannot be blank.'),

    email: z
      .string()
      .min(1, 'Email address is required.')
      .email('Please enter a valid email address.'),

    password: z
      .string()
      .min(1, 'Password is required.')
      .min(SIGN_UP_PASSWORD_MIN_LENGTH, `Password must be at least ${SIGN_UP_PASSWORD_MIN_LENGTH} characters.`)
      .refine((v) => v.trim().length > 0, 'Password cannot be blank spaces only.'),

    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });

export type SignUpFormValues = z.infer<typeof signUpSchema>;
