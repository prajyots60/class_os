import type {
  InstituteParentStudentEntity,
  GuardianRelationshipStatus,
} from '../../domain/entities/institute-parent-student.entity';
import type { GuardianRelationshipType } from '../../domain/value-objects/guardian-relationship-type.vo';

/**
 * Primary DTO for Guardian-Student Relationship aggregate responses.
 * Enforces anti-recursion boundaries: scalar relationship fields only.
 */
export interface InstituteParentStudentDTO {
  id: string;
  instituteId: string;
  instituteParentId: string;
  studentId: string;
  relationshipType: GuardianRelationshipType;
  isPrimary: boolean;
  status: GuardianRelationshipStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

/**
 * Lightweight summary of a linked guardian embedded in Student views.
 */
export interface StudentGuardianSummaryDTO {
  relationshipId: string;
  instituteParentId: string;
  parentIdentityId?: string | null;
  relationshipType: GuardianRelationshipType;
  isPrimary: boolean;
  parentName?: string | null;
  parentPhone?: string | null;
}

/**
 * Lightweight summary of a linked student embedded in Parent CRM views.
 */
export interface ParentStudentSummaryDTO {
  relationshipId: string;
  studentId: string;
  relationshipType: GuardianRelationshipType;
  isPrimary: boolean;
  studentName?: string | null;
  admissionNumber?: string | null;
  admissionStatus?: string | null;
}

/**
 * Converts an InstituteParentStudent domain entity into an InstituteParentStudentDTO.
 */
export function toInstituteParentStudentDTO(
  entity: InstituteParentStudentEntity,
): InstituteParentStudentDTO {
  const dto = entity.toDTO();
  return {
    ...dto,
    relationshipType: entity.relationshipType,
  };
}
