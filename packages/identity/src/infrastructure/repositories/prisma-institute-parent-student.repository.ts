import { db } from '@coaching-os/database';
import { ConflictError, NotFoundError, ValidationError } from '@coaching-os/shared';
import {
  InstituteParentStudentEntity,
  type GuardianRelationshipStatus,
} from '../../domain/entities/institute-parent-student.entity';
import type { GuardianRelationshipType } from '../../domain/value-objects/guardian-relationship-type.vo';
import type { InstituteParentStudentRepository } from '../../domain/repositories/institute-parent-student.repository';

/**
 * PrismaInstituteParentStudentRepository
 *
 * PostgreSQL Prisma implementation of InstituteParentStudentRepository.
 *
 * ARCHITECTURAL CONTRACT:
 * - Operates strictly on tenant-scoped Guardian-Student Relationship entities.
 * - EVERY method enforces `instituteId` tenant scoping at database layer.
 * - Enforces composite pair uniqueness: UNIQUE(institute_id, institute_parent_id, student_id).
 * - Enforces active primary guardian invariant via atomic transactions.
 * - Translates Prisma errors into clean domain/infrastructure errors.
 * - MUST NEVER mutate or delete ParentIdentity, InstituteParent, or Student aggregates.
 */
export class PrismaInstituteParentStudentRepository implements InstituteParentStudentRepository {
  /**
   * Create a new Guardian-Student Relationship record in PostgreSQL.
   */
  public async create(
    entity: InstituteParentStudentEntity,
  ): Promise<InstituteParentStudentEntity> {
    // Verify both Parent and Student belong to the target institute tenant
    const [parentExists, studentExists] = await Promise.all([
      db.instituteParent.findFirst({
        where: { id: entity.instituteParentId, instituteId: entity.instituteId },
      }),
      db.student.findFirst({
        where: { id: entity.studentId, instituteId: entity.instituteId },
      }),
    ]);

    if (!parentExists) {
      throw new NotFoundError(
        `InstituteParent record "${entity.instituteParentId}" not found in institute "${entity.instituteId}".`,
      );
    }

    if (!studentExists) {
      throw new NotFoundError(
        `Student record "${entity.studentId}" not found in institute "${entity.instituteId}".`,
      );
    }

    try {
      const record = await db.instituteParentStudent.create({
        data: {
          id: entity.id,
          instituteId: entity.instituteId,
          instituteParentId: entity.instituteParentId,
          studentId: entity.studentId,
          relationshipType: entity.relationshipType,
          isPrimary: entity.isPrimary,
          status: entity.status,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt,
          deletedAt: entity.deletedAt,
        },
      });

      return this.toDomainEntity(record);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictError(
          `A relationship already exists for parent "${entity.instituteParentId}" and student "${entity.studentId}" in institute "${entity.instituteId}".`,
        );
      }
      if (error?.code === 'P2003') {
        throw new ValidationError(
          `Foreign key constraint failure: Target institute, parent CRM record, or student record does not exist.`,
        );
      }
      throw error;
    }
  }

  /**
   * Look up a relationship by record ID strictly within tenant context.
   */
  public async findById(
    instituteId: string,
    id: string,
  ): Promise<InstituteParentStudentEntity | null> {
    if (!instituteId || !id) {
      return null;
    }

    const record = await db.instituteParentStudent.findFirst({
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
   * Look up a relationship by parent & student pair strictly within tenant context.
   */
  public async findByPair(
    instituteId: string,
    instituteParentId: string,
    studentId: string,
  ): Promise<InstituteParentStudentEntity | null> {
    if (!instituteId || !instituteParentId || !studentId) {
      return null;
    }

    const record = await db.instituteParentStudent.findUnique({
      where: {
        institute_parent_student_unique: {
          instituteId,
          instituteParentId,
          studentId,
        },
      },
    });

    if (!record) {
      return null;
    }

    return this.toDomainEntity(record);
  }

  /**
   * List all relationship records for a student strictly within tenant context.
   */
  public async listByStudentId(
    instituteId: string,
    studentId: string,
  ): Promise<InstituteParentStudentEntity[]> {
    if (!instituteId || !studentId) {
      return [];
    }

    const records = await db.instituteParentStudent.findMany({
      where: {
        instituteId,
        studentId,
      },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return records.map((record) => this.toDomainEntity(record));
  }

  /**
   * List all relationship records for a parent strictly within tenant context.
   */
  public async listByInstituteParentId(
    instituteId: string,
    instituteParentId: string,
  ): Promise<InstituteParentStudentEntity[]> {
    if (!instituteId || !instituteParentId) {
      return [];
    }

    const records = await db.instituteParentStudent.findMany({
      where: {
        instituteId,
        instituteParentId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return records.map((record) => this.toDomainEntity(record));
  }

  /**
   * Update an existing relationship record strictly within tenant context.
   */
  public async update(
    entity: InstituteParentStudentEntity,
  ): Promise<InstituteParentStudentEntity> {
    const existing = await this.findById(entity.instituteId, entity.id);
    if (!existing) {
      throw new NotFoundError(
        `Relationship record "${entity.id}" not found in institute "${entity.instituteId}".`,
      );
    }

    try {
      const record = await db.instituteParentStudent.update({
        where: { id: entity.id },
        data: {
          relationshipType: entity.relationshipType,
          isPrimary: entity.isPrimary,
          status: entity.status,
          updatedAt: entity.updatedAt,
          deletedAt: entity.deletedAt,
        },
      });

      return this.toDomainEntity(record);
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundError(
          `Relationship record "${entity.id}" not found in institute "${entity.instituteId}".`,
        );
      }
      if (error?.code === 'P2002') {
        throw new ConflictError(
          `An active primary guardian already exists for student "${entity.studentId}" in institute "${entity.instituteId}".`,
        );
      }
      throw error;
    }
  }

  /**
   * Atomically promotes a relationship to primary guardian for a student within an institute.
   */
  public async setPrimaryGuardian(
    instituteId: string,
    studentId: string,
    relationshipId: string,
  ): Promise<void> {
    const relationship = await this.findById(instituteId, relationshipId);
    if (!relationship) {
      throw new NotFoundError(
        `Relationship record "${relationshipId}" not found in institute "${instituteId}".`,
      );
    }

    if (relationship.studentId !== studentId) {
      throw new ValidationError(
        `Relationship "${relationshipId}" does not belong to student "${studentId}".`,
      );
    }

    if (relationship.status === 'archived') {
      throw new ValidationError(
        `Cannot designate an archived relationship as primary.`,
      );
    }

    await db.$transaction(async (tx) => {
      // Clear primary status on all existing relationships for this student
      await tx.instituteParentStudent.updateMany({
        where: {
          instituteId,
          studentId,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
          updatedAt: new Date(),
        },
      });

      // Promote target relationship to primary
      await tx.instituteParentStudent.update({
        where: { id: relationshipId },
        data: {
          isPrimary: true,
          updatedAt: new Date(),
        },
      });
    });
  }

  /**
   * Soft-archive a relationship record by ID strictly within tenant scope.
   */
  public async archive(instituteId: string, id: string): Promise<void> {
    const existing = await this.findById(instituteId, id);
    if (!existing) {
      throw new NotFoundError(
        `Relationship record "${id}" not found in institute "${instituteId}".`,
      );
    }

    const now = new Date();
    await db.instituteParentStudent.update({
      where: { id },
      data: {
        status: 'archived',
        isPrimary: false,
        updatedAt: now,
        deletedAt: now,
      },
    });
  }

  /**
   * Check whether a relationship record exists for (instituteId, instituteParentId, studentId).
   */
  public async exists(
    instituteId: string,
    instituteParentId: string,
    studentId: string,
  ): Promise<boolean> {
    if (!instituteId || !instituteParentId || !studentId) {
      return false;
    }

    const count = await db.instituteParentStudent.count({
      where: {
        instituteId,
        instituteParentId,
        studentId,
      },
    });

    return count > 0;
  }

  // ── Mapping Helper ─────────────────────────────────────────────────────────

  private toDomainEntity(record: {
    id: string;
    instituteId: string;
    instituteParentId: string;
    studentId: string;
    relationshipType: string;
    isPrimary: boolean;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): InstituteParentStudentEntity {
    return InstituteParentStudentEntity.from({
      id: record.id,
      instituteId: record.instituteId,
      instituteParentId: record.instituteParentId,
      studentId: record.studentId,
      relationshipType: record.relationshipType as GuardianRelationshipType,
      isPrimary: record.isPrimary,
      status: record.status as GuardianRelationshipStatus,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
    });
  }
}
