/**
 * guardian-ui.types.ts
 *
 * Frontend UI Type definitions for Guardian & Student Relationship management.
 * Enforces anti-recursion rules and maps canonical Phase 1.9 relationship DTOs.
 */

export type GuardianRelationshipType =
  | 'father'
  | 'mother'
  | 'guardian'
  | 'stepfather'
  | 'stepmother'
  | 'grandparent'
  | 'sibling'
  | 'other';

export type GuardianRelationshipStatus = 'active' | 'archived';

export const GUARDIAN_RELATIONSHIP_LABELS: Record<GuardianRelationshipType, string> = {
  mother: 'Mother',
  father: 'Father',
  guardian: 'Guardian',
  stepfather: 'Stepfather',
  stepmother: 'Stepmother',
  grandparent: 'Grandparent',
  sibling: 'Sibling',
  other: 'Other',
};

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

export interface StudentGuardianSummaryDTO {
  id?: string;
  relationshipId?: string;
  instituteParentId: string;
  parentIdentityId?: string | null;
  relationshipType: GuardianRelationshipType;
  isPrimary: boolean;
  parentName?: string | null;
  parentPhone?: string | null;
  status?: GuardianRelationshipStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface ParentStudentSummaryDTO {
  id?: string;
  relationshipId?: string;
  studentId: string;
  relationshipType: GuardianRelationshipType;
  isPrimary: boolean;
  studentName?: string | null;
  admissionNumber?: string | null;
  admissionStatus?: string | null;
  status?: GuardianRelationshipStatus;
}

export interface CreateGuardianFormValues {
  instituteParentId: string;
  relationshipType: GuardianRelationshipType;
  isPrimary?: boolean;
}

export interface EditGuardianFormValues {
  relationshipType: GuardianRelationshipType;
}

export interface ApiGuardianListResponse {
  success?: boolean;
  data: InstituteParentStudentDTO[];
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiGuardianResponse {
  success?: boolean;
  data: InstituteParentStudentDTO | null;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiGuardianActionResponse {
  success?: boolean;
  data?: InstituteParentStudentDTO | null;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
