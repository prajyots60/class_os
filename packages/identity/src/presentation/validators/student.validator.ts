import { z } from 'zod';

/**
 * Validator schema for creating a new Student record (POST /api/institute/students).
 * Uses .strict() to reject forbidden fields (id, instituteId, admissionStatus, status, etc.).
 */
export const createStudentSchema = z
  .object({
    admissionNumber: z
      .string({ required_error: 'Admission number is required' })
      .trim()
      .min(1, 'Admission number is required')
      .max(50, 'Admission number cannot exceed 50 characters'),
    firstName: z
      .string({ required_error: 'First name is required' })
      .trim()
      .min(1, 'First name is required')
      .max(100, 'First name cannot exceed 100 characters'),
    middleName: z
      .string()
      .trim()
      .max(100, 'Middle name cannot exceed 100 characters')
      .nullable()
      .optional(),
    lastName: z
      .string({ required_error: 'Last name is required' })
      .trim()
      .min(1, 'Last name is required')
      .max(100, 'Last name cannot exceed 100 characters'),
    dateOfBirth: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format')
      .nullable()
      .optional(),
    gender: z
      .enum(['male', 'female', 'other'], {
        errorMap: () => ({ message: 'Gender must be male, female, or other' }),
      })
      .nullable()
      .optional(),
    phone: z
      .string()
      .trim()
      .min(5, 'Phone number must be at least 5 characters')
      .max(30, 'Phone number cannot exceed 30 characters')
      .nullable()
      .optional(),
    email: z
      .string()
      .trim()
      .email('Invalid email address')
      .max(255, 'Email cannot exceed 255 characters')
      .nullable()
      .optional(),
    address: z
      .string()
      .trim()
      .max(500, 'Address cannot exceed 500 characters')
      .nullable()
      .optional(),
    city: z
      .string()
      .trim()
      .max(100, 'City cannot exceed 100 characters')
      .nullable()
      .optional(),
    state: z
      .string()
      .trim()
      .max(100, 'State cannot exceed 100 characters')
      .nullable()
      .optional(),
    postalCode: z
      .string()
      .trim()
      .max(20, 'Postal code cannot exceed 20 characters')
      .nullable()
      .optional(),
  })
  .strict();

export type CreateStudentInput = z.infer<typeof createStudentSchema>;

/**
 * Validator schema for updating an existing Student profile (PATCH /api/institute/students/:id).
 * Uses .strict() to reject immutability violations (id, instituteId, admissionNumber, status, etc.).
 */
export const updateStudentSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, 'First name cannot be empty')
      .max(100, 'First name cannot exceed 100 characters')
      .optional(),
    middleName: z
      .string()
      .trim()
      .max(100, 'Middle name cannot exceed 100 characters')
      .nullable()
      .optional(),
    lastName: z
      .string()
      .trim()
      .min(1, 'Last name cannot be empty')
      .max(100, 'Last name cannot exceed 100 characters')
      .optional(),
    dateOfBirth: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format')
      .nullable()
      .optional(),
    gender: z
      .enum(['male', 'female', 'other'], {
        errorMap: () => ({ message: 'Gender must be male, female, or other' }),
      })
      .nullable()
      .optional(),
    phone: z
      .string()
      .trim()
      .min(5, 'Phone number must be at least 5 characters')
      .max(30, 'Phone number cannot exceed 30 characters')
      .nullable()
      .optional(),
    email: z
      .string()
      .trim()
      .email('Invalid email address')
      .max(255, 'Email cannot exceed 255 characters')
      .nullable()
      .optional(),
    address: z
      .string()
      .trim()
      .max(500, 'Address cannot exceed 500 characters')
      .nullable()
      .optional(),
    city: z
      .string()
      .trim()
      .max(100, 'City cannot exceed 100 characters')
      .nullable()
      .optional(),
    state: z
      .string()
      .trim()
      .max(100, 'State cannot exceed 100 characters')
      .nullable()
      .optional(),
    postalCode: z
      .string()
      .trim()
      .max(20, 'Postal code cannot exceed 20 characters')
      .nullable()
      .optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).some((key) => data[key as keyof typeof data] !== undefined),
    { message: 'At least one update field must be provided' },
  );

export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;

/**
 * Query parameter validator schema for listing Student records (GET /api/institute/students).
 */
export const listStudentsQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  admissionStatus: z.enum(['pending', 'admitted', 'rejected', 'cancelled']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type ListStudentsQueryInput = z.infer<typeof listStudentsQuerySchema>;

/**
 * Path parameter validator schema for single Student resource operations.
 */
export const studentParamsSchema = z.object({
  id: z.string().uuid('Invalid Student ID format'),
});

/**
 * Validator schema for admitting a Student (POST /api/institute/students/:id/admit).
 */
export const admitStudentSchema = z
  .object({
    admissionDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Admission date must be in YYYY-MM-DD format')
      .optional(),
  })
  .strict();

export type AdmitStudentInput = z.infer<typeof admitStudentSchema>;
