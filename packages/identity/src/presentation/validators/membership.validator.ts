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

export const inviteStaffSchema = z
  .object({
    userId: z.string().trim().min(1, 'User ID is required'),
    role: z.enum(['owner', 'teacher', 'assistant'], {
      message: 'Role must be owner, teacher, or assistant',
    }),
  })
  .strict();

export const updateStaffRoleSchema = z
  .object({
    role: z.enum(['owner', 'teacher', 'assistant'], {
      message: 'Role must be owner, teacher, or assistant',
    }),
  })
  .strict();

export type CreateMembershipInput = z.infer<typeof createMembershipSchema>;
export type ChangeMembershipStatusInput = z.infer<typeof changeMembershipStatusSchema>;
export type ResolveMembershipInput = z.infer<typeof resolveMembershipSchema>;
export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;
export type UpdateStaffRoleInput = z.infer<typeof updateStaffRoleSchema>;
