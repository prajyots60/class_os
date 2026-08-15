import { z } from 'zod';
import type { StudentLinkDTO } from '../../domain/entities/student-link.entity';

export type { StudentLinkDTO };

export const createStudentLinkSchema = z
  .object({
    studentId: z.string().uuid('Invalid Student ID format'),
  })
  .strict();

export type CreateStudentLinkInput = z.infer<typeof createStudentLinkSchema>;
