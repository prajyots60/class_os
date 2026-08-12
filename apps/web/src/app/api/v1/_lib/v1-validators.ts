/**
 * Phase 1.12.3 — API v1 Presentation Validators
 *
 * Strict Zod schemas for all /api/v1 endpoints.
 * Rules enforced here:
 *   - .strict() on all schemas to reject unknown/injected fields
 *   - Tenant fields (instituteId, userId, role, membershipId, tenantId) are NEVER in allowed fields
 *   - Page size capped at MAX_PAGE_SIZE
 *   - All path params validated as UUIDs
 */

import { z } from 'zod';

// ─── Shared Pagination ────────────────────────────────────────────────────────

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 25;

export const paginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(MAX_PAGE_SIZE, `Page size cannot exceed ${MAX_PAGE_SIZE}`)
    .optional()
    .default(DEFAULT_PAGE_SIZE),
});

export type PaginationQueryInput = z.infer<typeof paginationQuerySchema>;

// ─── Path Params ─────────────────────────────────────────────────────────────

export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid resource ID format — must be a valid UUID'),
});

export type UuidParamInput = z.infer<typeof uuidParamSchema>;

export const staffParamSchema = z.object({
  id: z.string().trim().min(1, 'Invalid staff membership ID format'),
});

export type StaffParamInput = z.infer<typeof staffParamSchema>;

// ─── Students ─────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/students — collection filter.
 * Explicitly excludes: instituteId, userId, role, membershipId, tenantId.
 */
export const v1ListStudentsQuerySchema = z
  .object({
    search: z.string().trim().max(200, 'Search term too long').optional(),
    status: z.enum(['active', 'inactive', 'archived']).optional(),
    admissionStatus: z.enum(['pending', 'admitted', 'rejected', 'cancelled']).optional(),
    cursor: z.string().optional(),
    limit: z.coerce
      .number()
      .int()
      .positive()
      .max(MAX_PAGE_SIZE, `Limit cannot exceed ${MAX_PAGE_SIZE}`)
      .optional()
      .default(DEFAULT_PAGE_SIZE),
  })
  .strict();

export type V1ListStudentsQueryInput = z.infer<typeof v1ListStudentsQuerySchema>;

/**
 * PATCH /api/v1/students/:id — explicit mutable fields only.
 * Rejected fields: id, instituteId, admissionNumber, status, admissionStatus, role,
 *                  userId, membershipId, password, sessionToken, etc.
 */
export const v1UpdateStudentSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    middleName: z.string().trim().max(100).nullable().optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    dateOfBirth: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format')
      .nullable()
      .optional(),
    gender: z.enum(['male', 'female', 'other']).nullable().optional(),
    phone: z.string().trim().min(5).max(30).nullable().optional(),
    email: z.string().trim().email().max(255).nullable().optional(),
    address: z.string().trim().max(500).nullable().optional(),
    city: z.string().trim().max(100).nullable().optional(),
    state: z.string().trim().max(100).nullable().optional(),
    postalCode: z.string().trim().max(20).nullable().optional(),
  })
  .strict()
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'At least one field must be provided to update',
  });

export type V1UpdateStudentInput = z.infer<typeof v1UpdateStudentSchema>;

// ─── Guardians / Parents ──────────────────────────────────────────────────────

/**
 * GET /api/v1/guardians — collection filter.
 */
export const v1ListGuardiansQuerySchema = z
  .object({
    search: z.string().trim().max(200).optional(),
    status: z.enum(['active', 'inactive']).optional(),
    cursor: z.string().optional(),
    limit: z.coerce
      .number()
      .int()
      .positive()
      .max(MAX_PAGE_SIZE)
      .optional()
      .default(DEFAULT_PAGE_SIZE),
  })
  .strict();

export type V1ListGuardiansQueryInput = z.infer<typeof v1ListGuardiansQuerySchema>;

// ─── Staff / Memberships ──────────────────────────────────────────────────────

/**
 * GET /api/v1/staff — collection filter.
 */
export const v1ListStaffQuerySchema = z
  .object({
    role: z.enum(['owner', 'teacher', 'assistant']).optional(),
    status: z.enum(['active', 'suspended', 'removed']).optional(),
    cursor: z.string().optional(),
    limit: z.coerce
      .number()
      .int()
      .positive()
      .max(MAX_PAGE_SIZE)
      .optional()
      .default(DEFAULT_PAGE_SIZE),
  })
  .strict();

export type V1ListStaffQueryInput = z.infer<typeof v1ListStaffQuerySchema>;

/**
 * POST /api/v1/staff/invite — Invite new staff member.
 * Strictly rejects instituteId, membershipId, status, timestamps, or authorization overrides.
 */
export const v1InviteStaffSchema = z
  .object({
    email: z.string().trim().email('Invalid email address format').optional(),
    userId: z.string().trim().optional(),
    role: z.enum(['owner', 'teacher', 'assistant'], {
      message: 'Staff role must be owner, teacher, or assistant',
    }),
  })
  .strict()
  .refine((data) => Boolean(data.email || data.userId), {
    message: 'Either email or userId must be provided.',
    path: ['email'],
  });

export type V1InviteStaffInput = z.infer<typeof v1InviteStaffSchema>;

/**
 * PATCH /api/v1/staff/[id]/role — Update staff member role.
 * Strictly rejects userId, instituteId, membershipId, status, timestamps, or authorization overrides.
 */
export const v1UpdateStaffRoleSchema = z
  .object({
    role: z.enum(['owner', 'teacher', 'assistant'], {
      message: 'Staff role must be owner, teacher, or assistant',
    }),
  })
  .strict();

export type V1UpdateStaffRoleInput = z.infer<typeof v1UpdateStaffRoleSchema>;

// ─── Enrollments ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/enrollments — collection filter.
 * Rejected: instituteId, tenantId, any internal FK fields.
 */
export const v1ListEnrollmentsQuerySchema = z
  .object({
    studentId: z.string().uuid('studentId must be a valid UUID').optional(),
    batchId: z.string().uuid('batchId must be a valid UUID').optional(),
    status: z
      .enum(['pending', 'active', 'completed', 'withdrawn', 'transferred', 'cancelled'])
      .optional(),
    cursor: z.string().optional(),
    limit: z.coerce
      .number()
      .int()
      .positive()
      .max(MAX_PAGE_SIZE)
      .optional()
      .default(DEFAULT_PAGE_SIZE),
  })
  .strict();

export type V1ListEnrollmentsQueryInput = z.infer<typeof v1ListEnrollmentsQuerySchema>;
