import type { ParentIdentityEntity } from '../entities/parent-identity.entity';
import type { PhoneNumber } from '../value-objects/phone-number.vo';

/**
 * ParentIdentityRepository Interface
 *
 * Domain repository abstraction for global ParentIdentity persistence.
 *
 * ARCHITECTURAL CONTRACT:
 * - Operates strictly on ParentIdentity domain entities and value objects.
 * - Framework-independent, zero Prisma or HTTP dependencies.
 * - NO tenant parameters (e.g. instituteId). ParentIdentity is globally scoped.
 */
export interface ParentIdentityRepository {
  /**
   * Persists a new ParentIdentity domain entity.
   * Throws ConflictError if phone number already exists in the database.
   */
  create(parentIdentity: ParentIdentityEntity): Promise<ParentIdentityEntity>;

  /**
   * Look up a ParentIdentity by unique UUID.
   */
  findById(id: string): Promise<ParentIdentityEntity | null>;

  /**
   * Look up a ParentIdentity by unique canonical E.164 phone number.
   * Automatically normalizes input phone string/value object before searching.
   */
  findByPhone(phone: PhoneNumber | string): Promise<ParentIdentityEntity | null>;

  /**
   * Check whether a ParentIdentity exists with the given canonical phone number.
   */
  existsByPhone(phone: PhoneNumber | string): Promise<boolean>;

  /**
   * Update existing ParentIdentity state (profile or lifecycle status).
   * Throws NotFoundError if record does not exist.
   */
  update(parentIdentity: ParentIdentityEntity): Promise<ParentIdentityEntity>;

  /**
   * Delete a ParentIdentity record by ID.
   */
  delete(id: string): Promise<void>;
}
