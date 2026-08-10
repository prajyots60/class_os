import { z } from 'zod';

export const createMembershipSchema = z.object({
  userId: z.string().trim().min(1, 'User ID is required'),
  instituteId: z.string().trim().min(1, 'Institute ID is required'),
  role: z.enum(['owner', 'teacher', 'assistant', 'parent'], {
    errorMap: () => ({
      message: 'Role must be one of: owner, teacher, assistant, parent',
    }),
  }),
  status: z.enum(['active', 'suspended', 'removed']).optional(),
});

export const changeMembershipStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'removed'], {
    errorMap: () => ({ message: 'Status must be active, suspended, or removed' }),
  }),
});

export const resolveMembershipSchema = z.object({
  userId: z.string().trim().min(1, 'User ID is required'),
  requestedInstituteId: z.string().trim().min(1, 'Institute ID is required'),
});

export type CreateMembershipInput = z.infer<typeof createMembershipSchema>;
export type ChangeMembershipStatusInput = z.infer<typeof changeMembershipStatusSchema>;
export type ResolveMembershipInput = z.infer<typeof resolveMembershipSchema>;
