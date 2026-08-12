import { z } from 'zod';

/**
 * Validator schema for creating a Subject (POST /api/institute/subjects).
 * Uses .strict() to reject forbidden fields (id, instituteId, status, timestamps, etc.).
 */
export const createSubjectSchema = z
  .object({
    name: z
      .string({ required_error: 'Subject name is required' })
      .trim()
      .min(1, 'Subject name is required')
      .max(100, 'Subject name cannot exceed 100 characters'),
    code: z
      .string({ required_error: 'Subject code is required' })
      .trim()
      .min(1, 'Subject code is required')
      .max(50, 'Subject code cannot exceed 50 characters')
      .regex(/^[A-Za-z0-9_-]+$/, 'Subject code can only contain letters, numbers, hyphens, and underscores'),
    description: z
      .string()
      .trim()
      .max(500, 'Description cannot exceed 500 characters')
      .nullable()
      .optional(),
  })
  .strict();

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;

/**
 * Validator schema for updating a Subject profile (PATCH /api/institute/subjects/:id).
 * Uses .strict() to reject immutability violations (code, status, instituteId, etc.).
 */
export const updateSubjectSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Subject name cannot be empty')
      .max(100, 'Subject name cannot exceed 100 characters')
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

export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;

/**
 * Query parameter validator schema for listing Subjects (GET /api/institute/subjects).
 */
export const listSubjectsQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type ListSubjectsQueryInput = z.infer<typeof listSubjectsQuerySchema>;

/**
 * Path parameter validator schema for Subject operations.
 */
export const subjectParamsSchema = z.object({
  id: z.string().uuid('Invalid Subject ID format'),
});
