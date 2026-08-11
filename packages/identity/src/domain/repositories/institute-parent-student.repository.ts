import type { InstituteParentStudentEntity } from '../entities/institute-parent-student.entity';

/**
 * InstituteParentStudentRepository Interface
 *
 * Domain repository abstraction for tenant-scoped Guardian-Student Relationship persistence.
 *
 * ARCHITECTURAL CONTRACT:
 * - Operates strictly on InstituteParentStudent domain entities.
 * - Framework-independent, zero Prisma or HTTP dependencies.
 * - EVERY query method requires `instituteId` as an explicit parameter to enforce
 *   strict multi-tenant isolation at the persistence boundary.
 * - Cross-tenant queries return null / empty lists to preserve the 404/not-found security posture.
 */
export interface InstituteParentStudentRepository {
  /**
   * Persists a new InstituteParentStudent relationship entity.
   * Throws ConflictError if (instituteId, instituteParentId, studentId) pair already exists.
   */
  create(entity: InstituteParentStudentEntity): Promise<InstituteParentStudentEntity>;

  /**
   * Look up a relationship by composite key (instituteId + relationship ID).
   * Cross-tenant lookups return null.
   */
  findById(instituteId: string, id: string): Promise<InstituteParentStudentEntity | null>;

  /**
   * Look up a relationship by pair (instituteId + instituteParentId + studentId).
   */
  findByPair(
    instituteId: string,
    instituteParentId: string,
    studentId: string,
  ): Promise<InstituteParentStudentEntity | null>;

  /**
   * List all relationships linked to a specific student within an institute.
   */
  listByStudentId(instituteId: string, studentId: string): Promise<InstituteParentStudentEntity[]>;

  /**
   * List all relationships linked to a specific parent CRM record within an institute.
   */
  listByInstituteParentId(
    instituteId: string,
    instituteParentId: string,
  ): Promise<InstituteParentStudentEntity[]>;

  /**
   * Update an existing relationship entity (relationshipType, isPrimary, status).
   * Validates that target record belongs to instituteId. Throws NotFoundError if record does not exist.
   */
  update(entity: InstituteParentStudentEntity): Promise<InstituteParentStudentEntity>;

  /**
   * Atomically promotes a relationship to primary guardian for a student within an institute,
   * unsetting isPrimary on any existing primary relationship for that student.
   */
  setPrimaryGuardian(
    instituteId: string,
    studentId: string,
    relationshipId: string,
  ): Promise<void>;

  /**
   * Soft-archive a relationship record by ID within tenant scope.
   */
  archive(instituteId: string, id: string): Promise<void>;

  /**
   * Check whether an active or existing relationship exists for (instituteId, instituteParentId, studentId).
   */
  exists(instituteId: string, instituteParentId: string, studentId: string): Promise<boolean>;
}
