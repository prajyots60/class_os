import { z } from 'zod';
import {
  VALID_GUARDIAN_RELATIONSHIP_TYPES,
  type GuardianRelationshipType,
} from '../../domain/value-objects/guardian-relationship-type.vo';

/**
 * Validator schema for creating a new Guardian-Student Relationship link.
 * POST /api/institute/students/[studentId]/guardians
 * Rejects forbidden fields (id, instituteId, studentId, parentIdentityId, status, deletedAt).
 */
export const createInstituteParentStudentSchema = z
  .object({
    instituteParentId: z
      .string({ required_error: 'Institute parent ID is required' })
      .uuid('Invalid Institute Parent ID format'),
    relationshipType: z.enum(
      VALID_GUARDIAN_RELATIONSHIP_TYPES as [
        GuardianRelationshipType,
        ...GuardianRelationshipType[],
      ],
      {
        errorMap: () => ({
          message: `Relationship type must be one of: ${VALID_GUARDIAN_RELATIONSHIP_TYPES.join(', ')}`,
        }),
      },
    ),
    isPrimary: z.boolean().optional(),
  })
  .strict();

export type CreateInstituteParentStudentInput = z.infer<typeof createInstituteParentStudentSchema>;

/**
 * Validator schema for updating a Guardian-Student Relationship link (PATCH /api/institute/parent-student/[id]).
 * Strictly restricts mutation to relationshipType.
 * Rejects forbidden fields (id, instituteId, instituteParentId, studentId, isPrimary, status, deletedAt).
 */
export const updateInstituteParentStudentSchema = z
  .object({
    relationshipType: z.enum(
      VALID_GUARDIAN_RELATIONSHIP_TYPES as [
        GuardianRelationshipType,
        ...GuardianRelationshipType[],
      ],
      {
        errorMap: () => ({
          message: `Relationship type must be one of: ${VALID_GUARDIAN_RELATIONSHIP_TYPES.join(', ')}`,
        }),
      },
    ),
  })
  .strict();

export type UpdateInstituteParentStudentInput = z.infer<typeof updateInstituteParentStudentSchema>;

/**
 * Path parameter validator for single relationship operations.
 */
export const instituteParentStudentParamsSchema = z.object({
  id: z.string().uuid('Invalid Relationship ID format'),
});

export type InstituteParentStudentParamsInput = z.infer<typeof instituteParentStudentParamsSchema>;

/**
 * Path parameter validator for student guardians listing.
 */
export const studentGuardiansParamsSchema = z.object({
  studentId: z.string().uuid('Invalid Student ID format'),
});

export type StudentGuardiansParamsInput = z.infer<typeof studentGuardiansParamsSchema>;

/**
 * Path parameter validator for parent students listing.
 */
export const parentStudentsParamsSchema = z.object({
  parentId: z.string().uuid('Invalid Parent ID format'),
});

export type ParentStudentsParamsInput = z.infer<typeof parentStudentsParamsSchema>;
