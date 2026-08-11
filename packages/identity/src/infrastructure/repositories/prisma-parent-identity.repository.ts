import { db } from '@coaching-os/database';
import { ConflictError, NotFoundError } from '@coaching-os/shared';
import {
  ParentIdentityEntity,
  type ParentIdentityStatus,
} from '../../domain/entities/parent-identity.entity';
import type { ParentIdentityRepository } from '../../domain/repositories/parent-identity.repository';
import { PhoneNumber } from '../../domain/value-objects/phone-number.vo';

/**
 * PrismaParentIdentityRepository
 *
 * PostgreSQL Prisma implementation of ParentIdentityRepository.
 *
 * ARCHITECTURAL CONTRACT:
 * - Operates strictly on global ParentIdentity entities.
 * - Handles E.164 phone normalization prior to database queries.
 * - Maps Prisma database records to framework-independent domain entities.
 * - Enforces database-backed unique conflict handling (P2002 -> ConflictError).
 * - NO tenant parameters (e.g. instituteId).
 */
export class PrismaParentIdentityRepository implements ParentIdentityRepository {
  /**
   * Create a new ParentIdentity record in PostgreSQL.
   */
  public async create(entity: ParentIdentityEntity): Promise<ParentIdentityEntity> {
    try {
      const record = await db.parentIdentity.create({
        data: {
          id: entity.id,
          phone: entity.phoneValue,
          name: entity.name,
          avatar: entity.avatar,
          status: entity.status,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt,
        },
      });

      return this.toDomainEntity(record);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictError(
          `A global parent identity with phone number "${entity.phoneValue}" already exists.`,
        );
      }
      throw error;
    }
  }

  /**
   * Look up ParentIdentity by ID.
   */
  public async findById(id: string): Promise<ParentIdentityEntity | null> {
    if (!id || typeof id !== 'string') {
      return null;
    }

    const record = await db.parentIdentity.findUnique({
      where: { id },
    });

    if (!record) {
      return null;
    }

    return this.toDomainEntity(record);
  }

  /**
   * Look up ParentIdentity by canonical phone number.
   */
  public async findByPhone(phone: PhoneNumber | string): Promise<ParentIdentityEntity | null> {
    if (!phone) {
      return null;
    }

    const canonicalPhone = typeof phone === 'string' ? PhoneNumber.normalize(phone) : phone.value;

    const record = await db.parentIdentity.findUnique({
      where: { phone: canonicalPhone },
    });

    if (!record) {
      return null;
    }

    return this.toDomainEntity(record);
  }

  /**
   * Check existence of ParentIdentity by canonical phone number.
   */
  public async existsByPhone(phone: PhoneNumber | string): Promise<boolean> {
    if (!phone) {
      return false;
    }

    const canonicalPhone = typeof phone === 'string' ? PhoneNumber.normalize(phone) : phone.value;

    const count = await db.parentIdentity.count({
      where: { phone: canonicalPhone },
    });

    return count > 0;
  }

  /**
   * Update existing ParentIdentity.
   */
  public async update(entity: ParentIdentityEntity): Promise<ParentIdentityEntity> {
    try {
      const record = await db.parentIdentity.update({
        where: { id: entity.id },
        data: {
          name: entity.name,
          avatar: entity.avatar,
          status: entity.status,
          updatedAt: entity.updatedAt,
        },
      });

      return this.toDomainEntity(record);
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundError(`ParentIdentity with ID "${entity.id}" not found.`);
      }
      if (error?.code === 'P2002') {
        throw new ConflictError(
          `A global parent identity with phone number "${entity.phoneValue}" already exists.`,
        );
      }
      throw error;
    }
  }

  /**
   * Delete ParentIdentity by ID.
   */
  public async delete(id: string): Promise<void> {
    try {
      await db.parentIdentity.delete({
        where: { id },
      });
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundError(`ParentIdentity with ID "${id}" not found.`);
      }
      throw error;
    }
  }

  // ── Mapping Helper ─────────────────────────────────────────────────────────

  private toDomainEntity(record: {
    id: string;
    phone: string;
    name: string | null;
    avatar: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): ParentIdentityEntity {
    return ParentIdentityEntity.from({
      id: record.id,
      phone: record.phone,
      name: record.name,
      avatar: record.avatar,
      status: record.status as ParentIdentityStatus,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
