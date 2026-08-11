import { z } from 'zod';

/**
 * Validator schema for creating a new InstituteParent CRM record (POST /api/institute/parents).
 * Uses .strict() to reject forbidden fields (instituteId, parentIdentityId, role, etc.).
 */
export const createInstituteParentSchema = z
  .object({
    phone: z
      .string({ required_error: 'Phone number is required' })
      .trim()
      .min(5, 'Phone number must be at least 5 characters')
      .max(30, 'Phone number cannot exceed 30 characters'),
    name: z
      .string()
      .trim()
      .max(100, 'Name cannot exceed 100 characters')
      .nullable()
      .optional(),
    notes: z
      .string()
      .trim()
      .max(2000, 'Notes cannot exceed 2000 characters')
      .nullable()
      .optional(),
    initialStatus: z
      .enum(['active', 'inactive'], {
        errorMap: () => ({ message: 'Initial status must be active or inactive' }),
      })
      .optional(),
  })
  .strict();

export type CreateInstituteParentInput = z.infer<typeof createInstituteParentSchema>;

/**
 * Validator schema for updating an existing InstituteParent CRM record (PATCH /api/institute/parents/:id).
 * Strictly restricts mutation to tenant-owned CRM fields (notes, status).
 * Rejects immutability violations (phone, instituteId, parentIdentityId, etc.).
 */
export const updateInstituteParentSchema = z
  .object({
    notes: z
      .string()
      .trim()
      .max(2000, 'Notes cannot exceed 2000 characters')
      .nullable()
      .optional(),
    status: z
      .enum(['active', 'inactive'], {
        errorMap: () => ({ message: 'Status must be active or inactive' }),
      })
      .optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).some((key) => data[key as keyof typeof data] !== undefined),
    { message: 'At least one update parameter must be provided' },
  );

export type UpdateInstituteParentInput = z.infer<typeof updateInstituteParentSchema>;

/**
 * Query parameter validator schema for listing InstituteParent records (GET /api/institute/parents).
 */
export const listInstituteParentsQuerySchema = z.object({
  status: z.enum(['active', 'inactive']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type ListInstituteParentsQueryInput = z.infer<typeof listInstituteParentsQuerySchema>;

/**
 * Path parameter validator schema for single InstituteParent resource operations.
 */
export const instituteParentParamsSchema = z.object({
  id: z.string().uuid('Invalid Institute Parent ID format'),
});
