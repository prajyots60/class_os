import type { StudentAdmissionStatus, StudentStatus } from '../../domain/entities/student.entity';
import type { InstituteParentStatus } from '../../domain/entities/institute-parent.entity';
import type { MembershipRole, MembershipStatus } from '../../domain/entities/institute-membership.entity';
import type { EnrollmentStatus } from '../../domain/value-objects/enrollment-status.vo';

/**
 * Standardized application-level paginated result envelope.
 */
export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  pageSize: number;
  total?: number;
}

/**
 * Canonical cursor-based pagination options.
 */
export interface PaginationOptions {
  cursor?: string | null;
  limit?: number;
}

/**
 * Strongly-typed filter for student collection queries.
 */
export interface StudentListFilter extends PaginationOptions {
  status?: StudentStatus;
  admissionStatus?: StudentAdmissionStatus;
  search?: string;
}

/**
 * Strongly-typed filter for guardian collection queries.
 */
export interface GuardianListFilter extends PaginationOptions {
  status?: InstituteParentStatus;
  search?: string;
}

/**
 * Strongly-typed filter for staff membership collection queries.
 */
export interface StaffListFilter extends PaginationOptions {
  role?: MembershipRole;
  status?: MembershipStatus;
  search?: string;
}

/**
 * Strongly-typed filter for enrollment collection queries.
 */
export interface EnrollmentListFilter extends PaginationOptions {
  studentId?: string;
  batchId?: string;
  status?: EnrollmentStatus;
}
