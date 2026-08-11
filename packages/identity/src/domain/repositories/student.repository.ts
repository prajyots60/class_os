import type {
  StudentAdmissionStatus,
  StudentEntity,
  StudentStatus,
} from '../entities/student.entity';

export interface ListStudentsOptions {
  status?: StudentStatus;
  admissionStatus?: StudentAdmissionStatus;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * StudentRepository Interface
 *
 * Domain repository abstraction for tenant-scoped Student persistence.
 *
 * ARCHITECTURAL CONTRACT:
 * - Operates strictly on Student domain entities.
 * - Framework-independent, zero Prisma or HTTP dependencies.
 * - EVERY query method requires `instituteId` as an explicit parameter to enforce
 *   strict multi-tenant isolation at the persistence boundary.
 * - Cross-tenant lookups return null or empty lists, preventing cross-tenant information leaks.
 */
export interface StudentRepository {
  /**
   * Persists a new Student domain entity.
   * Throws ConflictError if (instituteId, admissionNumber) pair already exists.
   */
  create(student: StudentEntity): Promise<StudentEntity>;

  /**
   * Look up a Student record by composite key (instituteId + record ID).
   * Cross-tenant lookups (where record ID belongs to another institute) return null.
   */
  findById(instituteId: string, id: string): Promise<StudentEntity | null>;

  /**
   * Look up a Student record by composite key (instituteId + admissionNumber).
   */
  findByAdmissionNumber(instituteId: string, admissionNumber: string): Promise<StudentEntity | null>;

  /**
   * List Student records for a specific institute with optional status/search filters and pagination.
   */
  listByInstitute(instituteId: string, options?: ListStudentsOptions): Promise<StudentEntity[]>;

  /**
   * Update an existing Student record.
   * Validates that target record belongs to instituteId. Throws NotFoundError if record does not exist.
   */
  update(student: StudentEntity): Promise<StudentEntity>;

  /**
   * Check whether a Student record exists for the given (instituteId, admissionNumber).
   */
  existsByAdmissionNumber(instituteId: string, admissionNumber: string): Promise<boolean>;
}
