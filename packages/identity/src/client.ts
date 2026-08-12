// Pure Client-safe Exports (No Database or Prisma Dependencies)
export * from './authorization/capabilities';
export * from './authorization/role-capabilities';

// DTOs (Type-only exports to prevent bundling domain entities / node:crypto into client code)
export type { ParentIdentityDTO } from './application/dto/parent-identity.dto';
export type { InstituteParentDTO } from './application/dto/institute-parent.dto';
export type { StudentDTO } from './application/dto/student.dto';
export type { ProgramDTO } from './application/dto/program.dto';
export type { SubjectDTO } from './application/dto/subject.dto';
export type { ProgramSubjectDTO } from './application/dto/program-subject.dto';
export type { BatchDTO } from './application/dto/batch.dto';
export type BatchStatus = 'draft' | 'open' | 'running' | 'completed' | 'archived';
export type { StaffMembershipDTO, StaffUserSummaryDTO } from './application/dto/membership.dto';
export type { EnrollmentDTO, StudentEnrollmentSummaryDTO, BatchEnrollmentSummaryDTO } from './application/dto/enrollment.dto';
export type {
  PaginatedResult,
  PaginationOptions,
  StudentListFilter,
  GuardianListFilter,
  StaffListFilter,
  EnrollmentListFilter,
} from './application/dto/pagination.dto';
export type {
  StudentGuardianSummaryDTO,
  ParentStudentSummaryDTO,
} from './application/dto/institute-parent-student.dto';

// Protected API v1 Client SDK Exports
export * from './application/dto/api-v1-response.dto';
export * from './client/v1-identity-api-client';

// Validators
export * from './presentation/validators/institute.validator';
export * from './presentation/validators/membership.validator';
export * from './presentation/validators/onboarding.validator';
export * from './presentation/validators/institute-parent.validator';
export * from './presentation/validators/student.validator';
export * from './presentation/validators/institute-parent-student.validator';
export * from './presentation/validators/program.validator';
export * from './presentation/validators/subject.validator';
export * from './presentation/validators/program-subject.validator';
export * from './presentation/validators/batch.validator';
