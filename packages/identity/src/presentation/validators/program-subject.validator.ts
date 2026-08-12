import { z } from 'zod';

/**
 * Validator schema for creating a ProgramSubject mapping (POST /api/institute/programs/:programId/subjects).
 * Uses .strict() to reject tenant injection or extra fields.
 */
export const createProgramSubjectSchema = z
  .object({
    programId: z.string().uuid('Invalid Program ID format'),
    subjectId: z.string().uuid('Invalid Subject ID format'),
  })
  .strict();

export type CreateProgramSubjectInput = z.infer<typeof createProgramSubjectSchema>;

/**
 * Path parameter validator schema for ProgramSubject operations with single ID.
 */
export const programSubjectParamsSchema = z.object({
  id: z.string().uuid('Invalid ProgramSubject ID format'),
});

/**
 * Path parameter validator schema for program-subject route params.
 */
export const programSubjectRouteParamsSchema = z.object({
  programId: z.string().uuid('Invalid Program ID format'),
  subjectId: z.string().uuid('Invalid Subject ID format').optional(),
});
