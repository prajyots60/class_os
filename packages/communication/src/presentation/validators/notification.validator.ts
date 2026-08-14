import { z } from 'zod';

export const createNotificationSchema = z.object({
  recipientUserId: z.string().uuid('recipientUserId must be a valid UUID'),
  recipientType: z.enum(['staff', 'parent', 'student']),
  priority: z.enum(['critical', 'important', 'informational']).default('informational'),
  category: z
    .enum(['attendance', 'fee', 'assessment', 'homework', 'announcement', 'emergency', 'general'])
    .default('general'),
  channel: z.enum(['in_app']).default('in_app'),
  title: z.string().min(1, 'Title is required').max(255, 'Title cannot exceed 255 characters'),
  message: z
    .string()
    .min(1, 'Message is required')
    .max(5000, 'Message cannot exceed 5000 characters'),
  actionUrl: z.string().url('actionUrl must be a valid URL').nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  idempotencyKey: z.string().max(255).optional(),
});

export const listNotificationsQuerySchema = z.object({
  isRead: z.coerce.boolean().optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type ListNotificationsQueryInput = z.infer<typeof listNotificationsQuerySchema>;
