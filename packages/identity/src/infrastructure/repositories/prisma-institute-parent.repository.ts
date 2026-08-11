import { db } from '@coaching-os/database';
import { ConflictError, NotFoundError, ValidationError } from '@coaching-os/shared';
import {
  InstituteParentEntity,
  type InstituteParentStatus,
} from '../../domain/entities/institute-parent.entity';
import type {
  InstituteParentRepository,
  ListInstituteParentsOptions,
} from '../../domain/repositories/institute-parent.repository';

/**
 * PrismaInstituteParentRepository
 *
 * PostgreSQL Prisma implementation of InstituteParentRepository.
 *
 * ARCHITECTURAL CONTRACT:
 * - Operates strictly on tenant-scoped InstituteParent CRM entities.
 * - EVERY method enforces `instituteId` tenant scoping at database layer.
 * - Enforces composite uniqueness: UNIQUE(institute_id, parent_identity_id).
 * - Translates Prisma errors into clean domain/infrastructure errors.
 * - MUST NEVER mutate or delete global ParentIdentity entities.
 */
export class PrismaInstituteParentRepository implements InstituteParentRepository {
  /**
   * Create a new InstituteParent CRM record in PostgreSQL.
   */
  public async create(entity: InstituteParentEntity): Promise<InstituteParentEntity> {
    try {
      const record = await db.instituteParent.create({
        data: {
          id: entity.id,
          instituteId: entity.instituteId,
          parentIdentityId: entity.parentIdentityId,
          notes: entity.notes,
          status: entity.status,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt,
        },
      });

      return this.toDomainEntity(record);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictError(
          `An institute parent CRM record already exists for parent identity "${entity.parentIdentityId}" in institute "${entity.instituteId}".`,
        );
      }
      if (error?.code === 'P2003') {
        throw new ValidationError(
          `Foreign key constraint failure: Target institute or global ParentIdentity does not exist.`,
        );
      }
      throw error;
    }
  }

  /**
   * Look up an InstituteParent record by record ID strictly within tenant context.
   */
  public async findById(instituteId: string, id: string): Promise<InstituteParentEntity | null> {
    if (!instituteId || !id) {
      return null;
    }

    const record = await db.instituteParent.findFirst({
      where: {
        id,
        instituteId,
      },
    });

    if (!record) {
      return null;
    }

    return this.toDomainEntity(record);
  }

  /**
   * Look up an InstituteParent record by global parentIdentityId strictly within tenant context.
   */
  public async findByParentIdentityId(
    instituteId: string,
    parentIdentityId: string,
  ): Promise<InstituteParentEntity | null> {
    if (!instituteId || !parentIdentityId) {
      return null;
    }

    const record = await db.instituteParent.findUnique({
      where: {
        institute_parent_unique: {
          instituteId,
          parentIdentityId,
        },
      },
    });

    if (!record) {
      return null;
    }

    return this.toDomainEntity(record);
  }

  /**
   * List all InstituteParent records for an institute with optional filtering and pagination.
   */
  public async listByInstitute(
    instituteId: string,
    options?: ListInstituteParentsOptions,
  ): Promise<InstituteParentEntity[]> {
    if (!instituteId) {
      return [];
    }

    const page = Math.max(1, options?.page ?? 1);
    const limit = Math.max(1, Math.min(100, options?.limit ?? 50));
    const skip = (page - 1) * limit;

    const records = await db.instituteParent.findMany({
      where: {
        instituteId,
        ...(options?.status ? { status: options.status } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });

    return records.map((record) => this.toDomainEntity(record));
  }

  /**
   * Update an existing InstituteParent record strictly within tenant context.
   */
  public async update(entity: InstituteParentEntity): Promise<InstituteParentEntity> {
    // Verify target record exists within the specified tenant context
    const existing = await this.findById(entity.instituteId, entity.id);
    if (!existing) {
      throw new NotFoundError(
        `InstituteParent record "${entity.id}" not found in institute "${entity.instituteId}".`,
      );
    }

    try {
      const record = await db.instituteParent.update({
        where: { id: entity.id },
        data: {
          notes: entity.notes,
          status: entity.status,
          updatedAt: entity.updatedAt,
        },
      });

      return this.toDomainEntity(record);
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundError(
          `InstituteParent record "${entity.id}" not found in institute "${entity.instituteId}".`,
        );
      }
      throw error;
    }
  }

  /**
   * Check whether an InstituteParent record exists for a (instituteId, parentIdentityId) pair.
   */
  public async exists(instituteId: string, parentIdentityId: string): Promise<boolean> {
    if (!instituteId || !parentIdentityId) {
      return false;
    }

    const count = await db.instituteParent.count({
      where: {
        instituteId,
        parentIdentityId,
      },
    });

    return count > 0;
  }

  // ── Mapping Helper ─────────────────────────────────────────────────────────

  private toDomainEntity(record: {
    id: string;
    instituteId: string;
    parentIdentityId: string;
    notes: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): InstituteParentEntity {
    return InstituteParentEntity.from({
      id: record.id,
      instituteId: record.instituteId,
      parentIdentityId: record.parentIdentityId,
      notes: record.notes,
      status: record.status as InstituteParentStatus,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
