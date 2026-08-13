import { z } from 'zod';

export const createScheduleSchema = z.object({
  batchId: z.string().uuid({ message: 'Batch ID must be a valid UUID' }),
  dayOfWeek: z.enum([
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ], { message: 'Invalid day of week' }),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Start time must be in 24-hour HH:mm format',
  }),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'End time must be in 24-hour HH:mm format',
  }),
  teacherId: z.string().uuid().nullable().optional(),
});

export const updateScheduleSchema = z.object({
  scheduleId: z.string().uuid({ message: 'Schedule ID must be a valid UUID' }),
  batchId: z.string().uuid({ message: 'Batch ID must be a valid UUID' }),
  dayOfWeek: z.enum([
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ]).optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  teacherId: z.string().uuid().nullable().optional(),
});

export const listSchedulesForBatchSchema = z.object({
  batchId: z.string().uuid({ message: 'Batch ID must be a valid UUID' }),
});

export const generateBatchSessionsSchema = z.object({
  batchId: z.string().uuid({ message: 'Batch ID must be a valid UUID' }),
  startDate: z.string().min(1, { message: 'Start date is required' }),
  endDate: z.string().min(1, { message: 'End date is required' }),
});

export const listBatchSessionsSchema = z.object({
  batchId: z.string().uuid({ message: 'Batch ID must be a valid UUID' }),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
