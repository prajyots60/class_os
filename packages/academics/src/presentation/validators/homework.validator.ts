import { z } from 'zod';

/**
 * Validator schema for creating homework.
 * Injected fields like `instituteId`, `publishedAt`, `createdBy` MUST be rejected (HOMEWORK-SEC-06..08).
 */
export const createHomeworkSchema = z
  .object({
    batchId: z.string().uuid({ message: 'Batch ID must be a valid UUID' }),
    title: z
      .string()
      .trim()
      .min(1, { message: 'Title is required' })
      .max(255, { message: 'Title cannot exceed 255 characters' }),
    description: z
      .string()
      .trim()
      .max(5000, { message: 'Description cannot exceed 5000 characters' })
      .optional()
      .nullable(),
    attachmentUrl: z
      .string()
      .trim()
      .url({ message: 'Attachment URL must be a valid URL' })
      .optional()
      .nullable(),
  })
  .strict();

export type CreateHomeworkInput = z.infer<typeof createHomeworkSchema>;

/**
 * Validator schema for updating homework details.
 * `instituteId`, `batchId`, `publishedAt` MUST be rejected.
 */
export const updateHomeworkSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, { message: 'Title cannot be empty' })
      .max(255, { message: 'Title cannot exceed 255 characters' })
      .optional(),
    description: z
      .string()
      .trim()
      .max(5000, { message: 'Description cannot exceed 5000 characters' })
      .optional()
      .nullable(),
    attachmentUrl: z
      .string()
      .trim()
      .url({ message: 'Attachment URL must be a valid URL' })
      .optional()
      .nullable(),
  })
  .strict();

export type UpdateHomeworkInput = z.infer<typeof updateHomeworkSchema>;

/**
 * Validator schema for listing homework for a batch.
 */
export const listHomeworkForBatchSchema = z
  .object({
    batchId: z.string().uuid({ message: 'Batch ID must be a valid UUID' }),
  })
  .strict();

export type ListHomeworkForBatchInput = z.infer<typeof listHomeworkForBatchSchema>;
