import { z } from 'zod';

/**
 * Validator schema for creating a test assessment.
 * Injected fields like `instituteId`, `status`, `createdAt` MUST be rejected.
 */
export const createTestSchema = z
  .object({
    batchId: z.string().uuid({ message: 'Batch ID must be a valid UUID' }),
    title: z
      .string()
      .trim()
      .min(1, { message: 'Title is required' })
      .max(255, { message: 'Title cannot exceed 255 characters' }),
    maximumMarks: z
      .number()
      .int({ message: 'Maximum marks must be an integer' })
      .positive({ message: 'Maximum marks must be greater than zero' }),
    scheduledDate: z
      .string()
      .trim()
      .datetime({ message: 'Scheduled date must be a valid ISO date-time string' })
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Scheduled date must be YYYY-MM-DD' }))
      .optional()
      .nullable(),
  })
  .strict();

export type CreateTestInput = z.infer<typeof createTestSchema>;

/**
 * Validator schema for updating test configuration.
 * `instituteId`, `batchId`, `status` MUST be rejected.
 */
export const updateTestSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, { message: 'Title cannot be empty' })
      .max(255, { message: 'Title cannot exceed 255 characters' })
      .optional(),
    maximumMarks: z
      .number()
      .int({ message: 'Maximum marks must be an integer' })
      .positive({ message: 'Maximum marks must be greater than zero' })
      .optional(),
    scheduledDate: z
      .string()
      .trim()
      .datetime({ message: 'Scheduled date must be a valid ISO date-time string' })
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Scheduled date must be YYYY-MM-DD' }))
      .optional()
      .nullable(),
  })
  .strict();

export type UpdateTestInput = z.infer<typeof updateTestSchema>;

/**
 * Validator schema for entering bulk marks for a test.
 * Enforces non-empty array and uniqueness of enrollment IDs inside request payload.
 */
export const markItemSchema = z
  .object({
    enrollmentId: z.string().uuid({ message: 'Enrollment ID must be a valid UUID' }),
    marksObtained: z
      .number({ message: 'Marks obtained must be a valid number' })
      .min(0, { message: 'Marks obtained cannot be negative' }),
  })
  .strict();

export const enterTestMarksSchema = z
  .object({
    testId: z.string().uuid({ message: 'Test ID must be a valid UUID' }),
    records: z
      .array(markItemSchema)
      .min(1, { message: 'At least one student mark record must be provided' }),
  })
  .strict()
  .refine(
    (data) => {
      const ids = data.records.map((r) => r.enrollmentId);
      return new Set(ids).size === ids.length;
    },
    {
      message: 'Duplicate enrollment IDs detected in bulk marks payload',
      path: ['records'],
    },
  );

export type EnterTestMarksInput = z.infer<typeof enterTestMarksSchema>;

/**
 * Validator schema for listing tests for a batch.
 */
export const listTestsForBatchSchema = z
  .object({
    batchId: z.string().uuid({ message: 'Batch ID must be a valid UUID' }),
  })
  .strict();

export type ListTestsForBatchInput = z.infer<typeof listTestsForBatchSchema>;
