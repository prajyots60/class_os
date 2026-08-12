import { z } from 'zod';

const dateSchema = z
  .string()
  .trim()
  .refine((val) => !Number.isNaN(Date.parse(val)), {
    message: 'Must be a valid date string (e.g. YYYY-MM-DD or ISO 8601)',
  });

/**
 * Validator schema for creating a Batch (POST /api/institute/batches).
 * Uses .strict() to reject forbidden fields (id, instituteId, status, studentId, enrollmentId, etc.).
 */
export const createBatchSchema = z
  .object({
    subjectId: z
      .string({ required_error: 'Subject ID is required' })
      .uuid('Invalid Subject ID format'),
    programId: z.string().uuid('Invalid Program ID format').nullable().optional(),
    teacherId: z.string().uuid('Invalid Teacher ID format').nullable().optional(),
    name: z
      .string({ required_error: 'Batch name is required' })
      .trim()
      .min(1, 'Batch name is required')
      .max(100, 'Batch name cannot exceed 100 characters'),
    code: z
      .string({ required_error: 'Batch code is required' })
      .trim()
      .min(1, 'Batch code is required')
      .max(50, 'Batch code cannot exceed 50 characters')
      .regex(/^[A-Za-z0-9_-]+$/, 'Batch code can only contain letters, numbers, hyphens, and underscores'),
    capacity: z
      .number()
      .int('Capacity must be an integer')
      .positive('Capacity must be a positive integer')
      .nullable()
      .optional(),
    startDate: dateSchema.nullable().optional(),
    endDate: dateSchema.nullable().optional(),
  })
  .strict();

export type CreateBatchInput = z.infer<typeof createBatchSchema>;

/**
 * Validator schema for updating Batch profile (PATCH /api/institute/batches/:id).
 * Uses .strict() to reject immutability violations (code, subjectId, status, teacherId, instituteId, studentId, etc.).
 */
export const updateBatchSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Batch name cannot be empty')
      .max(100, 'Batch name cannot exceed 100 characters')
      .optional(),
    programId: z.string().uuid('Invalid Program ID format').nullable().optional(),
    capacity: z
      .number()
      .int('Capacity must be an integer')
      .positive('Capacity must be a positive integer')
      .nullable()
      .optional(),
    startDate: dateSchema.nullable().optional(),
    endDate: dateSchema.nullable().optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).some((key) => data[key as keyof typeof data] !== undefined),
    { message: 'At least one update field must be provided' },
  );

export type UpdateBatchInput = z.infer<typeof updateBatchSchema>;

/**
 * Validator schema for assigning/updating batch primary teacher (PATCH /api/institute/batches/:id/teacher).
 */
export const assignBatchTeacherSchema = z
  .object({
    teacherId: z.string().uuid('Invalid Teacher ID format').nullable(),
  })
  .strict();

export type AssignBatchTeacherInput = z.infer<typeof assignBatchTeacherSchema>;

/**
 * Validator schema for batch status transition (PATCH /api/institute/batches/:id/status).
 */
export const changeBatchStatusSchema = z
  .object({
    status: z.enum(['draft', 'open', 'running', 'completed', 'archived'], {
      errorMap: () => ({ message: 'Status must be draft, open, running, completed, or archived' }),
    }),
  })
  .strict();

export type ChangeBatchStatusInput = z.infer<typeof changeBatchStatusSchema>;

/**
 * Query parameter validator schema for listing Batches (GET /api/institute/batches).
 */
export const listBatchesQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(['draft', 'open', 'running', 'completed', 'archived']).optional(),
  subjectId: z.string().uuid('Invalid Subject ID format').optional(),
  programId: z.string().uuid('Invalid Program ID format').optional(),
  teacherId: z.string().uuid('Invalid Teacher ID format').optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type ListBatchesQueryInput = z.infer<typeof listBatchesQuerySchema>;

/**
 * Path parameter validator schema for Batch operations.
 */
export const batchParamsSchema = z.object({
  id: z.string().uuid('Invalid Batch ID format'),
});
