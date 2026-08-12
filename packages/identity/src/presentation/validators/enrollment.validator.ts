import { z } from 'zod';

const dateSchema = z
  .string()
  .trim()
  .refine((val) => !Number.isNaN(Date.parse(val)), {
    message: 'Must be a valid date string (e.g. YYYY-MM-DD or ISO 8601)',
  });

/**
 * Validator schema for creating an Enrollment (POST /api/institute/enrollments).
 * Uses .strict() to reject client-injected fields (id, instituteId, transferredToBatchId, deletedAt, etc.).
 */
export const createEnrollmentSchema = z
  .object({
    studentId: z
      .string({ required_error: 'Student ID is required' })
      .uuid('Invalid Student ID format'),
    batchId: z
      .string({ required_error: 'Batch ID is required' })
      .uuid('Invalid Batch ID format'),
    status: z
      .enum(['pending', 'active'], {
        errorMap: () => ({ message: 'Status must be pending or active upon creation' }),
      })
      .optional(),
    enrolledAt: dateSchema.nullable().optional(),
  })
  .strict();

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;

/**
 * Validator schema for transferring an Enrollment (POST /api/institute/enrollments/:id/transfer).
 * Uses .strict() to reject client-injected fields.
 */
export const transferEnrollmentSchema = z
  .object({
    targetBatchId: z
      .string({ required_error: 'Target Batch ID is required' })
      .uuid('Invalid Target Batch ID format'),
  })
  .strict();

export type TransferEnrollmentInput = z.infer<typeof transferEnrollmentSchema>;

/**
 * Query parameter validator schema for listing Enrollments (GET /api/institute/enrollments).
 */
export const listEnrollmentsQuerySchema = z.object({
  studentId: z.string().uuid('Invalid Student ID format').optional(),
  batchId: z.string().uuid('Invalid Batch ID format').optional(),
  status: z
    .enum(['pending', 'active', 'completed', 'withdrawn', 'transferred', 'cancelled'])
    .optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type ListEnrollmentsQueryInput = z.infer<typeof listEnrollmentsQuerySchema>;

/**
 * Path parameter validator schema for Enrollment operations (e.g. /api/institute/enrollments/:id).
 */
export const enrollmentParamsSchema = z.object({
  id: z.string().uuid('Invalid Enrollment ID format'),
});

export type EnrollmentParamsInput = z.infer<typeof enrollmentParamsSchema>;
