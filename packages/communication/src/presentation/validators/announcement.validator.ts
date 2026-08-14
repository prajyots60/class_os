import { z } from 'zod';

export const createAnnouncementSchema = z
  .object({
    targetType: z.enum(['institute', 'batch']),
    targetBatchId: z.string().uuid().nullable().optional(),
    title: z.string().trim().min(1, 'Title cannot be empty').max(200, 'Title cannot exceed 200 characters'),
    content: z.string().trim().min(1, 'Content cannot be empty').max(5000, 'Content cannot exceed 5000 characters'),
  })
  .strict()
  .refine(
    (data) => {
      if (data.targetType === 'institute') {
        return !data.targetBatchId;
      }
      if (data.targetType === 'batch') {
        return typeof data.targetBatchId === 'string' && data.targetBatchId.length > 0;
      }
      return true;
    },
    {
      message: 'Batch-targeted announcement requires a targetBatchId, institute-wide announcement must not specify batchId',
      path: ['targetBatchId'],
    },
  );

export const updateDraftAnnouncementSchema = z
  .object({
    targetType: z.enum(['institute', 'batch']).optional(),
    targetBatchId: z.string().uuid().nullable().optional(),
    title: z.string().trim().min(1).max(200).optional(),
    content: z.string().trim().min(1).max(5000).optional(),
  })
  .strict();

export const listAnnouncementsQuerySchema = z
  .object({
    batchId: z.string().uuid().optional(),
    status: z.enum(['draft', 'published', 'archived']).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateDraftAnnouncementInput = z.infer<typeof updateDraftAnnouncementSchema>;
export type ListAnnouncementsQueryInput = z.infer<typeof listAnnouncementsQuerySchema>;
