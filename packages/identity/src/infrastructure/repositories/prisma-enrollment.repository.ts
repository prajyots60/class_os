import { db } from '@coaching-os/database';
import { ConflictError, NotFoundError, ValidationError } from '@coaching-os/shared';
import {
  EnrollmentEntity,
  type EnrollmentStatus,
} from '../../domain/entities/enrollment.entity';
import type {
  EnrollmentRepository,
  ListEnrollmentsOptions,
} from '../../domain/repositories/enrollment.repository';

/**
 * PrismaEnrollmentRepository
 *
 * PostgreSQL Prisma implementation of EnrollmentRepository.
 *
 * ARCHITECTURAL CONTRACT (ADR-0014):
 * - Operates strictly on tenant-scoped Enrollment domain entities.
 * - EVERY method enforces `instituteId` tenant scoping at the database query boundary.
 * - Enforces composite uniqueness: UNIQUE(institute_id, student_id, batch_id).
 * - Maps PostgreSQL/Prisma errors into clean domain errors (P2002 -> ConflictError, P2025 -> NotFoundError).
 * - Cross-tenant queries return null or empty lists, preventing cross-tenant existence disclosure.
 */
export class PrismaEnrollmentRepository implements EnrollmentRepository {
  /**
   * Create a new Enrollment record in PostgreSQL.
   */
  public async create(entity: EnrollmentEntity): Promise<EnrollmentEntity> {
    // Validate target student belongs strictly to tenant institute
    const student = await db.student.findFirst({
      where: { id: entity.studentId, instituteId: entity.instituteId },
    });
    if (!student) {
      throw new ValidationError(
        `Target student "${entity.studentId}" does not exist in institute "${entity.instituteId}".`,
      );
    }

    // Validate target batch belongs strictly to tenant institute
    const batch = await db.batch.findFirst({
      where: { id: entity.batchId, instituteId: entity.instituteId },
    });
    if (!batch) {
      throw new ValidationError(
        `Target batch "${entity.batchId}" does not exist in institute "${entity.instituteId}".`,
      );
    }

    try {
      const record = await db.enrollment.create({
        data: {
          id: entity.id,
          instituteId: entity.instituteId,
          studentId: entity.studentId,
          batchId: entity.batchId,
          status: entity.status as EnrollmentStatus,
          enrolledAt: entity.enrolledAt,
          completedAt: entity.completedAt,
          withdrawnAt: entity.withdrawnAt,
          transferredAt: entity.transferredAt,
          transferredToBatchId: entity.transferredToBatchId,
          transferredToEnrollmentId: entity.transferredToEnrollmentId,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt,
          deletedAt: entity.deletedAt,
        },
      });

      return this.toDomainEntity(record);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictError(
          `Student "${entity.studentId}" is already enrolled in batch "${entity.batchId}" in institute "${entity.instituteId}".`,
        );
      }
      if (error?.code === 'P2003') {
        throw new ValidationError(
          `Foreign key constraint failure: Target student, batch, or institute does not exist.`,
        );
      }
      throw error;
    }
  }

  /**
   * Look up an Enrollment record by ID strictly within tenant context.
   */
  public async findById(instituteId: string, id: string): Promise<EnrollmentEntity | null> {
    if (!instituteId || !id) {
      return null;
    }

    const record = await db.enrollment.findFirst({
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
   * Find enrollments for a specific student strictly within tenant context.
   */
  public async findByStudent(
    instituteId: string,
    studentId: string,
    options?: ListEnrollmentsOptions,
  ): Promise<EnrollmentEntity[]> {
    if (!instituteId || !studentId) {
      return [];
    }

    const page = Math.max(1, options?.page ?? 1);
    const limit = Math.max(1, Math.min(100, options?.limit ?? 50));
    const skip = (page - 1) * limit;

    const records = await db.enrollment.findMany({
      where: {
        instituteId,
        studentId,
        ...(options?.status ? { status: options.status as EnrollmentStatus } : {}),
        ...(options?.batchId ? { batchId: options.batchId } : {}),
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
   * Find enrollments for a specific batch strictly within tenant context.
   */
  public async findByBatch(
    instituteId: string,
    batchId: string,
    options?: ListEnrollmentsOptions,
  ): Promise<EnrollmentEntity[]> {
    if (!instituteId || !batchId) {
      return [];
    }

    const page = Math.max(1, options?.page ?? 1);
    const limit = Math.max(1, Math.min(100, options?.limit ?? 50));
    const skip = (page - 1) * limit;

    const records = await db.enrollment.findMany({
      where: {
        instituteId,
        batchId,
        ...(options?.status ? { status: options.status as EnrollmentStatus } : {}),
        ...(options?.studentId ? { studentId: options.studentId } : {}),
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
   * Find active enrollments for a student strictly within tenant context.
   */
  public async findActiveByStudent(
    instituteId: string,
    studentId: string,
  ): Promise<EnrollmentEntity[]> {
    if (!instituteId || !studentId) {
      return [];
    }

    const records = await db.enrollment.findMany({
      where: {
        instituteId,
        studentId,
        status: 'active',
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return records.map((record) => this.toDomainEntity(record));
  }

  /**
   * Find active enrollments for a batch strictly within tenant context.
   */
  public async findActiveByBatch(
    instituteId: string,
    batchId: string,
  ): Promise<EnrollmentEntity[]> {
    if (!instituteId || !batchId) {
      return [];
    }

    const records = await db.enrollment.findMany({
      where: {
        instituteId,
        batchId,
        status: 'active',
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return records.map((record) => this.toDomainEntity(record));
  }

  /**
   * Look up an enrollment record for a (studentId, batchId) pair strictly within tenant context.
   */
  public async findByStudentAndBatch(
    instituteId: string,
    studentId: string,
    batchId: string,
  ): Promise<EnrollmentEntity | null> {
    if (!instituteId || !studentId || !batchId) {
      return null;
    }

    const record = await db.enrollment.findFirst({
      where: {
        instituteId,
        studentId,
        batchId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!record) {
      return null;
    }

    return this.toDomainEntity(record);
  }

  /**
   * Check whether an active or pending enrollment exists for a (studentId, batchId) pair.
   */
  public async existsActiveOrPending(
    instituteId: string,
    studentId: string,
    batchId: string,
  ): Promise<boolean> {
    if (!instituteId || !studentId || !batchId) {
      return false;
    }

    const count = await db.enrollment.count({
      where: {
        instituteId,
        studentId,
        batchId,
        status: {
          in: ['active', 'pending'],
        },
        deletedAt: null,
      },
    });

    return count > 0;
  }

  /**
   * Count active and pending enrollments for a batch to enforce capacity limits.
   */
  public async countActiveOrPendingByBatch(
    instituteId: string,
    batchId: string,
  ): Promise<number> {
    if (!instituteId || !batchId) {
      return 0;
    }

    return db.enrollment.count({
      where: {
        instituteId,
        batchId,
        status: {
          in: ['active', 'pending'],
        },
        deletedAt: null,
      },
    });
  }

  /**
   * List Enrollment records for an institute with optional filters and pagination.
   */
  public async listByInstitute(
    instituteId: string,
    options?: ListEnrollmentsOptions,
  ): Promise<EnrollmentEntity[]> {
    if (!instituteId) {
      return [];
    }

    const page = Math.max(1, options?.page ?? 1);
    const limit = Math.max(1, Math.min(100, options?.limit ?? 50));
    const skip = (page - 1) * limit;

    const records = await db.enrollment.findMany({
      where: {
        instituteId,
        ...(options?.status ? { status: options.status as EnrollmentStatus } : {}),
        ...(options?.studentId ? { studentId: options.studentId } : {}),
        ...(options?.batchId ? { batchId: options.batchId } : {}),
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
   * Update an existing Enrollment record strictly within tenant context.
   */
  public async update(entity: EnrollmentEntity): Promise<EnrollmentEntity> {
    const existing = await this.findById(entity.instituteId, entity.id);
    if (!existing) {
      throw new NotFoundError(
        `Enrollment record "${entity.id}" not found in institute "${entity.instituteId}".`,
      );
    }

    try {
      const record = await db.enrollment.update({
        where: { id: entity.id },
        data: {
          status: entity.status as EnrollmentStatus,
          enrolledAt: entity.enrolledAt,
          completedAt: entity.completedAt,
          withdrawnAt: entity.withdrawnAt,
          transferredAt: entity.transferredAt,
          transferredToBatchId: entity.transferredToBatchId,
          transferredToEnrollmentId: entity.transferredToEnrollmentId,
          updatedAt: entity.updatedAt,
          deletedAt: entity.deletedAt,
        },
      });

      return this.toDomainEntity(record);
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundError(
          `Enrollment record "${entity.id}" not found in institute "${entity.instituteId}".`,
        );
      }
      if (error?.code === 'P2002') {
        throw new ConflictError(
          `Student "${entity.studentId}" is already enrolled in batch "${entity.batchId}" in institute "${entity.instituteId}".`,
        );
      }
      throw error;
    }
  }

  // ── Mapping Helper ─────────────────────────────────────────────────────────

  private toDomainEntity(record: {
    id: string;
    instituteId: string;
    studentId: string;
    batchId: string;
    status: string;
    enrolledAt: Date;
    completedAt: Date | null;
    withdrawnAt: Date | null;
    transferredAt: Date | null;
    transferredToBatchId: string | null;
    transferredToEnrollmentId: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): EnrollmentEntity {
    return EnrollmentEntity.from({
      id: record.id,
      instituteId: record.instituteId,
      studentId: record.studentId,
      batchId: record.batchId,
      status: record.status as EnrollmentStatus,
      enrolledAt: record.enrolledAt,
      completedAt: record.completedAt,
      withdrawnAt: record.withdrawnAt,
      transferredAt: record.transferredAt,
      transferredToBatchId: record.transferredToBatchId,
      transferredToEnrollmentId: record.transferredToEnrollmentId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
    });
  }
}
