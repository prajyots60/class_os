import { z } from 'zod';

/**
 * Validator schema for creating a Program (POST /api/institute/programs).
 * Uses .strict() to reject forbidden fields (id, instituteId, status, timestamps, etc.).
 */
export const createProgramSchema = z
  .object({
    name: z
      .string({ required_error: 'Program name is required' })
      .trim()
      .min(1, 'Program name is required')
      .max(100, 'Program name cannot exceed 100 characters'),
    code: z
      .string({ required_error: 'Program code is required' })
      .trim()
      .min(1, 'Program code is required')
      .max(50, 'Program code cannot exceed 50 characters')
      .regex(/^[A-Za-z0-9_-]+$/, 'Program code can only contain letters, numbers, hyphens, and underscores'),
    description: z
      .string()
      .trim()
      .max(500, 'Description cannot exceed 500 characters')
      .nullable()
      .optional(),
  })
  .strict();

export type CreateProgramInput = z.infer<typeof createProgramSchema>;

/**
 * Validator schema for updating a Program profile (PATCH /api/institute/programs/:id).
 * Uses .strict() to reject immutability violations (code, status, instituteId, etc.).
 */
export const updateProgramSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Program name cannot be empty')
      .max(100, 'Program name cannot exceed 100 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .max(500, 'Description cannot exceed 500 characters')
      .nullable()
      .optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).some((key) => data[key as keyof typeof data] !== undefined),
    { message: 'At least one update field must be provided' },
  );

export type UpdateProgramInput = z.infer<typeof updateProgramSchema>;

/**
 * Query parameter validator schema for listing Programs (GET /api/institute/programs).
 */
export const listProgramsQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type ListProgramsQueryInput = z.infer<typeof listProgramsQuerySchema>;

/**
 * Path parameter validator schema for Program operations.
 */
export const programParamsSchema = z.object({
  id: z.string().uuid('Invalid Program ID format'),
});
