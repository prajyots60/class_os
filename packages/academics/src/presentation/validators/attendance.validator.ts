import { z } from 'zod';

export const attendanceItemSchema = z.object({
  enrollmentId: z.string().uuid({ message: 'Enrollment ID must be a valid UUID' }),
  status: z.enum(['present', 'absent', 'late'], {
    message: 'Attendance status must be one of: present, absent, late',
  }),
});

export const getSessionAttendanceSchema = z.object({
  sessionId: z.string().uuid({ message: 'Session ID must be a valid UUID' }),
});

export const recordSessionAttendanceSchema = z.object({
  sessionId: z.string().uuid({ message: 'Session ID must be a valid UUID' }),
  records: z
    .array(attendanceItemSchema)
    .min(1, { message: 'Attendance payload must contain at least one enrollment record' })
    .refine(
      (items) => {
        const set = new Set(items.map((i) => i.enrollmentId));
        return set.size === items.length;
      },
      { message: 'Attendance payload contains duplicate enrollment IDs' },
    ),
});
