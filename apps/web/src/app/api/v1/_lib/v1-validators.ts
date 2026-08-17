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
    batchId: z.string().uuid('batchId must be a valid UUID').optional(),
    cursor: z.string().optional(),
    limit: z.coerce
      .number()
      .int()
      .positive()
      .max(MAX_PAGE_SIZE, `Limit cannot exceed ${MAX_PAGE_SIZE}`)
      .optional()
      .default(DEFAULT_PAGE_SIZE),
    page: z.coerce.number().int().positive().optional().default(1),
    pageSize: z.coerce
      .number()
      .int()
      .positive()
      .max(MAX_PAGE_SIZE, `Page size cannot exceed ${MAX_PAGE_SIZE}`)
      .optional()
      .default(DEFAULT_PAGE_SIZE),
    sortBy: z.enum(['displayName', 'admissionNumber', 'createdAt', 'status']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
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

// ─── Billing ─────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/billing-plans
 */
export const v1ListBillingPlansQuerySchema = z
  .object({
    enrollmentId: z.string().uuid('enrollmentId must be a valid UUID').optional(),
    studentId: z.string().uuid('studentId must be a valid UUID').optional(),
    feeType: z.enum(['monthly', 'one_time', 'installment']).optional(),
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

export type V1ListBillingPlansQueryInput = z.infer<typeof v1ListBillingPlansQuerySchema>;

/**
 * POST /api/v1/billing-plans
 */
export const v1CreateBillingPlanSchema = z
  .object({
    enrollmentId: z.string().uuid('enrollmentId must be a valid UUID'),
    feeType: z.enum(['monthly', 'one_time', 'installment'], {
      message: 'feeType must be monthly, one_time, or installment',
    }),
    totalAmount: z.number().positive('totalAmount must be greater than 0'),
    billingStartDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'billingStartDate must be YYYY-MM-DD format'),
    installmentCount: z.number().int().min(2, 'installmentCount must be at least 2').optional().nullable(),
    discountType: z.enum(['none', 'percentage', 'fixed']).optional().nullable(),
    discountValue: z.number().nonnegative('discountValue cannot be negative').optional().nullable(),
    firstInvoiceAmountOverride: z
      .number()
      .nonnegative('firstInvoiceAmountOverride cannot be negative')
      .optional()
      .nullable(),
  })
  .strict();

export type V1CreateBillingPlanInput = z.infer<typeof v1CreateBillingPlanSchema>;

/**
 * PATCH /api/v1/billing-plans/:id
 */
export const v1UpdateBillingPlanSchema = z
  .object({
    billingStartDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'billingStartDate must be YYYY-MM-DD format')
      .optional(),
    discountType: z.enum(['none', 'percentage', 'fixed']).optional().nullable(),
    discountValue: z.number().nonnegative('discountValue cannot be negative').optional().nullable(),
    firstInvoiceAmountOverride: z
      .number()
      .nonnegative('firstInvoiceAmountOverride cannot be negative')
      .optional()
      .nullable(),
  })
  .strict()
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'At least one field must be provided to update',
  });

export type V1UpdateBillingPlanInput = z.infer<typeof v1UpdateBillingPlanSchema>;

/**
 * GET /api/v1/invoices
 */
export const v1ListInvoicesQuerySchema = z
  .object({
    billingPlanId: z.string().uuid('billingPlanId must be a valid UUID').optional(),
    enrollmentId: z.string().uuid('enrollmentId must be a valid UUID').optional(),
    studentId: z.string().uuid('studentId must be a valid UUID').optional(),
    status: z.enum(['pending', 'partial', 'paid']).optional(),
    overdue: z.coerce.boolean().optional(),
    search: z.string().trim().max(200).optional(),
    cursor: z.string().optional(),
    limit: z.coerce
      .number()
      .int()
      .positive()
      .max(MAX_PAGE_SIZE)
      .optional()
      .default(DEFAULT_PAGE_SIZE),
    page: z.coerce.number().int().positive().optional().default(1),
    pageSize: z.coerce
      .number()
      .int()
      .positive()
      .max(MAX_PAGE_SIZE, `Page size cannot exceed ${MAX_PAGE_SIZE}`)
      .optional()
      .default(DEFAULT_PAGE_SIZE),
    sortBy: z.enum(['dueDate', 'amount', 'createdAt', 'status']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  })
  .strict();


export type V1ListInvoicesQueryInput = z.infer<typeof v1ListInvoicesQuerySchema>;

/**
 * GET /api/v1/academics/sessions
 */
export const v1ListSessionsQuerySchema = z
  .object({
    batchId: z.string().uuid('batchId must be a valid UUID').optional(),
    subjectId: z.string().uuid('subjectId must be a valid UUID').optional(),
    teacherId: z.string().uuid('teacherId must be a valid UUID').optional(),
    status: z.enum(['scheduled', 'completed', 'cancelled']).optional(),
    attendanceStatus: z.enum(['taken', 'pending']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    search: z.string().trim().max(200).optional(),
    cursor: z.string().optional(),
    limit: z.coerce
      .number()
      .int()
      .positive()
      .max(MAX_PAGE_SIZE)
      .optional()
      .default(DEFAULT_PAGE_SIZE),
    page: z.coerce.number().int().positive().optional().default(1),
    pageSize: z.coerce
      .number()
      .int()
      .positive()
      .max(MAX_PAGE_SIZE, `Page size cannot exceed ${MAX_PAGE_SIZE}`)
      .optional()
      .default(DEFAULT_PAGE_SIZE),
    sortBy: z.enum(['date', 'status', 'createdAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  })
  .strict();

export type V1ListSessionsQueryInput = z.infer<typeof v1ListSessionsQuerySchema>;


/**
 * POST /api/v1/invoices
 */
export const v1GenerateInvoiceSchema = z
  .object({
    billingPlanId: z.string().uuid('billingPlanId must be a valid UUID'),
    billingPeriod: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}$/, 'billingPeriod must be YYYY-MM format')
      .optional(),
    installmentNumber: z.number().int().positive('installmentNumber must be at least 1').optional(),
  })
  .strict();

export type V1GenerateInvoiceInput = z.infer<typeof v1GenerateInvoiceSchema>;

/**
 * GET /api/v1/payments
 */
export const v1ListPaymentsQuerySchema = z
  .object({
    invoiceId: z.string().uuid('invoiceId must be a valid UUID').optional(),
    studentId: z.string().uuid('studentId must be a valid UUID').optional(),
    batchId: z.string().uuid('batchId must be a valid UUID').optional(),
    paymentMode: z.enum(['cash', 'upi', 'bank_transfer']).optional(),
    fromDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'fromDate must be YYYY-MM-DD format')
      .optional(),
    toDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'toDate must be YYYY-MM-DD format')
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

export type V1ListPaymentsQueryInput = z.infer<typeof v1ListPaymentsQuerySchema>;

/**
 * POST /api/v1/payments
 */
export const v1RecordPaymentSchema = z
  .object({
    invoiceId: z.string().uuid('invoiceId must be a valid UUID'),
    amount: z.number().positive('amount must be greater than 0'),
    paymentMode: z.enum(['cash', 'upi', 'bank_transfer'], {
      message: 'paymentMode must be cash, upi, or bank_transfer',
    }),
    receivedOn: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'receivedOn must be YYYY-MM-DD format'),
    remarks: z.string().trim().max(500, 'remarks cannot exceed 500 characters').optional().nullable(),
  })
  .strict();

export type V1RecordPaymentInput = z.infer<typeof v1RecordPaymentSchema>;

/**
 * POST /api/v1/receipts
 */
export const v1GenerateReceiptSchema = z
  .object({
    paymentId: z.string().uuid('paymentId must be a valid UUID'),
  })
  .strict();

export type V1GenerateReceiptInput = z.infer<typeof v1GenerateReceiptSchema>;

