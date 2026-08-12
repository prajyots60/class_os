import type { EnrollmentEntity, EnrollmentStatus } from '../entities/enrollment.entity';

export interface ListEnrollmentsOptions {
  status?: EnrollmentStatus;
  studentId?: string;
  batchId?: string;
  page?: number;
  limit?: number;
}

/**
 * EnrollmentRepository Interface
 *
 * Domain repository abstraction for tenant-scoped Student Enrollment persistence.
 *
 * ARCHITECTURAL CONTRACT (ADR-0014):
 * - Framework-independent, zero Prisma or HTTP dependencies.
 * - Operates strictly on `EnrollmentEntity` domain entities.
 * - EVERY query method requires `instituteId` as an explicit parameter to enforce
 *   strict multi-tenant isolation at the persistence boundary.
 * - Cross-tenant lookups return null or empty lists, preventing cross-tenant existence disclosure.
 */
export interface EnrollmentRepository {
  /**
   * Persists a new Enrollment domain entity.
   * Throws ConflictError if duplicate enrollment constraint (instituteId, studentId, batchId) is violated.
   */
  create(enrollment: EnrollmentEntity): Promise<EnrollmentEntity>;

  /**
   * Look up an Enrollment record by composite key (instituteId + record ID).
   * Cross-tenant lookups return null.
   */
  findById(instituteId: string, id: string): Promise<EnrollmentEntity | null>;

  /**
   * Find enrollments for a specific student strictly within tenant context.
   */
  findByStudent(
    instituteId: string,
    studentId: string,
    options?: ListEnrollmentsOptions,
  ): Promise<EnrollmentEntity[]>;

  /**
   * Find enrollments for a specific batch strictly within tenant context.
   */
  findByBatch(
    instituteId: string,
    batchId: string,
    options?: ListEnrollmentsOptions,
  ): Promise<EnrollmentEntity[]>;

  /**
   * Find active enrollments for a student strictly within tenant context.
   */
  findActiveByStudent(instituteId: string, studentId: string): Promise<EnrollmentEntity[]>;

  /**
   * Find active enrollments for a batch strictly within tenant context.
   */
  findActiveByBatch(instituteId: string, batchId: string): Promise<EnrollmentEntity[]>;

  /**
   * Find enrollment record for a specific (studentId, batchId) pair strictly within tenant context.
   */
  findByStudentAndBatch(
    instituteId: string,
    studentId: string,
    batchId: string,
  ): Promise<EnrollmentEntity | null>;

  /**
   * Check whether an active or pending enrollment exists for a (studentId, batchId) pair.
   */
  existsActiveOrPending(instituteId: string, studentId: string, batchId: string): Promise<boolean>;

  /**
   * Count active and pending enrollments for a batch to enforce batch capacity.
   */
  countActiveOrPendingByBatch(instituteId: string, batchId: string): Promise<number>;

  /**
   * List enrollments for an institute with optional filters and pagination.
   */
  listByInstitute(
    instituteId: string,
    options?: ListEnrollmentsOptions,
  ): Promise<EnrollmentEntity[]>;

  /**
   * Update an existing Enrollment record.
   * Throws NotFoundError if record does not exist within the specified tenant.
   */
  update(enrollment: EnrollmentEntity): Promise<EnrollmentEntity>;

  /**
   * Persists a new Enrollment domain entity with pessimistic row-level locking on target Batch capacity.
   * Throws ConflictError if capacity limit is reached or duplicate enrollment exists.
   */
  createWithCapacityCheck(enrollment: EnrollmentEntity): Promise<EnrollmentEntity>;

  /**
   * Atomically transfers a student from source enrollment to a target batch.
   * Updates source enrollment to "transferred" state with target pointers and creates a new active target enrollment.
   * Executed within a single database transaction with pessimistic row-level locking on target Batch capacity.
   */
  transferWithCapacityCheck(params: {
    sourceEnrollment: EnrollmentEntity;
    targetBatchId: string;
    destinationEnrollment: EnrollmentEntity;
  }): Promise<{ source: EnrollmentEntity; destination: EnrollmentEntity }>;
}
