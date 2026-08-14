import { z } from 'zod';

export const listStudentActivitiesQuerySchema = z.object({
  studentId: z.string().uuid('Invalid student ID format'),
  eventType: z
    .enum([
      'attendance_absent',
      'attendance_present',
      'homework_assigned',
      'test_result',
      'fee_payment',
      'receipt_issued',
      'announcement',
    ])
    .optional(),
  cursor: z.string().uuid('Invalid cursor format').optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type ListStudentActivitiesQueryInput = z.infer<typeof listStudentActivitiesQuerySchema>;
