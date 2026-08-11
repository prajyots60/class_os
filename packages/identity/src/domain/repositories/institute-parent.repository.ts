import type { InstituteParentEntity, InstituteParentStatus } from '../entities/institute-parent.entity';

export interface ListInstituteParentsOptions {
  status?: InstituteParentStatus;
  page?: number;
  limit?: number;
}

/**
 * InstituteParentRepository Interface
 *
 * Domain repository abstraction for tenant-scoped InstituteParent CRM persistence.
 *
 * ARCHITECTURAL CONTRACT:
 * - Operates strictly on InstituteParent domain entities.
 * - Framework-independent, zero Prisma or HTTP dependencies.
 * - EVERY query method requires `instituteId` as an explicit parameter to enforce
 *   strict multi-tenant isolation at the persistence boundary.
 */
export interface InstituteParentRepository {
  /**
   * Persists a new InstituteParent domain entity.
   * Throws ConflictError if (instituteId, parentIdentityId) pair already exists.
   */
  create(instituteParent: InstituteParentEntity): Promise<InstituteParentEntity>;

  /**
   * Look up an InstituteParent record by composite key (instituteId + record ID).
   * Cross-tenant lookups (where record ID belongs to another institute) return null.
   */
  findById(instituteId: string, id: string): Promise<InstituteParentEntity | null>;

  /**
   * Look up an InstituteParent record by composite key (instituteId + global parentIdentityId).
   */
  findByParentIdentityId(instituteId: string, parentIdentityId: string): Promise<InstituteParentEntity | null>;

  /**
   * List all InstituteParent records for a specific institute with optional status filter and pagination.
   */
  listByInstitute(
    instituteId: string,
    options?: ListInstituteParentsOptions,
  ): Promise<InstituteParentEntity[]>;

  /**
   * Update an existing InstituteParent record (notes, status).
   * Validates that target record belongs to instituteId. Throws NotFoundError if record does not exist.
   */
  update(instituteParent: InstituteParentEntity): Promise<InstituteParentEntity>;

  /**
   * Check whether an InstituteParent record exists for the given (instituteId, parentIdentityId).
   */
  exists(instituteId: string, parentIdentityId: string): Promise<boolean>;
}
